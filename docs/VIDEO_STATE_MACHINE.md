# The Landing Film: Scroll-Scrub Contract

The landing page is the film. A red 911 on a white studio cyclorama: a close-up
of the door, the camera pulling back along the flank, the car turning to face
you and away, then a burnout and a take-off through its own smoke. The visitor's
scroll is the playhead. Forward plays it, back rewinds it, stopping holds the
frame. The company's story is told in the spaces the film leaves, and when the
car takes off the smoke fades into the sign-in panel.

This document is the contract for `components/film/`. It replaces the earlier
autoplaying intro (loader, frozen frame, sign-in gate, film, landing), which is
in the git history before 2026-10-08.

---

## 1. Why stills, not a video element

Setting `video.currentTime` on every scroll tick decodes from the previous
keyframe, which stutters in Safari and Firefox and depends on the encode. The
film ships instead as a numbered sequence of stills drawn into a canvas:

- `scripts/build-film-frames.mjs` cuts every frame from 1.25s (past the fade up
  from black) to the end: 264 stills, 1600x900 WebP at quality 70, about 22 KB
  each, 5.6 MB in all. A studio shot on a white backdrop compresses very well;
  the set is smaller than the 1080p MP4 it replaces.
- It also measures where the car is in each frame (it is the only saturated red
  on a grey set) and writes that, smoothed, to `lib/film-manifest.ts`, along
  with the count and sizes.
- It cuts the engine rev and burnout from the soundtrack (6.6s to 10s, where
  the RMS climbs from -23 dB to -12 dB) for the easter egg.

The output folder is versioned (`public/film/v1`) and served immutable. Change
the film, bump `VERSION` in the script.

---

## 2. Geometry

The film is pinned (`position: sticky`) inside a track 700vh tall (600vh on
portrait), so the 264 stills spread over about 540vh: roughly 18px of wheel per
still on a 900px screen.

Two ways to put a 16:9 film on a screen (`timeline.fitModeFor`):

| Mode | When | Placement |
|---|---|---|
| `cover` | aspect at least 1.1 | Fills the viewport, crops symmetrically |
| `band` | portrait | A horizontal band (46% of the height), cropped to keep the car centred using the manifest's per-frame focus, never past the frame's own edges. The band's top and bottom dissolve into the page. |

The hero opens on a **window**: a slab about 60vw by 23.5vh into which the film
is drawn, framed on the door just under the glass at 1.12x. The tagline overlaps
it. As the visitor starts to scroll the window opens to the full film rectangle
while the framing eases back to the film's own, which plays as a short dolly
out. FilmStage publishes the closed window and film rectangle as CSS variables
(`--win-*`, `--film-*`) on the stage, so the type lines up with the canvas at any
size; `globals.css` holds matching fallbacks for the server render.

---

## 3. The timeline

All of it in `components/film/timeline.ts`, pure, unit tested.

Scroll progress `p` (0 to 1 across the track) maps to film frames in segments,
one beat each:

| p | Frames | Beat |
|---|---|---|
| 0 to 0.09 | 0 to 24 | Door close-up; the window opens |
| 0.09 to 0.25 | 24 to 80 | Pull back along the flank |
| 0.25 to 0.45 | 80 to 136 | The car turns to face you (head-on at 120) |
| 0.45 to 0.66 | 136 to 205 | It keeps turning: front three-quarter, right flank |
| 0.66 to 0.90 | 205 to 263 | Burnout and take-off |
| 0.90 to 1 | 263 | Smoke; fades into the page by 0.985 |

The mapping is monotonic: scrolling forward never plays the film backward.

Copy (`CHAPTERS`, as fade-in-from, fully-in, start-out, gone):

| Chapter | Window | Space it uses |
|---|---|---|
| Hero | until 0.032 | The page around the window; gone before the window opens under it |
| Flank | 0.10 to 0.255 | The band above the car; body in the top right |
| Roast | 0.275 to 0.46 | The flanks while the car faces the camera; body on the floor |
| Delivery | 0.475 to 0.66 | The band above; tiers top right; body on the floor |
| Take-off | 0.72 to 0.985 | The smoke |

No two chapters are ever on screen at once (tested). Opacity follows the scroll
exactly; each chapter's drift is on a spring, so copy keeps settling for a
moment after the wheel stops. That trailing settle is the system's heading lag.

On portrait, copy stacks above and below the band; the delivery tiers and the
roast body drop out there (`.ch-landscape-only`).

---

## 4. Drawing

`FilmStage` owns a canvas and a `FrameLoader`. Drawing is driven by events, not
a loop: a change in the (lightly sprung) scroll progress, a frame arriving, or a
resize each request one animation frame, and that frame draws once. Nothing in
the draw path touches React state.

Each draw:

1. Sets the canvas opacity from the fade (`FADE_OUT`, 0.9 to 0.985). Always, even
   when the frame has not changed: the last still holds while it fades.
2. Works out the fractional frame. Skips if neither the frame nor the window
   moved.
3. Draws the exact still, or the nearest loaded one, clipped to the window. If
   the playhead sits between two stills, blends the next one in by the fraction,
   which reads as continuous motion rather than steps.
4. In band mode, fades the band's edges into the page ground (to the ground
   colour at zero alpha, not to transparent black, which draws a grey bar).

`data-frame` on the canvas reports the frame for the smoke test.

---

## 5. Loading

`FrameLoader` fetches stills six at a time in coarse-to-fine order
(`timeline.loadOrder`): frame 0, then every 16th across the whole film, then
every 8th, 4th, 2nd, and finally the rest. Scrubbing works from the first moment
on a slow connection, at a lower frame rate, and sharpens as stills land. Phones
(coarse pointer, short side under 820px) load even frames only: half the bytes,
and at a thumb's speed it does not show.

Stills stay as `HTMLImageElement`s, decoded by the browser on first draw. They
are not pre-decoded into ImageBitmaps: 264 decoded frames would pin about 1.5 GB.

---

## 6. The boot loader

The loader (wordmark, real progress rule) covers the landing until the coarse
pass is in: frame 0, every 8th frame, and the first few (`timeline.bootSet`,
about 40 stills, under 1 MB). Its progress is the share of that set that has
actually arrived. It never moves backward.

| Constant | Value | Why |
|---|---|---|
| `BOOT_MIN_MS` | 900 | First visit only: a cached load must not flash the wordmark |
| `BOOT_MAX_MS` | 6000 | Let go regardless; the scrub draws the nearest loaded still |
| `LOADER_FADE_MS` | 700 | Colour-transition tier |

Both limits count from navigation start, not hydration. A failed still counts
toward boot (its neighbour covers it), so a missing file can never strand the
loader. After the first visit in a session (`sessionStorage`), the floor is
dropped.

The loader is server-rendered so it covers the first paint. Without JavaScript,
or with reduced motion, CSS hides it.

---

## 7. The hand-over to sign-in

The take-off chapter ("Your turn.") sits in the smoke. From 0.9 the canvas
fades and the smoke becomes the page ground; at the end of the track the stage
scrolls away, already the same colour as the page, and the sign-in panel
(`AuthPanel`, light) follows straight on. A signed-in visitor gets
`WelcomePanel` there instead: no form, the fleet and their bookings.

Signing in from the panel turns its type into sand (the particle stage in
`components/fx`, drifting the way the car left) and lands on the fleet.

---

## 8. Reduced motion and no JavaScript

`prefers-reduced-motion: reduce` and `(scripting: none)` get the same thing,
by CSS first and by script once hydrated: no canvas, no loader, no smooth
scroll. The track becomes a plain document: the hero as type, then each chapter
in order with its own still (lazy-loaded, so the scrubbing layout never fetches
them). The take-off chapter offers the film as a video with controls
(`FilmOnRequest`), because a preference for less motion is not a prohibition on
watching something.

---

## 9. Files

```
components/film/
  FilmStory.tsx      the track, the pinned stage, the loader; owns progress
  FilmStage.tsx      the canvas and every draw
  FilmHero.tsx       the opening frame and its entrance
  FilmChapter.tsx    one beat of copy
  FilmOnRequest.tsx  the film as a video, for reduced motion
  BootLoader.tsx     wordmark and progress rule
  FilmContext.tsx    progress, ready, reduced
  frame-loader.ts    fetch order and nearest-frame lookup
  timeline.ts        every number above, pure
  constants.ts       loader timings, spring, video sources
lib/film-manifest.ts generated: count, sizes, per-frame car position
scripts/build-film-frames.mjs
public/film/v1/      the stills and engine.m4a
```
