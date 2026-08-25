# Project Status & Milestones

**Current Phase:** Phase 1
**Status:** 🔴 Not Started

*Instructions for AI: Only work on the current active phase. Update this file with checkboxes [x] as you complete sub-tasks.*

### Phase 1: Initialization & Database (🔴 Not Started)
- [ ] Initialize `package.json` and install required dependencies.
- [ ] Set up `server.js` with basic Express skeleton and CORS.
- [ ] Create `config/db.js` using `mysql2` connection pool.
- [ ] Write `database/schema.sql` based on `ERD.md`.
- [ ] Write `database/seed.sql` (1 admin, 3 branches, 10 realistic cars).

### Phase 2: Core Backend & Auth (🔴 Not Started)
- [ ] Create User/Auth controllers, routes, and JWT middleware.
- [ ] Implement `POST /api/auth/register` and `POST /api/auth/login`.
- [ ] Implement `requireAdmin` middleware.
- [ ] Create basic Car API (`GET /api/cars`, `GET /api/cars/:id`).

### Phase 3: Frontend Foundation & UI Hook (🔴 Not Started)
- [ ] Setup `public/` directory structure (CSS, JS, assets).
- [ ] Build `index.html` with the requested scrolling animation hero section.
- [ ] Implement global styling (CSS variables for Navy/White/Blue theme).
- [ ] Build `register.html` and `login.html` and connect them to Auth APIs using vanilla JS `fetch()`.

### Phase 4: Car Catalog & Availability (🔴 Not Started)
- [ ] Build `cars.html` (Car grid with Bootstrap cards).
- [ ] Implement frontend search & filter UI.
- [ ] Update backend `GET /api/cars` to handle filter query parameters.
- [ ] Build `car-details.html` (Single car view).
- [ ] Write the SQL logic for checking overlapping date availability.

### Phase 5: The Booking Engine (🔴 Not Started)
- [ ] Build `booking.html` (multi-section checkout).
- [ ] Implement Haversine distance calculator in backend services.
- [ ] Implement Pricing Service (Days × Rate + Tiered Delivery Fee).
- [ ] Create `POST /api/bookings` handling the full transaction (Booking -> Delivery -> Payment records) using MySQL `BEGIN/COMMIT`.

### Phase 6: Mock Payments & Post-Booking (🔴 Not Started)
- [ ] Build UI for Mock Card / UPI payment simulation.
- [ ] Build `confirmation.html` (Success screen).
- [ ] Implement PDFKit service for invoice generation (`GET /api/bookings/:id/invoice`).
- [ ] Build `my-bookings.html` for customer dashboard.

### Phase 7: Admin Panel (🔴 Not Started)
- [ ] Build `admin/dashboard.html` with stats.
- [ ] Build admin UI and API to add/edit/soft-delete cars.
- [ ] Build admin UI and API to manage bookings (change status).
- [ ] Build admin UI and API to manage delivery status.

### Phase 8: Polish & Testing (🔴 Not Started)
- [ ] Ensure all Toast notifications work.
- [ ] Perform double-booking prevention test.
- [ ] Final UI/UX responsiveness check.
- [ ] Update README with run instructions.