import { test } from 'node:test';
import assert from 'node:assert/strict';
import { safeNextPath } from '../lib/safe-redirect.ts';

test('accepts same-origin paths', () => {
  assert.equal(safeNextPath('/bookings'), '/bookings');
  assert.equal(safeNextPath('/cars?fuel=electric&page=2'), '/cars?fuel=electric&page=2');
});

test('falls back when missing', () => {
  assert.equal(safeNextPath(null), '/cars');
  assert.equal(safeNextPath(''), '/cars');
  assert.equal(safeNextPath(undefined, '/admin'), '/admin');
});

test('refuses absolute and protocol-relative URLs', () => {
  for (const hostile of [
    'https://evil.example',
    '//evil.example',
    '/\\evil.example',
    'javascript:alert(1)',
    '/\tjavascript:alert(1)',
    'evil.example/path',
  ]) {
    assert.equal(safeNextPath(hostile), '/cars', hostile);
  }
});
