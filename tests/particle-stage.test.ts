import { test } from 'node:test';
import assert from 'node:assert/strict';
import { effectiveDensity, uvFit } from '../components/fx/particle-stage.ts';

/**
 * The particle stage's pure helpers. The WebGL path itself needs a browser
 * and is exercised by `npm run smoke`; these are the two calculations that
 * decide what a plate looks like and how much it costs per frame.
 */

test('fill maps the whole texture onto the rect', () => {
  assert.deepEqual(uvFit('fill', 1920, 1080, 400, 400), { s: [1, 1], o: [0, 0] });
});

test('cover crops a wide texture horizontally, centred', () => {
  // 16:9 film onto a square: keep the middle 9/16 of the width.
  const { s, o } = uvFit('cover', 1920, 1080, 500, 500);
  assert.equal(s[1], 1);
  assert.ok(Math.abs(s[0] - 9 / 16) < 1e-9);
  assert.ok(Math.abs(o[0] - (1 - 9 / 16) / 2) < 1e-9);
  assert.equal(o[1], 0);
});

test('cover crops a tall texture vertically, centred', () => {
  // A portrait phone viewport over a 16:9 frame is the other common case.
  const { s, o } = uvFit('cover', 1080, 1920, 1600, 900);
  assert.equal(s[0], 1);
  assert.ok(s[1] < 1);
  assert.ok(Math.abs(o[1] - (1 - s[1]) / 2) < 1e-9);
});

test('a degenerate size falls back to fill rather than dividing by zero', () => {
  assert.deepEqual(uvFit('cover', 0, 0, 500, 500), { s: [1, 1], o: [0, 0] });
  assert.deepEqual(uvFit('cover', 1920, 1080, 0, 500), { s: [1, 1], o: [0, 0] });
});

test('small plates keep the requested grain spacing', () => {
  assert.equal(effectiveDensity(2, 400, 500), 2);
});

test('a full-viewport plate coarsens to hold the point count', () => {
  const density = effectiveDensity(2, 2560, 1440);
  assert.ok(density > 2);
  const points = Math.ceil(2560 / density) * Math.ceil(1440 / density);
  assert.ok(points <= 905_000, `points=${points}`);
});
