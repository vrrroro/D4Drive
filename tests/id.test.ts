import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parsePositiveId } from '../lib/validation/id.ts';

test('accepts plain positive integers', () => {
  assert.equal(parsePositiveId('1'), 1);
  assert.equal(parsePositiveId('9007199254740991'), 9007199254740991);
});

test('rejects everything Number() would quietly accept', () => {
  for (const raw of ['', '0', '-1', '01', '1.5', '1e3', '0x10', ' 7', '7 ', '1e20', 'NaN', 'Infinity', '9007199254740993', '1;DROP TABLE cars']) {
    assert.equal(parsePositiveId(raw), null, raw);
  }
  assert.equal(parsePositiveId(undefined), null);
});
