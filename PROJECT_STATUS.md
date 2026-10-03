# Project Status & Milestones

**Current Phase:** Phase 1 — Backend Initialization & Database
**Status:** 🟡 Frontend shell complete, backend not started

*Instructions for AI: Only work on the current active phase. Update this file with checkboxes [x] as you complete sub-tasks. See `CLAUDE.md` for the stack — the frontend is React/Vite/Tailwind, not Bootstrap/vanilla JS.*

### Phase 0: Frontend Shell & Opening Film (✅ Complete)
- [x] Vite + React 19 + TypeScript + Tailwind v4 project at repo root.
- [x] Design tokens from `EDRD.md` in `src/index.css` (`@theme`).
- [x] Opening film: logo loader → car approach → login → depart → scatter (`src/sequence/`).
- [x] WebGL2 particle stage for dissolves/assembles with CSS fallback (`src/fx/`).
- [x] Login panel UI with Member / Concierge roles (visual only — no real auth yet).
- [x] Landing site: Header, Hero, Fleet grid with body-type filter, Experience, Enquiries FAQ, Footer.
- [x] Static fleet of 7 cars in `src/data/fleet.ts` (temporary).
- [x] `npm run build` passes.

### Phase 1: Backend Initialization & Database (🔴 Not Started) ← ACTIVE
- [ ] Create `server/` with its own `package.json`; install `express`, `mysql2`, `bcryptjs`, `jsonwebtoken`, `dotenv`, `cors`, `cookie-parser`.
- [ ] Set up `server/server.js` with Express skeleton, CORS (origin `http://localhost:5173`), JSON body parsing, error handler.
- [ ] Create `server/config/db.js` using a `mysql2` connection pool from `.env`.
- [ ] Write `server/database/schema.sql` (users, branches, cars, bookings, deliveries, payments — 3NF).
- [ ] Write `server/database/seed.sql` (1 admin, 3 branches, the 7 cars from `src/data/fleet.ts` plus 3 more).
- [ ] Add Vite proxy `/api` → `http://localhost:5000` in `vite.config.ts`.
- [ ] Root `README.md`: add backend setup steps.

### Phase 2: Core Backend & Auth (🔴 Not Started)
- [ ] User/Auth controllers, routes, and JWT middleware (access token + httpOnly refresh cookie).
- [ ] `POST /api/auth/register`, `POST /api/auth/login`, `POST /api/auth/refresh`, `POST /api/auth/logout`, `GET /api/auth/me`.
- [ ] `requireAdmin` middleware (Concierge role).
- [ ] Car API: `GET /api/cars`, `GET /api/cars/:id`.

### Phase 3: Connect Frontend to API (🔴 Not Started)
- [ ] Small typed API client in `src/lib/api.ts`.
- [ ] Wire `LoginPanel` to `/api/auth/login`; show errors without breaking the dissolve; role comes from the server, not the toggle.
- [ ] Make "Request an invitation" open a register form.
- [ ] Load the Fleet section from `GET /api/cars`; remove the static array from runtime code.
- [ ] Keep session on reload (`/api/auth/me`); sign-out calls `/api/auth/logout`.

### Phase 4: Car Catalog & Availability (🔴 Not Started)
- [ ] Extend Fleet filtering: brand, fuel, price, seats (backend query params + UI).
- [ ] Car detail view (route or modal) reached from "Reserve".
- [ ] SQL availability check for overlapping date ranges.

### Phase 5: The Booking Engine (🔴 Not Started)
- [ ] Booking flow UI (dates → delivery/pickup → summary) in the EDRD style.
- [ ] Haversine distance service; tiered delivery fee per `PRD.md`.
- [ ] Pricing service (Days × Rate + Delivery Fee).
- [ ] `POST /api/bookings` as one MySQL transaction (Booking → Delivery → Payment).

### Phase 6: Mock Payments & Post-Booking (🔴 Not Started)
- [ ] Mock Card / UPI payment step.
- [ ] Confirmation screen.
- [ ] PDFKit invoice: `GET /api/bookings/:id/invoice`.
- [ ] "My bookings" view for members.

### Phase 7: Concierge (Admin) Panel (🔴 Not Started)
- [ ] Dashboard stats (revenue, active bookings, fleet status).
- [ ] Add / edit / soft-delete cars (with image upload via `multer`).
- [ ] Manage booking statuses.
- [ ] Manage delivery statuses.

### Phase 8: Polish & Testing (🔴 Not Started)
- [ ] Toast notifications for all async actions; loading states on buttons.
- [ ] Double-booking prevention test.
- [ ] Responsiveness + reduced-motion check.
- [ ] Final README run instructions.

## Open decisions / known gaps
- **Currency:** Fleet shows **£** prices; `PRD.md` delivery fees are in **₹**. Pick one before Phase 5.
- **Login is cosmetic:** any credentials pass; the role toggle decides Member vs Concierge. Fixed in Phase 3.
- **Fleet photos** are stills from the reveal film (same livery on every car) — see `README.md` › Assets.
- Footer newsletter form and footer links are non-functional placeholders.
