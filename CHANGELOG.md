# Changelog

All notable changes to this project are documented here.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

Entries are grouped by session date, newest first. Every session adds one.

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
