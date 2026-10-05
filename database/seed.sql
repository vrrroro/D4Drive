-- =============================================================================
-- D4Drive seed data
--
-- Load after schema.sql.
--
-- Password hashes below are real Argon2id, not placeholders. Verify them by
-- signing in rather than by reading them.
--   admin@d4drive.in   D4Drive!Admin2026
--   ananya.k@fastmail.in   DemoRenter!2026
--
-- These are development credentials for a local database. Change them before
-- any deployment that is reachable from a network.
-- =============================================================================

SET NAMES utf8mb4;

-- -----------------------------------------------------------------------------
-- users
-- -----------------------------------------------------------------------------
INSERT INTO users (full_name, email, phone, password_hash, role, licence_number) VALUES
('Rohit Sampath', 'admin@d4drive.in', '9845112207',
 '$argon2id$v=19$m=19456,t=2,p=1$IhVTkSy31lYN7HVwA2VjIw$o7AjJWXJYCl6gmkEQ3uy2b9AeX9VaUWgOj2jw4zmw8o',
 'admin', NULL),
('Ananya Krishnan', 'ananya.k@fastmail.in', '9731408852',
 '$argon2id$v=19$m=19456,t=2,p=1$CHpPFHBOzO0VVoeUAFNCjA$fmjAbtTtbJxjdTgP1ArZ5Wi8iR6j/uL/lxJzXq6N1bQ',
 'customer', 'KA0320180004521');

-- -----------------------------------------------------------------------------
-- branches
--
-- Real Bengaluru coordinates. The Haversine distances between these three are
-- roughly: Indiranagar to Koramangala 4.6 km, Indiranagar to Whitefield 12.8 km,
-- Koramangala to Whitefield 15.4 km. That spread deliberately exercises every
-- delivery fee tier including the out-of-range rejection.
-- -----------------------------------------------------------------------------
INSERT INTO branches (name, address, city, latitude, longitude, phone) VALUES
('D4Drive Indiranagar', '412, 100 Feet Road, Indiranagar', 'Bengaluru', 12.971599, 77.641228, '8043120890'),
('D4Drive Koramangala', '78, 5th Block, Koramangala', 'Bengaluru', 12.934533, 77.626579, '8043120891'),
('D4Drive Whitefield', '22, Whitefield Main Road, Whitefield', 'Bengaluru', 12.969802, 77.749745, '8043120892');

-- -----------------------------------------------------------------------------
-- cars
--
-- Ten cars across the three branches. Day rates reflect the Indian
-- self-drive rental market rather than invented round numbers.
--
-- image_url is NULL for every car. No photograph of these specific cars has
-- been sourced, and DESIGN.md bans filling the gap with stock images or CSS
-- shapes, so the UI renders a labelled placeholder slot instead. To add a
-- photo, put the file in public/cars/ and set image_url to '/cars/<file>'.
--
-- The last entry is deactivated on purpose, so the soft-delete path has real
-- data to exercise and the catalog's is_active filter is actually tested.
-- -----------------------------------------------------------------------------
INSERT INTO cars
  (branch_id, brand, model, year, registration_no, fuel_type, transmission, seats, price_per_day, image_url, description, is_active)
VALUES
(1, 'Maruti Suzuki', 'Swift VXi', 2023, 'KA01MJ4417', 'petrol', 'manual', 5, 1650.00,
 NULL,
 'Light, quick through traffic, and easy to park. The default choice for a city weekend.', 1),

(1, 'Hyundai', 'Creta SX', 2024, 'KA01NP8823', 'diesel', 'automatic', 5, 3200.00,
 NULL,
 'Raised ride height and a torquey diesel. Comfortable on a long highway run.', 1),

(1, 'Tata', 'Nexon EV Max', 2024, 'KA01ND1195', 'electric', 'automatic', 5, 2950.00,
 NULL,
 'Roughly 400 km of real-world range. Delivered charged above ninety percent.', 1),

(2, 'Mahindra', 'Thar LX', 2023, 'KA05MR7702', 'diesel', 'manual', 4, 4100.00,
 NULL,
 'Four wheel drive, removable roof. Built for the road to Coorg, not the one to the office.', 1),

(2, 'Honda', 'City ZX', 2023, 'KA05MQ3348', 'petrol', 'automatic', 5, 2400.00,
 NULL,
 'A quiet sedan with a large boot. The airport run car.', 1),

(2, 'Toyota', 'Innova Crysta', 2022, 'KA05LT9061', 'diesel', 'manual', 7, 4600.00,
 NULL,
 'Seven full-size seats. Chosen most often for family trips and group travel.', 1),

(3, 'Kia', 'Seltos HTX', 2024, 'KA53NA2274', 'petrol', 'automatic', 5, 3050.00,
 NULL,
 'Well equipped mid-size crossover with a smooth automatic.', 1),

(3, 'MG', 'ZS EV Excite', 2023, 'KA53MW5530', 'electric', 'automatic', 5, 3400.00,
 NULL,
 'Silent, spacious, and cheap to run. Fast charging supported at partner points.', 1),

(3, 'Volkswagen', 'Virtus GT', 2024, 'KA53NB6618', 'petrol', 'manual', 5, 2850.00,
 NULL,
 'A turbocharged sedan with a firmer setup. The enthusiast option in the fleet.', 1),

(1, 'Renault', 'Kwid RXT', 2021, 'KA01KH2286', 'petrol', 'manual', 5, 1200.00,
 NULL,
 'Withdrawn from the fleet pending a service inspection.', 0);
