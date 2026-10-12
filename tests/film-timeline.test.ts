import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  APPEAR_IN,
  CHAPTERS,
  FADE_OUT,
  LAST_BEAT,
  SEGMENTS,
  WINDOW_OPEN,
  appearAlpha,
  beatAt,
  bootSet,
  chapterOpacity,
  closedWindow,
  easeInOut,
  filmFrame,
  filmPhase,
  fitModeFor,
  frameAt,
  heroFraming,
  heroPush,
  loadOrder,
  placeFrame,
  windowRect,
} from '../components/film/timeline.ts';

/**
 * The landing film's choreography, without a browser. FilmStage draws what
 * these functions say; `npm run smoke` checks that it actually does.
 */

const V1 = 264;
const V2 = 528;

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
  for (let i = 0; i <= 4000; i += 1) {
    const b = beatAt(i / 4000);
    assert.ok(b >= previous - 1e-9, `film went back at p=${i / 4000}`);
    previous = b;
  }
});

test('segments tile 0 to 1 with no gaps and join on the same beat', () => {
  assert.equal(SEGMENTS[0]?.from, 0);
  assert.equal(SEGMENTS[SEGMENTS.length - 1]?.to, 1);
  for (let i = 1; i < SEGMENTS.length; i += 1) {
    assert.equal(SEGMENTS[i]?.from, SEGMENTS[i - 1]?.to);
    assert.equal(SEGMENTS[i]?.beats[0], SEGMENTS[i - 1]?.beats[1]);
  }
});

test('the film never stops while the page scrolls through it: no holds', () => {
  const run = SEGMENTS.find((s) => s.beats[0] !== s.beats[1])!;
  assert.equal(SEGMENTS.filter((s) => s.beats[0] !== s.beats[1]).length, 1, 'one moving segment, start to end');
  assert.deepEqual(run.beats, [0, LAST_BEAT]);
  // From the window opening to the fade, every stretch of scroll moves the film.
  for (let p = WINDOW_OPEN[1]; p < FADE_OUT[0]; p += 0.005) {
    assert.ok(beatAt(p + 0.005) - beatAt(p) > 0.5, `the film stalls at p=${p.toFixed(3)}`);
  }
});

test('the film starts and stops smoothly but runs at an even pace between', () => {
  const run = SEGMENTS.find((s) => s.beats[0] !== s.beats[1])!;
  const speed = (p: number) => (beatAt(p + 0.001) - beatAt(p)) / 0.001;
  const mid = speed((run.from + run.to) / 2);
  assert.ok(speed(run.from) < mid / 4, 'it should pull away gently');
  assert.ok(speed(run.to - 0.001) < mid / 4, 'it should settle gently');
  // Even pace through the middle: the copy reads over a steady picture.
  assert.ok(Math.abs(speed(0.3) - speed(0.6)) < 1e-6 * mid + 1e-3);
  assert.ok(Math.abs(easeInOut(0.5) - 0.5) < 1e-9);
  assert.equal(easeInOut(0), 0);
  assert.equal(easeInOut(1), 1);
  assert.ok(Math.abs(easeInOut(0.5, 0.08) - 0.5) < 1e-9);
});

test('each chapter is up while its shot passes', () => {
  // Side on at beat 80, head-on at 120, three-quarter at 176.
  for (const [id, beat] of [['flank', 80], ['roast', 120], ['delivery', 176]] as const) {
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
  for (let i = 1; i < ordered.length; i += 1) {
    assert.ok(ordered[i]![0] >= ordered[i - 1]![3], 'two chapters on screen at once');
  }
});

test('the film starts as blank space and appears by itself or with the first scroll', () => {
  assert.equal(appearAlpha(0, 0), 0);
  assert.ok(appearAlpha(0, 0.5) > 0 && appearAlpha(0, 0.5) < 1, 'it fades in, it does not pop');
  assert.equal(appearAlpha(0, 1), 1);
  assert.equal(appearAlpha(APPEAR_IN[1], 0), 1);
  assert.equal(appearAlpha(WINDOW_OPEN[1], 0), 1);
});

test('the film appears in the gap between the slogan and the wordmark', () => {
  const win = closedWindow(1440, 900, 86, { top: 360, bottom: 560 });
  assert.ok(win.y > 360 && win.y + win.height < 560);
  assert.equal(win.x, 86);
  assert.equal(win.width, 1440 - 172);
});

test('as it opens, the window pushes the slogan up and the wordmark down off the screen', () => {
  for (const [w, h, gap] of [
    [1440, 900, { top: 360, bottom: 560 }],
    [390, 844, { top: 200, bottom: 600 }],
  ] as const) {
    const mode = fitModeFor(w, h);
    const closed = closedWindow(w, h, 24, gap);
    assert.deepEqual(heroPush(0, gap, h), { up: -0, down: 0 });
    const open = heroPush(1, gap, h);
    // The slogan's bottom moves above the top of the screen, and the
    // wordmark's top below the bottom, in landscape and portrait alike.
    assert.ok(gap.top + open.up < 0);
    assert.ok(gap.bottom + open.down > h);
    // All the way, the window's edges stay ahead of the type: it pushes.
    for (let i = 0; i <= 50; i += 1) {
      const p = WINDOW_OPEN[0] + ((WINDOW_OPEN[1] - WINDOW_OPEN[0]) * i) / 50;
      const rect = windowRect(p, mode, w, h, closed);
      const push = heroPush(p, gap, h);
      assert.ok(gap.top + push.up <= rect.y + 0.5, `slogan inside the window at p=${p}`);
      assert.ok(gap.bottom + push.down >= rect.y + rect.height - 0.5 || mode === 'band', `wordmark inside the window at p=${p}`);
    }
  }
});

test('the window opens out to the full film rectangle', () => {
  for (const [w, h] of [
    [1440, 900],
    [390, 844],
  ] as const) {
    const mode = fitModeFor(w, h);
    const closed = closedWindow(w, h, 24);
    const shut = windowRect(0, mode, w, h, closed);
    const open = windowRect(1, mode, w, h, closed);
    assert.ok(shut.width < w && shut.height < h);
    assert.deepEqual(open, filmFrame(mode, w, h));
  }
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
  const at = placeFrame('cover', { x: 0, y: 0, width: 1440, height: 900 }, 1600, 900);
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

test('hero framing eases from the close-up to the film placement', () => {
  const at = placeFrame('cover', { x: 0, y: 0, width: 1440, height: 900 }, 1600, 900);
  const closed = closedWindow(1440, 900, 86);
  const shut = heroFraming(0, windowRect(0, 'cover', 1440, 900, closed), at);
  assert.ok(shut.dw > at.dw, 'the narrow window should be zoomed in');
  assert.deepEqual(heroFraming(1, windowRect(1, 'cover', 1440, 900, closed), at), at);
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
