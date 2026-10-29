# D4Drive

**Drive easy. Book smart. Delivered to you.**

A self-drive car rental and doorstep-delivery platform for Bengaluru. The landing
page is a film of a red 911 that the visitor scrubs with their own scroll: the
company's story sits in the spaces the film leaves, and when the car takes off
its smoke fades into the sign-in panel. Every other page follows the same
editorial system: Fraunces at poster scale, a condensed wordmark cropped by the
page, red-pen notes, and full-bleed panels dealt in like cards.

---

## Stack

Next.js 15 (App Router) - React 19 - TypeScript - Tailwind v4 - Motion - Lenis - MySQL 8

No ORM. Queries are hand-written and parameterised.

## Setup

**Requires:** Node 20 or newer, MySQL 8 running locally.

```bash
git clone https://github.com/vrrroro/D4Drive.git
cd D4Drive
npm install
```

Create your environment file and fill it in:

```bash
cp .env.example .env
```

Generate the two JWT secrets:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

Create the database and load the schema:

```bash
mysql -u root -p -e "CREATE DATABASE d4drive CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
mysql -u root -p d4drive < database/schema.sql
mysql -u root -p d4drive < database/seed.sql
```

Or do it all in one step with `npm run db:setup` (uses the `.env` credentials),
which also loads `database/routines.sql` (the stored functions, procedures,
triggers and view) between the schema and the seed. With the `mysql` client,
load `schema.sql`, then `routines.sql`, then `seed.sql`.

**A database created before 2026-10-12 must be rebuilt** with
`npm run db:setup`: the booking engine now runs in the stored procedures, and
the schema gained a table, columns and constraints. `docs/DATABASE.md` is the
database write-up (ER diagram, relational schema, constraints, routines,
queries, and how each transaction flows); `/admin/database` shows it live.

Run it:

```bash
npm run dev
```

### Assets

Everything generated is committed, so a fresh clone runs as is: the film's
scrubbed stills (`public/film/v4/`, 524 frames at 60 a second, 12.1 MB, from `D4DRIVEMAIN.mp4`), the fleet photographs
(`public/cars/`, studio composites of Creative Commons photos, credited on
`/credits`), and the film as video (`public/videos/`, used only by reduced
motion's "Play the film"). Only if you replace the film:

```bash
npm run build:assets -- --input ~/Downloads/D4Drive.mp4 --poster-time 1.2
npm run build:frames
```

then bump `VERSION` in `scripts/build-film-frames.mjs`, because the stills are
cached forever. The fleet photographs rebuild with `scripts/fleet-photos/`
(Python; see its README).

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript, no emit |
| `npm run lint:copy` | Fails on em-dashes and en-dashes in user-visible strings |
| `npm run build:assets` | Transcodes the hero film and extracts poster stills |
| `npm run build:frames` | Cuts the film into scrubbed stills and writes `lib/film-manifest.ts` |
| `npm run db:setup` | Creates the database, loads schema, routines and seed from `.env` |
| `npm run build:erd` | Redraws `docs/erd.svg` and `public/erd.svg` from the schema |
| `npm run test` | Unit tests; the MySQL tests skip unless `DB_HOST` and `DB_NAME` are set |
| `npm run test:db` | Same, with `.env` loaded, so the double-booking and refresh-rotation tests run |
| `npm run smoke` | Browser smoke test against a running server (see `scripts/smoke.mjs`) |
| `npm run check:leaks` | Hostile requests against a running server; fails if any response leaks internals |

## Documentation

| File | Contents |
|---|---|
| `PRD.md` | What the product does |
| `ARCHITECTURE.md` | Stack, structure, request flow, double-booking logic, asset pipelines |
| `DESIGN.md` | Design system: tokens, type, motion, components, hard bans |
| `docs/VIDEO_STATE_MACHINE.md` | The landing film: how the scroll scrubs it |
| `docs/DATABASE.md` | The database coursework: ERD, relational schema, constraints, stored programs, queries, transaction walkthrough |
| `docs/ERD.md` | Data model, constraints, indexes, and the verified overlap query plan |
| `CONTRIBUTING.md` | Git, worktree, and review protocol |
| `SECURITY.md` | Threat model and security rules |
| `PROJECT_STATUS.md` | Phases and what is left |
| `CHANGELOG.md` | Every change, newest first |
| `scripts/fleet-photos/README.md` | How the fleet photographs were chosen and made |
| `reference/vite-intro/` | Earlier Vite prototype; only the blocked logo loader is left |

## Status

Complete in code, redesigned on 2026-10-08 (Phase 12). See `PROJECT_STATUS.md`
for what is left.

Payment is **simulated**. There is no real gateway and no card data is stored.
