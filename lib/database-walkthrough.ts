/**
 * Every major transaction in D4Drive, traced from what the person does to
 * what they get back. Shown on /admin/database and mirrored in
 * docs/DATABASE.md section 6. When a route or routine changes, change both.
 *
 * Each entry answers the five questions the course asks of a transaction:
 * what operation, which tables, which SQL component, how the database is
 * affected, what result comes back.
 */

export type Dml = 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE';

export interface Transaction {
  id: string;
  operation: string;
  where: string;
  tables: string[];
  component: string[];
  dml: Dml[];
  effect: string;
  result: string;
}

export const TRANSACTIONS: Transaction[] = [
  {
    id: 'register',
    operation: 'A visitor creates an account',
    where: 'Sign-in panel, "New here?" (POST /api/auth/register)',
    tables: ['users', 'refresh_tokens'],
    component: [
      'INSERT INTO users',
      'UNIQUE uq_users_email',
      'CHECK chk_users_email, chk_users_phone, chk_users_name',
      'INSERT INTO refresh_tokens',
    ],
    dml: ['SELECT', 'INSERT'],
    effect:
      'One users row with an Argon2id hash (role defaults to customer), and one refresh_tokens row for the new session. A second account with the same email is refused by the unique key.',
    result: 'Signed in: the session cookies are set and the visitor lands on the fleet.',
  },
  {
    id: 'session',
    operation: 'A signed-in customer comes back after 15 minutes',
    where: 'Any page (POST /api/auth/refresh, called automatically)',
    tables: ['refresh_tokens', 'users'],
    component: [
      'Transaction: SELECT ... FOR UPDATE on the presented token',
      'UPDATE refresh_tokens SET revoked_at, replaced_by',
      'INSERT INTO refresh_tokens (the successor)',
    ],
    dml: ['SELECT', 'UPDATE', 'INSERT'],
    effect:
      'The old token row is retired and names its successor; a new row is added. Replaying a retired token revokes every live row for that user (an UPDATE across the family).',
    result: 'A fresh pair of cookies, with the role re-read from users.',
  },
  {
    id: 'browse',
    operation: 'A visitor browses and filters the fleet',
    where: '/cars (GET /api/cars)',
    tables: ['cars', 'branches'],
    component: [
      'SELECT ... JOIN branches with a WHERE built only from allowlisted filters',
      'Index idx_cars_filter (is_active, fuel_type, seats, price_per_day)',
    ],
    dml: ['SELECT'],
    effect: 'Read only. Withdrawn cars (is_active = 0) never appear.',
    result: 'The fleet list, filtered and sorted, with a total for paging.',
  },
  {
    id: 'availability',
    operation: 'A customer checks whether a car is free on their dates',
    where: 'Car page and checkout (GET /api/cars/:id/availability)',
    tables: ['bookings'],
    component: ['FUNCTION fn_car_available(car, start, end)', 'Index idx_bookings_overlap'],
    dml: ['SELECT'],
    effect:
      'Read only. Counts bookings that hold dates (pending, confirmed, active) and overlap the range; a booking ending on the day another starts does not overlap.',
    result: 'Available or taken. Only a preview: the booking procedure checks again under a lock.',
  },
  {
    id: 'reserve',
    operation: 'A customer reserves a car and pays',
    where: 'Checkout, "Reserve" (POST /api/bookings)',
    tables: ['cars', 'branches', 'bookings', 'deliveries', 'payments', 'booking_status_log'],
    component: [
      'PROCEDURE sp_create_booking',
      'SELECT ... FROM cars FOR UPDATE (the row lock)',
      'FUNCTION fn_car_available, fn_haversine_km, fn_delivery_fee',
      'INSERT INTO bookings, deliveries, payments (one transaction)',
      'TRIGGER trg_bookings_ai_log (AFTER INSERT)',
      'CHECK chk_bookings_days, chk_bookings_rental, chk_bookings_total, chk_deliveries_mode, chk_payments_method',
    ],
    dml: ['SELECT', 'INSERT'],
    effect:
      'Four new rows, all or none: the booking (status confirmed), its delivery or collection, its paid payment, and its first history row from the trigger. A second customer racing for the same dates waits on the lock, then is refused.',
    result:
      'The confirmation page with a reference such as D4K7QM2XPA. Refusals: 409 dates taken, 404 car withdrawn, 422 address or branch beyond 15 km.',
  },
  {
    id: 'mine',
    operation: 'A customer opens My bookings or downloads an invoice',
    where: '/bookings, /confirmation/:reference, GET /api/bookings/:id/invoice',
    tables: ['bookings', 'users', 'cars', 'branches', 'deliveries', 'payments'],
    component: ['VIEW v_booking_details (a six-way join)', 'WHERE user_id = ? (ownership in the query)'],
    dml: ['SELECT'],
    effect: 'Read only. Someone else’s booking is simply not found.',
    result: 'The list of journeys with delivery status, or the PDF invoice.',
  },
  {
    id: 'cancel',
    operation: 'A customer cancels a booking before pickup',
    where: 'My bookings, "Cancel" (POST /api/bookings/:id/cancel); staff via the admin status menu',
    tables: ['bookings', 'payments', 'booking_status_log'],
    component: [
      'PROCEDURE sp_cancel_booking',
      'UPDATE bookings SET status = cancelled',
      'TRIGGER trg_bookings_au_log (AFTER UPDATE)',
      'TRIGGER trg_bookings_au_refund (AFTER UPDATE, FOLLOWS the log trigger)',
    ],
    dml: ['SELECT', 'UPDATE', 'INSERT'],
    effect:
      'The booking becomes cancelled; the refund trigger marks its payment refunded with a time; the log trigger records who cancelled and why. The dates are free again at once.',
    result: 'A notice with the amount refunded. Refused once the pickup day has come (409).',
  },
  {
    id: 'dispatch',
    operation: 'Staff send a car out and mark it delivered',
    where: '/admin/bookings, delivery menu (PATCH /api/admin/deliveries/:id)',
    tables: ['deliveries'],
    component: ['UPDATE deliveries ... WHERE status = ? (compare and set)', 'TRIGGER trg_deliveries_bu_stamp (BEFORE UPDATE)'],
    dml: ['UPDATE'],
    effect: 'The delivery moves pending, out for delivery, delivered, returned. The trigger stamps delivered_at itself, so no client can supply the time.',
    result: 'The customer sees "On its way to you", then "Delivered".',
  },
  {
    id: 'status',
    operation: 'Staff move a booking on (confirm, start, complete)',
    where: '/admin/bookings, status menu (PATCH /api/admin/bookings/:id)',
    tables: ['bookings', 'booking_status_log'],
    component: ['SET @d4d_actor_id, @d4d_reason on the connection', 'UPDATE bookings ... WHERE status = ?', 'TRIGGER trg_bookings_au_log'],
    dml: ['UPDATE', 'INSERT'],
    effect: 'One status change and one history row naming the staff member. An illegal move (completed back to active) is refused before any SQL runs (409).',
    result: 'The row updates in place on the admin page.',
  },
  {
    id: 'close',
    operation: 'Staff close the day',
    where: 'Operations dashboard, "Run the end-of-day close" (POST /api/admin/operations/close)',
    tables: ['bookings', 'deliveries', 'refresh_tokens', 'booking_status_log'],
    component: [
      'PROCEDURE sp_end_of_day_close',
      'CURSOR cur_due over bookings whose day has come',
      'UPDATE bookings (confirmed to active, active to completed)',
      'UPDATE deliveries (delivered to returned)',
      'DELETE FROM refresh_tokens (expired sessions)',
      'TRIGGER trg_bookings_au_log, once per step',
    ],
    dml: ['SELECT', 'UPDATE', 'DELETE', 'INSERT'],
    effect:
      'Every due booking moves on, oldest first, one compare-and-set step at a time; each step writes a history row with the reason "end-of-day close". Expired sessions are deleted. Running it twice changes nothing more.',
    result: 'A summary (started, completed, returned, cleared) and the list of every step taken.',
  },
  {
    id: 'car',
    operation: 'Staff add or edit a car',
    where: '/admin/fleet (POST /api/admin/cars, PUT /api/admin/cars/:id)',
    tables: ['cars', 'branches'],
    component: [
      'INSERT INTO cars / UPDATE cars',
      'FOREIGN KEY fk_cars_branch',
      'UNIQUE uq_cars_registration',
      'CHECK chk_cars_registration, chk_cars_seats, chk_cars_price, chk_cars_year',
    ],
    dml: ['INSERT', 'UPDATE'],
    effect: 'One car row added or changed. An unknown branch, a duplicate registration or an impossible seat count is refused by the database.',
    result: 'The fleet list refreshes; the catalog shows the change at once.',
  },
  {
    id: 'withdraw',
    operation: 'Staff withdraw a car from the catalog',
    where: '/admin/fleet, "Withdraw" (POST /api/admin/cars/:id/withdraw)',
    tables: ['cars', 'bookings'],
    component: ['UPDATE cars SET is_active = 0 (soft delete)', 'TRIGGER trg_cars_bu_withdraw_guard (BEFORE UPDATE)'],
    dml: ['UPDATE'],
    effect: 'The car leaves the catalog but keeps its row for invoices. While it has a confirmed or running rental, the trigger refuses (SIGNAL 5201).',
    result: '"Withdrawn", or the trigger’s reason as a notice (409).',
  },
  {
    id: 'delete',
    operation: 'Staff delete a car entered by mistake',
    where: '/admin/fleet, "Delete" (DELETE /api/admin/cars/:id), shown only for never-booked cars',
    tables: ['cars'],
    component: ['DELETE FROM cars', 'FOREIGN KEY fk_bookings_car ON DELETE RESTRICT'],
    dml: ['DELETE'],
    effect: 'The row is gone. For a car with any booking, MySQL itself refuses: the foreign key protects the history.',
    result: '"Deleted", or "This car has bookings. Withdraw it instead." (409).',
  },
  {
    id: 'reports',
    operation: 'Staff read the reports',
    where: '/admin/reports',
    tables: ['every table'],
    component: ['18 named SELECTs in database/queries.sql: joins, GROUP BY and HAVING, subqueries, window functions, the view'],
    dml: ['SELECT'],
    effect: 'Read only.',
    result: 'Revenue by branch and month, utilisation, rankings, customers, the dispatch list, the audit trail.',
  },
];

/**
 * The relational schema, in the textbook notation the course uses:
 * table(primary key, other columns), with each foreign key named. Derived from
 * database/schema.sql; tests/walkthrough.test.ts fails if a column here does
 * not exist there.
 */
export interface SchemaTable {
  table: string;
  pk: string[];
  columns: string[];
  fks: { column: string; references: string }[];
  unique: string[];
}

export const RELATIONAL_SCHEMA: SchemaTable[] = [
  {
    table: 'users',
    pk: ['id'],
    columns: ['full_name', 'email', 'phone', 'password_hash', 'role', 'licence_number', 'created_at', 'updated_at'],
    fks: [],
    unique: ['email'],
  },
  {
    table: 'branches',
    pk: ['id'],
    columns: ['name', 'address', 'city', 'pincode', 'latitude', 'longitude', 'phone', 'is_active', 'created_at'],
    fks: [],
    unique: ['name'],
  },
  {
    table: 'cars',
    pk: ['id'],
    columns: ['branch_id', 'brand', 'model', 'year', 'registration_no', 'fuel_type', 'transmission', 'seats', 'price_per_day', 'image_url', 'description', 'is_active', 'created_at', 'updated_at'],
    fks: [{ column: 'branch_id', references: 'branches(id)' }],
    unique: ['registration_no'],
  },
  {
    table: 'bookings',
    pk: ['id'],
    columns: ['reference', 'user_id', 'car_id', 'start_date', 'end_date', 'days', 'rate_per_day', 'rental_amount', 'delivery_fee', 'total_amount', 'status', 'created_at', 'updated_at'],
    fks: [
      { column: 'user_id', references: 'users(id)' },
      { column: 'car_id', references: 'cars(id)' },
    ],
    unique: ['reference'],
  },
  {
    table: 'deliveries',
    pk: ['id'],
    columns: ['booking_id', 'mode', 'pickup_branch_id', 'address_line', 'city', 'pincode', 'latitude', 'longitude', 'distance_km', 'status', 'scheduled_at', 'delivered_at', 'created_at', 'updated_at'],
    fks: [
      { column: 'booking_id', references: 'bookings(id)' },
      { column: 'pickup_branch_id', references: 'branches(id)' },
    ],
    unique: ['booking_id'],
  },
  {
    table: 'payments',
    pk: ['id'],
    columns: ['booking_id', 'amount', 'method', 'status', 'reference', 'card_last_four', 'upi_handle', 'paid_at', 'refunded_at', 'created_at'],
    fks: [{ column: 'booking_id', references: 'bookings(id)' }],
    unique: ['reference'],
  },
  {
    table: 'refresh_tokens',
    pk: ['jti'],
    columns: ['user_id', 'expires_at', 'revoked_at', 'replaced_by', 'created_at'],
    fks: [{ column: 'user_id', references: 'users(id)' }],
    unique: [],
  },
  {
    table: 'booking_status_log',
    pk: ['id'],
    columns: ['booking_id', 'from_status', 'to_status', 'actor_user_id', 'reason', 'changed_at'],
    fks: [
      { column: 'booking_id', references: 'bookings(id)' },
      { column: 'actor_user_id', references: 'users(id)' },
    ],
    unique: [],
  },
];
