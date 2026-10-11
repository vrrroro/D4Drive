-- =============================================================================
-- D4Drive stored programs: functions, procedures, triggers, and a view.
--
-- Load after schema.sql and before seed.sql (the seed relies on the triggers
-- to write the status history). npm run db:setup does all three in order.
--
-- Every program here is called by the application. docs/DATABASE.md maps each
-- one to the page or API route that uses it and walks through what it does to
-- the tables.
--
-- Custom errors are raised with SQLSTATE 45000 and an errno the application
-- maps to an HTTP status (lib/services/db-errors.ts):
--   5001 car not found or withdrawn        404
--   5002 car already booked for the dates  409
--   5003 delivery or collection too far    422
--   5004 dates invalid                     400
--   5005 collection branch unavailable     422
--   5006 unknown delivery or payment mode  400
--   5101 booking not found                 404
--   5102 booking cannot be cancelled now   409
--   5201 car has rentals, cannot withdraw  409
--
-- Comments inside routine bodies avoid apostrophes: the db:setup splitter
-- reads quotes to find statement ends.
-- =============================================================================

DROP VIEW IF EXISTS v_booking_details;
DROP TRIGGER IF EXISTS trg_bookings_ai_log;
DROP TRIGGER IF EXISTS trg_bookings_au_log;
DROP TRIGGER IF EXISTS trg_bookings_au_refund;
DROP TRIGGER IF EXISTS trg_deliveries_bu_stamp;
DROP TRIGGER IF EXISTS trg_cars_bu_withdraw_guard;
DROP PROCEDURE IF EXISTS sp_create_booking;
DROP PROCEDURE IF EXISTS sp_cancel_booking;
DROP PROCEDURE IF EXISTS sp_end_of_day_close;
DROP FUNCTION IF EXISTS fn_haversine_km;
DROP FUNCTION IF EXISTS fn_delivery_fee;
DROP FUNCTION IF EXISTS fn_car_available;

DELIMITER $$

-- -----------------------------------------------------------------------------
-- FUNCTION fn_haversine_km
--
-- Great-circle distance in km between two points, rounded to 0.01 km. The
-- same asin(sqrt(a)) form as lib/services/distance.ts, which the checkout
-- uses for its live quote; tests/routines.test.ts holds the two together.
-- Used by sp_create_booking and the delivery reports.
-- -----------------------------------------------------------------------------
CREATE FUNCTION fn_haversine_km(
  p_lat1 DECIMAL(9, 6), p_lon1 DECIMAL(9, 6),
  p_lat2 DECIMAL(9, 6), p_lon2 DECIMAL(9, 6)
) RETURNS DECIMAL(8, 2)
DETERMINISTIC NO SQL
BEGIN
  DECLARE v_a DOUBLE;
  SET v_a = POW(SIN(RADIANS(p_lat2 - p_lat1) / 2), 2)
          + COS(RADIANS(p_lat1)) * COS(RADIANS(p_lat2))
            * POW(SIN(RADIANS(p_lon2 - p_lon1) / 2), 2);
  RETURN ROUND(2 * 6371 * ASIN(LEAST(1, SQRT(v_a))), 2);
END$$

-- -----------------------------------------------------------------------------
-- FUNCTION fn_delivery_fee
--
-- The tier table from the brief: up to 5 km free, up to 10 km 100 rupees, up
-- to 15 km 200 rupees, beyond that NULL (not offered). Mirrors DELIVERY_TIERS
-- in lib/constants.ts; tests/routines.test.ts fails if the two drift.
-- -----------------------------------------------------------------------------
CREATE FUNCTION fn_delivery_fee(p_km DECIMAL(8, 2)) RETURNS DECIMAL(10, 2)
DETERMINISTIC NO SQL
BEGIN
  IF p_km IS NULL OR p_km < 0 THEN RETURN NULL; END IF;
  IF p_km <= 5 THEN RETURN 0.00; END IF;
  IF p_km <= 10 THEN RETURN 100.00; END IF;
  IF p_km <= 15 THEN RETURN 200.00; END IF;
  RETURN NULL;
END$$

-- -----------------------------------------------------------------------------
-- FUNCTION fn_car_available
--
-- 1 when no booking that holds dates (pending, confirmed, active) overlaps the
-- range, else 0. Two ranges overlap when each starts before the other ends;
-- strict inequality lets one rental end on the day the next begins.
-- Used by GET /api/cars/:id/availability and inside sp_create_booking, where
-- it runs after the car row is locked.
-- -----------------------------------------------------------------------------
CREATE FUNCTION fn_car_available(
  p_car_id BIGINT UNSIGNED, p_start DATE, p_end DATE
) RETURNS TINYINT
READS SQL DATA
BEGIN
  RETURN NOT EXISTS (
    SELECT 1
      FROM bookings
     WHERE car_id = p_car_id
       AND status IN ('pending', 'confirmed', 'active')
       AND start_date < p_end
       AND end_date > p_start
  );
END$$

-- -----------------------------------------------------------------------------
-- PROCEDURE sp_create_booking
--
-- The whole booking as one transaction: lock the car row, check the dates are
-- free, work out the delivery or collection fee, then insert the booking, its
-- delivery and its payment. Either all three rows land or none do.
--
-- The lock is what prevents double booking: a second call for the same car
-- waits on FOR UPDATE until the first commits, then sees its booking.
--
-- Called by POST /api/bookings (lib/services/bookings.ts). Returns one row:
-- id, reference, days, rental_amount, delivery_fee, total_amount, distance_km.
-- The insert fires trg_bookings_ai_log, which writes the first history row.
-- -----------------------------------------------------------------------------
CREATE PROCEDURE sp_create_booking(
  IN p_reference        VARCHAR(16),
  IN p_user_id          BIGINT UNSIGNED,
  IN p_car_id           BIGINT UNSIGNED,
  IN p_start            DATE,
  IN p_end              DATE,
  IN p_mode             VARCHAR(16),
  IN p_pickup_branch_id BIGINT UNSIGNED,
  IN p_address          VARCHAR(255),
  IN p_city             VARCHAR(80),
  IN p_pincode          CHAR(6),
  IN p_latitude         DECIMAL(9, 6),
  IN p_longitude        DECIMAL(9, 6),
  IN p_method           VARCHAR(8),
  IN p_card_last_four   CHAR(4),
  IN p_upi_handle       VARCHAR(80)
)
BEGIN
  DECLARE v_rate        DECIMAL(10, 2);
  DECLARE v_home_branch BIGINT UNSIGNED;
  DECLARE v_pickup      BIGINT UNSIGNED DEFAULT NULL;
  DECLARE v_from_lat    DECIMAL(9, 6);
  DECLARE v_from_lon    DECIMAL(9, 6);
  DECLARE v_to_lat      DECIMAL(9, 6);
  DECLARE v_to_lon      DECIMAL(9, 6);
  DECLARE v_km          DECIMAL(8, 2) DEFAULT 0.00;
  DECLARE v_fee         DECIMAL(10, 2) DEFAULT 0.00;
  DECLARE v_days        INT;
  DECLARE v_rental      DECIMAL(10, 2);
  DECLARE v_booking_id  BIGINT UNSIGNED;
  DECLARE v_message     VARCHAR(200);

  DECLARE EXIT HANDLER FOR SQLEXCEPTION
  BEGIN
    ROLLBACK;
    SET @d4d_actor_id = NULL, @d4d_reason = NULL;
    RESIGNAL;
  END;

  IF p_end <= p_start THEN
    SIGNAL SQLSTATE '45000'
      SET MYSQL_ERRNO = 5004, MESSAGE_TEXT = 'The return date must be after the pickup date.';
  END IF;
  IF p_start < CURDATE() THEN
    SIGNAL SQLSTATE '45000'
      SET MYSQL_ERRNO = 5004, MESSAGE_TEXT = 'Pickup cannot be in the past.';
  END IF;
  IF p_mode NOT IN ('doorstep', 'self_pickup') OR p_method NOT IN ('card', 'upi') THEN
    SIGNAL SQLSTATE '45000'
      SET MYSQL_ERRNO = 5006, MESSAGE_TEXT = 'Choose a delivery option and a payment method.';
  END IF;

  START TRANSACTION;

  -- Lock only the car row. Joining branches here would lock the branch too
  -- and serialise every booking at that branch, not just this car.
  SELECT price_per_day, branch_id
    INTO v_rate, v_home_branch
    FROM cars
   WHERE id = p_car_id AND is_active = 1
     FOR UPDATE;

  IF v_rate IS NULL THEN
    SIGNAL SQLSTATE '45000'
      SET MYSQL_ERRNO = 5001, MESSAGE_TEXT = 'Car not found.';
  END IF;

  IF fn_car_available(p_car_id, p_start, p_end) = 0 THEN
    SIGNAL SQLSTATE '45000'
      SET MYSQL_ERRNO = 5002, MESSAGE_TEXT = 'This car is already booked for the selected dates.';
  END IF;

  SELECT latitude, longitude INTO v_from_lat, v_from_lon
    FROM branches WHERE id = v_home_branch;

  IF p_mode = 'doorstep' THEN
    SET v_to_lat = p_latitude, v_to_lon = p_longitude;
  ELSE
    SET v_pickup = COALESCE(p_pickup_branch_id, v_home_branch);
    SELECT latitude, longitude INTO v_to_lat, v_to_lon
      FROM branches WHERE id = v_pickup AND is_active = 1;
    IF v_to_lat IS NULL THEN
      SIGNAL SQLSTATE '45000'
        SET MYSQL_ERRNO = 5005, MESSAGE_TEXT = 'That branch is not taking collections.';
    END IF;
  END IF;

  IF p_mode = 'self_pickup' AND v_pickup = v_home_branch THEN
    SET v_km = 0.00;
  ELSE
    SET v_km = fn_haversine_km(v_from_lat, v_from_lon, v_to_lat, v_to_lon);
  END IF;

  SET v_fee = fn_delivery_fee(v_km);
  IF v_fee IS NULL THEN
    SET v_message = CONCAT(
      IF(p_mode = 'doorstep',
         'Doorstep delivery reaches 15 km. This address is ',
         'Collection at another branch reaches 15 km. That branch is '),
      FORMAT(v_km, 1), ' km from where the car is kept.');
    SIGNAL SQLSTATE '45000' SET MYSQL_ERRNO = 5003, MESSAGE_TEXT = v_message;
  END IF;

  SET v_days = DATEDIFF(p_end, p_start);
  SET v_rental = v_days * v_rate;

  -- Read by trg_bookings_ai_log: who booked and why.
  SET @d4d_actor_id = p_user_id, @d4d_reason = 'booked online';

  INSERT INTO bookings
    (reference, user_id, car_id, start_date, end_date, days,
     rate_per_day, rental_amount, delivery_fee, total_amount, status)
  VALUES
    (p_reference, p_user_id, p_car_id, p_start, p_end, v_days,
     v_rate, v_rental, v_fee, v_rental + v_fee, 'confirmed');

  SET v_booking_id = LAST_INSERT_ID();

  INSERT INTO deliveries
    (booking_id, mode, pickup_branch_id, address_line, city, pincode,
     latitude, longitude, distance_km, status)
  VALUES
    (v_booking_id, p_mode, v_pickup,
     IF(p_mode = 'doorstep', p_address, NULL),
     IF(p_mode = 'doorstep', p_city, NULL),
     IF(p_mode = 'doorstep', p_pincode, NULL),
     IF(p_mode = 'doorstep', p_latitude, NULL),
     IF(p_mode = 'doorstep', p_longitude, NULL),
     v_km, 'pending');

  -- Simulated payment. Only the last four digits of a card are ever stored.
  INSERT INTO payments
    (booking_id, amount, method, status, reference, card_last_four, upi_handle, paid_at)
  VALUES
    (v_booking_id, v_rental + v_fee, p_method, 'paid', CONCAT('MOCK', p_reference),
     IF(p_method = 'card', p_card_last_four, NULL),
     IF(p_method = 'upi', p_upi_handle, NULL),
     NOW());

  COMMIT;
  SET @d4d_actor_id = NULL, @d4d_reason = NULL;

  SELECT v_booking_id    AS id,
         p_reference     AS reference,
         v_days          AS days,
         v_rental        AS rental_amount,
         v_fee           AS delivery_fee,
         v_rental + v_fee AS total_amount,
         v_km            AS distance_km;
END$$

-- -----------------------------------------------------------------------------
-- PROCEDURE sp_cancel_booking
--
-- Cancels a booking that has not started. A customer may cancel only their
-- own booking, and only before its pickup day; staff may cancel any pending
-- or confirmed booking. The UPDATE fires two triggers: trg_bookings_au_log
-- writes the history row and trg_bookings_au_refund refunds the payment.
--
-- Called by POST /api/bookings/:id/cancel (customer, My bookings) and by the
-- admin status route when the new status is cancelled. Returns the booking
-- reference and the amount refunded.
-- -----------------------------------------------------------------------------
CREATE PROCEDURE sp_cancel_booking(
  IN p_booking_id BIGINT UNSIGNED,
  IN p_actor_id   BIGINT UNSIGNED,
  IN p_is_admin   TINYINT
)
BEGIN
  DECLARE v_status VARCHAR(16);
  DECLARE v_owner  BIGINT UNSIGNED;
  DECLARE v_start  DATE;

  DECLARE EXIT HANDLER FOR SQLEXCEPTION
  BEGIN
    ROLLBACK;
    SET @d4d_actor_id = NULL, @d4d_reason = NULL;
    RESIGNAL;
  END;

  START TRANSACTION;

  SELECT status, user_id, start_date
    INTO v_status, v_owner, v_start
    FROM bookings
   WHERE id = p_booking_id
     FOR UPDATE;

  -- Someone else s booking reads as not found, never as forbidden: the
  -- difference would confirm that the id exists.
  IF v_owner IS NULL OR (p_is_admin = 0 AND v_owner <> p_actor_id) THEN
    SIGNAL SQLSTATE '45000'
      SET MYSQL_ERRNO = 5101, MESSAGE_TEXT = 'Booking not found.';
  END IF;

  IF v_status NOT IN ('pending', 'confirmed') THEN
    SIGNAL SQLSTATE '45000'
      SET MYSQL_ERRNO = 5102, MESSAGE_TEXT = 'Only a booking that has not started can be cancelled.';
  END IF;

  IF p_is_admin = 0 AND v_start <= CURDATE() THEN
    SIGNAL SQLSTATE '45000'
      SET MYSQL_ERRNO = 5102, MESSAGE_TEXT = 'The pickup day has come. Call the branch to cancel.';
  END IF;

  SET @d4d_actor_id = p_actor_id,
      @d4d_reason = IF(p_is_admin = 1, 'cancelled by staff', 'cancelled by customer');

  UPDATE bookings SET status = 'cancelled' WHERE id = p_booking_id;

  COMMIT;
  SET @d4d_actor_id = NULL, @d4d_reason = NULL;

  SELECT b.reference,
         COALESCE(SUM(p.amount), 0.00) AS refunded_amount
    FROM bookings b
    LEFT JOIN payments p ON p.booking_id = b.id AND p.status = 'refunded'
   WHERE b.id = p_booking_id
   GROUP BY b.reference;
END$$

-- -----------------------------------------------------------------------------
-- PROCEDURE sp_end_of_day_close  (uses a CURSOR)
--
-- The branch closing routine, run from the admin dashboard. A cursor walks
-- every booking whose day has come, oldest first, and moves each one on:
--
--   confirmed, pickup day reached   ->  active     (the rental has started)
--   active, return day reached      ->  completed  (and a delivered car is
--                                                   marked returned)
--
-- A confirmed booking whose whole period has passed goes through both steps,
-- so its history shows both, in order. Each step is a compare-and-set UPDATE,
-- so a booking an admin changed a moment ago is left alone. Every UPDATE fires
-- trg_bookings_au_log, so the history records the close as the reason.
--
-- It then deletes refresh tokens that expired more than a day ago (sessions
-- nobody can use any more).
--
-- Returns two result sets: a summary row (activated, completed,
-- deliveries_returned, sessions_purged) and one row per step taken.
-- -----------------------------------------------------------------------------
CREATE PROCEDURE sp_end_of_day_close(IN p_actor_id BIGINT UNSIGNED)
BEGIN
  DECLARE v_done      TINYINT DEFAULT 0;
  DECLARE v_id        BIGINT UNSIGNED;
  DECLARE v_reference VARCHAR(16);
  DECLARE v_status    VARCHAR(16);
  DECLARE v_end       DATE;
  DECLARE v_activated INT DEFAULT 0;
  DECLARE v_completed INT DEFAULT 0;
  DECLARE v_returned  INT DEFAULT 0;
  DECLARE v_purged    INT DEFAULT 0;

  DECLARE cur_due CURSOR FOR
    SELECT id, reference, status, end_date
      FROM bookings
     WHERE (status = 'confirmed' AND start_date <= CURDATE())
        OR (status = 'active' AND end_date <= CURDATE())
     ORDER BY start_date, id;

  DECLARE CONTINUE HANDLER FOR NOT FOUND SET v_done = 1;

  DECLARE EXIT HANDLER FOR SQLEXCEPTION
  BEGIN
    ROLLBACK;
    SET @d4d_actor_id = NULL, @d4d_reason = NULL;
    RESIGNAL;
  END;

  DROP TEMPORARY TABLE IF EXISTS tmp_eod_steps;
  CREATE TEMPORARY TABLE tmp_eod_steps (
    step        INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    reference   VARCHAR(16)  NOT NULL,
    from_status VARCHAR(16)  NOT NULL,
    to_status   VARCHAR(16)  NOT NULL
  );

  START TRANSACTION;
  SET @d4d_actor_id = p_actor_id, @d4d_reason = 'end-of-day close';

  OPEN cur_due;
  due_loop: LOOP
    FETCH cur_due INTO v_id, v_reference, v_status, v_end;
    IF v_done = 1 THEN
      LEAVE due_loop;
    END IF;

    IF v_status = 'confirmed' THEN
      UPDATE bookings SET status = 'active' WHERE id = v_id AND status = 'confirmed';
      IF ROW_COUNT() = 1 THEN
        SET v_activated = v_activated + 1, v_status = 'active';
        INSERT INTO tmp_eod_steps (reference, from_status, to_status)
        VALUES (v_reference, 'confirmed', 'active');
      END IF;
    END IF;

    IF v_status = 'active' AND v_end <= CURDATE() THEN
      UPDATE bookings SET status = 'completed' WHERE id = v_id AND status = 'active';
      IF ROW_COUNT() = 1 THEN
        SET v_completed = v_completed + 1;
        INSERT INTO tmp_eod_steps (reference, from_status, to_status)
        VALUES (v_reference, 'active', 'completed');

        UPDATE deliveries SET status = 'returned'
         WHERE booking_id = v_id AND status = 'delivered';
        SET v_returned = v_returned + ROW_COUNT();
      END IF;
    END IF;
  END LOOP;
  CLOSE cur_due;

  DELETE FROM refresh_tokens WHERE expires_at < NOW() - INTERVAL 1 DAY;
  SET v_purged = ROW_COUNT();

  COMMIT;
  SET @d4d_actor_id = NULL, @d4d_reason = NULL;

  SELECT v_activated AS activated,
         v_completed AS completed,
         v_returned  AS deliveries_returned,
         v_purged    AS sessions_purged;

  SELECT step, reference, from_status, to_status FROM tmp_eod_steps ORDER BY step;
  DROP TEMPORARY TABLE IF EXISTS tmp_eod_steps;
END$$

-- -----------------------------------------------------------------------------
-- TRIGGER trg_bookings_ai_log  (AFTER INSERT ON bookings)
--
-- Every new booking gets its first history row. The actor defaults to the
-- customer who booked; the reason to booked.
-- -----------------------------------------------------------------------------
CREATE TRIGGER trg_bookings_ai_log
AFTER INSERT ON bookings
FOR EACH ROW
BEGIN
  INSERT INTO booking_status_log (booking_id, from_status, to_status, actor_user_id, reason)
  VALUES (NEW.id, NULL, NEW.status,
          COALESCE(@d4d_actor_id, NEW.user_id),
          COALESCE(@d4d_reason, 'booked'));
END$$

-- -----------------------------------------------------------------------------
-- TRIGGER trg_bookings_au_log  (AFTER UPDATE ON bookings)
--
-- Every status change, from whatever path (admin, customer, the end-of-day
-- cursor, a hand-typed UPDATE), lands in the history. Updates that do not
-- change the status write nothing.
-- -----------------------------------------------------------------------------
CREATE TRIGGER trg_bookings_au_log
AFTER UPDATE ON bookings
FOR EACH ROW
BEGIN
  IF NEW.status <> OLD.status THEN
    INSERT INTO booking_status_log (booking_id, from_status, to_status, actor_user_id, reason)
    VALUES (NEW.id, OLD.status, NEW.status, @d4d_actor_id,
            COALESCE(@d4d_reason, 'status change'));
  END IF;
END$$

-- -----------------------------------------------------------------------------
-- TRIGGER trg_bookings_au_refund  (AFTER UPDATE ON bookings)
--
-- Cancelling a booking refunds its payment automatically, so no cancellation
-- path can forget the money. The payment keeps its row and gains a refund time.
-- -----------------------------------------------------------------------------
CREATE TRIGGER trg_bookings_au_refund
AFTER UPDATE ON bookings
FOR EACH ROW
FOLLOWS trg_bookings_au_log
BEGIN
  IF NEW.status = 'cancelled' AND OLD.status <> 'cancelled' THEN
    UPDATE payments
       SET status = 'refunded', refunded_at = NOW()
     WHERE booking_id = NEW.id AND status = 'paid';
  END IF;
END$$

-- -----------------------------------------------------------------------------
-- TRIGGER trg_deliveries_bu_stamp  (BEFORE UPDATE ON deliveries)
--
-- The handover time is stamped by the database the moment a delivery becomes
-- delivered, never supplied by a client, so it records when it happened.
-- -----------------------------------------------------------------------------
CREATE TRIGGER trg_deliveries_bu_stamp
BEFORE UPDATE ON deliveries
FOR EACH ROW
BEGIN
  IF NEW.status = 'delivered' AND OLD.status <> 'delivered' THEN
    SET NEW.delivered_at = NOW();
  END IF;
END$$

-- -----------------------------------------------------------------------------
-- TRIGGER trg_cars_bu_withdraw_guard  (BEFORE UPDATE ON cars)
--
-- A car with a confirmed or running rental cannot be withdrawn from the fleet:
-- the customer holding it would be stranded. The admin fleet page shows the
-- message; the rental has to be completed or cancelled first.
-- -----------------------------------------------------------------------------
CREATE TRIGGER trg_cars_bu_withdraw_guard
BEFORE UPDATE ON cars
FOR EACH ROW
BEGIN
  IF OLD.is_active = 1 AND NEW.is_active = 0 AND EXISTS (
       SELECT 1 FROM bookings
        WHERE car_id = OLD.id
          AND status IN ('confirmed', 'active')
          AND end_date > CURDATE()) THEN
    SIGNAL SQLSTATE '45000'
      SET MYSQL_ERRNO = 5201,
          MESSAGE_TEXT = 'This car has a confirmed or running rental. Complete or cancel it before withdrawing the car.';
  END IF;
END$$

DELIMITER ;

-- -----------------------------------------------------------------------------
-- VIEW v_booking_details
--
-- One row per booking with its customer, car, branches, delivery and payment.
-- The customer dashboard, the invoice, the confirmation page and the admin
-- bookings page all read this view instead of repeating a five-way join.
-- -----------------------------------------------------------------------------
CREATE VIEW v_booking_details AS
SELECT bo.id,
       bo.reference,
       bo.user_id,
       u.full_name      AS customer_name,
       u.email          AS customer_email,
       bo.car_id,
       bo.start_date,
       bo.end_date,
       bo.days,
       bo.rate_per_day,
       bo.rental_amount,
       bo.delivery_fee,
       bo.total_amount,
       bo.status,
       bo.created_at,
       c.brand,
       c.model,
       c.year,
       c.image_url,
       c.registration_no,
       hb.name          AS home_branch,
       d.mode           AS delivery_mode,
       d.status         AS delivery_status,
       d.address_line,
       d.distance_km,
       d.delivered_at,
       pb.name          AS pickup_branch,
       p.status         AS payment_status,
       p.method         AS payment_method,
       p.card_last_four,
       p.upi_handle,
       p.paid_at,
       p.refunded_at
  FROM bookings bo
  JOIN users      u  ON u.id = bo.user_id
  JOIN cars       c  ON c.id = bo.car_id
  JOIN branches   hb ON hb.id = c.branch_id
  JOIN deliveries d  ON d.booking_id = bo.id
  LEFT JOIN branches pb ON pb.id = d.pickup_branch_id
  JOIN payments   p  ON p.booking_id = bo.id;
