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
| `GATED` | Auth panel fades up over the frozen frame | Paused, held |
| `AUTHENTICATING` | Submit button in loading state, panel locked | Paused, held |
| `UNLOCKED` | Auth panel fades out over 500ms | `play()` called |
| `PLAYING` | Video running, no chrome, no controls | Playing |
| `COMPLETED` | Video fades into the landing content | Paused at final frame, then unmounted |
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
  VideoStage.tsx                       video element, listeners, play commands
  constants.ts                         timings, thresholds, z-index scale
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
| `REVEAL_MS` | 1500 | Video into landing content, the cinematic image tier |
| `POSTER_TIME` | 0.04 | Seek target for frame one, past t=0 to dodge black leader frames |
| `STALL_TIMEOUT_MS` | 4000 | No `progress` event for this long means the network gave up |

`POSTER_TIME` is deliberately not zero. Many encodes open on a black or partial
frame at exactly t=0, and seeking a few hundredths in lands on real picture. The
exact value is confirmed against the encoded asset during the pipeline task, not
guessed.
