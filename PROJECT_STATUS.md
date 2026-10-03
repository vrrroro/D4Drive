# Project Status and Milestones

**Current phase:** Phase 10, Close the gaps
**Status:** In progress
**Last updated:** 2026-10-04

Work only the active phase. Tick boxes as sub-tasks land, in the same commit as
the work. When a phase is finished, set the next one as current here and in the
"Current state" section of `CLAUDE.md`.

**Verified on 2026-10-04 (Windows, Node 20+, no database):** `npm ci`,
`npm run lint:copy`, `npm run typecheck`, `npm test` (24 pass, 1 skipped:
the double-booking test needs MySQL), and `npm run build` all succeed.
Nothing has been run against a live MySQL yet.

---

## Phase order

| Order | Phase | State |
|---|---|---|
| 1 | 0 to 8: Foundation through Admin | Done in code, see ticks |
| 2 | **10: Close the gaps** | **Active** |
| 3 | 11: Port the Vite intro effects | Next |
| 4 | 9: Hardening | Last |

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

- [ ] Write `docs/ERD.md`, derived from `database/schema.sql` (moved to Phase 10)
- [x] Write `database/schema.sql` in 3NF with indexes and foreign keys
- [x] Write `database/seed.sql`: 1 admin, 3 branches, 10 realistic cars
- [x] Build `lib/db.ts` as a single pooled `mysql2/promise` instance
- [x] `npm run db:setup` creates the database and loads schema and seed
- [ ] Confirm the booking overlap index supports the locking query (needs MySQL, Phase 10)

### Phase 2: Auth and session (mostly done)

- [x] Argon2id hashing helpers (`lib/auth/hash.ts`)
- [x] `jose` sign and verify, access plus refresh tokens (`lib/auth/tokens.ts`)
- [x] `httpOnly` `Secure` `SameSite=Lax` cookie helpers (`lib/auth/cookies.ts`)
- [x] `POST /api/auth/register` and `POST /api/auth/login` with zod validation
- [x] `POST /api/auth/logout` and `GET /api/auth/me`
- [ ] **`POST /api/auth/refresh` with rotation. Missing: the refresh cookie is
      scoped to this path but the route does not exist** (Phase 10)
- [x] Rate limiting on auth routes (`lib/auth/rate-limit.ts`)
- [x] CSRF double-submit token on state-changing admin routes
- [x] `requireSession` and `requireAdmin` guards (`lib/auth/guards.ts`)

### Phase 3: Design system in code (mostly done)

- [x] `Button` with variants
- [x] `Field` with label, error slot, italic placeholder
- [ ] `Card` built on `border-t` (no shared component yet, Phase 10)
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
- [ ] Concurrency test passes against a real MySQL (written, skipped without DB; Phase 10)

### Phase 7: Payment simulation and post-booking (done)

- [x] Mock card and UPI payment UI, labelled as simulated
- [x] Confirmation page
- [x] `pdfkit` invoice at `GET /api/bookings/:id/invoice`, authorisation in the query
- [x] Customer bookings dashboard with delivery tracking

### Phase 8: Admin (done)

- [x] Dashboard, fleet management, booking transitions, delivery lifecycle
- [x] Every admin route behind `requireAdmin`; status changes checked against a transition graph

---

### Phase 10: Close the gaps (ACTIVE)

- [ ] Add `POST /api/auth/refresh`: verify refresh cookie, rotate both tokens, 401 on failure; client retries once on 401
- [ ] Write `docs/ERD.md` from `database/schema.sql`
- [ ] Extract a shared `Card` component and use it in catalog and admin
- [ ] Run against a real MySQL 8 (`npm run db:setup`), then `npm test` with the DB env vars so the double-booking test runs instead of skipping
- [ ] Smoke test in the browser: register, log in, intro, catalog, book, invoice, admin status change
- [ ] Car photography: `seed.sql` points `image_url` at random `picsum.photos` stills, not cars. Replace with real photos in `public/cars/` or labelled placeholder slots per `DESIGN.md` ("real images only")

### Phase 11: Port the Vite intro effects (next)

Source: `reference/vite-intro/` (read its `REFERENCE.md` first). Target: `components/intro/`.
Keep `docs/VIDEO_STATE_MACHINE.md` as the contract; extend it, do not break it.

- [ ] Port the WebGL2 particle stage into `components/fx/` with the reduced-motion and no-WebGL fallbacks
- [ ] `AuthGate`: on successful login, dissolve the panel's type into particles instead of a plain fade
- [ ] Landing reveal: scatter the film's last frame into the landing content
- [ ] Optional: logo spin loader in `BootLoader`, if a carmine-palette logo clip exists
- [ ] Catalog cards assemble from particles on first view (data still from the API)
- [ ] Recolour everything to `DESIGN.md` (carmine accent, gold hairline only), rupees, no em-dashes
- [ ] Update `docs/VIDEO_STATE_MACHINE.md` and unit tests for any new states
- [ ] Delete ported files from `reference/vite-intro/`; delete the folder when empty

### Phase 9: Hardening (last)

- [ ] Full pre-merge checklist (`DESIGN.md` section 10) across every page
- [ ] Lighthouse: LCP under 2.5s, INP under 200ms, CLS under 0.1
- [ ] Responsive pass at 375, 768, 1024, and 1600
- [ ] Keyboard-only navigation of the intro and the booking flow
- [ ] Screen reader pass on forms and the auth gate
- [ ] Verify no error response leaks a stack trace or SQL fragment
- [ ] Device check: iOS Safari, Android Chrome, throttled network

---

## Open decisions

- **Express tier:** `ARCHITECTURE.md` asks whether the course rubric needs a visibly separate Express server. Still unanswered; ask the owner before Phase 9.
- **`EDRD.md` vs `DESIGN.md`:** EDRD is the original brief (gold accent). `DESIGN.md` supersedes it (carmine accent). Follow `DESIGN.md`.
