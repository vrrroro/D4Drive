import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  introReducer,
  initialContext,
  isRevealed,
  type IntroContext,
  type IntroEvent,
} from '../components/intro/useIntroMachine.ts';

/**
 * These run with no browser, no DOM shim, and no video element. That is the
 * entire reason the machine was kept pure: the sequence is the highest-risk
 * part of the product and it can be exercised exhaustively in milliseconds.
 */
const drive = (events: IntroEvent[], from: IntroContext = initialContext): IntroContext =>
  events.reduce(introReducer, from);

test('starts in BOOT', () => {
  assert.equal(initialContext.state, 'BOOT');
});

test('runs the full happy path', () => {
  const result = drive([
    { type: 'BUFFER_READY' },
    { type: 'LOADER_FADED' },
    { type: 'SUBMIT' },
    { type: 'AUTH_SUCCESS' },
    { type: 'PLAYBACK_STARTED' },
    { type: 'VIDEO_ENDED' },
  ]);

  assert.equal(result.state, 'COMPLETED');
});

test('a failed login returns to GATED and keeps the panel open', () => {
  const result = drive([
    { type: 'BUFFER_READY' },
    { type: 'LOADER_FADED' },
    { type: 'SUBMIT' },
    { type: 'AUTH_FAILURE', message: 'Those details did not match. Try again.' },
  ]);

  assert.equal(result.state, 'GATED');
  assert.equal(result.authError, 'Those details did not match. Try again.');
});

test('submitting again clears the previous error', () => {
  const failed = drive([
    { type: 'BUFFER_READY' },
    { type: 'LOADER_FADED' },
    { type: 'SUBMIT' },
    { type: 'AUTH_FAILURE', message: 'nope' },
  ]);

  const retried = introReducer(failed, { type: 'SUBMIT' });
  assert.equal(retried.state, 'AUTHENTICATING');
  assert.equal(retried.authError, null);
});

test('AUTHENTICATING is the only backward edge', () => {
  // From PLAYING, nothing walks the machine back to an earlier state.
  const playing = drive([
    { type: 'BUFFER_READY' },
    { type: 'LOADER_FADED' },
    { type: 'SUBMIT' },
    { type: 'AUTH_SUCCESS' },
    { type: 'PLAYBACK_STARTED' },
  ]);

  assert.equal(introReducer(playing, { type: 'SUBMIT' }).state, 'PLAYING');
  assert.equal(introReducer(playing, { type: 'BUFFER_READY' }).state, 'PLAYING');
  assert.equal(introReducer(playing, { type: 'LOADER_FADED' }).state, 'PLAYING');
});

test('an authenticated visitor skips the gate entirely', () => {
  const result = drive([{ type: 'BUFFER_READY' }, { type: 'ALREADY_AUTHENTICATED' }]);
  assert.equal(result.state, 'UNLOCKED');
});

test('RECOVER is accepted from any non-terminal state', () => {
  const states: IntroEvent[][] = [
    [],
    [{ type: 'BUFFER_READY' }],
    [{ type: 'BUFFER_READY' }, { type: 'LOADER_FADED' }],
    [{ type: 'BUFFER_READY' }, { type: 'LOADER_FADED' }, { type: 'SUBMIT' }],
  ];

  for (const path of states) {
    const context = drive([...path, { type: 'RECOVER', reason: 'media-error' }]);
    assert.equal(context.state, 'RECOVERED');
    assert.equal(context.recoveryReason, 'media-error');
  }
});

test('COMPLETED is terminal and RECOVER cannot undo it', () => {
  const completed = drive([
    { type: 'BUFFER_READY' },
    { type: 'LOADER_FADED' },
    { type: 'SUBMIT' },
    { type: 'AUTH_SUCCESS' },
    { type: 'PLAYBACK_STARTED' },
    { type: 'VIDEO_ENDED' },
  ]);

  const after = introReducer(completed, { type: 'RECOVER', reason: 'media-error' });
  assert.equal(after.state, 'COMPLETED');
});

test('RECOVERED is terminal', () => {
  const recovered = drive([{ type: 'RECOVER', reason: 'reduced-motion' }]);
  const after = introReducer(recovered, { type: 'BUFFER_READY' });
  assert.equal(after.state, 'RECOVERED');
});

test('the machine cannot re-enter BOOT', () => {
  let context = drive([{ type: 'BUFFER_READY' }]);
  for (const event of [
    { type: 'BUFFER_READY' },
    { type: 'LOADER_FADED' },
    { type: 'VIDEO_ENDED' },
  ] as IntroEvent[]) {
    context = introReducer(context, event);
    assert.notEqual(context.state, 'BOOT');
  }
});

test('both terminal states reveal the landing content', () => {
  assert.equal(isRevealed('COMPLETED'), true);
  assert.equal(isRevealed('RECOVERED'), true);
  assert.equal(isRevealed('GATED'), false);
  assert.equal(isRevealed('BOOT'), false);
});

test('out-of-order events are ignored rather than corrupting state', () => {
  // VIDEO_ENDED arriving during BOOT must not skip the whole sequence.
  const result = introReducer(initialContext, { type: 'VIDEO_ENDED' });
  assert.equal(result.state, 'BOOT');
});

test('CLEAR_ERROR drops a failed attempt\'s message without leaving GATED', () => {
  const failed = drive([
    { type: 'BUFFER_READY' },
    { type: 'LOADER_FADED' },
    { type: 'SUBMIT' },
    { type: 'AUTH_FAILURE', message: 'Those details did not match. Try again.' },
  ]);
  assert.equal(failed.authError, 'Those details did not match. Try again.');

  const cleared = introReducer(failed, { type: 'CLEAR_ERROR' });
  assert.equal(cleared.state, 'GATED');
  assert.equal(cleared.authError, null);
});

test('CLEAR_ERROR is ignored outside GATED', () => {
  const authenticating = drive([
    { type: 'BUFFER_READY' },
    { type: 'LOADER_FADED' },
    { type: 'SUBMIT' },
  ]);
  assert.equal(introReducer(authenticating, { type: 'CLEAR_ERROR' }), authenticating);
});

test('an authenticated visitor is unlocked from READY while the loader still fades', () => {
  const result = drive([
    { type: 'BUFFER_READY' },
    { type: 'ALREADY_AUTHENTICATED' },
    // The loader finishes its fade after the machine has moved on. That late
    // event must not drag the visitor back to the gate.
    { type: 'LOADER_FADED' },
  ]);
  assert.equal(result.state, 'UNLOCKED');
});
