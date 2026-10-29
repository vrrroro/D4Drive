'use client';

import { motion } from 'motion/react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { BootLoader } from './BootLoader';
import { VideoStage } from './VideoStage';
import { AuthGate } from './AuthGate';
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
export function IntroSequence() {
  const { context, send } = useIntroMachine();
  const { state, authError, recoveryReason } = context;

  const [progress, setProgress] = useState(0);
  const [loaderGone, setLoaderGone] = useState(false);

  const mountedAt = useRef(Date.now());
  const bufferReady = useRef(false);

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
    async (email: string, password: string) => {
      send({ type: 'SUBMIT' });

      try {
        const response = await fetch('/api/auth/login', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-csrf-token': readCsrfToken(),
          },
          body: JSON.stringify({ email, password }),
        });

        if (!response.ok) {
          const body = (await response.json().catch(() => ({}))) as { error?: string };
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

  const showLoader = state === 'BOOT' || (state === 'READY' && !loaderGone);
  const gateVisible = state === 'GATED' || state === 'AUTHENTICATING';
  const revealed = isRevealed(state);

  return (
    <>
      {!revealed && (
        <VideoStage
          state={state}
          onProgress={setProgress}
          onBufferReady={handleBufferReady}
          onPlaybackStarted={() => send({ type: 'PLAYBACK_STARTED' })}
          onEnded={() => send({ type: 'VIDEO_ENDED' })}
          onRecover={recover}
        />
      )}

      {!revealed && gateVisible && (
        <AuthGate
          visible={gateVisible}
          submitting={state === 'AUTHENTICATING'}
          error={authError}
          onSubmit={handleSubmit}
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
