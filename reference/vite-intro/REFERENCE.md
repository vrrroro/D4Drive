# Reference: the Vite intro prototype (what is left)

This folder held the earlier React + Vite frontend (branch `frontend-react`,
commit `bc20291`) so its intro and particle work could be ported into the
Next.js app. Phase 11 ported it on 2026-10-05 and deleted the ported files.
Everything that was here is still in git history at `bc20291` and `7f90030`.

It is excluded from `tsconfig.json`, `npm run lint:copy`, and `next lint`. Do not
import from it.

## Ported (now in the app)

| Piece | Now lives in |
|---|---|
| WebGL2 particle stage (dissolve and assemble) | `components/fx/particle-stage.ts` |
| DOM capture and the dissolve and assemble hooks | `components/fx/use-particles.ts` |
| Login "turns to sand" on submit | `components/intro/AuthGate.tsx` |
| Last frame scatters into the site | `components/intro/VideoStage.tsx` (`COMPLETED`) |
| Fleet cards that assemble from particles | `components/fx/AssembleOnView.tsx`, used by `app/cars/page.tsx` |

## Deleted without porting

Listed under "What NOT to port" in the original notes: the mock fleet
(`src/data/fleet.ts`) and its Porsche photography (not the seeded Indian
fleet), the prototype's own film (`car-reveal.mp4`) and the timings measured
for it, the fake role-toggle login, and the prototype's landing sections and
UI kit, which the app already has in its own design system.

## Still here, and why

`src/sequence/LogoLoader.tsx` and `public/media/logo-*` are the logo spin
loader. Porting it is optional in `PROJECT_STATUS.md` (Phase 11) and only if a
**carmine-palette** logo clip exists. The only clip is solid gold metal, and
`DESIGN.md` allows gold as a 1px hairline only, never as a filled shape. It
needs a recoloured render from the owner, not a hue shift in code, because it
is the brand mark.

When that render exists, port the loader into `components/intro/BootLoader.tsx`
(the loader must still report real buffer progress, see
`docs/VIDEO_STATE_MACHINE.md` section 3) and delete this folder. If the owner
decides against a logo loader, delete this folder.
