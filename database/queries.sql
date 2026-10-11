-- =============================================================================
-- D4Drive queries
--
-- The questions the business asks of its data. Each one is a named block the
-- admin Reports page (/admin/reports) reads from this very file and runs, so
-- what is written here is exactly what executes. None takes a parameter, so
-- every block also runs as-is in the mysql client or Workbench.
--
-- Block format, read by lib/services/reports.ts:
--   -- name:    the key the page asks for
--   -- title:   the heading on the page
--   -- purpose: why anyone needs the answer
--   -- uses:    the SQL features it demonstrates
--
-- The application runs many more queries of its own (catalog filters, the
-- dashboard tiles, sign-in, the booking view); docs/DATABASE.md lists them.
-- =============================================================================

-- name: revenue_by_branch
-- title: Revenue by branch
-- purpose: Which branches earn, and how much was handed back in refunds. Money counts only payments actually collected.
-- uses: LEFT JOIN across four tables, GROUP BY, SUM over CASE (conditional aggregation)
SELECT br.name                                                         AS branch,
       COUNT(DISTINCT bo.id)                                           AS bookings,
       COALESCE(SUM(CASE WHEN p.status = 'paid' THEN p.amount END), 0)     AS revenue,
       COALESCE(SUM(CASE WHEN p.status = 'refunded' THEN p.amount END), 0) AS refunded
  FROM branches br
  LEFT JOIN cars c      ON c.branch_id = br.id
  LEFT JOIN bookings bo ON bo.car_id = c.id
  LEFT JOIN payments p  ON p.booking_id = bo.id
 WHERE br.is_active = 1
 GROUP BY br.id, br.name
 ORDER BY revenue DESC, br.name;

-- name: monthly_revenue
-- title: Revenue by month
-- purpose: The last six months of collected money, for the trend.
-- uses: DATE_FORMAT, date arithmetic, WHERE before GROUP BY, ORDER BY
SELECT DATE_FORMAT(p.paid_at, '%Y-%m') AS month,
       COUNT(*)                        AS payments,
       SUM(p.amount)                   AS revenue
  FROM payments p
 WHERE p.status = 'paid'
   AND p.paid_at >= CURDATE() - INTERVAL 6 MONTH
 GROUP BY month
 ORDER BY month;

-- name: car_rank_in_branch
-- title: Best earner at each branch
-- purpose: Ranks every car against the others at its own branch, so a branch manager knows what to keep on the road.
-- uses: derived table (subquery in FROM), window function RANK() OVER (PARTITION BY ... ORDER BY ...)
SELECT branch,
       car,
       revenue,
       RANK() OVER (PARTITION BY branch ORDER BY revenue DESC) AS rank_in_branch
  FROM (SELECT br.name                         AS branch,
               CONCAT(c.brand, ' ', c.model)   AS car,
               COALESCE(SUM(CASE WHEN p.status = 'paid' THEN p.amount END), 0) AS revenue
          FROM cars c
          JOIN branches br      ON br.id = c.branch_id
          LEFT JOIN bookings bo ON bo.car_id = c.id
          LEFT JOIN payments p  ON p.booking_id = bo.id
         WHERE c.is_active = 1
         GROUP BY c.id, br.name, c.brand, c.model) AS per_car
 ORDER BY branch, rank_in_branch;

-- name: refunds
-- title: Refunds issued
-- purpose: Every refund the cancellation trigger has made, newest first.
-- uses: three-table JOIN, filter on an ENUM, ORDER BY a nullable timestamp
SELECT b.reference,
       u.full_name AS customer,
       p.amount,
       p.method,
       p.refunded_at
  FROM payments p
  JOIN bookings b ON b.id = p.booking_id
  JOIN users u    ON u.id = b.user_id
 WHERE p.status = 'refunded'
 ORDER BY p.refunded_at DESC;

-- name: fleet_utilisation
-- title: Fleet utilisation, last 90 days
-- purpose: How many of the last 90 days each car spent out on hire. Low numbers are cars to move to a busier branch.
-- uses: LEFT JOIN with a condition in ON, GREATEST/LEAST/DATEDIFF to clip each rental to the window, ROUND, GROUP BY
SELECT CONCAT(c.brand, ' ', c.model) AS car,
       br.name                       AS branch,
       COALESCE(SUM(GREATEST(0, DATEDIFF(LEAST(bo.end_date, CURDATE()),
                                         GREATEST(bo.start_date, CURDATE() - INTERVAL 90 DAY)))), 0) AS days_on_hire,
       ROUND(100 * COALESCE(SUM(GREATEST(0, DATEDIFF(LEAST(bo.end_date, CURDATE()),
                                         GREATEST(bo.start_date, CURDATE() - INTERVAL 90 DAY)))), 0) / 90, 1) AS utilisation_pct
  FROM cars c
  JOIN branches br      ON br.id = c.branch_id
  LEFT JOIN bookings bo ON bo.car_id = c.id AND bo.status IN ('active', 'completed')
 WHERE c.is_active = 1
 GROUP BY c.id, c.brand, c.model, br.name
 ORDER BY utilisation_pct DESC, car;

-- name: cars_never_booked
-- title: Cars nobody has booked
-- purpose: Candidates for a price change, a move, or (if entered by mistake) a permanent delete, which the foreign key allows only for these.
-- uses: LEFT JOIN ... WHERE right side IS NULL (anti-join)
SELECT CONCAT(c.brand, ' ', c.model) AS car,
       c.registration_no,
       br.name                       AS branch,
       IF(c.is_active = 1, 'In the fleet', 'Withdrawn') AS state
  FROM cars c
  JOIN branches br      ON br.id = c.branch_id
  LEFT JOIN bookings bo ON bo.car_id = c.id
 WHERE bo.id IS NULL
 ORDER BY car;

-- name: cancellation_rate
-- title: Cancellations by car
-- purpose: A car that is cancelled often may be priced or described wrongly.
-- uses: SUM over a boolean expression, percentage arithmetic, GROUP BY, multi-key ORDER BY
SELECT CONCAT(c.brand, ' ', c.model)                        AS car,
       COUNT(bo.id)                                         AS bookings,
       SUM(bo.status = 'cancelled')                         AS cancelled,
       ROUND(100 * SUM(bo.status = 'cancelled') / COUNT(bo.id), 1) AS cancel_pct
  FROM cars c
  JOIN bookings bo ON bo.car_id = c.id
 GROUP BY c.id, c.brand, c.model
 ORDER BY cancel_pct DESC, bookings DESC, car;

-- name: by_fuel_type
-- title: Rentals by fuel type
-- purpose: Whether electric cars are hired for shorter trips than petrol and diesel ones.
-- uses: GROUP BY an ENUM, AVG, ROUND, IN list
SELECT c.fuel_type,
       COUNT(bo.id)                AS rentals,
       ROUND(AVG(bo.days), 1)      AS avg_days,
       ROUND(AVG(bo.total_amount)) AS avg_value
  FROM cars c
  JOIN bookings bo ON bo.car_id = c.id
 WHERE bo.status IN ('confirmed', 'active', 'completed')
 GROUP BY c.fuel_type
 ORDER BY rentals DESC;

-- name: price_bands
-- title: The fleet by day rate
-- purpose: How the fleet spreads across price points, for the catalog filters.
-- uses: CASE expression as a grouping key, MIN, MAX, ORDER BY an aggregate
SELECT CASE
         WHEN price_per_day < 2000 THEN 'Under 2,000'
         WHEN price_per_day < 3000 THEN '2,000 to 2,999'
         WHEN price_per_day < 4000 THEN '3,000 to 3,999'
         ELSE '4,000 and up'
       END                AS band,
       COUNT(*)           AS cars,
       MIN(price_per_day) AS lowest,
       MAX(price_per_day) AS highest
  FROM cars
 WHERE is_active = 1
 GROUP BY band
 ORDER BY MIN(price_per_day);

-- name: collection_points
-- title: Branches with no car of their own
-- purpose: Branches that only hand over cars driven in from elsewhere. Every one of these collections carries a distance fee.
-- uses: NOT IN with a subquery
SELECT br.name,
       br.address,
       br.phone
  FROM branches br
 WHERE br.is_active = 1
   AND br.id NOT IN (SELECT c.branch_id FROM cars c WHERE c.is_active = 1)
 ORDER BY br.name;

-- name: top_customers
-- title: Top customers
-- purpose: The five customers who have spent the most, counting collected payments only.
-- uses: JOIN with a condition in ON, GROUP BY, HAVING, ORDER BY an aggregate, LIMIT
SELECT u.full_name     AS customer,
       COUNT(bo.id)    AS bookings,
       SUM(p.amount)   AS spent
  FROM users u
  JOIN bookings bo ON bo.user_id = u.id
  JOIN payments p  ON p.booking_id = bo.id AND p.status = 'paid'
 GROUP BY u.id, u.full_name
HAVING SUM(p.amount) > 0
 ORDER BY spent DESC
 LIMIT 5;

-- name: repeat_customers
-- title: Customers who came back
-- purpose: Everyone with two or more rentals that went ahead.
-- uses: correlated subquery, in the SELECT list and in WHERE
SELECT u.full_name AS customer,
       (SELECT COUNT(*) FROM bookings b
         WHERE b.user_id = u.id AND b.status <> 'cancelled') AS rentals
  FROM users u
 WHERE u.role = 'customer'
   AND (SELECT COUNT(*) FROM bookings b
         WHERE b.user_id = u.id AND b.status <> 'cancelled') >= 2
 ORDER BY rentals DESC, customer;

-- name: customers_never_booked
-- title: Signed up, never booked
-- purpose: Accounts that have not made a booking yet, oldest first.
-- uses: NOT EXISTS with a correlated subquery
SELECT u.full_name AS customer,
       u.email,
       u.created_at AS joined
  FROM users u
 WHERE u.role = 'customer'
   AND NOT EXISTS (SELECT 1 FROM bookings bo WHERE bo.user_id = u.id)
 ORDER BY u.created_at;

-- name: bookings_above_average
-- title: Bookings worth more than average
-- purpose: The larger rentals, against the average of every booking that went ahead.
-- uses: scalar subquery in WHERE and in the SELECT list, AVG
SELECT bo.reference,
       CONCAT(c.brand, ' ', c.model) AS car,
       bo.days,
       bo.total_amount,
       ROUND((SELECT AVG(total_amount) FROM bookings WHERE status <> 'cancelled'), 2) AS average
  FROM bookings bo
  JOIN cars c ON c.id = bo.car_id
 WHERE bo.status <> 'cancelled'
   AND bo.total_amount > (SELECT AVG(total_amount) FROM bookings WHERE status <> 'cancelled')
 ORDER BY bo.total_amount DESC;

-- name: status_breakdown
-- title: Bookings by status
-- purpose: Where every booking is in its life, as counts and shares.
-- uses: GROUP BY, window function SUM(COUNT(*)) OVER () for the share, ORDER BY FIELD
SELECT status,
       COUNT(*)                                          AS bookings,
       ROUND(100 * COUNT(*) / SUM(COUNT(*)) OVER (), 1)  AS share_pct
  FROM bookings
 GROUP BY status
 ORDER BY FIELD(status, 'pending', 'confirmed', 'active', 'completed', 'cancelled');

-- name: delivery_modes
-- title: Doorstep against collection
-- purpose: How customers take their cars, how far doorstep deliveries travel, and what the distance fees bring in.
-- uses: JOIN, GROUP BY, AVG, MAX, SUM, ROUND
SELECT d.mode,
       COUNT(*)                    AS bookings,
       ROUND(AVG(d.distance_km), 2) AS avg_km,
       MAX(d.distance_km)          AS max_km,
       SUM(bo.delivery_fee)        AS fees
  FROM deliveries d
  JOIN bookings bo ON bo.id = d.booking_id
 WHERE bo.status <> 'cancelled'
 GROUP BY d.mode
 ORDER BY bookings DESC;

-- name: handovers_next_7_days
-- title: Handovers in the next seven days
-- purpose: The dispatch list: who gets which car, when, and where.
-- uses: the view v_booking_details, BETWEEN on dates, IF and COALESCE, CONCAT
SELECT v.start_date,
       v.reference,
       v.customer_name                AS customer,
       CONCAT(v.brand, ' ', v.model)  AS car,
       IF(v.delivery_mode = 'doorstep',
          v.address_line,
          CONCAT('Collect at ', COALESCE(v.pickup_branch, v.home_branch))) AS handover
  FROM v_booking_details v
 WHERE v.status IN ('pending', 'confirmed')
   AND v.start_date BETWEEN CURDATE() AND CURDATE() + INTERVAL 7 DAY
 ORDER BY v.start_date, v.reference;

-- name: recent_history
-- title: Latest status changes
-- purpose: The audit trail the triggers write: every booking created, started, completed or cancelled, by whom and why.
-- uses: JOIN plus LEFT JOIN (the actor may be gone), COALESCE, ORDER BY with a tiebreak, LIMIT
SELECT l.changed_at,
       b.reference,
       COALESCE(l.from_status, 'new') AS from_status,
       l.to_status,
       l.reason,
       COALESCE(u.full_name, 'system') AS actor
  FROM booking_status_log l
  JOIN bookings b    ON b.id = l.booking_id
  LEFT JOIN users u  ON u.id = l.actor_user_id
 ORDER BY l.changed_at DESC, l.id DESC
 LIMIT 15;
