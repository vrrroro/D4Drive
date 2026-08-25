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

Build the video assets. The source film is not in the repository, since a 16 MB
binary in git history is permanent:

```bash
npm run build:assets -- --input ~/Downloads/D4Drive.mp4
```

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
| `npm run test` | Unit tests for pricing, distance, availability, and the intro reducer |

## Documentation

| File | Contents |
|---|---|
| `PRD.md` | What the product does |
| `ARCHITECTURE.md` | Stack, structure, request flow, double-booking logic |
| `DESIGN.md` | Design system, tokens, components, hard bans |
| `docs/VIDEO_STATE_MACHINE.md` | The intro sequence contract |
| `docs/ERD.md` | Data model |
| `CONTRIBUTING.md` | Git, worktree, and review protocol |
| `SECURITY.md` | Threat model and security rules |
| `PROJECT_STATUS.md` | Current phase and progress |
| `CLAUDE.md` | Agent instructions |

## Status

In development. See `PROJECT_STATUS.md` for the active phase.

Payment is **simulated**. There is no real gateway and no card data is stored.
