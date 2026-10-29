import { useReducer, useCallback } from 'react';

/**
 * The intro sequence state machine.
 *
 * Deliberately pure. No `document`, no `window`, no video element, no timers.
 * Events go in, states come out. That is what makes the sequence testable
 * without a browser, and it is why the imperative video commands live in
 * VideoStage as effects of state rather than driving state directly.
 *
 * See docs/VIDEO_STATE_MACHINE.md sections 1 and 2.
 */

export type IntroState =
  | 'BOOT'
  | 'READY'
  | 'GATED'
  | 'AUTHENTICATING'
  | 'UNLOCKED'
  | 'PLAYING'
  | 'COMPLETED'
  | 'RECOVERED';

export type IntroEvent =
  | { type: 'BUFFER_READY' }
  | { type: 'LOADER_FADED' }
  | { type: 'SUBMIT' }
  | { type: 'AUTH_SUCCESS' }
  | { type: 'AUTH_FAILURE'; message: string }
  | { type: 'CLEAR_ERROR' }
  | { type: 'ALREADY_AUTHENTICATED' }
  | { type: 'PLAYBACK_STARTED' }
  | { type: 'VIDEO_ENDED' }
  | { type: 'RECOVER'; reason: RecoveryReason };

export type RecoveryReason =
  | 'reduced-motion'
  | 'already-seen'
  | 'media-error'
  | 'stalled'
  | 'playback-rejected'
  | 'timeout';

export interface IntroContext {
  state: IntroState;
  /** Inline error shown in the auth panel. Cleared on every new attempt. */
  authError: string | null;
  /** Why we took the recovered path. Surfaced for the manual play control. */
  recoveryReason: RecoveryReason | null;
}

export const initialContext: IntroContext = {
  state: 'BOOT',
  authError: null,
  recoveryReason: null,
};

/** Terminal states. Once here, nothing moves the machine again. */
const TERMINAL: ReadonlySet<IntroState> = new Set(['COMPLETED', 'RECOVERED']);

export function introReducer(context: IntroContext, event: IntroEvent): IntroContext {
  const { state } = context;

  // RECOVER is accepted from any non-terminal state, because a media error or
  // a stall can happen at any point before the video finishes.
  if (event.type === 'RECOVER') {
    if (TERMINAL.has(state)) return context;
    return { state: 'RECOVERED', authError: null, recoveryReason: event.reason };
  }

  if (TERMINAL.has(state)) return context;

  switch (state) {
    case 'BOOT': {
      if (event.type === 'BUFFER_READY') {
        return { ...context, state: 'READY' };
      }
      return context;
    }

    case 'READY': {
      if (event.type === 'LOADER_FADED') {
        return { ...context, state: 'GATED' };
      }
      // A returning visitor with a live session skips the wall entirely.
      if (event.type === 'ALREADY_AUTHENTICATED') {
        return { ...context, state: 'UNLOCKED' };
      }
      return context;
    }

    case 'GATED': {
      if (event.type === 'SUBMIT') {
        return { ...context, state: 'AUTHENTICATING', authError: null };
      }
      // Switching between sign in and register drops the other form's error.
      if (event.type === 'CLEAR_ERROR') {
        return context.authError === null ? context : { ...context, authError: null };
      }
      if (event.type === 'ALREADY_AUTHENTICATED') {
        return { ...context, state: 'UNLOCKED', authError: null };
      }
      return context;
    }

    case 'AUTHENTICATING': {
      if (event.type === 'AUTH_SUCCESS') {
        return { ...context, state: 'UNLOCKED', authError: null };
      }
      // The only backward edge in the machine. The panel stays open and shows
      // the error inline rather than disappearing on failure.
      if (event.type === 'AUTH_FAILURE') {
        return { ...context, state: 'GATED', authError: event.message };
      }
      return context;
    }

    case 'UNLOCKED': {
      if (event.type === 'PLAYBACK_STARTED') {
        return { ...context, state: 'PLAYING' };
      }
      return context;
    }

    case 'PLAYING': {
      if (event.type === 'VIDEO_ENDED') {
        return { ...context, state: 'COMPLETED', authError: null };
      }
      return context;
    }

    default:
      return context;
  }
}

export function useIntroMachine() {
  const [context, dispatch] = useReducer(introReducer, initialContext);

  const send = useCallback((event: IntroEvent) => dispatch(event), []);

  return { context, send };
}

/** True once the landing content below the intro should be revealed. */
export function isRevealed(state: IntroState): boolean {
  return state === 'COMPLETED' || state === 'RECOVERED';
}
