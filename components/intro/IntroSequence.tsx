'use client';

import { motion } from 'motion/react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { BootLoader } from './BootLoader';
import { VideoStage } from './VideoStage';
import { AuthGate, type AuthMode, type AuthPayload } from './AuthGate';
import { useIntroMachine, isRevealed, type RecoveryReason } from './useIntroMachine';
import { BOOT_MAX_MS, BOOT_MIN_MS, INTRO_SEEN_KEY, REVEAL_MS } from './constants';
import { readCsrfToken } from '@/lib/csrf';

/**
 * Orchestrates the entry sequence.
 *
 * Loader, film, and gate are assembled here; the machine decides what is
 * visible and the children report events back. Nothing in this file decides a
 * transition on its own.
 */
export function IntroSequence({ authenticated = false }: { authenticated?: boolean }) {
  const { context, send } = useIntroMachine();
  const { state, authError, recoveryReason } = context;

  const [progress, setProgress] = useState(0);
  const [loaderGone, setLoaderGone] = useState(false);
  const [gateGone, setGateGone] = useState(false);
  const [stageReleased, setStageReleased] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const mountedAt = useRef(Date.now());
  const bufferReady = useRef(false);

  const handlePlaybackStarted = useCallback(() => send({ type: 'PLAYBACK_STARTED' }), [send]);
  const handleEnded = useCallback(() => send({ type: 'VIDEO_ENDED' }), [send]);
  const handleReleased = useCallback(() => setStageReleased(true), []);
  const handleGateDissolved = useCallback(() => setGateGone(true), []);

  const recover = useCallback(
    (reason: RecoveryReason) => send({ type: 'RECOVER', reason }),
    [send],
  );

  // Reduced motion and returning visitors both skip straight to the content.
  useEffect(() => {
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) {
      recover('reduced-motion');
      return;
    }

    try {
      // sessionStorage, not localStorage: the intro should return on a
      // genuinely new visit but not on an in-session reload. Safari private
      // mode throws on access, hence the catch.
      if (sessionStorage.getItem(INTRO_SEEN_KEY) === '1') {
        recover('already-seen');
      }
    } catch {
      // No session storage available. Show the intro; it is the safe default.
    }
  }, [recover]);

  // Hard ceiling on how long anyone waits at the loader.
  useEffect(() => {
    if (state !== 'BOOT') return undefined;
    const timer = setTimeout(() => {
      if (!bufferReady.current) recover('timeout');
    }, BOOT_MAX_MS);
    return () => clearTimeout(timer);
  }, [state, recover]);

  // A visitor with a live session gets the film but not the wall
  // (docs/VIDEO_STATE_MACHINE.md section 6). READY is the only state that
  // accepts this from the loader's side, so it is sent the moment we get there.
  useEffect(() => {
    if (authenticated && state === 'READY') send({ type: 'ALREADY_AUTHENTICATED' });
  }, [authenticated, state, send]);

  // Record completion so the sequence does not replay within the session.
  useEffect(() => {
    if (!isRevealed(state)) return;
    try {
      sessionStorage.setItem(INTRO_SEEN_KEY, '1');
    } catch {
      // Nothing to do. The intro simply plays again next reload.
    }
  }, [state]);

  /**
   * Holds BOOT for a floor before advancing.
   *
   * A warm cache can fire canplaythrough in under 100ms, and a loader that
   * flashes for one frame is worse than no loader at all.
   */
  const handleBufferReady = useCallback(() => {
    if (bufferReady.current) return;
    bufferReady.current = true;

    const elapsed = Date.now() - mountedAt.current;
    const remaining = Math.max(0, BOOT_MIN_MS - elapsed);
    setTimeout(() => send({ type: 'BUFFER_READY' }), remaining);
  }, [send]);

  const handleSubmit = useCallback(
    async (mode: AuthMode, payload: AuthPayload) => {
      send({ type: 'SUBMIT' });
      setFieldErrors({});

      try {
        const response = await fetch(`/api/auth/${mode}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-csrf-token': readCsrfToken(),
          },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          const body = (await response.json().catch(() => ({}))) as {
            error?: string;
            fields?: Record<string, string>;
          };
          if (body.fields) setFieldErrors(body.fields);
          send({
            type: 'AUTH_FAILURE',
            message: body.error ?? 'Those details did not match. Try again.',
          });
          return;
        }

        send({ type: 'AUTH_SUCCESS' });
      } catch {
        send({
          type: 'AUTH_FAILURE',
          message: 'Could not reach the server. Check your connection.',
        });
      }
    },
    [send],
  );

  const handleModeChange = useCallback(() => {
    setFieldErrors({});
    send({ type: 'CLEAR_ERROR' });
  }, [send]);

  const revealed = isRevealed(state);
  // The loader fades on its own clock. An authenticated visitor can move past
  // READY before it finishes, and the fade must still complete, not cut.
  const showLoader = !loaderGone && state !== 'RECOVERED';
  const gateVisible = state === 'GATED' || state === 'AUTHENTICATING';
  // After a successful sign-in the gate stays mounted while its type turns to
  // sand. Only a gate that was actually shown dissolves.
  const gateDissolving =
    (state === 'UNLOCKED' || state === 'PLAYING' || state === 'COMPLETED') && !gateGone;
  const [gateShown, setGateShown] = useState(false);
  useEffect(() => {
    if (gateVisible) setGateShown(true);
  }, [gateVisible]);
  // The stage outlives COMPLETED by exactly its scatter. RECOVERED drops it
  // at once: that path is the one that must never wait on an effect.
  const showStage = !revealed || (state === 'COMPLETED' && !stageReleased);

  return (
    <>
      {showStage && (
        <VideoStage
          state={state}
          onProgress={setProgress}
          onBufferReady={handleBufferReady}
          onPlaybackStarted={handlePlaybackStarted}
          onEnded={handleEnded}
          onRecover={recover}
          onReleased={handleReleased}
        />
      )}

      {state !== 'RECOVERED' && (gateVisible || (gateShown && gateDissolving)) && (
        <AuthGate
          visible={gateVisible}
          submitting={state === 'AUTHENTICATING'}
          dissolving={gateDissolving}
          error={authError}
          fieldErrors={fieldErrors}
          onSubmit={handleSubmit}
          onModeChange={handleModeChange}
          onDissolved={handleGateDissolved}
        />
      )}

      {showLoader && (
        <BootLoader
          progress={progress}
          dismissed={state !== 'BOOT'}
          onFaded={() => {
            setLoaderGone(true);
            send({ type: 'LOADER_FADED' });
          }}
        />
      )}

      {revealed && recoveryReason === 'reduced-motion' && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: REVEAL_MS / 1000 }}
          className="sr-only"
        >
          The introduction film was skipped because your system requests reduced motion.
        </motion.p>
      )}
    </>
  );
}
