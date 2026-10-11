-- =============================================================================
-- D4Drive seed data
--
-- Load after schema.sql and routines.sql (npm run db:setup does all three).
-- At least ten meaningful rows in every table, so every query, report and
-- stored program has real data to work on.
--
-- Password hashes below are real Argon2id, not placeholders. Verify them by
-- signing in rather than by reading them.
--   admin@d4drive.in        D4Drive!Admin2026   (admin)
--   ops@d4drive.in          D4Drive!Ops2026     (admin)
--   ananya.k@fastmail.in    DemoRenter!2026     (customer)
--   every other customer    DemoRenter!2026
--
-- These are development credentials for a local database. Change them before
-- any deployment that is reachable from a network.
--
-- Booking dates are relative to the day the seed runs (CURDATE()), so the
-- data always has past rentals, rentals running now, and upcoming ones, and
-- the end-of-day close always has something to do.
-- =============================================================================

SET NAMES utf8mb4;

-- -----------------------------------------------------------------------------
-- branches (11: ten open, one not yet open)
--
-- Real Bengaluru localities and coordinates. The spread exercises every
-- delivery fee tier including the out-of-range refusal: Indiranagar to
-- Koramangala is about 4.4 km (free), Jayanagar to Indiranagar 7.3 km
-- (100 rupees), Koramangala to Whitefield 13.9 km (200 rupees), Hebbal to
-- Electronic City about 22 km (refused).
-- -----------------------------------------------------------------------------
INSERT INTO branches (name, address, city, pincode, latitude, longitude, phone, is_active) VALUES
('D4Drive Indiranagar',     '412, 100 Feet Road, Indiranagar',           'Bengaluru', '560038', 12.971599, 77.641228, '8043120890', 1),
('D4Drive Koramangala',     '78, 5th Block, Koramangala',                'Bengaluru', '560095', 12.934533, 77.626579, '8043120891', 1),
('D4Drive Whitefield',      '22, Whitefield Main Road, Whitefield',      'Bengaluru', '560066', 12.969802, 77.749745, '8043120892', 1),
('D4Drive HSR Layout',      '1187, 27th Main Road, Sector 1, HSR Layout', 'Bengaluru', '560102', 12.912100, 77.644700, '8043120893', 1),
('D4Drive Jayanagar',       '36, 11th Main Road, 4th Block, Jayanagar',  'Bengaluru', '560041', 12.925000, 77.593800, '8043120894', 1),
('D4Drive Malleshwaram',    '64, Sampige Road, Malleshwaram',            'Bengaluru', '560003', 13.003100, 77.570500, '8043120895', 1),
('D4Drive Hebbal',          '9, Bellary Road, Hebbal',                   'Bengaluru', '560024', 13.035800, 77.597000, '8043120896', 1),
('D4Drive Electronic City', '51, Hosur Road, Electronic City Phase 1',   'Bengaluru', '560100', 12.845200, 77.660200, '8043120897', 1),
('D4Drive Marathahalli',    '230, Outer Ring Road, Marathahalli',        'Bengaluru', '560037', 12.959200, 77.697400, '8043120898', 1),
('D4Drive JP Nagar',        '17, 24th Main Road, JP Nagar 2nd Phase',    'Bengaluru', '560078', 12.906300, 77.585700, '8043120899', 1),
('D4Drive Yelahanka',       '5, Doddaballapur Road, Yelahanka New Town', 'Bengaluru', '560064', 13.100700, 77.596300, '8043120900', 0);

-- -----------------------------------------------------------------------------
-- users (12: two admins, ten customers)
-- -----------------------------------------------------------------------------
INSERT INTO users (full_name, email, phone, password_hash, role, licence_number) VALUES
('Rohit Sampath', 'admin@d4drive.in', '9845112207',
 '$argon2id$v=19$m=19456,t=2,p=1$IhVTkSy31lYN7HVwA2VjIw$o7AjJWXJYCl6gmkEQ3uy2b9AeX9VaUWgOj2jw4zmw8o',
 'admin', NULL),
('Ananya Krishnan', 'ananya.k@fastmail.in', '9731408852',
 '$argon2id$v=19$m=19456,t=2,p=1$CHpPFHBOzO0VVoeUAFNCjA$fmjAbtTtbJxjdTgP1ArZ5Wi8iR6j/uL/lxJzXq6N1bQ',
 'customer', 'KA0320180004521'),
('Karthik Raghunathan', 'karthik.raghu@fastmail.in', '9880234517',
 '$argon2id$v=19$m=19456,t=2,p=1$8wDRjq3I8OT6YOtqJhZzpw$ykzz3h97dWEOfbn3OfKXwN2UBMqMGhQ38bf8Rh5uU4w',
 'customer', 'KA0120150019873'),
('Priya Venkatesh', 'priya.venkatesh@fastmail.in', '9741156602',
 '$argon2id$v=19$m=19456,t=2,p=1$vZFniBnzag5oTUPApdKXmA$aU+RgJylKHYP0A7XmBuP5PK/EfjZsjsGW6n4lE9k1qM',
 'customer', 'KA0520170008841'),
('Arjun Hegde', 'arjun.hegde@fastmail.in', '9902817734',
 '$argon2id$v=19$m=19456,t=2,p=1$yYczKmzTMgNAcO+7SJ6R/A$fJACpsE6Qm23XyRqdURZUYwtlTO4hDj27u7wxC1z8as',
 'customer', 'KA1920190031156'),
('Sneha Gowda', 'sneha.gowda@fastmail.in', '9164420398',
 '$argon2id$v=19$m=19456,t=2,p=1$QB9z6cNaYValv+tvy3Krfg$lgbLNQL0RgyDxNwFAtabpc7SrnG7tnIn6vJXN9UCNVg',
 'customer', 'KA0420200012207'),
('Vikram Shetty', 'vikram.shetty@fastmail.in', '9008345561',
 '$argon2id$v=19$m=19456,t=2,p=1$Ve7hz1KWyQ8Pvb8J10tPKg$M3dpIWOBiK3KlDOQCBAu8AMsWvfYDsNlDkBKT+9gBPQ',
 'customer', 'KA2020160027419'),
('Divya Nair', 'divya.nair@fastmail.in', '8971203346',
 '$argon2id$v=19$m=19456,t=2,p=1$86IgHOoCLZWk832s58mwQg$0j1CM1nTnFnpkXc1aWAXJcJS6XS0nrwlbv/Y9wcQcJI',
 'customer', 'KL0720180044312'),
('Rahul Bhat', 'rahul.bhat@fastmail.in', '9448876120',
 '$argon2id$v=19$m=19456,t=2,p=1$1UdMSzhhJff0F/vW37uXhQ$d6zTFEtKl+z4hnhAiDtbOvDtM/rwks+AtNaBHHMTRtk',
 'customer', 'KA0220140006653'),
('Lakshmi Prasad', 'lakshmi.prasad@fastmail.in', '9620045718',
 '$argon2id$v=19$m=19456,t=2,p=1$74Ai7inLfe/QtBDwv3nrYw$XLzgPWyXdM71pq3WA6ctsl6phgPi0Z/pV/PFWs6nXLo',
 'customer', 'TN0920190052286'),
('Farhan Ahmed', 'farhan.ahmed@fastmail.in', '7899312054',
 '$argon2id$v=19$m=19456,t=2,p=1$/DfxKNjgIyY/++0dZ8FeAQ$+pPN006UkId/jSoRUMKbHgWfKr6fdSGSHC0ghSrjlwg',
 'customer', NULL),
('Meera Iyer', 'ops@d4drive.in', '9845307719',
 '$argon2id$v=19$m=19456,t=2,p=1$54PMewt6LCwNr/YWXtuxbg$pp+zdeD1ePr1VGeZQ4xCLB8u5m0i1ppeUVkBYqL4h3c',
 'admin', NULL);

-- -----------------------------------------------------------------------------
-- cars (10: nine in the fleet, one withdrawn)
--
-- Day rates reflect the Bengaluru rental market rather than invented round
-- numbers. image_url points at a studio composite in public/cars/ (see
-- scripts/fleet-photos/; credits in public/cars/credits.json and on /credits).
--
-- The Kwid is withdrawn on purpose, so the soft-delete path has real data and
-- the catalog's is_active filter is actually tested.
-- -----------------------------------------------------------------------------
INSERT INTO cars
  (branch_id, brand, model, year, registration_no, fuel_type, transmission, seats, price_per_day, image_url, description, is_active)
VALUES
(1, 'Maruti Suzuki', 'Swift VXi', 2023, 'KA01MJ4417', 'petrol', 'manual', 5, 1650.00,
 '/cars/maruti-suzuki-swift.webp',
 'Light, quick through traffic, and easy to park. The default choice for a city weekend.', 1),

(4, 'Hyundai', 'Creta SX', 2024, 'KA01NP8823', 'diesel', 'automatic', 5, 3200.00,
 '/cars/hyundai-creta.webp',
 'Raised ride height and a torquey diesel. Comfortable on a long highway run.', 1),

(1, 'Tata', 'Nexon EV Max', 2024, 'KA01ND1195', 'electric', 'automatic', 5, 2950.00,
 '/cars/tata-nexon-ev.webp',
 'Roughly 400 km of real-world range. Delivered charged above ninety percent.', 1),

(2, 'Mahindra', 'Thar LX', 2023, 'KA05MR7702', 'diesel', 'manual', 4, 4100.00,
 '/cars/mahindra-thar.webp',
 'Four wheel drive, removable roof. Built for the road to Coorg, not the one to the office.', 1),

(5, 'Honda', 'City ZX', 2023, 'KA05MQ3348', 'petrol', 'automatic', 5, 2400.00,
 '/cars/honda-city.webp',
 'A quiet sedan with a large boot. The airport run car.', 1),

(7, 'Toyota', 'Innova Crysta', 2022, 'KA05LT9061', 'diesel', 'manual', 7, 4600.00,
 '/cars/toyota-innova-crysta.webp',
 'Seven full-size seats. Chosen most often for family trips and group travel.', 1),

(3, 'Kia', 'Seltos HTX', 2024, 'KA53NA2274', 'petrol', 'automatic', 5, 3050.00,
 '/cars/kia-seltos.webp',
 'Well equipped mid-size crossover with a smooth automatic.', 1),

(9, 'MG', 'ZS EV Excite', 2023, 'KA53MW5530', 'electric', 'automatic', 5, 3400.00,
 '/cars/mg-zs-ev.webp',
 'Silent, spacious, and cheap to run. Fast charging supported at partner points.', 1),

(6, 'Volkswagen', 'Virtus GT', 2024, 'KA53NB6618', 'petrol', 'manual', 5, 2850.00,
 '/cars/volkswagen-virtus-gt.webp',
 'A turbocharged sedan with a firmer setup. The enthusiast option in the fleet.', 1),

(8, 'Renault', 'Kwid RXT', 2021, 'KA01KH2286', 'petrol', 'manual', 5, 1200.00,
 '/cars/renault-kwid.webp',
 'Withdrawn from the fleet pending a service inspection.', 0);

-- -----------------------------------------------------------------------------
-- bookings (14)
--
-- Amounts satisfy the table's CHECKs: rental = days x rate, total = rental +
-- fee. Doorstep distances are the Haversine distance from the car's branch to
-- the address below, worked out by fn_haversine_km's own formula, and the fee
-- is that distance's tier.
--
-- Each booking is inserted as booked (confirmed, or pending for one still
-- awaiting payment); the status changes further down are real UPDATEs, so the
-- triggers write the history and the refunds exactly as they do in the app.
-- -----------------------------------------------------------------------------
SET @d4d_actor_id = NULL, @d4d_reason = 'booked online';

INSERT INTO bookings
  (reference, user_id, car_id, start_date, end_date, days, rate_per_day,
   rental_amount, delivery_fee, total_amount, status, created_at)
VALUES
('D4K7QM2XPA',  2, 1, CURDATE() - INTERVAL 60 DAY, CURDATE() - INTERVAL 57 DAY, 3, 1650.00,  4950.00,   0.00,  4950.00, 'confirmed', NOW() - INTERVAL 68 DAY),
('D4T9HV3WNC',  3, 4, CURDATE() - INTERVAL 45 DAY, CURDATE() - INTERVAL 40 DAY, 5, 4100.00, 20500.00,   0.00, 20500.00, 'confirmed', NOW() - INTERVAL 52 DAY),
('D4M2RB8KDE',  4, 6, CURDATE() - INTERVAL 30 DAY, CURDATE() - INTERVAL 26 DAY, 4, 4600.00, 18400.00, 100.00, 18500.00, 'confirmed', NOW() - INTERVAL 41 DAY),
('D4P5XJ6LQF',  5, 2, CURDATE() - INTERVAL 20 DAY, CURDATE() - INTERVAL 18 DAY, 2, 3200.00,  6400.00,   0.00,  6400.00, 'confirmed', NOW() - INTERVAL 30 DAY),
('D4W8NC4GTH',  6, 5, CURDATE() - INTERVAL 12 DAY, CURDATE() - INTERVAL 9 DAY,  3, 2400.00,  7200.00, 100.00,  7300.00, 'confirmed', NOW() - INTERVAL 19 DAY),
('D4R3KZ7MVJ',  7, 7, CURDATE() - INTERVAL 3 DAY,  CURDATE() + INTERVAL 2 DAY,  5, 3050.00, 15250.00,   0.00, 15250.00, 'confirmed', NOW() - INTERVAL 11 DAY),
('D4H6YP2BXK',  8, 8, CURDATE() - INTERVAL 1 DAY,  CURDATE() + INTERVAL 3 DAY,  4, 3400.00, 13600.00, 200.00, 13800.00, 'confirmed', NOW() - INTERVAL 6 DAY),
('D4C9LT5QRM',  9, 3, CURDATE() + INTERVAL 2 DAY,  CURDATE() + INTERVAL 5 DAY,  3, 2950.00,  8850.00,   0.00,  8850.00, 'confirmed', NOW() - INTERVAL 4 DAY),
('D4F4VW8HNP',  2, 9, CURDATE() + INTERVAL 5 DAY,  CURDATE() + INTERVAL 7 DAY,  2, 2850.00,  5700.00,   0.00,  5700.00, 'confirmed', NOW() - INTERVAL 3 DAY),
('D4J7QD3ZSR', 10, 1, CURDATE() + INTERVAL 7 DAY,  CURDATE() + INTERVAL 10 DAY, 3, 1650.00,  4950.00,   0.00,  4950.00, 'confirmed', NOW() - INTERVAL 2 DAY),
('D4N2GX9KTU',  4, 6, CURDATE() + INTERVAL 10 DAY, CURDATE() + INTERVAL 14 DAY, 4, 4600.00, 18400.00,   0.00, 18400.00, 'pending',   NOW() - INTERVAL 1 DAY),
('D4Q8BM4FWV',  3, 2, CURDATE() + INTERVAL 14 DAY, CURDATE() + INTERVAL 16 DAY, 2, 3200.00,  6400.00,   0.00,  6400.00, 'confirmed', NOW() - INTERVAL 2 DAY),
('D4V5HR7CXY',  5, 5, CURDATE() - INTERVAL 2 DAY,  CURDATE(),                   2, 2400.00,  4800.00,   0.00,  4800.00, 'confirmed', NOW() - INTERVAL 9 DAY),
('D4Z3KN6PDA',  6, 9, CURDATE(),                   CURDATE() + INTERVAL 2 DAY,  2, 2850.00,  5700.00,   0.00,  5700.00, 'confirmed', NOW() - INTERVAL 5 DAY);

-- -----------------------------------------------------------------------------
-- deliveries (14, one per booking)
--
-- Doorstep addresses are real Bengaluru localities with invented door numbers.
-- Self-pickup names the collecting branch; D4W8NC4GTH collects a Jayanagar car
-- at Indiranagar, 7.3 km away, which is why it carries a 100 rupee fee.
-- -----------------------------------------------------------------------------
INSERT INTO deliveries
  (booking_id, mode, pickup_branch_id, address_line, city, pincode, latitude, longitude, distance_km, status, scheduled_at)
SELECT b.id, x.mode, x.pickup_branch_id, x.address_line, x.city, x.pincode, x.latitude, x.longitude,
       x.distance_km, 'pending', TIMESTAMP(b.start_date, '09:00:00')
  FROM bookings b
  JOIN (
    SELECT 'D4K7QM2XPA' AS reference, 'self_pickup' AS mode, 1 AS pickup_branch_id, NULL AS address_line, NULL AS city, NULL AS pincode, NULL AS latitude, NULL AS longitude, 0.00 AS distance_km
    UNION ALL SELECT 'D4T9HV3WNC', 'doorstep', NULL, '14, 3rd Cross, BTM Layout 2nd Stage', 'Bengaluru', '560076', 12.916600, 77.610100, 2.68
    UNION ALL SELECT 'D4M2RB8KDE', 'doorstep', NULL, 'Flat 302, Brigade Gateway, Rajajinagar', 'Bengaluru', '560055', 12.991500, 77.554800, 6.72
    UNION ALL SELECT 'D4P5XJ6LQF', 'doorstep', NULL, '88, 1st Main Road, Bellandur', 'Bengaluru', '560103', 12.925800, 77.676200, 3.74
    UNION ALL SELECT 'D4W8NC4GTH', 'self_pickup', 1, NULL, NULL, NULL, NULL, NULL, 7.30
    UNION ALL SELECT 'D4R3KZ7MVJ', 'doorstep', NULL, 'B-1104, Prestige Shantiniketan, ITPL Road', 'Bengaluru', '560048', 12.991200, 77.728600, 3.30
    UNION ALL SELECT 'D4H6YP2BXK', 'doorstep', NULL, '17, 9th Main Road, Jayanagar 3rd Block', 'Bengaluru', '560011', 12.929900, 77.582600, 12.86
    UNION ALL SELECT 'D4C9LT5QRM', 'doorstep', NULL, '6, 80 Feet Road, HAL 3rd Stage', 'Bengaluru', '560075', 12.967900, 77.655500, 1.60
    UNION ALL SELECT 'D4F4VW8HNP', 'self_pickup', 6, NULL, NULL, NULL, NULL, NULL, 0.00
    UNION ALL SELECT 'D4J7QD3ZSR', 'self_pickup', 1, NULL, NULL, NULL, NULL, NULL, 0.00
    UNION ALL SELECT 'D4N2GX9KTU', 'self_pickup', 7, NULL, NULL, NULL, NULL, NULL, 0.00
    UNION ALL SELECT 'D4Q8BM4FWV', 'self_pickup', 4, NULL, NULL, NULL, NULL, NULL, 0.00
    UNION ALL SELECT 'D4V5HR7CXY', 'self_pickup', 5, NULL, NULL, NULL, NULL, NULL, 0.00
    UNION ALL SELECT 'D4Z3KN6PDA', 'self_pickup', 6, NULL, NULL, NULL, NULL, NULL, 0.00
  ) x ON x.reference = b.reference;

-- -----------------------------------------------------------------------------
-- payments (14, one per booking; simulated)
--
-- Card payments keep the last four digits only. The pending booking has a
-- pending payment and no paid_at.
-- -----------------------------------------------------------------------------
INSERT INTO payments
  (booking_id, amount, method, status, reference, card_last_four, upi_handle, paid_at, created_at)
SELECT b.id, b.total_amount, x.method,
       IF(b.status = 'pending', 'pending', 'paid'),
       CONCAT('MOCK', b.reference), x.card_last_four, x.upi_handle,
       IF(b.status = 'pending', NULL, b.created_at),
       b.created_at
  FROM bookings b
  JOIN (
    SELECT 'D4K7QM2XPA' AS reference, 'card' AS method, '4417' AS card_last_four, NULL AS upi_handle
    UNION ALL SELECT 'D4T9HV3WNC', 'upi',  NULL,   'karthik.raghu@okhdfcbank'
    UNION ALL SELECT 'D4M2RB8KDE', 'card', '9032', NULL
    UNION ALL SELECT 'D4P5XJ6LQF', 'card', '1186', NULL
    UNION ALL SELECT 'D4W8NC4GTH', 'upi',  NULL,   'sneha.gowda@oksbi'
    UNION ALL SELECT 'D4R3KZ7MVJ', 'card', '7720', NULL
    UNION ALL SELECT 'D4H6YP2BXK', 'upi',  NULL,   'divya.nair@okaxis'
    UNION ALL SELECT 'D4C9LT5QRM', 'card', '3358', NULL
    UNION ALL SELECT 'D4F4VW8HNP', 'upi',  NULL,   'ananya.k@okicici'
    UNION ALL SELECT 'D4J7QD3ZSR', 'upi',  NULL,   'lakshmi.p@ybl'
    UNION ALL SELECT 'D4N2GX9KTU', 'card', '6604', NULL
    UNION ALL SELECT 'D4Q8BM4FWV', 'upi',  NULL,   'karthik.raghu@okhdfcbank'
    UNION ALL SELECT 'D4V5HR7CXY', 'card', '2291', NULL
    UNION ALL SELECT 'D4Z3KN6PDA', 'upi',  NULL,   'sneha.gowda@oksbi'
  ) x ON x.reference = b.reference;

-- -----------------------------------------------------------------------------
-- Booking lifecycles, as real UPDATEs (the triggers write the history).
-- The actor is the staff member or customer who made the change.
-- -----------------------------------------------------------------------------

-- Cars handed over: rentals that have started.
SET @d4d_actor_id = 12, @d4d_reason = 'rental started';
UPDATE bookings SET status = 'active'
 WHERE reference IN ('D4K7QM2XPA', 'D4T9HV3WNC', 'D4M2RB8KDE', 'D4W8NC4GTH',
                     'D4R3KZ7MVJ', 'D4H6YP2BXK', 'D4V5HR7CXY');

UPDATE deliveries d JOIN bookings b ON b.id = d.booking_id
   SET d.status = 'delivered'
 WHERE b.status = 'active';

-- Rentals that came back.
SET @d4d_actor_id = 12, @d4d_reason = 'rental returned';
UPDATE bookings SET status = 'completed'
 WHERE reference IN ('D4K7QM2XPA', 'D4T9HV3WNC', 'D4M2RB8KDE', 'D4W8NC4GTH');

UPDATE deliveries d JOIN bookings b ON b.id = d.booking_id
   SET d.status = 'returned'
 WHERE b.status = 'completed';

-- Two cancellations by the customers themselves. trg_bookings_au_refund
-- refunds each payment.
SET @d4d_actor_id = 5, @d4d_reason = 'cancelled by customer';
UPDATE bookings SET status = 'cancelled' WHERE reference = 'D4P5XJ6LQF';
SET @d4d_actor_id = 3, @d4d_reason = 'cancelled by customer';
UPDATE bookings SET status = 'cancelled' WHERE reference = 'D4Q8BM4FWV';

SET @d4d_actor_id = NULL, @d4d_reason = NULL;

-- -----------------------------------------------------------------------------
-- Backdating, seed only. The triggers above stamped everything with the time
-- the seed ran; these move each stamp to when it would really have happened,
-- so reports by date read true. The application never edits history.
-- -----------------------------------------------------------------------------
UPDATE booking_status_log l
  JOIN bookings b ON b.id = l.booking_id
   SET l.changed_at = CASE
         WHEN l.from_status IS NULL     THEN b.created_at
         WHEN l.to_status = 'active'    THEN TIMESTAMP(b.start_date, '09:40:00')
         WHEN l.to_status = 'completed' THEN TIMESTAMP(b.end_date, '18:15:00')
         WHEN l.to_status = 'cancelled' THEN b.created_at + INTERVAL 1 DAY
         ELSE l.changed_at
       END;

UPDATE deliveries d
  JOIN bookings b ON b.id = d.booking_id
   SET d.delivered_at = TIMESTAMP(b.start_date, '09:40:00')
 WHERE d.status IN ('delivered', 'returned');

UPDATE payments p
  JOIN bookings b ON b.id = p.booking_id
   SET p.refunded_at = b.created_at + INTERVAL 1 DAY
 WHERE p.status = 'refunded';

-- -----------------------------------------------------------------------------
-- refresh_tokens (16)
--
-- Session history: rotated chains (each revoked row names its successor),
-- sessions that ended at sign-out, and some that simply expired. The jtis are
-- random and no token was ever signed for them, so none can be used. The six
-- expired more than a day ago are what sp_end_of_day_close purges; ten remain.
-- -----------------------------------------------------------------------------
INSERT INTO refresh_tokens (jti, user_id, expires_at, revoked_at, replaced_by, created_at) VALUES
('683c7e93-f1e2-4c4e-9e91-68ed057ea793',  2, NOW() - INTERVAL 61 DAY, NOW() - INTERVAL 67 DAY, '36740c04-8667-4566-8ee4-b0efa1a27610', NOW() - INTERVAL 68 DAY),
('36740c04-8667-4566-8ee4-b0efa1a27610',  2, NOW() - INTERVAL 60 DAY, NOW() - INTERVAL 66 DAY, NULL,                                   NOW() - INTERVAL 67 DAY),
('1f101bcf-1234-4bac-834e-6b178da57bff',  3, NOW() - INTERVAL 45 DAY, NULL,                    NULL,                                   NOW() - INTERVAL 52 DAY),
('8a2e12fe-c3ca-41a7-a9f2-b6f3910c7795',  4, NOW() - INTERVAL 34 DAY, NOW() - INTERVAL 41 DAY, NULL,                                   NOW() - INTERVAL 41 DAY),
('901c3fd9-a9f1-4e14-9d2d-674d5d63b161',  6, NOW() - INTERVAL 12 DAY, NULL,                    NULL,                                   NOW() - INTERVAL 19 DAY),
('def2b9fc-77c2-4b7d-a44d-78c92a22983e',  7, NOW() - INTERVAL 4 DAY,  NOW() - INTERVAL 10 DAY, '4ee71015-b264-4bcc-86c0-cd461747ec6a', NOW() - INTERVAL 11 DAY),
('4ee71015-b264-4bcc-86c0-cd461747ec6a',  7, NOW() + INTERVAL 3 DAY,  NOW() - INTERVAL 2 DAY,  NULL,                                   NOW() - INTERVAL 4 DAY),
('53e432d9-ca95-473a-9634-00176cbf7b37',  8, NOW() + INTERVAL 1 DAY,  NULL,                    NULL,                                   NOW() - INTERVAL 6 DAY),
('bffd3dc4-cecd-4bbb-9286-3d9f8ef87618',  9, NOW() + INTERVAL 3 DAY,  NOW() - INTERVAL 4 DAY,  'f5e29367-b58f-46c2-b0d3-68f8493d5346', NOW() - INTERVAL 4 DAY),
('f5e29367-b58f-46c2-b0d3-68f8493d5346',  9, NOW() + INTERVAL 4 DAY,  NOW() - INTERVAL 3 DAY,  NULL,                                   NOW() - INTERVAL 4 DAY),
('3ac632fc-1c08-46b7-9f1b-a3a00f6c9df9', 12, NOW() + INTERVAL 5 DAY,  NULL,                    NULL,                                   NOW() - INTERVAL 2 DAY),
('7ce7b974-c368-4f82-8ea5-629d20debb87',  1, NOW() + INTERVAL 6 DAY,  NOW() - INTERVAL 1 DAY,  NULL,                                   NOW() - INTERVAL 1 DAY),
('c7f254fa-c8b3-430b-8602-cfb2e61beb86', 10, NOW() + INTERVAL 5 DAY,  NOW() - INTERVAL 2 DAY,  '46f9328f-5343-48c5-8c9e-733d32e2c517', NOW() - INTERVAL 2 DAY),
('46f9328f-5343-48c5-8c9e-733d32e2c517', 10, NOW() + INTERVAL 6 DAY,  NULL,                    NULL,                                   NOW() - INTERVAL 2 DAY),
('801600ec-befe-4b07-b4ff-5ee3aff4bb4d',  5, NOW() + INTERVAL 2 DAY,  NOW() - INTERVAL 1 DAY,  NULL,                                   NOW() - INTERVAL 5 DAY),
('eefa0bf0-5f14-4e69-ae06-613c467baff7', 11, NOW() + INTERVAL 6 DAY,  NULL,                    NULL,                                   NOW() - INTERVAL 1 DAY);
