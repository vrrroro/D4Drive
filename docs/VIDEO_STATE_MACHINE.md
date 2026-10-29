# Intro Sequence: Video Playback State Machine

The D4Drive entry experience is one continuous moment: a branded loader that fades
into the first frame of `D4Drive.mp4`, an auth gate held over that frozen frame,
and a cinematic release into the landing page once the video ends.

This document is the contract. The implementation in `components/intro/` must
match it exactly.

---

## 1. States

| State | What the user sees | Video element |
|---|---|---|
| `BOOT` | Alabaster ground, `D4Drive` wordmark, progress rule filling left to right | Created, `preload="auto"`, buffering, not painted |
| `READY` | Loader fades out over 700ms, revealing frame one | Seeked to `POSTER_TIME`, paused |
| `GATED` | Auth panel fades up over the frozen frame, a charcoal scrim dims it | Paused, held |
| `AUTHENTICATING` | Submit button in loading state, panel locked | Paused, held |
| `UNLOCKED` | Panel backing fades over 500ms while its type dissolves into sand (section 10) | `play()` called |
| `PLAYING` | Video running, no chrome, no controls | Playing |
| `COMPLETED` | Held final frame scatters into the landing content (section 10) | Paused at final frame, unmounted once the scatter ends |
| `RECOVERED` | Poster still, landing content revealed directly | Never played |

`RECOVERED` is not a failure screen. It is the graceful path for reduced motion,
media errors, stalled networks, and returning visitors. The user still gets the
product, just without the cinema.

---

## 2. Transitions

```
   mount
     │
     ▼
┌──────────┐   buffer >= THRESHOLD    ┌─────────────┐
│   BOOT   │─────────────────────────▶│    READY    │
└────┬─────┘                          └──────┬──────┘
     │                                       │ 700ms fade
     │                                       ▼
     │                                ┌─────────────┐
     │                                │    GATED    │◀────────┐
     │                                └──────┬──────┘         │
     │                                       │ submit         │ 401 / 422
     │                                       ▼                │
     │                             ┌──────────────────┐       │
     │                             │  AUTHENTICATING  │───────┘
     │                             └────────┬─────────┘
     │                                      │ 200
     │                                      ▼
     │                               ┌────────────┐
     │                               │  UNLOCKED  │
     │                               └──────┬─────┘
     │  error                               │ play()
     │  stall > STALL_TIMEOUT                ▼
     │  prefers-reduced-motion        ┌─────────────┐
     │  session.introSeen             │   PLAYING   │
     │                                └──────┬──────┘
     ▼                                       │ ended
┌─────────────┐                              ▼
│  RECOVERED  │──────────────────────▶┌─────────────┐
└─────────────┘  both reveal landing  │  COMPLETED  │
                                      └─────────────┘
```

**Only `AUTHENTICATING` can return to a previous state.** Every other edge moves
forward. The intro never replays within a session.

Two edges are not drawn above:

- `READY` and `GATED` both accept `ALREADY_AUTHENTICATED` and move straight to
  `UNLOCKED` (section 6). `IntroSequence` sends it on reaching `READY` when the
  server rendered the page with a session.
- `GATED` accepts `CLEAR_ERROR` as a self-edge: switching the panel between
  sign in and register drops the other form's error without leaving the state.

A `LOADER_FADED` that arrives after the machine has left `READY` is ignored. The
loader fades on its own clock and must not drag an authenticated visitor back to
the gate.

---

## 3. The loader is real, not theatrical

A progress bar that animates to 100% on a timer is the laziest thing this screen
could do, and it becomes visible as a lie the moment the network is slow. The bar
reports actual buffer state.

```ts
// Drive the bar from TimeRanges, not from a setInterval.
function bufferedFraction(video: HTMLVideoElement): number {
  const { buffered, duration } = video;
  if (!duration || buffered.length === 0) return 0;
  // The contiguous range from t=0 is what matters. A gap means we cannot play through.
  return Math.min(buffered.end(0) / duration, 1);
}
```

Bind to the `progress` event, not `timeupdate`. `progress` fires as bytes arrive.

**`THRESHOLD` is not 100%.** Waiting for the full asset before showing frame one
would strand the user on a loader for the entire download. Advance to `READY` at
whichever comes first:

- `canplaythrough` fires, or
- `bufferedFraction >= 0.25` and the observed download rate projects completion
  before playback would catch up, or
- `BOOT_MAX_MS` (6000) elapses, in which case go to `RECOVERED`.

The bar eases toward its target rather than snapping, so a burst of buffering does
not cause a jolt. It never moves backward, and it never reaches 100% until the
transition is genuinely committed.

**Minimum display time.** If the asset is warm in cache, `canplaythrough` can fire
in under 100ms and the loader flashes. Hold `BOOT` for a floor of `BOOT_MIN_MS`
(900) so the wordmark is legible. A flash of a loader is worse than no loader.

**Both limits count from navigation start** (`performance.now()`), not from the
moment React mounts. The visitor began waiting when they arrived. On Slow 3G
the script bundle alone takes about ten seconds; a ceiling that started after
it would add six more on top. Measured: Slow 3G reaches the recovered landing
in 11.4s (the bundle's arrival), Fast 3G at the 6s ceiling, Slow 4G reaches the
gate in 2.2s.

---

## 4. Autoplay, audio, and browser policy

Chrome, Safari, and Firefox all block audible autoplay without a user gesture. The
architecture sidesteps this rather than fighting it:

- The element is `muted` and `playsInline` from first paint, so any programmatic
  `play()` is permitted.
- The transition out of `GATED` is triggered by a **form submit**, which is a
  genuine user gesture. That gesture is what authorises playback.
- Because a gesture is in hand at `UNLOCKED`, audio may be unmuted at that exact
  moment if the video carries a soundtrack. Unmute inside the same call stack as
  the submit handler. Deferring it past an `await` loses the gesture in Safari.
- `play()` returns a Promise and it can reject. A rejected `play()` routes to
  `RECOVERED`, never to an unhandled rejection.

```ts
const attempt = video.play();
if (attempt !== undefined) {
  attempt.catch(() => transition('RECOVERED'));
}
```

`playsInline` is mandatory. Without it, iOS Safari hijacks the video into its
native fullscreen player and the composition is lost.

---

## 5. Detecting the end

`ended` is the primary signal, but it does not fire reliably across every browser
and codec combination, particularly when the final frame sits on a keyframe
boundary. Belt and braces:

```ts
// Primary
video.addEventListener('ended', complete, { once: true });

// Fallback: some browsers stall a few milliseconds short of duration.
video.addEventListener('timeupdate', () => {
  if (video.duration && video.duration - video.currentTime < 0.25) complete();
});
```

`complete()` must be idempotent. Guard it with a ref, not with component state,
because state updates are asynchronous and both listeners can fire in the same tick.

---

## 6. Returning visitors

Forcing a returning user through the intro on every navigation is hostile. Persist
a session flag on first completion:

```ts
sessionStorage.setItem('d4drive:intro-seen', '1');
```

`sessionStorage`, not `localStorage`. The intro should return on a genuinely new
visit but not on an in-session reload. Read it during `BOOT` and route straight to
`RECOVERED` if set. Wrap both the read and the write in `try/catch`, because Safari
private mode throws on access.

An authenticated user with a valid session cookie skips `GATED` entirely and moves
from `READY` to `UNLOCKED` directly. They still get the video, just not the wall.

---

## 7. Reduced motion

`prefers-reduced-motion: reduce` sends the sequence to `RECOVERED` at mount. The
user sees the poster frame and the landing content, with the auth panel rendered
inline rather than as an overlay. A manual play control is offered for anyone who
wants the video anyway. That preference is a stated preference, not a permanent
prohibition, so the door stays open.

---

## 8. Implementation shape

```
components/intro/
  IntroSequence.tsx      'use client'  orchestrator, owns the machine
  useIntroMachine.ts                   reducer, states and guards, zero DOM
  BootLoader.tsx                       wordmark + progress rule
  AuthGate.tsx                         auth panel, form, error surface
  VideoStage.tsx                       video element, listeners, play commands, scatter
  constants.ts                         timings, thresholds, z-index scale

components/fx/
  particle-stage.ts                    one shared WebGL2 canvas, dissolve and assemble jobs
  use-particles.ts                     DOM capture (html-to-image), dissolve and assemble hooks
  AssembleOnView.tsx                   catalog cards condensing out of sand on first view
```

**`useIntroMachine` must be a pure reducer with no DOM access.** That is what makes
the sequence testable without a browser: feed it events, assert on states. The
imperative video commands live in `VideoStage` and are issued as effects of state,
never the reverse.

**Do not track buffer progress in `useState`.** `progress` fires many times per
second and every update would re-render the tree. Use a Motion `useMotionValue` for
the bar and let it drive `transform: scaleX()` outside React's render cycle. React
state holds the discrete machine state only.

Animate `transform` and `opacity` only. The loader bar is `scaleX` on a
`transform-origin: left` element, never an animated `width`.

---

## 9. Timing constants

All values live in `components/intro/constants.ts`. Nothing below is inlined at a
call site.

| Constant | Value | Why |
|---|---|---|
| `BOOT_MIN_MS` | 900 | Floor so a cached load does not flash the wordmark |
| `BOOT_MAX_MS` | 6000 | Ceiling before giving up and taking the recovered path |
| `BUFFER_THRESHOLD` | 0.25 | Enough head start to play through on a typical connection |
| `LOADER_FADE_MS` | 700 | Loader out, matches the design system colour-transition tier |
| `GATE_FADE_MS` | 500 | Auth panel in and out, the UI interaction tier |
| `REVEAL_MS` | 1500 | Video into landing content when particles are unavailable (CSS fade) |
| `SCATTER_MS` | 2000 | Held final frame scattering into the landing, top of the cinematic tier |
| `DISSOLVE_MS` | 1500 | Auth panel type turning to sand on a successful sign-in |
| `GATE_SCRIM_OPACITY` | 0.55 | Charcoal scrim over the held frame while the gate is up |
| `POSTER_TIME` | 1.2 | Seek target for the revealed frame, past the film's fade up from black |
| `STALL_TIMEOUT_MS` | 4000 | No `progress` event for this long means the network gave up |

`POSTER_TIME` is deliberately not zero. This film fades up from black over
roughly 1.2 seconds (mean luma 8 at t=0.37, legible only from t=1.2), so the
first frame worth revealing is well past t=0. Measured against the encoded
asset, not guessed; `npm run build:assets -- --poster-time` must match it.

---

## 10. Particle effects

Two moments use the shared WebGL2 particle stage in `components/fx/`, ported
from the Vite prototype. Neither adds a state. Both are presentation inside an
existing state, and both have a CSS fallback that the sequence uses whenever
particles are unavailable.

| Moment | State | With WebGL2 | Without (or reduced motion) |
|---|---|---|---|
| Sign-in succeeds | `UNLOCKED` onward | The panel's type is rasterised (`html-to-image`) and dissolves over `DISSOLVE_MS`; the opaque backing fades over `GATE_FADE_MS` | Type fades over `GATE_FADE_MS` |
| Film ends | `COMPLETED` | The held final frame is uploaded as a texture and scatters left to right over `SCATTER_MS` | Stage fades over `REVEAL_MS` |

Rules that keep this inside the contract:

- **The machine never waits on an effect.** `COMPLETED` is entered on `ended`
  as before. `IntroSequence` keeps the gate mounted until its dissolve reports
  done, and keeps `VideoStage` mounted until its scatter reports done, as
  local flags. The reducer does not know either exists.
- **`RECOVERED` never runs an effect.** It drops the stage and the gate at once.
  Reduced motion lands here at mount, so it never sees a particle.
- **Nothing is ever stranded invisible.** A lost WebGL context finishes every
  pending job immediately. Assembling content carries a deadline that reveals
  it regardless. The real element is hidden only on the frame after the stage
  draws its first, pixel-identical, particle frame.
- **The loop never touches React state.** The stage's `requestAnimationFrame`
  loop draws to its canvas and reads each job's rect; it stops when the last
  job ends.
- **Layering.** The canvas is fixed, full viewport, `pointer-events: none`, at
  `Z.particles` (45): above the gate (40) and film (30) it dissolves, below the
  boot loader (50).
