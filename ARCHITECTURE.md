# System Architecture

## 1. Tech Stack
- **Frontend:** React 19, TypeScript, Vite 7, Tailwind CSS v4, `motion`, `lucide-react`, `html-to-image` (login dissolve), WebGL2 particle stage. Single-page app.
- **Backend:** Node.js, Express.js — REST API under `/api`.
- **Database:** MySQL (relational, 3rd Normal Form), accessed with `mysql2` connection pool and raw parameterised SQL.
- **Backend libraries:** `express`, `mysql2`, `bcryptjs`, `jsonwebtoken`, `dotenv`, `cors`, `cookie-parser`, `multer` (image uploads), `pdfkit` (invoices).

## 2. Directory Structure
```text
D4Drive/
├── package.json            # frontend (Vite) — npm run dev / build / preview
├── index.html, vite.config.ts, tsconfig.json
├── public/
│   ├── media/              # opening-film videos + stills
│   └── fleet/              # car photography
├── src/
│   ├── App.tsx             # Boot (opening film + login) → Site
│   ├── sequence/           # opening film state machine: Boot, LogoLoader, CarStage, LoginPanel
│   ├── site/               # landing site: Header, Hero, Fleet, Experience, Enquiries/Footer
│   ├── ui/                 # Button, Field, Reveal/GridLines
│   ├── fx/                 # WebGL2 particle stage + hooks
│   ├── lib/                # cn(), sequence timings
│   └── data/fleet.ts       # TEMPORARY static fleet — replace with API data
│
└── server/                 # backend (to be built — Phase 1)
    ├── package.json
    ├── server.js
    ├── .env                # copied from /.env.example, never committed
    ├── config/             # db.js (mysql2 pool)
    ├── middleware/         # auth (JWT), requireAdmin, error handler
    ├── routes/             # API route definitions
    ├── controllers/        # req/res logic
    ├── services/           # business logic: pricing, distance (Haversine), availability
    ├── utils/              # helpers, validators
    ├── database/           # schema.sql, seed.sql
    └── uploads/            # stored images (gitignored)
```

## 3. How the pieces connect
- In development, Vite serves the SPA on `http://localhost:5173` and the API runs on `http://localhost:5000`. Add a Vite `server.proxy` entry for `/api` → `http://localhost:5000` so the frontend can call relative `/api/...` URLs.
- In production, Express serves the built `dist/` folder statically and the API from the same origin.
- Auth: login returns a short-lived JWT access token; the refresh token is set as an httpOnly cookie. TTLs and secrets are in `.env.example`.
- Roles: the UI's **Member** maps to a customer account; **Concierge** maps to an admin account (`requireAdmin`).

## 4. Frontend flow
`App.tsx` renders `Boot` until the visitor signs in, then `Site`. `Boot` runs the opening film (logo → car approach → login → depart → scatter); see `README.md` for each phase and its timings. In dev, `?stage=site` (optionally `&role=concierge`) skips straight to the site.
