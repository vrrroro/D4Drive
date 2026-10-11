# Changelog

All notable changes to this project are documented here.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

Entries are grouped by session date, newest first. Every session adds one.

### 2026-10-12: Phase 13 (database coursework) and Phase 14 (UI revisions) planned

#### Phase 14, step 1: the site's chrome (branch `feature/ux-revisions`, draft PR #26)
- Header: the condensed `D4DRIVE` wordmark is the logo, hidden on the
  landing's first screen until the film starts (`FilmStory` writes
  `data-film-phase` on the track; `filmPhase` in `timeline.ts`). Once the page
  has moved, a frosted grey bar (`data-scrolled`, from a sentinel watched by
  `HeaderTone`, no scroll listener), tinted for carmine and charcoal panels.
- Signed in: "Signed in as *Name*" opens `AccountMenu` (My bookings, Fleet,
  admin pages for staff, Photo credits, Sign out). The rotating "Let's ___"
  is for signed-out visitors only. `SignOutButton` removed.
- Every button hovers red with white type: primary, blush, secondary and
  keycaps share `--btn-hover-bg` (the deeper carmine on carmine panels).
- `SiteFooter` is a slim line on every page with "This Was Bloomed By Rohit".
  The branch list and "Browse the fleet" moved to `LocationsSection`, which
  flows on from the landing's sign-in panel with no card or tilt.
- The "go on." notes are anchored to their buttons, arrows rising to them.
- Back to top is a small arrow at the left edge, red on hover.
- Fixed: the Fleet link landed at the end of the page. Lenis kept the
  previous page's eased target; `SmoothScroll` now jumps to the top of a new
  page before it paints (back and forward, and #fragments, keep theirs).
- "Self-drive" removed from all copy; example names, numbers and emails
  removed from the sign-in form.
- `scripts/shoot.mjs` gains `SHOOT_SELECTOR`.

Branch `feature/dbms-coursework`, stacked on `feature/scroll-film-redesign`
(PR #24), draft PR #25. Steps land newest first below, each pushed as it is done.

#### Verified (Phase 13 done)
- `lint`, `lint:copy`, `typecheck`, `npm test` (38 pass, 3 skip), `test:db`
  (56 pass), `build`, `smoke` (41/41 against `next start`), `check:leaks`
  (clean). Admin pages reviewed at 1440x900.
- Added `scripts/shoot.mjs`: signed-in, full-page screenshots for review
  (`MSYS_NO_PATHCONV=1` in Git Bash).

#### Added (reports, demonstration, write-up)
- `database/queries.sql`: 18 named queries (joins, GROUP BY and HAVING,
  scalar, correlated, NOT EXISTS and NOT IN subqueries, window functions,
  CASE, the view). `lib/services/reports.ts` parses the file and runs it.
- `/admin/reports`: every query's answer, grouped (money, fleet, customers,
  operations), with "The SQL" under each table.
- `/admin/database` ("How the database works"): live table counts, routines,
  triggers and constraint counts from information_schema; the ER diagram and
  relational schema; 14 transactions traced as operation, tables, component,
  effect, result (`lib/database-walkthrough.ts`); three "Try it" panels
  (`GET /api/admin/database/try`) that run `fn_car_available`, the distance
  and fee functions, or a history lookup and show the SQL, bound values and
  rows; the latest trigger writes.
- `npm run build:erd` (`scripts/build-erd.mjs`): draws `docs/erd.svg` and
  `public/erd.svg` from `database/schema.sql`, crow's foot notation.
- `docs/DATABASE.md`: the database write-up, requirement by requirement, with
  a five minute demonstration script.
- Tests: `tests/queries.test.ts` (15+ queries, all described, all run),
  `tests/walkthrough.test.ts` (the relational schema matches schema.sql).

#### Changed (the app now runs on the stored programs)
- `createBooking` calls `sp_create_booking`; the TypeScript lock path
  (`assertAvailableForUpdate`) is gone. `isCarAvailable` calls
  `fn_car_available`. Booking reads use the view `v_booking_details`.
- Self-pickup takes an optional `pickupBranchId` (any open branch).
- Customers can cancel from My bookings (`CancelBookingButton`, asks twice);
  refunds show as "Refunded in full". Staff cancellations use the same
  procedure.
- Admin status changes pass the admin's id to the history trigger
  (`withActor`); the delivered stamp moved into `trg_deliveries_bu_stamp`.
- Admin fleet: Withdraw is `POST /api/admin/cars/:id/withdraw` and shows the
  trigger's reason when refused; Delete (`DELETE /api/admin/cars/:id`) appears
  only for never-booked cars, asks twice, and the foreign key refuses the rest.
- Operations dashboard: "Run the end-of-day close" (`EndOfDayClose`), and
  links to Reports and How the database works.
- `handleRouteError` maps stored-program SIGNALs and FK, unique and CHECK
  violations to 4xx (`lib/services/db-errors.ts`); everything else stays a
  generic 500.
- Car registration numbers are validated to the Indian format, as the
  database's CHECK requires.
- `lib/db.ts`: `callProcedure`, `withActor`.
- `tests/double-booking.test.ts` asserts the procedure's 5002 refusal.
- Seed: the pending booking belongs to Priya Venkatesh, so one customer
  (Farhan Ahmed) has never booked and that report has an answer.
- `docs/ERD.md`, `ARCHITECTURE.md` section 4, `README.md` (rebuild a database
  created before 2026-10-12).

#### Verified
- `npm run test:db`: 56 pass. Every procedure path by hand and over HTTP
  (book at another branch, cancel twice, cancel a started booking, the close,
  withdraw a car with a running rental, delete a booked car). The three
  admin pages render against the seed.

#### Added (database layer)
- `database/routines.sql`: functions `fn_haversine_km`, `fn_delivery_fee`,
  `fn_car_available`; procedures `sp_create_booking` (the whole booking in one
  locked transaction), `sp_cancel_booking`, `sp_end_of_day_close` (a cursor
  over due bookings, plus the expired-session purge); triggers
  `trg_bookings_ai_log`, `trg_bookings_au_log`, `trg_bookings_au_refund`,
  `trg_deliveries_bu_stamp`, `trg_cars_bu_withdraw_guard`; view
  `v_booking_details`. Custom errors use SQLSTATE 45000 with errnos 5001 to
  5201, listed at the top of the file.
- Table `booking_status_log` (8th table), written only by triggers.
- Columns `deliveries.pickup_branch_id` (collect at any branch),
  `branches.pincode`, `payments.refunded_at`.
- CHECK constraints mirroring the app's validation: email, mobile, branch
  phone and pincode, coordinates, car year and registration format, booking
  days and amounts that must add up, reference format, delivery mode shape,
  payment method shape, refund stamp.

#### Changed (database layer)
- Seed: 11 branches (Yelahanka not yet open), 12 users (two admins), 10 cars
  spread over the branches, 14 bookings across every status with dates
  relative to the seed day, their deliveries and payments, 16 session rows.
  Status changes are real UPDATEs, so the triggers write 27 history rows and
  refund both cancellations.
- `npm run db:setup` loads schema, routines, seed; understands `DELIMITER`;
  prints row counts for all eight tables and the routine and trigger counts.
- Fixed a wrong seed comment: Koramangala to Whitefield is 13.9 km, not 15.4.

#### Note
- Until the next commit, the app's booking code still inserts rows itself and
  the new constraints reject its self-pickup rows. The next step routes it
  through `sp_create_booking`.

#### Planned
- Phase 13 and Phase 14 written into `PROJECT_STATUS.md` with the owner's
  course rubric and the owner's 18 numbered UI revisions, so any session can
  resume from the list.

### 2026-10-08: Phase 12, the scroll film and the editorial redesign

Owner's brief: the hero film should be scrubbed by the scroll instead of
playing outright, carry the company's story in the spaces it leaves, and fade
into sign-in as the car takes off; every page restyled to the "Lil Boxes"
editorial-maximalism system while keeping D4Drive's own identity; real fleet
photographs with one consistent look.

#### Added
- **The landing film** (`components/film/`): 264 WebP stills drawn into a
  pinned canvas from the scroll position, coarse-to-fine loading, a real
  progress loader, a hero window that opens out of the headline, five chapters
  of copy placed in the film's empty space, the smoke fading into the sign-in
  panel. Portrait screens crop to a band that follows the car. Contract
  rewritten in `docs/VIDEO_STATE_MACHINE.md`.
- `npm run build:frames` (`scripts/build-film-frames.mjs`): stills, the engine
  clip, and `lib/film-manifest.ts` with the car's position in every frame.
- **Fleet photographs** for all ten cars (`public/cars/`): Wikimedia Commons
  photos (CC BY, CC BY-SA), cut out, plates blurred, set on the film's
  cyclorama at one angle and scale. `public/cars/credits.json`, a credit line
  under each photo, a `/credits` page, and the Python pipeline in
  `scripts/fleet-photos/`. Seed `image_url` now points at them.
- The system's pieces: `SmoothScroll` (Lenis), `StackPanel` (pinned, dealt-in
  panels), `CursorHalo`, `BackToTop`, `HeaderTone` (the header follows the
  panel beneath), `Annotation` and `HandArrow` (red-pen notes), `Wordmark`
  (letters as windows onto the fleet), `RotatingWord`, `EasterEgg` (six clicks,
  then the film's engine note), `LetsCta`, `SiteHeader`, `SiteFooter` (real
  branches), `AuthPanel` and `WelcomePanel`, `FleetIndex` (the ghost stack).
- `lib/services/branches.ts` (branches, fleet summary, fleet photos, phone
  formatting), `lib/services/users.ts`, `lib/photo-credits.ts`.
- `tests/film-timeline.test.ts` (15 tests). Smoke test rewritten for the film:
  41 checks.

#### Changed
- Type: Fraunces (variable, optical size), Six Caps, Inter, Shadows Into Light
  Two, replacing Playfair Display. Tokens: ember, oxblood, blush, studio, and
  three corner-anchored fields. Radius 0 kept everywhere. `DESIGN.md` rewritten.
- Every page restyled: catalog (ghost stack on desktop, photo cards on touch),
  detail (tilted photo, delivery panel), checkout (charcoal summary), bookings,
  confirmation, login (carmine, swings in), admin, 404, error, loading.
- `getCar` returns the branch phone. `CarPhoto` renders the composites and keeps
  the labelled slot for a car without one.
- Cache headers for `/film/*` (immutable, versioned) and fleet photo files.
- `Field` takes `tone` (light, dark, hot) and `size`; `Button` gains `blush`.

#### Removed
- The autoplaying intro: `IntroSequence`, `VideoStage`, `AuthGate`,
  `useIntroMachine` and its tests, the catalog's particle assembly
  (`AssembleOnView`), `SiteNav`, `AuthForm`, `Gridlines`. The particle stage
  stays for the sign-in dissolve.

#### Fixed
- The smoke test's "boot loader shows a progressbar" race (it read the loader
  after it had already gone on a fast machine).
- The confirmation page nested a `<button>` in an `<a>`.

#### Verified (Windows 11, Node 24, MySQL 8.0, Chrome)
`lint`, `lint:copy`, `typecheck`, `npm test` (38 pass, 2 skip), `test:db`
(45 pass), `build`, `smoke` (41/41 against `next start`), `check:leaks`.
Screens reviewed at 1440x900 and 390x844, in reduced motion, and in dark mode.

### 2026-10-07: ESLint CLI, pushed

#### Changed
- `npm run lint` is `eslint . --max-warnings=0` with a flat `eslint.config.mjs`
  (`next/core-web-vitals` through FlatCompat), replacing `.eslintrc.json` and
  the deprecated `next lint`. CI now runs it.
- Removed an `eslint-disable no-var` directive in `lib/db.ts` that disabled a
  rule the config never enables.
- `source-map-js` 1.2.2 (via PostCSS) for GHSA-68fv-2mgg-jv7q, a high
  advisory published after Phase 9; production audit back to 0.
- `npm run smoke` retries the booking step with fresh dates when an earlier
  run's booking holds the window (a correct 409), which made it flaky as
  bookings accumulated. Three consecutive runs: 35/35.
- `integrate/combine-frontends` pushed; PR #23 now carries Phases 10, 11, and 9.
  `CLAUDE.md` and `PROJECT_STATUS.md` record it.

### 2026-10-05: Phase 9, hardening

#### Added
- `npm run check:leaks` (`scripts/leak-check.mjs`): 37 hostile and
  unauthorised requests across every route, failing on any stack frame, SQL,
  driver code, or path in a response. Run with the database up and down.
- `ButtonLink` and shared `button-styles.tsx`; `RouteLoading` and
  `loading.tsx` on every data route; `FilmOnRequest` (the reduced-motion play
  control); generated `app/icon` also served at `/favicon.ico`;
  `lib/validation/id.ts` with tests.
- Tokens `--accent-text` (carmine text and focus in dark mode, #E66256) and
  `--muted-on-surface`, with the `.surface-panel` class.
- Smoke test now 35 checks, including reduced motion's play control.

#### Changed
- Hero headline is two lines ("Delivered / to your door."); the brand line
  moved into the subtext. The charcoal band's emphasis is paper italic.
- Gridlines are drawn by the content's own 12-column grid, from 1024px.
- CI audit gates on production dependencies (`--omit=dev`); full audit is
  informational. Next 15.5.27, `overrides` lifts Next's nested PostCSS.
- Fonts trimmed to the weights used (Playfair 400, Inter 400 and 500).
- Particle captures run one at a time on idle and embed latin faces only.
- Boot loader floor and ceiling count from navigation start.
- Admin status transitions are compare-and-set; conflicts return 409.

#### Fixed
- Gold used as a text colour (charcoal band) and as a state signal (toast).
- Dark-mode carmine text at 2.4:1; muted text on taupe panels at 4.42:1;
  carmine field errors on the dark gate.
- Motion animations ignored `prefers-reduced-motion`.
- Landing links reachable by Tab behind the film; boot loader covering the
  page forever without JavaScript.
- `<Link><Button>` nesting; link underline animated `width`.
- Mobile nav overlapping the wordmark at 375px.
- Route ids accepting `0x10`, `1e3`, `1e20`; unknown branch returning 500.
- Card photos repeating the car name to screen readers.
- Checkout silently accepting a return date before pickup.

#### Verified
- Lighthouse with real throttling: mobile LCP 1.6 to 1.7s, CLS at most 0.002,
  accessibility 100. INP by Event Timing at 4x CPU: worst 80ms.
- axe-core clean on every page in light and dark; radius 0 computed on every
  element; responsive at 320 to 1600; keyboard-only booking; throttled
  networks never strand the loader. Real devices and real screen readers
  were not available.

### 2026-10-05: Phase 11, port the Vite intro effects

#### Added
- `components/fx/particle-stage.ts`: the prototype's WebGL2 particle stage (one
  shared canvas, dissolve and assemble jobs), with a `Z.particles` layer,
  WebGL context-loss recovery that finishes pending jobs, and pure `uvFit` and
  `effectiveDensity` helpers under unit test.
- `components/fx/use-particles.ts`: DOM capture through `html-to-image` (loaded
  on demand), `useParticleDissolve`, and `useParticleAssemble`.
- Sign-in dissolves the gate's type into sand while its backing fades.
- The film's held last frame scatters into the landing at `COMPLETED`.
- Catalog cards condense out of sand on first view (`AssembleOnView`), with a
  CSS failsafe so no-JS, reduced motion, and failed hydration still show them.
- Intro: `CLEAR_ERROR` event, `SCATTER_MS`, `DISSOLVE_MS`, `GATE_SCRIM_OPACITY`.
- `docs/VIDEO_STATE_MACHINE.md` section 10 (particle effects); smoke test grows
  to 34 checks including reduced motion and JavaScript disabled.

#### Fixed
- Registering from the intro gate always failed: no mobile field, and it
  posted to the login endpoint.
- Signed-in visitors still met the gate: `ALREADY_AUTHENTICATED` was never sent.
- The gate vanished instantly instead of fading; the film vanished instead of
  revealing the landing.
- Video dimming animated `filter`; replaced with an opacity scrim.
- `VideoStage` re-registered its listeners and re-armed its stall timer on
  every render because its callbacks were recreated each time.
- `docs/VIDEO_STATE_MACHINE.md` gave `POSTER_TIME` as 0.04; the code's
  measured value is 1.2.

#### Removed
- Ported and do-not-port files from `reference/vite-intro/`. Only the gold logo
  loader remains, blocked on a carmine render of the mark.

### 2026-10-05: Phase 10, close the gaps

#### Added
- `POST /api/auth/refresh`: rotates both tokens on every call. Refresh token
  ids are recorded in a new `refresh_tokens` table (plus
  `database/migrations/001_refresh_tokens.sql`); a retired token replayed
  outside a 10 second two-tab window revokes the user's whole token family.
  The role is re-read from `users` on each refresh. Logout now revokes the
  token server-side. The refresh cookie path widened from
  `/api/auth/refresh` to `/api/auth` so logout can read it.
- `lib/api-client.ts`: `apiFetch` retries once after a single, de-duplicated
  refresh when a call returns 401. Used by checkout and every admin mutation.
  `/login` tries a silent refresh before asking for a password.
- `docs/ERD.md`: Mermaid ERD, relationships, normal form, constraints, and the
  measured `EXPLAIN` showing `idx_bookings_overlap` as a covering range scan.
- `components/ui/Card.tsx` (border-t card per DESIGN.md section 6), used in the
  catalog, admin dashboard, admin bookings, admin fleet, and customer bookings.
- `components/ui/CarPhoto.tsx`: real photo, or a labelled "Photograph pending"
  slot with `data-placeholder="car-photo"`.
- `lib/safe-redirect.ts` with tests: `?next=` accepts same-origin paths only.
- Tests: `tests/refresh-rotation.test.ts` (MySQL), `tests/safe-redirect.test.ts`.
- Scripts: `npm run test:db` (tests with `.env` loaded), `npm run smoke`
  (`scripts/smoke.mjs`, 27 browser checks through `playwright-core`).

#### Changed
- Seed cars have `image_url = NULL` instead of random picsum stills; picsum
  removed from the CSP `img-src`. Admin photo field takes a `/cars/<file>` path.

#### Fixed
- `npm run db:setup` never ran: a `'\'` string literal in the SQL splitter
  was a syntax error.
- Double-booking test 2 failed against a real database because test 1 left
  its booking behind. Bookings are now cleared before each test. The
  concurrency test itself passed: two simultaneous bookings yield exactly one.
- Every invoice returned 500 in a production build: webpack bundled `pdfkit`
  away from its `.afm` font files. Now in `serverExternalPackages`.
- Editing a car in admin silently cleared its photo and description.
- Open redirect through `/login?next=https://...`.

#### Verified
- MySQL 8.0.46 in the sandbox: `db:setup`, `test:db` 34/34, `npm test`
  27 pass and 2 skip without a database, `build`, and `smoke` 27/27.

### 2026-10-04: Combine the two frontends, make the repo resumable

#### Added
- `reference/vite-intro/`: the earlier React + Vite prototype (branch
  `frontend-react`), kept as reference for its WebGL particle intro. Excluded
  from typecheck and lint. `REFERENCE.md` lists what to port and what not to.
- Intro film variants (`public/videos/`, about 7.5 MB) and poster stills
  (`public/posters/`) are now committed, so a fresh clone or cloud session
  plays the intro without the 16 MB source.
- `build:assets` accepts `--poster-time` so the poster matches `POSTER_TIME`;
  previously it cut the poster at the first non-black frame (0.373s), which
  was still too dark.
- `CLAUDE.md`: "Current state" section, "If the user just says continue", and a
  mandatory end-of-session update of CHANGELOG, PROJECT_STATUS, and Current state.

#### Changed
- `PROJECT_STATUS.md` rewritten to match the code: Phases 0 to 8 ticked where
  implemented, new Phase 10 (close the gaps, active) and Phase 11 (port the Vite
  intro effects), Phase 9 hardening moved last.
- `README.md`: committed media, `npm run db:setup`, new docs listed.
- `tsconfig.json` excludes `reference/`.

#### Found (not yet fixed, tracked in Phase 10)
- `POST /api/auth/refresh` does not exist although the refresh cookie is scoped to it.
- `docs/ERD.md` is referenced but missing. No shared `Card` component.
- Seed car images are random `picsum.photos` stills.
- Never run against a live MySQL; the double-booking test skips without one.

### 2026-08-26: MVP

Reconstructed from commit messages `3d0c7cc`, `4a71c27`, `468a03e`, `af746f0`.

#### Added
- Next.js 15 foundation, Argon2id + `jose` auth with `httpOnly` cookies, rate
  limiting, CSRF on admin mutations, and the intro sequence (loader, video
  stage, auth gate) as a unit-tested reducer.
- Transactional booking engine with `FOR UPDATE` locking, pricing and Haversine
  services with tests, double-booking concurrency test, and CI.
- Fleet catalog with `searchParams` filters and car detail pages.
- Checkout with live price and delivery quote, mock card/UPI payment,
  confirmation, customer bookings dashboard, PDF invoices, sign-in page, and
  admin for fleet, bookings (transition graph), and deliveries.

#### Fixed
- CSP blocked Next's inline RSC scripts and emptied the page after hydration;
  moved to a per-request nonce in middleware.
- Invisible primary button on the dark auth panel and in dark mode.

### 2026-08-26: Project charter

#### Added
- Repository initialised, private, with secret hygiene in place before any code
- `.gitignore` excluding `.env`, `node_modules`, and generated video assets
- `.env.example` covering server, database, auth, and rate-limit configuration
- `DESIGN.md`: full design system, carmine accent drawn from the hero film,
  resolved conflicts between the design brief and the design skill's hard bans
- `docs/VIDEO_STATE_MACHINE.md`: the intro sequence contract, including the
  buffer-driven loader, autoplay policy, and every recovery path
- `CONTRIBUTING.md`: git, worktree, and review protocol for parallel agents
- `SECURITY.md`: threat model, security rules, and the Content Security Policy
- `README.md`: setup and run instructions

#### Changed
- Stack moved from Express plus vanilla JavaScript plus Bootstrap to Next.js 15,
  React 19, TypeScript, and Tailwind v4. Rationale in `ARCHITECTURE.md`.
- Sessions moved from client-readable JWTs to `httpOnly` cookies, removing the
  XSS-to-account-takeover path
- Password hashing moved from bcrypt to Argon2id
- `ARCHITECTURE.md` rewritten for the new stack, with the double-booking
  transaction and locking strategy specified
- `PROJECT_STATUS.md` rephased into ten phases grouped into concurrency waves
- `PRD.md` gained the entry sequence specification
- `CLAUDE.md` rewritten around the new stack and the design skill's non-negotiables

#### Security
- `.env` confirmed excluded from version control before the first commit
