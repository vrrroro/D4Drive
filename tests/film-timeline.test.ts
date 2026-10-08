import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  CHAPTERS,
  FADE_OUT,
  SEGMENTS,
  bootSet,
  chapterOpacity,
  filmFrame,
  fitModeFor,
  frameAt,
  heroFraming,
  loadOrder,
  placeFrame,
  windowOpenness,
  windowRect,
} from '../components/film/timeline.ts';

/**
 * The landing film's choreography, without a browser. FilmStage draws what
 * these functions say; `npm run smoke` checks that it actually does.
 */

const COUNT = 264;

test('the film starts on frame 0 and ends on the last frame', () => {
  assert.equal(frameAt(0), 0);
  assert.equal(frameAt(1), COUNT - 1);
  assert.equal(frameAt(-0.5), 0);
  assert.equal(frameAt(7), COUNT - 1);
});

test('scrolling forward never plays the film backward', () => {
  let previous = -1;
  for (let i = 0; i <= 2000; i += 1) {
    const f = frameAt(i / 2000);
    assert.ok(f >= previous, `frame went back at p=${i / 2000}`);
    previous = f;
  }
});

test('segments tile 0 to 1 with no gaps', () => {
  assert.equal(SEGMENTS[0]?.from, 0);
  assert.equal(SEGMENTS[SEGMENTS.length - 1]?.to, 1);
  for (let i = 1; i < SEGMENTS.length; i += 1) {
    assert.equal(SEGMENTS[i]?.from, SEGMENTS[i - 1]?.to);
    assert.equal(SEGMENTS[i]?.frames[0], SEGMENTS[i - 1]?.frames[1]);
  }
});

test('the car has left frame before the smoke starts to fade', () => {
  assert.equal(frameAt(FADE_OUT[0]), COUNT - 1);
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

test('the headline has gone before the window opens under it', () => {
  assert.ok(CHAPTERS.hero[3] < 0.05);
  assert.equal(windowOpenness(CHAPTERS.hero[2]), 0);
});

test('landscape covers, portrait uses the band', () => {
  assert.equal(fitModeFor(1440, 900), 'cover');
  assert.equal(fitModeFor(390, 844), 'band');
  assert.equal(fitModeFor(820, 1180), 'band');
});

test('the hero window opens out to the full film rectangle', () => {
  for (const [w, h] of [
    [1440, 900],
    [390, 844],
  ] as const) {
    const mode = fitModeFor(w, h);
    const closed = windowRect(0, mode, w, h);
    const open = windowRect(1, mode, w, h);
    assert.ok(closed.width < w && closed.height < h);
    assert.deepEqual(open, filmFrame(mode, w, h));
  }
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
  const win = windowRect(0, 'cover', 1440, 900);
  const closed = heroFraming(0, win, at);
  assert.ok(closed.dw > at.dw, 'closed window should be zoomed in');
  assert.deepEqual(heroFraming(1, windowRect(1, 'cover', 1440, 900), at), at);
});

test('every frame is loaded exactly once, the first one first', () => {
  const order = loadOrder(COUNT);
  assert.equal(order[0], 0);
  assert.equal(order.length, COUNT);
  assert.equal(new Set(order).size, COUNT);
});

test('phones load only even frames', () => {
  const order = loadOrder(COUNT, 2);
  assert.ok(order.every((i) => i % 2 === 0));
  assert.equal(order.length, COUNT / 2);
});

test('the boot set spans the whole film, not just its start', () => {
  const boot = bootSet(COUNT);
  assert.ok(boot.includes(0));
  assert.ok(Math.max(...boot) >= COUNT - 16, 'coarse pass should reach the end of the film');
  assert.ok(boot.length < COUNT / 4, 'boot should wait for a fraction of the frames, not all of them');
});
