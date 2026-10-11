# The Landing Film: Scroll-Scrub Contract

The landing page is the film. A red 911 on a white studio cyclorama: a close-up
of the door, the camera pulling back along the flank, the car turning to face
you and away, then a burnout and a take-off through its own smoke. The visitor's
scroll is the playhead. Forward plays it, back rewinds it, stopping holds the
frame. It opens out of a black slab in the blank space between the slogan and
the wordmark, pauses on each finished shot while that shot's copy is read,
plays on a grey stage, and when the car has gone the smoke fades back into the
page and on into the sign-in panel.

Revised 2026-10-12 (Phase 14, the owner's items 1, 2, 4 and 5): the slab
replaces the old peeking window, the four holds and the grey stage are new,
and the film is cut at 60 stills a second.

This document is the contract for `components/film/`. It replaces the earlier
autoplaying intro (loader, frozen frame, sign-in gate, film, landing), which is
in the git history before 2026-10-08.

---

## 1. Why stills, not a video element

Setting `video.currentTime` on every scroll tick decodes from the previous
keyframe, which stutters in Safari and Firefox and depends on the encode. The
film ships instead as a numbered sequence of stills drawn into a canvas:

- `scripts/build-film-frames.mjs` cuts the film from 1.25s (past the fade up
  from black) to the end at 60 stills a second, interpolating between the
  source's 30 with ffmpeg's motion-compensated `minterpolate`: 524 stills,
  1600x900 WebP at quality 70, about 22 KB each, 11.2 MB in all. A slow scroll
  then steps through real in-between frames instead of cross-fading stills
  33ms apart, which read as judder. Phones load every other still (5.6 MB,
  the same as the old 30-a-second cut). `--fps 30` rebuilds without
  interpolation.
- It also measures where the car is in each frame (it is the only saturated red
  on a grey set) and writes that, smoothed, to `lib/film-manifest.ts`, along
  with the count and sizes.
- It cuts the engine rev and burnout from the soundtrack (6.6s to 10s, where
  the RMS climbs from -23 dB to -12 dB) for the easter egg.

The output folder is versioned (`public/film/v2`) and served immutable. Change
the film, bump `VERSION` in the script.

---

## 2. Geometry

The film is pinned (`position: sticky`) inside a track 1000vh tall (850vh on
portrait). About half of it plays the film; the rest is the four holds and the
fades.

Two ways to put a 16:9 film on a screen (`timeline.fitModeFor`):

| Mode | When | Placement |
|---|---|---|
| `cover` | aspect at least 1.1 | Fills the viewport, crops symmetrically |
| `band` | portrait | A horizontal band (46% of the height), cropped to keep the car centred using the manifest's per-frame focus, never past the frame's own edges. The band's top and bottom dissolve into the page. |

**The hero and the slab.** The first screen is type only: the slogan at the
top, the whole `D4DRIVE` wordmark at the bottom (sized to the height left,
never cropped), and a blank band between them. FilmStage measures that band
from the layout (`[data-hero-slogan]`, `[data-hero-wordmark]`) and puts the
closed slab in its middle (`timeline.closedSlab`). The slab fades in by itself
1.5s after the slogan lands (`SLAB_ENTRANCE`), or with the first scroll, and
waits. Scrolling opens it to the film rectangle while the film rises out of
its black (`filmAlpha`), framed on the door at 1.12x and easing back to the
film's own framing as a short dolly out. Its opening pushes the slogan up and
the wordmark down (`heroPush`, written as `--hero-up` and `--hero-down`,
transform only) until both are off the screen, in either fit mode.

**The grey stage.** While the film plays, a layer of the studio grey
(`.film-tone`, `#E2DED9`, `mix-blend-mode: multiply`) sits over the canvas and
under the copy, so the white studio stops glaring and the charcoal copy keeps
its contrast. Its opacity is `timeline.stageTone`: up as the slab opens, down
with the smoke. Before and after the film the page is its own ground.

## 3. The timeline

All of it in `components/film/timeline.ts`, pure, unit tested. Film positions
are in beats (the source's own frames at 30 a second, 0 to 263); `frameAt`
scales them to however many stills the manifest has.

| p | Beats | Beat |
|---|---|---|
| 0 to 0.012 | 0 | The slab fades in (if the entrance has not already shown it) |
| 0.012 to 0.07 | 0 to 12 | The slab opens; the film rises out of the black |
| 0.07 to 0.19 | 12 to 80 | Pull back along the flank |
| 0.19 to 0.28 | 80 | **Hold**: the whole car side on |
| 0.28 to 0.40 | 80 to 120 | The car turns to face you |
| 0.40 to 0.49 | 120 | **Hold**: head-on |
| 0.49 to 0.59 | 120 to 176 | It keeps turning |
| 0.59 to 0.68 | 176 | **Hold**: three-quarter, facing right |
| 0.68 to 0.80 | 176 to 263 | Burnout and take-off |
| 0.80 to 1 | 263 | **Hold** on the smoke; from 0.90 to 0.97 the film and the grey fade into the page |

Moving segments ease in and out (`easeInOut`: quadratic over the first and
last 18%, linear between), so the car settles into each hold rather than
stopping on one scroll pixel. The mapping is monotonic: scrolling forward
never plays the film backward.

Copy (`CHAPTERS`, as fade-in-from, fully-in, start-out, gone), each fully shown
for the whole of its hold:

| Chapter | Window | Space it uses |
|---|---|---|
| Flank | 0.165 to 0.30 | The band above the car; body top right; the "not for rent" note at the roof |
| Roast | 0.375 to 0.51 | The flanks while the car faces the camera; body on the floor |
| Delivery | 0.565 to 0.70 | The band above; tiers top right; body on the floor |
| Take-off | 0.775 to 0.94 | The smoke, until the fade begins |

No two chapters are ever on screen at once (tested). Opacity follows the scroll
exactly; each chapter's drift is on a spring, so copy keeps settling for a
moment after the wheel stops. That trailing settle is the system's heading lag.

`filmPhase` (`hero`, `film`, `after`) is written onto the track as
`data-film-phase`: the header hides its wordmark during `hero`, and the hero
stops catching the pointer once the film plays.

On portrait, copy stacks above and below the band; the delivery tiers and the
roast body drop out there (`.ch-landscape-only`).

## 4. Drawing

`FilmStage` owns a canvas and a `FrameLoader`. Drawing is driven by events, not
a loop: a change in the (lightly sprung) scroll progress, a frame arriving, or a
resize each request one animation frame, and that frame draws once. Nothing in
the draw path touches React state.

Each draw:

1. Sets the canvas opacity from the fade (`FADE_OUT`, 0.9 to 0.97) and the
   tone layer's opacity from `stageTone`. Always, even when the frame has not
   changed: the last still holds while it fades.
2. Writes the hero push (`--hero-up`, `--hero-down`) when it changed.
3. Works out the fractional frame and the slab. Skips if nothing moved.
4. Fills the slab black at `slabAlpha`, then draws the exact still, or the
   nearest loaded one, clipped to it at `filmAlpha`. If the playhead sits
   between two stills, blends the next one in by the fraction.
5. In band mode, fades the band's edges into the page ground (to the ground
   colour at zero alpha, not to transparent black, which draws a grey bar).
6. Asks the loader to decode the next eight stills in the direction of travel
   (`FrameLoader.warm`, `img.decode()`), so a still's first draw is never a
   synchronous decode. Each still is also decoded as it arrives.

`data-frame` (the still) and `data-beat` (the film position at 30 a second)
on the canvas are what the smoke test reads.

---

## 5. Loading

`FrameLoader` fetches stills six at a time in coarse-to-fine order
(`timeline.loadOrder`): frame 0, then one still every 16 beats across the whole
film (every 32nd still at 60 a second), then halving the stride down to every
still. Scrubbing works from the first moment on a slow connection, at a lower
frame rate, and sharpens as stills land. Phones (coarse pointer, short side
under 820px) load even stills only: half the bytes, and at a thumb's speed it
does not show.

Stills stay as `HTMLImageElement`s. Each is decoded (`img.decode()`, off the
main thread) before it is offered for drawing, and the ones ahead of the
playhead are decoded again on the way (`warm`), because the browser may drop
decoded pixels it is not using. They are not held as ImageBitmaps: 524 decoded
frames would pin about 3 GB.

---

## 6. The boot loader

The loader (wordmark, real progress rule) covers the landing until the coarse
pass is in: frame 0, one still every 8 beats, and the first few
(`timeline.bootSet`, about 40 stills, under 1 MB, at either cut). Its progress is the share of that set that has
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

The take-off chapter ("Your turn.") sits in the smoke. From 0.9 the canvas and
the grey stage fade together and the smoke becomes the page ground; at the end
of the track the stage scrolls away, already the same colour as the page, and
the sign-in panel (`AuthPanel`, light) follows straight on, then the branch
list (`LocationsSection`) on the same ground. A signed-in visitor gets
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
public/film/v2/      the stills and engine.m4a
```
