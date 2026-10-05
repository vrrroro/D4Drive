-- =============================================================================
-- D4Drive schema
--
-- MySQL 8, InnoDB, utf8mb4. Third normal form throughout.
-- Money is DECIMAL, never FLOAT: binary floating point cannot represent 0.10
-- exactly and rental totals must reconcile to the paise.
--
-- Load order: schema.sql, then seed.sql.
-- =============================================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS refresh_tokens;
DROP TABLE IF EXISTS payments;
DROP TABLE IF EXISTS deliveries;
DROP TABLE IF EXISTS bookings;
DROP TABLE IF EXISTS cars;
DROP TABLE IF EXISTS branches;
DROP TABLE IF EXISTS users;

SET FOREIGN_KEY_CHECKS = 1;

-- -----------------------------------------------------------------------------
-- users
-- -----------------------------------------------------------------------------
CREATE TABLE users (
  id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  full_name       VARCHAR(120)    NOT NULL,
  email           VARCHAR(255)    NOT NULL,
  phone           VARCHAR(20)     NOT NULL,
  -- Argon2id encoded hash. 97 chars at our parameters, 255 leaves headroom
  -- for a future parameter change without a migration.
  password_hash   VARCHAR(255)    NOT NULL,
  role            ENUM('customer', 'admin') NOT NULL DEFAULT 'customer',
  licence_number  VARCHAR(32)     NULL,
  created_at      TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP
                                  ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  UNIQUE KEY uq_users_email (email),
  KEY idx_users_role (role)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- branches
--
-- Coordinates drive the Haversine delivery-distance calculation, so they are
-- NOT NULL. DECIMAL(9,6) gives roughly 0.11 m precision at the equator, which
-- is far more than a delivery fee tier needs.
-- -----------------------------------------------------------------------------
CREATE TABLE branches (
  id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  name        VARCHAR(120)    NOT NULL,
  address     VARCHAR(255)    NOT NULL,
  city        VARCHAR(80)     NOT NULL,
  latitude    DECIMAL(9, 6)   NOT NULL,
  longitude   DECIMAL(9, 6)   NOT NULL,
  phone       VARCHAR(20)     NOT NULL,
  is_active   TINYINT(1)      NOT NULL DEFAULT 1,
  created_at  TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  KEY idx_branches_city (city, is_active)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- cars
--
-- Soft delete via is_active. A hard delete would orphan the booking history
-- that a completed rental depends on for its invoice.
-- -----------------------------------------------------------------------------
CREATE TABLE cars (
  id                BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  branch_id         BIGINT UNSIGNED NOT NULL,
  brand             VARCHAR(60)     NOT NULL,
  model             VARCHAR(80)     NOT NULL,
  year              SMALLINT UNSIGNED NOT NULL,
  registration_no   VARCHAR(20)     NOT NULL,
  fuel_type         ENUM('petrol', 'diesel', 'electric', 'hybrid') NOT NULL,
  transmission      ENUM('manual', 'automatic') NOT NULL,
  seats             TINYINT UNSIGNED NOT NULL,
  price_per_day     DECIMAL(10, 2)  NOT NULL,
  image_url         VARCHAR(500)    NULL,
  description       TEXT            NULL,
  is_active         TINYINT(1)      NOT NULL DEFAULT 1,
  created_at        TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at        TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP
                                    ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  UNIQUE KEY uq_cars_registration (registration_no),
  KEY fk_cars_branch (branch_id),

  -- Covers the catalog's common filter path so it does not table scan.
  KEY idx_cars_filter (is_active, fuel_type, seats, price_per_day),
  KEY idx_cars_brand (brand, is_active),

  CONSTRAINT fk_cars_branch
    FOREIGN KEY (branch_id) REFERENCES branches (id)
    ON DELETE RESTRICT ON UPDATE CASCADE,

  CONSTRAINT chk_cars_seats CHECK (seats BETWEEN 2 AND 9),
  CONSTRAINT chk_cars_price CHECK (price_per_day > 0)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- bookings
--
-- start_date and end_date are DATE, not DATETIME. Rentals here are whole-day,
-- and mixing a time component into an overlap comparison is a reliable source
-- of off-by-one bugs at the handover boundary.
-- -----------------------------------------------------------------------------
CREATE TABLE bookings (
  id                BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  reference         VARCHAR(16)     NOT NULL,
  user_id           BIGINT UNSIGNED NOT NULL,
  car_id            BIGINT UNSIGNED NOT NULL,
  start_date        DATE            NOT NULL,
  end_date          DATE            NOT NULL,
  days              SMALLINT UNSIGNED NOT NULL,
  rate_per_day      DECIMAL(10, 2)  NOT NULL,
  rental_amount     DECIMAL(10, 2)  NOT NULL,
  delivery_fee      DECIMAL(10, 2)  NOT NULL DEFAULT 0.00,
  total_amount      DECIMAL(10, 2)  NOT NULL,
  status            ENUM('pending', 'confirmed', 'active', 'completed', 'cancelled')
                    NOT NULL DEFAULT 'pending',
  created_at        TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at        TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP
                                    ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  UNIQUE KEY uq_bookings_reference (reference),
  KEY fk_bookings_user (user_id),

  -- The availability query filters on car_id and status, then compares the
  -- date range. This composite is what keeps that query off a full scan.
  KEY idx_bookings_overlap (car_id, status, start_date, end_date),

  CONSTRAINT fk_bookings_user
    FOREIGN KEY (user_id) REFERENCES users (id)
    ON DELETE RESTRICT ON UPDATE CASCADE,

  CONSTRAINT fk_bookings_car
    FOREIGN KEY (car_id) REFERENCES cars (id)
    ON DELETE RESTRICT ON UPDATE CASCADE,

  -- A rental cannot end before it starts. Cheap to enforce here, and it stops
  -- a reversed range from silently matching nothing in the overlap check.
  CONSTRAINT chk_bookings_dates CHECK (end_date > start_date),
  CONSTRAINT chk_bookings_total CHECK (total_amount >= 0)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- deliveries
--
-- One row per booking, whether the customer chose doorstep delivery or
-- self-pickup. Keeping a row either way means the lifecycle query does not
-- need an outer join and the admin view has a consistent shape.
-- -----------------------------------------------------------------------------
CREATE TABLE deliveries (
  id                  BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  booking_id          BIGINT UNSIGNED NOT NULL,
  mode                ENUM('self_pickup', 'doorstep') NOT NULL,
  address_line        VARCHAR(255)    NULL,
  city                VARCHAR(80)     NULL,
  pincode             VARCHAR(10)     NULL,
  latitude            DECIMAL(9, 6)   NULL,
  longitude           DECIMAL(9, 6)   NULL,
  distance_km         DECIMAL(6, 2)   NULL,
  status              ENUM('pending', 'out_for_delivery', 'delivered', 'returned')
                      NOT NULL DEFAULT 'pending',
  scheduled_at        DATETIME        NULL,
  delivered_at        DATETIME        NULL,
  created_at          TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at          TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP
                                      ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  UNIQUE KEY uq_deliveries_booking (booking_id),
  KEY idx_deliveries_status (status),

  CONSTRAINT fk_deliveries_booking
    FOREIGN KEY (booking_id) REFERENCES bookings (id)
    ON DELETE CASCADE ON UPDATE CASCADE,

  -- Doorstep delivery without an address is not a deliverable booking.
  CONSTRAINT chk_deliveries_address CHECK (
    mode = 'self_pickup'
    OR (address_line IS NOT NULL AND latitude IS NOT NULL AND longitude IS NOT NULL)
  )
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- payments
--
-- Payment is SIMULATED. No card number, CVV, expiry, or UPI credential is ever
-- stored here, not even a fake one. See SECURITY.md.
-- -----------------------------------------------------------------------------
CREATE TABLE payments (
  id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  booking_id      BIGINT UNSIGNED NOT NULL,
  amount          DECIMAL(10, 2)  NOT NULL,
  method          ENUM('card', 'upi') NOT NULL,
  status          ENUM('pending', 'paid', 'failed', 'refunded')
                  NOT NULL DEFAULT 'pending',
  -- Mock gateway reference. Not a real transaction id.
  reference       VARCHAR(40)     NOT NULL,
  -- Last four digits only, for display on the invoice. Never the full number.
  card_last_four  CHAR(4)         NULL,
  upi_handle      VARCHAR(80)     NULL,
  paid_at         DATETIME        NULL,
  created_at      TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  UNIQUE KEY uq_payments_reference (reference),
  KEY fk_payments_booking (booking_id),
  KEY idx_payments_status (status),

  CONSTRAINT fk_payments_booking
    FOREIGN KEY (booking_id) REFERENCES bookings (id)
    ON DELETE CASCADE ON UPDATE CASCADE,

  CONSTRAINT chk_payments_amount CHECK (amount >= 0)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- refresh_tokens
--
-- One row per issued refresh token, keyed by the JWT's jti. The token itself
-- is never stored: the jti is a random UUID that is useless without the
-- signing secret, so a leaked table cannot be replayed.
--
-- Rotation: every successful refresh revokes the presented row and records
-- its successor. A revoked jti presented again means the token was copied
-- (the legitimate client already holds the successor), so every live token
-- for that user is revoked and they sign in again.
-- -----------------------------------------------------------------------------
CREATE TABLE refresh_tokens (
  jti           CHAR(36)        NOT NULL,
  user_id       BIGINT UNSIGNED NOT NULL,
  expires_at    DATETIME        NOT NULL,
  revoked_at    DATETIME        NULL,
  replaced_by   CHAR(36)        NULL,
  created_at    TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (jti),
  -- Covers "revoke every live token for this user" on reuse and logout.
  KEY idx_refresh_tokens_user (user_id, revoked_at),

  CONSTRAINT fk_refresh_tokens_user
    FOREIGN KEY (user_id) REFERENCES users (id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;
