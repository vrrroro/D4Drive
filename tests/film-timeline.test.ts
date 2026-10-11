import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  CHAPTERS,
  FADE_OUT,
  LAST_BEAT,
  SEGMENTS,
  WINDOW_OPEN,
  beatAt,
  bootSet,
  chapterOpacity,
  closedSlab,
  easeInOut,
  filmAlpha,
  filmFrame,
  filmPhase,
  fitModeFor,
  frameAt,
  heroFraming,
  heroPush,
  loadOrder,
  placeFrame,
  slabAlpha,
  stageTone,
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

test('the film holds still on each finished shot while its copy is up', () => {
  const holds = SEGMENTS.filter((s) => s.beats[0] === s.beats[1] && s.from > 0.1);
  assert.ok(holds.length >= 4, 'four holds: side on, head-on, three-quarter, smoke');
  for (const hold of holds) {
    const a = beatAt(hold.from + 1e-6);
    const b = beatAt(hold.to - 1e-6);
    assert.equal(a, b, `film moved during the hold at ${hold.from}`);
  }
  // Each of the four chapters is fully shown for the whole of a hold.
  for (const range of Object.values(CHAPTERS)) {
    const hold = holds.find((h) => h.from >= range[0] && h.from <= range[1]);
    assert.ok(hold, `no hold under the chapter at ${range[1]}`);
    // The last hold carries on through the fade; its copy stays until the
    // fade begins, then goes with the film.
    const end = Math.min(hold.to, FADE_OUT[0]);
    assert.ok(range[1] <= hold.from && range[2] >= end, 'the copy leaves before its hold ends');
  }
});

test('the car eases into a hold rather than stopping dead', () => {
  const moving = SEGMENTS.find((s) => s.beats[0] === 12 && s.beats[1] === 80)!;
  const nearEnd = beatAt(moving.to - 0.001);
  const atEnd = beatAt(moving.to);
  const midStep = beatAt((moving.from + moving.to) / 2 + 0.001) - beatAt((moving.from + moving.to) / 2);
  assert.ok(atEnd - nearEnd < midStep, 'last scroll pixel should move the film less than one mid-segment');
  assert.ok(Math.abs(easeInOut(0.5) - 0.5) < 1e-9);
  assert.equal(easeInOut(0), 0);
  assert.equal(easeInOut(1), 1);
});

test('the car has left frame before the smoke starts to fade', () => {
  assert.equal(beatAt(FADE_OUT[0]), LAST_BEAT);
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

test('the slab starts as blank space and appears by itself or with the first scroll', () => {
  assert.equal(slabAlpha(0, 0), 0);
  assert.equal(slabAlpha(0, 1), 1);
  assert.equal(slabAlpha(WINDOW_OPEN[0], 0), 1);
  // The film only rises out of the black once the slab is opening.
  assert.equal(filmAlpha(0), 0);
  assert.equal(filmAlpha(WINDOW_OPEN[1]), 1);
});

test('the slab sits in the gap between the slogan and the wordmark', () => {
  const slab = closedSlab(1440, 900, 86, { top: 360, bottom: 560 });
  assert.ok(slab.y > 360 && slab.y + slab.height < 560);
  assert.equal(slab.x, 86);
  assert.equal(slab.width, 1440 - 172);
});

test('as it opens, the slab pushes the slogan up and the wordmark down off the screen', () => {
  for (const [w, h, gap] of [
    [1440, 900, { top: 360, bottom: 560 }],
    [390, 844, { top: 200, bottom: 600 }],
  ] as const) {
    const mode = fitModeFor(w, h);
    const closed = closedSlab(w, h, 24, gap);
    assert.deepEqual(heroPush(0, gap, h), { up: -0, down: 0 });
    const open = heroPush(1, gap, h);
    // The slogan's bottom moves above the top of the screen, and the
    // wordmark's top below the bottom, in landscape and portrait alike.
    assert.ok(gap.top + open.up < 0);
    assert.ok(gap.bottom + open.down > h);
    // All the way, the slab's edges stay ahead of the type: it pushes.
    for (let i = 0; i <= 50; i += 1) {
      const p = WINDOW_OPEN[0] + ((WINDOW_OPEN[1] - WINDOW_OPEN[0]) * i) / 50;
      const rect = windowRect(p, mode, w, h, closed);
      const push = heroPush(p, gap, h);
      assert.ok(gap.top + push.up <= rect.y + 0.5, `slogan inside the slab at p=${p}`);
      assert.ok(gap.bottom + push.down >= rect.y + rect.height - 0.5 || mode === 'band', `wordmark inside the slab at p=${p}`);
    }
  }
});

test('the slab opens out to the full film rectangle', () => {
  for (const [w, h] of [
    [1440, 900],
    [390, 844],
  ] as const) {
    const mode = fitModeFor(w, h);
    const closed = closedSlab(w, h, 24);
    const shut = windowRect(0, mode, w, h, closed);
    const open = windowRect(1, mode, w, h, closed);
    assert.ok(shut.width < w && shut.height < h);
    assert.deepEqual(open, filmFrame(mode, w, h));
  }
});

test('the stage is grey only while the film plays', () => {
  assert.equal(stageTone(0), 0);
  assert.equal(stageTone(0.4), 1);
  assert.equal(stageTone(FADE_OUT[1]), 0);
  assert.equal(stageTone(1), 0);
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
  const closed = closedSlab(1440, 900, 86);
  const shut = heroFraming(0, windowRect(0, 'cover', 1440, 900, closed), at);
  assert.ok(shut.dw > at.dw, 'the narrow slab should be zoomed in');
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
