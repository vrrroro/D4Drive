# D4Drive

**Drive easy. Book smart. Delivered to you.**

A car rental and doorstep-delivery platform. The site opens on a branded loader
that fades into the first frame of a hero film, holds an auth gate over that
frozen frame, and releases into the landing page when the film ends.

---

## Stack

Next.js 15 (App Router) - React 19 - TypeScript - Tailwind v4 - Motion - MySQL 8

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

Or do all three in one step with `npm run db:setup` (uses the `.env` credentials).

A database created before 2026-10-05 lacks the `refresh_tokens` table. Either
re-run `npm run db:setup` (it drops and reloads everything) or apply
`database/migrations/001_refresh_tokens.sql`.

Car photographs: the seed leaves `image_url` empty and the UI shows a labelled
"Photograph pending" slot. To add one, put the file in `public/cars/` and set
the car's photo to `/cars/<file>` in the admin fleet page.

The intro film is already in the repo: `public/videos/` (four encodes, about 7.5 MB)
and `public/posters/`. The 16 MB source film is **not** committed. Only if you
replace the film, regenerate them from the new source:

```bash
npm run build:assets -- --input ~/Downloads/D4Drive.mp4 --poster-time 1.2
```

`--poster-time` must equal `POSTER_TIME` in `components/intro/constants.ts`.

Run it:

```bash
npm run dev
```

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript, no emit |
| `npm run lint:copy` | Fails on em-dashes and en-dashes in user-visible strings |
| `npm run build:assets` | Transcodes the hero film and extracts poster stills |
| `npm run db:setup` | Creates the database, loads schema and seed from `.env` |
| `npm run test` | Unit tests; the MySQL tests skip unless `DB_HOST` and `DB_NAME` are set |
| `npm run test:db` | Same, with `.env` loaded, so the double-booking and refresh-rotation tests run |
| `npm run smoke` | Browser smoke test against a running server (see `scripts/smoke.mjs`) |

## Documentation

| File | Contents |
|---|---|
| `PRD.md` | What the product does |
| `ARCHITECTURE.md` | Stack, structure, request flow, double-booking logic |
| `DESIGN.md` | Design system, tokens, components, hard bans |
| `docs/VIDEO_STATE_MACHINE.md` | The intro sequence contract |
| `docs/ERD.md` | Data model, constraints, indexes, and the verified overlap query plan |
| `CONTRIBUTING.md` | Git, worktree, and review protocol |
| `SECURITY.md` | Threat model and security rules |
| `PROJECT_STATUS.md` | Current phase and progress |
| `CLAUDE.md` | Agent instructions, current state, and next step |
| `CHANGELOG.md` | Every change, newest first |
| `reference/vite-intro/` | Earlier Vite prototype, kept only to port its intro and particle effects |

## Status

MVP feature-complete in code; hardening and the intro port are in progress.
See `PROJECT_STATUS.md` for the active phase and `CLAUDE.md` for the next step.

Payment is **simulated**. There is no real gateway and no card data is stored.
