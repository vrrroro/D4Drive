import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  CHAPTERS,
  CUT,
  FADE_OUT,
  FILM_RUN,
  LAST_BEAT,
  SLOW,
  SLOWDOWNS,
  beatAt,
  bootSet,
  chapterOpacity,
  cutAmount,
  cutEdges,
  cutFraming,
  easeInOut,
  filmFrame,
  filmPhase,
  fitModeFor,
  frameAt,
  heroPush,
  loadOrder,
  placeFrame,
  progressAtBeat,
  scrollCost,
} from '../components/film/timeline.ts';

/**
 * The landing film's choreography, without a browser. FilmStage draws what
 * these functions say; `npm run smoke` checks that it actually does.
 */

const V1 = 264;
const V2 = 528;

/** Beats per unit of progress at p. */
const speed = (p: number) => (beatAt(p + 0.0005) - beatAt(p)) / 0.0005;

test('the film starts on its first still and ends on its last, at either cut', () => {
  for (const count of [V1, V2]) {
    assert.equal(frameAt(0, count), 0);
    assert.equal(frameAt(1, count), count - 1);
    assert.equal(frameAt(-0.5, count), 0);
    assert.equal(frameAt(7, count), count - 1);
  }
});

test('scrolling forward never plays the film backward', () => {
  let previous = -1;
  for (let i = 0; i <= 8000; i += 1) {
    const b = beatAt(i / 8000);
    assert.ok(b >= previous - 1e-9, `film went back at p=${i / 8000}`);
    previous = b;
  }
});

test('the film never stops while the page scrolls through it: it slows, it does not hold', () => {
  const edge = 0.02;
  for (let p = FILM_RUN[0] + edge; p < FILM_RUN[1] - edge; p += 0.0025) {
    assert.ok(speed(p) > 60, `the film all but stalls at p=${p.toFixed(4)} (${speed(p).toFixed(1)} beats per unit)`);
  }
});

test('the film eases into motion as the cut settles and comes to rest at the end', () => {
  assert.equal(beatAt(FILM_RUN[0]), 0);
  assert.ok(FILM_RUN[0] < CUT[1], 'the scrub starts before the cut has quite finished opening');
  assert.ok(speed(FILM_RUN[0]) < speed(0.12) / 8, 'it should pull away gently');
  assert.ok(speed(FILM_RUN[1] - 0.001) < speed(0.12) / 8, 'it should settle gently');
  assert.equal(easeInOut(0), 0);
  assert.equal(easeInOut(1), 1);
  assert.ok(Math.abs(easeInOut(0.5, 0.08) - 0.5) < 1e-9);
});

test('three slowdowns, one for each piece of copy, at SLOW of the pace between them', () => {
  assert.equal(Object.keys(SLOWDOWNS).length, 3);
  const full = speed(0.13);
  for (const [lo, hi] of Object.values(SLOWDOWNS)) {
    const held = speed(progressAtBeat((lo + hi) / 2));
    assert.ok(Math.abs(held / full - SLOW) < 0.02, `slowed to ${(held / full).toFixed(3)}, not ${SLOW}`);
  }
  // Between two slowdowns the film gets back to its full pace.
  const between = speed(progressAtBeat((SLOWDOWNS.flank[1] + SLOWDOWNS.roast[0]) / 2));
  assert.ok(between > full * 0.95);
});

test('the pace changes smoothly: no step in speed anywhere', () => {
  // Cost per beat is smooth, so neighbouring samples never jump.
  for (let b = 0; b < LAST_BEAT; b += 0.25) {
    assert.ok(Math.abs(scrollCost(b + 0.25) - scrollCost(b)) < 0.12, `a step in pace at beat ${b}`);
  }
  for (let p = FILM_RUN[0] + 0.001; p < FILM_RUN[1] - 0.002; p += 0.001) {
    const a = speed(p);
    const b = speed(p + 0.001);
    assert.ok(Math.abs(b - a) < Math.max(a, b) * 0.08 + 12, `speed jumps at p=${p.toFixed(3)}: ${a.toFixed(0)} to ${b.toFixed(0)}`);
  }
});

test('progressAtBeat inverts beatAt', () => {
  for (const beat of [1, 40, 80, 120, 176, 240, 262]) {
    assert.ok(Math.abs(beatAt(progressAtBeat(beat)) - beat) < 0.01);
  }
});

test('each reading chapter is up exactly while the film is slow for it', () => {
  for (const id of ['flank', 'roast', 'delivery'] as const) {
    const [lo, hi] = SLOWDOWNS[id];
    const range = CHAPTERS[id];
    assert.ok(Math.abs(beatAt(range[1]) - lo) < 0.05 && Math.abs(beatAt(range[2]) - hi) < 0.05, `${id} is not up for its slowdown`);
  }
  // Side on at beat 70, head-on at 120, three-quarter at 176.
  for (const [id, beat] of [['flank', 70], ['roast', 120], ['delivery', 176]] as const) {
    const range = CHAPTERS[id];
    assert.ok(beatAt(range[1]) <= beat && beatAt(range[2]) >= beat, `${id} is not fully shown at beat ${beat}`);
  }
  // The take-off copy is up as the car leaves through the smoke.
  assert.ok(beatAt(CHAPTERS.takeoff[1]) > 200);
});

test('the film reaches its last frame by the time it has faded into the page', () => {
  assert.equal(beatAt(FADE_OUT[1]), LAST_BEAT);
});

test('a chapter is invisible outside its window and fully shown inside', () => {
  const range = CHAPTERS.roast;
  assert.equal(chapterOpacity(range[0] - 0.01, range), 0);
  assert.equal(chapterOpacity((range[1] + range[2]) / 2, range), 1);
  assert.equal(chapterOpacity(range[3] + 0.01, range), 0);
  const mid = chapterOpacity((range[0] + range[1]) / 2, range);
  assert.ok(mid > 0 && mid < 1);
});

test('chapters never overlap one another', () => {
  const ordered = Object.values(CHAPTERS).sort((a, b) => a[1] - b[1]);
  for (const range of ordered) assert.ok(range[0] < range[1] && range[1] <= range[2] && range[2] < range[3]);
  for (let i = 1; i < ordered.length; i += 1) {
    assert.ok(ordered[i]![0] >= ordered[i - 1]![3], 'two chapters on screen at once');
  }
});

test('the top of the page is blank grey: the cut is shut until the page moves', () => {
  assert.equal(cutAmount(0), 0);
  const shut = cutEdges(0, 'cover', 1440, 900, { top: 360, bottom: 560 })!;
  assert.equal(shut.bottom - shut.top, 0);
  const rest = heroPush(0, 'cover', 1440, 900, { top: 360, bottom: 560 });
  assert.ok(rest.up === 0 && rest.down === 0, 'the type sits still at the top');
});

test('the cut opens from the middle of the gap, its edges moving apart to the film', () => {
  for (const [w, h, gap] of [
    [1440, 900, { top: 360, bottom: 560 }],
    [390, 844, { top: 200, bottom: 600 }],
  ] as const) {
    const mode = fitModeFor(w, h);
    const frame = filmFrame(mode, w, h);
    const first = cutEdges(CUT[0] + 0.0005, mode, w, h, gap)!;
    const mid = (gap.top + gap.bottom) / 2;
    assert.ok(Math.abs((first.top + first.bottom) / 2 - mid) < 2, 'it starts in the middle of the gap');
    let previous = first;
    for (let i = 1; i < 40; i += 1) {
      const cut = cutEdges(CUT[0] + ((CUT[1] - CUT[0]) * i) / 40, mode, w, h, gap)!;
      assert.ok(cut.top <= previous.top && cut.bottom >= previous.bottom, 'both edges move apart, never back');
      previous = cut;
    }
    const last = cutEdges(CUT[1] - 1e-6, mode, w, h, gap)!;
    assert.ok(Math.abs(last.top - frame.y) < 0.5 && Math.abs(last.bottom - (frame.y + frame.height)) < 0.5);
    assert.equal(cutEdges(CUT[1], mode, w, h, gap), null);
  }
});

test('the cut pushes the slogan up and the wordmark down, off the screen once open', () => {
  for (const [w, h, gap] of [
    [1440, 900, { top: 360, bottom: 560 }],
    [390, 844, { top: 200, bottom: 600 }],
  ] as const) {
    const mode = fitModeFor(w, h);
    // While the cut is still inside the gap, the type has not moved yet.
    const early = heroPush(CUT[0] + (CUT[1] - CUT[0]) * 0.06, mode, w, h, gap);
    assert.ok(early.up > -2 && early.down < 2, 'the type moves when the cut reaches it, not before');
    // It never overlaps the type: the slogan's bottom stays above the cut.
    for (let i = 0; i <= 40; i += 1) {
      const p = CUT[0] + ((CUT[1] - CUT[0]) * i) / 40;
      const cut = cutEdges(p, mode, w, h, gap);
      const push = heroPush(p, mode, w, h, gap);
      if (!cut) continue;
      assert.ok(gap.top + push.up <= cut.top + 1e-6, 'the slogan is under the cut');
      assert.ok(gap.bottom + push.down >= cut.bottom - 1e-6, 'the wordmark is under the cut');
    }
    const open = heroPush(1, mode, w, h, gap);
    assert.ok(gap.top + open.up < 0);
    assert.ok(gap.bottom + open.down > h);
  }
});

test('the cut starts a touch close and settles on the film framing', () => {
  const at = placeFrame('cover', { x: 0, y: 0, width: 1440, height: 900 }, 1600, 828);
  const centre = { x: 720, y: 460 };
  const close = cutFraming(CUT[0], at, centre);
  assert.ok(close.dw > at.dw, 'closer at first');
  assert.deepEqual(cutFraming(CUT[1], at, centre), at);
});

test('the phase moves hero, film, after', () => {
  assert.equal(filmPhase(0), 'hero');
  assert.equal(filmPhase(0.3), 'film');
  assert.equal(filmPhase(0.99), 'after');
});

test('landscape covers, portrait uses the band', () => {
  assert.equal(fitModeFor(1440, 900), 'cover');
  assert.equal(fitModeFor(390, 844), 'band');
  assert.equal(fitModeFor(820, 1180), 'band');
});

test('cover fills the viewport and crops symmetrically', () => {
  const at = placeFrame('cover', { x: 0, y: 0, width: 1440, height: 900 }, 1600, 828);
  assert.ok(at.dw >= 1440 && at.dh >= 900);
  assert.ok(Math.abs(at.dx + (at.dw - 1440) / 2) < 1e-9);
});

test('the band follows the car but never shows past the frame edge', () => {
  const band = filmFrame('band', 390, 844);
  const left = placeFrame('band', band, 1600, 900, 0);
  const right = placeFrame('band', band, 1600, 900, 1);
  // Focus at the far left pins the frame's left edge to the screen's.
  assert.equal(left.dx, band.x);
  // Focus at the far right pins its right edge.
  assert.ok(Math.abs(right.dx + right.dw - (band.x + band.width)) < 1e-9);
  const centre = placeFrame('band', band, 1600, 900, 0.5);
  assert.ok(centre.dx < left.dx && centre.dx > right.dx);
});

test('every frame is loaded exactly once, the first one first', () => {
  for (const count of [V1, V2]) {
    const order = loadOrder(count);
    assert.equal(order[0], 0);
    assert.equal(order.length, count);
    assert.equal(new Set(order).size, count);
  }
});

test('phones load only even frames', () => {
  const order = loadOrder(V2, 2);
  assert.ok(order.every((i) => i % 2 === 0));
  assert.equal(order.length, V2 / 2);
});

test('the boot set spans the whole film and costs the same at either cut', () => {
  for (const count of [V1, V2]) {
    const boot = bootSet(count);
    assert.ok(boot.includes(0));
    assert.ok(Math.max(...boot) >= count - 32, 'coarse pass should reach the end of the film');
    assert.ok(boot.length < count / 4, 'boot should wait for a fraction of the frames, not all of them');
  }
  assert.ok(Math.abs(bootSet(V2).length - bootSet(V1).length) <= 8);
});
