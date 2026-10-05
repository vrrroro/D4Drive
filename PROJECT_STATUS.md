# Project Status and Milestones

**Current phase:** Phase 9, Hardening
**Status:** In progress
**Last updated:** 2026-10-05

Work only the active phase. Tick boxes as sub-tasks land, in the same commit as
the work. When a phase is finished, set the next one as current here and in the
"Current state" section of `CLAUDE.md`.

**Verified on 2026-10-05 (cloud sandbox, Ubuntu 24.04, Node 22, MySQL 8.0.46):**
`npm ci`, `npm run db:setup`, `npm run lint:copy`, `npm run typecheck`,
`npm run test:db` (34 pass, 0 skipped: the double-booking and refresh-rotation
tests run against MySQL), `npm test` without a database (27 pass, 2 skipped),
`npm run build`, and `npm run smoke` (27 browser checks pass against
`next start`).

---

## Phase order

| Order | Phase | State |
|---|---|---|
| 1 | 0 to 8: Foundation through Admin | Done in code, see ticks |
| 2 | 10: Close the gaps | Done |
| 3 | 11: Port the Vite intro effects | Done (optional logo loader blocked, see below) |
| 4 | **9: Hardening** | **Active** |

---

### Phase 0: Foundation and toolchain (done)

- [x] Create the GitHub repository
- [x] Write `.gitignore` and `.env.example`, confirm `.env` is excluded
- [x] Scaffold Next.js 15 with TypeScript strict and Tailwind v4
- [x] Configure `@theme` tokens from `DESIGN.md`, both light and dark
- [x] Wire `next/font/google` for Playfair Display and Inter
- [x] Add `npm run lint:copy` to fail the build on em-dashes and en-dashes
- [x] Security headers and a per-request nonce CSP in `middleware.ts`
- [x] CI runs copy lint, typecheck, tests, build, and audit (`.github/workflows/ci.yml`)

### Phase 1: Database (mostly done)

- [x] Write `docs/ERD.md`, derived from `database/schema.sql`
- [x] Write `database/schema.sql` in 3NF with indexes and foreign keys
- [x] Write `database/seed.sql`: 1 admin, 3 branches, 10 realistic cars
- [x] Build `lib/db.ts` as a single pooled `mysql2/promise` instance
- [x] `npm run db:setup` creates the database and loads schema and seed
- [x] Confirm the booking overlap index supports the locking query (covering range scan, see `docs/ERD.md` section 5)

### Phase 2: Auth and session (mostly done)

- [x] Argon2id hashing helpers (`lib/auth/hash.ts`)
- [x] `jose` sign and verify, access plus refresh tokens (`lib/auth/tokens.ts`)
- [x] `httpOnly` `Secure` `SameSite=Lax` cookie helpers (`lib/auth/cookies.ts`)
- [x] `POST /api/auth/register` and `POST /api/auth/login` with zod validation
- [x] `POST /api/auth/logout` and `GET /api/auth/me`
- [x] `POST /api/auth/refresh` with rotation and reuse detection (`refresh_tokens` table)
- [x] Rate limiting on auth routes (`lib/auth/rate-limit.ts`)
- [x] CSRF double-submit token on state-changing admin routes
- [x] `requireSession` and `requireAdmin` guards (`lib/auth/guards.ts`)

### Phase 3: Design system in code (mostly done)

- [x] `Button` with variants
- [x] `Field` with label, error slot, italic placeholder
- [x] `Card` built on `border-t` (`components/ui/Card.tsx`)
- [x] `Toast` system
- [x] Fixed gridlines and paper grain layers
- [x] Z-index scale in `lib/constants.ts`
- [ ] Verify every component at radius 0 and in both colour schemes (Phase 9)

### Phase 4: The intro sequence (done in code)

Specification is `docs/VIDEO_STATE_MACHINE.md`.

- [x] `scripts/build-video-assets.mjs`: poster stills, MP4 and WebM, two sizes
- [x] Video variants and posters committed to `public/videos` and `public/posters`
- [x] `useIntroMachine` as a pure reducer, unit tested with no DOM
- [x] `BootLoader`, `VideoStage`, `AuthGate`, `IntroSequence`
- [x] Recovered path: reduced motion, media error, stall, returning visitor
- [ ] Verify on iOS Safari, Android Chrome, and a throttled connection (Phase 9)

### Phase 5: Car catalog (done)

- [x] `GET /api/cars` with filters, `GET /api/cars/:id`, availability endpoint
- [x] Catalog page with `searchParams` filters, car detail page
- [x] Empty and error states

### Phase 6: Booking engine (done in code)

- [x] Haversine distance service, unit tested
- [x] Pricing service, unit tested
- [x] Availability service with `SELECT ... FOR UPDATE` locking
- [x] `POST /api/bookings` as one transaction across booking, delivery, payment
- [x] Checkout page
- [x] Concurrency test passes against a real MySQL 8

### Phase 7: Payment simulation and post-booking (done)

- [x] Mock card and UPI payment UI, labelled as simulated
- [x] Confirmation page
- [x] `pdfkit` invoice at `GET /api/bookings/:id/invoice`, authorisation in the query
- [x] Customer bookings dashboard with delivery tracking

### Phase 8: Admin (done)

- [x] Dashboard, fleet management, booking transitions, delivery lifecycle
- [x] Every admin route behind `requireAdmin`; status changes checked against a transition graph

---

### Phase 10: Close the gaps (done 2026-10-05)

- [x] Add `POST /api/auth/refresh`: verify refresh cookie, rotate both tokens, 401 on failure; client retries once on 401 (`lib/api-client.ts`)
- [x] Write `docs/ERD.md` from `database/schema.sql`
- [x] Extract a shared `Card` component and use it in catalog and admin (and the customer bookings list)
- [x] Run against a real MySQL 8 (`npm run db:setup`), then `npm run test:db` so the double-booking test runs instead of skipping
- [x] Smoke test in the browser: register, log in, intro, catalog, book, invoice, admin status change (`npm run smoke`)
- [x] Car photography: labelled "Photograph pending" slots (`components/ui/CarPhoto.tsx`); seed `image_url` is `NULL`, picsum removed from seed and CSP
- [ ] Real photographs of the ten seeded cars in `public/cars/`. **Cannot be done in the sandbox:** it needs real photography of these specific models, and stock images are banned. Upload via the admin fleet page's Photo field.

Found and fixed while closing the gaps:

- [x] `scripts/db-setup.mjs` had a syntax error (`'\'` instead of `'\\'`), so `npm run db:setup` had never run
- [x] Double-booking test leaked a booking into the next test; it now clears before each test
- [x] Invoices returned 500 in production builds (`pdfkit` bundled without its font files); `serverExternalPackages`
- [x] Editing a car in admin wiped its photo and description (fields had no default values)
- [x] `?next=` on `/login` was an open redirect

### Phase 11: Port the Vite intro effects (done 2026-10-05)

Source: `reference/vite-intro/` (read its `REFERENCE.md` first). Target: `components/intro/`.
Keep `docs/VIDEO_STATE_MACHINE.md` as the contract; extend it, do not break it.

- [x] Port the WebGL2 particle stage into `components/fx/` with the reduced-motion and no-WebGL fallbacks (both verified in a browser)
- [x] `AuthGate`: on successful login, dissolve the panel's type into particles instead of a plain fade
- [x] Landing reveal: scatter the film's last frame into the landing content
- [ ] Optional: logo spin loader in `BootLoader`, if a carmine-palette logo clip exists. **Blocked:** the only clip (`reference/vite-intro/public/media/logo-spin.mp4`) is solid gold metal, which `DESIGN.md` forbids as a fill. Needs a carmine render of the mark from the owner.
- [x] Catalog cards assemble from particles on first view (data still from the API); CSS failsafe keeps them visible without JS
- [x] Recolour everything to `DESIGN.md` (carmine accent, gold hairline only), rupees, no em-dashes
- [x] Update `docs/VIDEO_STATE_MACHINE.md` (section 10, `CLEAR_ERROR`, corrected `POSTER_TIME`) and unit tests (`CLEAR_ERROR`, authenticated skip, particle helpers)
- [x] Delete ported files from `reference/vite-intro/`. The folder keeps only the blocked logo loader and its media; delete it once that is decided
- [x] Fix `AuthGate` register mode: it has no mobile field and submits to the login endpoint, so registering from the gate always fails
- [x] Send `ALREADY_AUTHENTICATED`: the contract's signed-in skip of the gate was never wired up
- [x] Video dimming animated `filter`; now an opacity scrim
- [x] VideoStage re-registered every listener on each render (unstable callbacks)

### Phase 9: Hardening (last)

- [ ] Full pre-merge checklist (`DESIGN.md` section 10) across every page
- [ ] Lighthouse: LCP under 2.5s, INP under 200ms, CLS under 0.1
- [ ] Responsive pass at 375, 768, 1024, and 1600
- [ ] Keyboard-only navigation of the intro and the booking flow
- [ ] Screen reader pass on forms and the auth gate
- [ ] Verify no error response leaks a stack trace or SQL fragment
- [ ] Device check: iOS Safari, Android Chrome, throttled network
- [ ] `npm audit --audit-level=high` fails (9 high: PostCSS bundled in `next`, `sharp`); CI runs this step
- [ ] Gridlines sit at sixths of the unpadded container, not on the content's 12-column boundaries (DESIGN.md section 7: align or cut)
- [ ] `Button` link variant animates `width`; must be `scaleX`
- [ ] `<Link><Button>` nests a button inside an anchor (invalid HTML, two tab stops)
- [ ] `/favicon.ico` returns 404
- [ ] Hero headline wraps to four lines at 1440px; `DESIGN.md` caps it at two
- [ ] Reduced motion: `docs/VIDEO_STATE_MACHINE.md` section 7 promises a manual play control; none exists
- [ ] Landing links behind the film are reachable by Tab while it plays (make them `inert` until reveal)

---

## Open decisions

- **Express tier:** `ARCHITECTURE.md` asks whether the course rubric needs a visibly separate Express server. Still unanswered; ask the owner before Phase 9.
- **`EDRD.md` vs `DESIGN.md`:** EDRD is the original brief (gold accent). `DESIGN.md` supersedes it (carmine accent). Follow `DESIGN.md`.
