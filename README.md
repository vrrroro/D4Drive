# D4DRIVE

A members-only car rental frontend, opening with a scripted film.

> **Project docs:** `CLAUDE.md` (how to work on this repo), `PROJECT_STATUS.md` (what's done / next), `ARCHITECTURE.md`, `PRD.md`, `EDRD.md` (design system). The backend (Express + MySQL in `server/`) is not built yet.

```
npm install
npm run dev      # http://localhost:5173
npm run build
```

---

## The opening film

`src/sequence/Boot.tsx` is the state machine. Everything else in `src/sequence/`
is a piece it drives.

| Phase | What happens |
| --- | --- |
| `logo` | `LogoLoader` — the mark spins, cross-dissolving into itself for as long as the car film is still buffering, then decelerates and settles facing camera. |
| — | Curtain to black (900ms), held (280ms). |
| `approach` | `CarStage` plays from 0. Tight on the glass, pulls out, turns left → front. Curtain lifts as it goes; the clip's own first half-second is near black, so the two read as one gesture. |
| `login` | Paused dead head-on. Scrim washes in, `LoginPanel` rises. |
| `depart` | Submit. The panel's type turns to sand and blows off the car; the scrim lifts and the film resumes. |
| — | The car finishes its turn onto the right side and leaves frame. |
| `scatter` | The last frame — skid marks on white — scatters too, and the site is underneath. |

**Skip** sits bottom-right during the first two phases. After one run the film is
marked seen in `sessionStorage`, and a reload opens straight on the login. In dev,
`?stage=site` jumps past all of it (`&role=concierge` for the other badge).

### Cut points

`src/lib/sequence.ts` holds the timings. Two were measured off the source files,
not eyeballed — **if you swap a video, re-measure them**:

- **`CAR.headOn = 5.267s`** — where the film stops for the login. Found by
  minimising left/right mirror error across 4.9s–5.7s: the error bottoms out at
  15.4 here against ~49 at either end of that window.
- **`LOGO.loopAt` / `LOGO.crossfade`** — the logo clip is a half-rotation with a
  dolly-in and contains **no matching frame pair** (best RMSE ≈ 40/255), so it
  cannot be spliced. The loop has to be a cross-dissolve, and 700ms is long
  enough that it reads as a camera move rather than a cut.

`LOGO.minSpin` is a floor, not a duration: the loop runs until the car film
reports it can play through *and* that much spin has been seen. The loop is the
loading state; the deceleration is the loaded state.

---

## Particles

One WebGL2 context, one fixed full-viewport canvas, many concurrent jobs —
`src/fx/particle-stage.ts`. A job takes any rasterisable source plus a live
viewport rect and either scatters it (`dissolve`) or condenses it (`assemble`).

A single shared context is deliberate: browsers cap concurrent WebGL contexts at
roughly 16, and the fleet grid alone would blow past that with a canvas per card.

The scatter maths mirrors the ParticleScroll component this project is built
around — same hash, same swirl/gravity/drift vocabulary — so every dissolve on
the site shares one motion DNA. Tuning knobs are documented on `ParticleOptions`.

Three things worth knowing before you touch it:

- **`desaturate` is a shader uniform, not CSS.** WebGL samples the raw file, so
  anything rendered under `grayscale()` has to pass `desaturate: 1` or the sand
  arrives in colour and snaps grey the instant it lands.
- **No `UNPACK_FLIP_Y`.** Sampling happens in the rect's own top-left-origin
  coordinates; flipping on upload renders every plate upside down.
- **Hiding the real element is timed to a frame.** The stage queues its rAF
  first, so hiding inside a following `requestAnimationFrame` lands after the
  opening (pixel-identical) particle frame is drawn — earlier flashes a gap,
  later doubles the image.

Every path degrades: no WebGL2, or `prefers-reduced-motion`, and callers fall
back to a CSS fade. Assembling photographs carry a deadline that reveals them
regardless, so a frozen tab or a lost context can never strand one invisible.

### Rasterising the login

The login panel carries no background of its own — it is type and hairlines on
the scrim — so the dissolve turns the *letters* into sand rather than shattering
a card. Getting the DOM into a texture (`html-to-image`) has two constraints:

- **Fonts are bundled and latin-only** (`src/main.tsx`, plus a hand-written
  `@font-face` for Inter Variable in `index.css`). Every declared face is fetched
  and inlined as a data URI during capture; the full multi-script families made
  that a five-second stall. The embed CSS is resolved once and cached, and warmed
  on idle while the visitor is still reading. Add a subset back if the copy needs
  one — and expect the capture to cost more.
- **`::placeholder` does not survive rasterisation.** `ui/Field.tsx` renders its
  hint as a real span; left as a placeholder attribute it captured as flat white
  body text and popped the moment the dissolve began. Same applies to any
  pseudo-element you add inside the panel, and to `backdrop-filter`.

---

## Design system

Luxury / editorial. Tokens live in `@theme` in `src/index.css` and nothing should
hard-code a hex outside it.

Warm alabaster `#F9F8F6` and rich charcoal `#1A1A1A` — never pure white or black.
Gold `#D4AF37` is an accent for hover, focus and emphasis, never a surface.
Playfair Display for headlines, Inter for everything else. Radii are removed from
the scale entirely (`--radius-*: initial`), so `rounded-*` utilities do not exist.
Motion is slow on purpose: 500ms interactions, 1500–2000ms on images.

Two deliberate departures from the brief:

- **Button labels flip to charcoal as the gold slides in.** The spec keeps them
  white; white on `#D4AF37` is 1.9:1, and charcoal on gold is 5.2:1.
- **Gridlines sit at 10% rather than 20%.** Four full-height hairlines at 20%
  across an alabaster ground read as a table, not a grid.

---

## Assets

`public/media/` and `public/fleet/` are generated from the two source clips —
transcoded with `+faststart` (14.6MB → 3.7MB) and stills cut at chosen angles.

Fleet photography is currently frames of the reveal film, which is why every car
wears the same livery — turned into the house conceit ("one livery, no
exceptions"). Drop real shots into `public/fleet/` and repoint `image` in
`src/data/fleet.ts`; nothing else changes.

The car clip keeps its audio track but plays muted throughout. If you want the
engine on the take-off, unmute in `CarStage` after the login submit — that is a
user gesture, so autoplay policy allows it.
