# Reference: the Vite intro prototype

This folder is **read-only reference material**, not part of the app. It is the
earlier React + Vite frontend (branch `frontend-react`, commit `bc20291`), kept
here so its intro and particle work can be ported into the Next.js app.

It is excluded from `tsconfig.json`, `npm run lint:copy`, and `next lint`. Do not
import from it. Port what you need into `components/` and delete the ported
parts from here when done. When nothing useful is left, delete the folder.

## What is worth porting

| Piece | Where | Notes |
|---|---|---|
| WebGL2 particle stage (dissolve / assemble) | `src/fx/particle-stage.ts`, `use-particles.ts`, `ParticleImage.tsx` | One shared context for many jobs. Read `README.md` > Particles before touching it. |
| Login "turns to sand" on submit | `src/sequence/LoginPanel.tsx` + `html-to-image` | Rasterises the panel and dissolves the letters. Fonts must be same-origin; see `README.md` > Rasterising the login. |
| Logo spin loader | `src/sequence/LogoLoader.tsx`, `public/media/logo-spin.mp4` | Cross-dissolve loop, decelerates when the car film can play through. |
| Scatter into the site | `src/sequence/Boot.tsx` (`scatter` phase) | Last frame of the film scatters to reveal landing content. |
| Fleet cards that assemble from particles | `src/site/Fleet.tsx` | Must read cars from the API, not `src/data/fleet.ts`. |

## What NOT to port as-is

- **Palette:** this prototype uses gold (`#D4AF37`) as the accent. The app's
  `DESIGN.md` uses carmine `#A82519` as the one accent and gold as hairline foil
  only. Recolour to `DESIGN.md` tokens.
- **Copy:** contains em-dashes and British pounds. The app bans em-dashes
  (`npm run lint:copy`) and prices in rupees.
- **Videos:** `public/media/car-reveal.mp4` is a different film from the app's
  `public/videos/d4drive-*.mp4`. Timings in `src/lib/sequence.ts` were measured
  for these files only.
- **Static fleet:** `src/data/fleet.ts` is mock data. The app reads cars from MySQL.
- **Fake login:** the role toggle decided Member vs Concierge. The app uses real
  auth via `/api/auth/login`.
