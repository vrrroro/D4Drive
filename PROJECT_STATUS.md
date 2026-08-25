# Project Status and Milestones

**Current phase:** Phase 0
**Status:** In progress

Work only the active phase. Tick boxes as sub-tasks land. Ask before marking a
phase complete.

---

## Concurrency waves

Issues inside a wave touch disjoint file sets and are safe to run in parallel
worktrees. A later wave depends on an earlier one and must wait.

| Wave | Phases | Parallel safe |
|---|---|---|
| 1 | Phase 0, Phase 1 | Scaffold and schema can run alongside the asset pipeline |
| 2 | Phase 2, Phase 3 | Auth API and design tokens do not overlap |
| 3 | Phase 4, Phase 5 | Intro sequence and car catalog are independent |
| 4 | Phase 6 | Booking engine needs catalog and auth in place |
| 5 | Phase 7, Phase 8 | Post-booking and admin can run in parallel |
| 6 | Phase 9 | Hardening needs everything else finished |

---

### Phase 0: Foundation and toolchain

- [x] Create the GitHub repository, private
- [x] Write `.gitignore` and `.env.example`, confirm `.env` is excluded
- [ ] Scaffold Next.js 15 with TypeScript strict and Tailwind v4
- [ ] Configure `@theme` tokens from `DESIGN.md`, both light and dark
- [ ] Wire `next/font/google` for Playfair Display and Inter
- [ ] Add `npm run lint:copy` to fail the build on em-dashes and en-dashes
- [ ] Add security headers and a CSP that permits `media-src 'self'`
- [ ] Set up CI to run lint, typecheck, copy lint, and build on every PR

### Phase 1: Database

- [ ] Write `docs/ERD.md`, derived from `PRD.md`, and get it reviewed
- [ ] Write `database/schema.sql` in 3NF with indexes and foreign keys
- [ ] Write `database/seed.sql`: 1 admin, 3 branches, 10 realistic cars
- [ ] Build `lib/db.ts` as a single pooled `mysql2/promise` instance
- [ ] Confirm the booking overlap index supports the locking query

### Phase 2: Auth and session

- [ ] Argon2id hashing helpers
- [ ] `jose` sign and verify, access plus refresh with rotation
- [ ] `httpOnly` `Secure` `SameSite=Lax` cookie helpers
- [ ] `POST /api/auth/register` and `POST /api/auth/login` with zod validation
- [ ] `POST /api/auth/logout` and `GET /api/auth/me`
- [ ] Rate limiting on auth routes
- [ ] CSRF double-submit token, since sessions are cookie-based
- [ ] `requireSession` and `requireAdmin` guards

### Phase 3: Design system in code

- [ ] `Button` with primary, secondary, and link variants plus the carmine slide
- [ ] `Input` and `Field`, label above, error slot, italic Playfair placeholder
- [ ] `Card` built on `border-t`
- [ ] `Toast` system
- [ ] Fixed gridlines and paper grain layers
- [ ] Z-index scale in `lib/constants.ts`
- [ ] Verify every component at radius 0 and in both colour schemes

### Phase 4: The intro sequence

Specification is `docs/VIDEO_STATE_MACHINE.md`. Do not deviate from it.

- [ ] `scripts/build-video-assets.mjs`: poster stills, MP4 and WebM, two sizes
- [ ] `useIntroMachine` as a pure reducer, unit tested with no DOM
- [ ] `BootLoader` with the wordmark and a buffer-driven progress rule
- [ ] `VideoStage` with listeners, `playsInline`, and idempotent completion
- [ ] `AuthGate` over the frozen frame, with a scrim that passes contrast
- [ ] `IntroSequence` orchestration and the reveal into landing content
- [ ] Recovered path: reduced motion, media error, stall, returning visitor
- [ ] Verify on iOS Safari, Android Chrome, and a throttled connection

### Phase 5: Car catalog

- [ ] `GET /api/cars` with brand, fuel, price, and seat filters
- [ ] `GET /api/cars/:id`
- [ ] Availability query with the overlap logic
- [ ] Catalog page, filters driven by `searchParams`
- [ ] Car detail page
- [ ] Empty state for zero results, error state for a failed fetch

### Phase 6: Booking engine

- [ ] Haversine distance service, unit tested
- [ ] Pricing service: days times rate plus tiered delivery fee, unit tested
- [ ] Availability service with `SELECT ... FOR UPDATE` locking
- [ ] `POST /api/bookings` as one transaction across booking, delivery, payment
- [ ] Checkout page
- [ ] **Concurrency test: two simultaneous requests for the same car and dates
      must produce exactly one booking**

### Phase 7: Payment simulation and post-booking

- [ ] Mock card and UPI payment UI, clearly labelled as simulated
- [ ] Confirmation page
- [ ] `pdfkit` invoice at `GET /api/bookings/:id/invoice`, authorisation enforced
- [ ] Customer bookings dashboard with delivery tracking

### Phase 8: Admin

- [ ] Dashboard with revenue, active bookings, and fleet stats
- [ ] Fleet management: add, edit, soft delete
- [ ] Booking management: status transitions
- [ ] Delivery management: lifecycle updates
- [ ] Every admin route behind `requireAdmin`, verified server-side

### Phase 9: Hardening

- [ ] Full pre-merge checklist across every page
- [ ] Lighthouse: LCP under 2.5s, INP under 200ms, CLS under 0.1
- [ ] Responsive pass at 375, 768, 1024, and 1600
- [ ] Keyboard-only navigation of the intro and the booking flow
- [ ] Screen reader pass on forms and the auth gate
- [ ] Verify no error response leaks a stack trace or SQL fragment
- [ ] README with setup and run instructions
