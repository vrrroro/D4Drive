# Changelog

All notable changes to this project are documented here.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

Entries are grouped by session date, newest first. Every session adds one.

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
