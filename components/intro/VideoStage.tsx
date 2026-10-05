'use client';

import { useEffect, useRef } from 'react';
import { Z } from '@/lib/constants';
import { runParticles } from '@/components/fx/particle-stage';
import {
  BUFFER_THRESHOLD,
  GATE_SCRIM_OPACITY,
  LOADER_FADE_MS,
  POSTER_TIME,
  REVEAL_MS,
  SCATTER_MS,
  STALL_TIMEOUT_MS,
  VIDEO_SOURCES,
} from './constants';
import type { IntroState, RecoveryReason } from './useIntroMachine';

interface VideoStageProps {
  state: IntroState;
  onProgress: (fraction: number) => void;
  onBufferReady: () => void;
  onPlaybackStarted: () => void;
  onEnded: () => void;
  onRecover: (reason: RecoveryReason) => void;
  /** Fired once the stage has scattered (or faded) away after COMPLETED. */
  onReleased: () => void;
}

/**
 * The video element and every imperative command issued to it.
 *
 * Commands are effects of machine state, never the reverse. This component
 * reads `state` and tells the element what to do; it never decides what the
 * next state is.
 */
export function VideoStage({
  state,
  onProgress,
  onBufferReady,
  onPlaybackStarted,
  onEnded,
  onRecover,
  onReleased,
}: VideoStageProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);

  /**
   * Completion guard.
   *
   * A ref, not state. `ended` and the `timeupdate` fallback can both fire in
   * the same tick, and a state update would not have landed in time to stop
   * the second one.
   */
  const completed = useRef(false);

  const readyFired = useRef(false);
  const stallTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Buffering, readiness, stall detection, and end detection.
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const armStallTimer = () => {
      if (stallTimer.current) clearTimeout(stallTimer.current);
      stallTimer.current = setTimeout(() => {
        if (!readyFired.current) onRecover('stalled');
      }, STALL_TIMEOUT_MS);
    };

    const bufferedFraction = (): number => {
      const { buffered, duration } = video;
      if (!duration || Number.isNaN(duration) || buffered.length === 0) return 0;
      // The contiguous range from t=0 is what matters. A gap elsewhere in the
      // timeline does not help us play through from the start.
      return Math.min(buffered.end(0) / duration, 1);
    };

    const markReady = () => {
      if (readyFired.current) return;
      readyFired.current = true;
      if (stallTimer.current) clearTimeout(stallTimer.current);
      onBufferReady();
    };

    const handleProgress = () => {
      armStallTimer();
      const fraction = bufferedFraction();
      onProgress(fraction);
      if (fraction >= BUFFER_THRESHOLD) markReady();
    };

    const handleCanPlayThrough = () => {
      onProgress(1);
      markReady();
    };

    const handleLoadedMetadata = () => {
      // Seek past any black leader frame so the reveal lands on real picture.
      try {
        video.currentTime = POSTER_TIME;
      } catch {
        // Seeking before the browser is ready throws in some engines. The
        // poster attribute covers this frame regardless.
      }
    };

    const complete = () => {
      if (completed.current) return;
      completed.current = true;
      onEnded();
    };

    const handleTimeUpdate = () => {
      const { duration, currentTime } = video;
      // `ended` does not fire reliably across every browser and codec pair,
      // particularly when the final frame sits on a keyframe boundary.
      if (duration && duration - currentTime < 0.25) complete();
    };

    const handleError = () => onRecover('media-error');

    video.addEventListener('progress', handleProgress);
    video.addEventListener('canplaythrough', handleCanPlayThrough);
    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('ended', complete);
    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('error', handleError);

    armStallTimer();
    handleProgress();

    return () => {
      video.removeEventListener('progress', handleProgress);
      video.removeEventListener('canplaythrough', handleCanPlayThrough);
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('ended', complete);
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('error', handleError);
      if (stallTimer.current) clearTimeout(stallTimer.current);
    };
  }, [onProgress, onBufferReady, onEnded, onRecover]);

  // Playback control, driven by state.
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (state === 'UNLOCKED') {
      const attempt = video.play();
      // play() returns a promise that can reject, and an unhandled rejection
      // here would surface as a console error with no recovery.
      if (attempt !== undefined) {
        attempt.then(onPlaybackStarted).catch(() => onRecover('playback-rejected'));
      } else {
        onPlaybackStarted();
      }
    }

    if (
      state === 'READY' ||
      state === 'GATED' ||
      state === 'AUTHENTICATING' ||
      state === 'COMPLETED'
    ) {
      video.pause();
    }
  }, [state, onPlaybackStarted, onRecover]);

  /**
   * The reveal. The held last frame scatters into sand over the landing that
   * has been underneath all along. Without WebGL2 (or with a context that
   * cannot upload the frame) it is a plain opacity fade instead.
   */
  const onReleasedRef = useRef(onReleased);
  onReleasedRef.current = onReleased;

  useEffect(() => {
    if (state !== 'COMPLETED') return undefined;
    const video = videoRef.current;
    const stage = stageRef.current;
    if (!video || !stage) {
      onReleasedRef.current();
      return undefined;
    }

    let done = false;
    const release = () => {
      if (done) return;
      done = true;
      onReleasedRef.current();
    };

    const cancel = runParticles({
      source: video,
      rect: () => new DOMRect(0, 0, window.innerWidth, window.innerHeight),
      mode: 'dissolve',
      duration: SCATTER_MS / 1000,
      fit: 'cover',
      spread: 340,
      gravity: -0.16,
      swirl: 92,
      drift: 0.9,
      stagger: 0.76,
      sweep: 0.7,
      // Left to right, carrying on the direction the car leaves in.
      sweepAngle: 0,
      size: 1.2,
      fade: 0.88,
      onDone: release,
    });

    if (cancel) {
      // The stage queued its frame first, so by now the opening particle
      // frame (identical to the video) is drawn. No gap, no double image.
      const raf = requestAnimationFrame(() => {
        stage.style.visibility = 'hidden';
      });
      return () => {
        cancelAnimationFrame(raf);
        cancel();
      };
    }

    stage.style.transition = `opacity ${REVEAL_MS}ms cubic-bezier(0.25, 0.46, 0.45, 0.94)`;
    stage.style.opacity = '0';
    const timer = setTimeout(release, REVEAL_MS);
    return () => clearTimeout(timer);
  }, [state]);

  const dimmed = state === 'GATED' || state === 'AUTHENTICATING';

  return (
    <div
      ref={stageRef}
      style={{ zIndex: Z.videoStage }}
      className="fixed inset-0 overflow-hidden bg-[var(--color-ink)]"
      // Decorative. The sequence is narrated to assistive technology by the
      // loader's progressbar and the auth dialog, not by the film itself.
      aria-hidden="true"
    >
      <video
        ref={videoRef}
        // muted + playsInline are what make a programmatic play() legal under
        // browser autoplay policy. playsInline specifically stops iOS Safari
        // hijacking the film into its native fullscreen player.
        muted
        playsInline
        preload="auto"
        poster={VIDEO_SOURCES.poster}
        disablePictureInPicture
        className="h-full w-full object-cover"
      >
        <source src={VIDEO_SOURCES.webm720} type="video/webm" media="(max-width: 768px)" />
        <source src={VIDEO_SOURCES.mp4720} type="video/mp4" media="(max-width: 768px)" />
        <source src={VIDEO_SOURCES.webm1080} type="video/webm" />
        <source src={VIDEO_SOURCES.mp41080} type="video/mp4" />
      </video>

      {/* Dims the held frame behind the gate. An opacity transition on a
          scrim rather than a filter on the video: only transform and opacity
          animate, and a filter transition repaints the whole film. */}
      <div
        className="absolute inset-0 bg-[var(--color-ink)]"
        style={{
          opacity: dimmed ? GATE_SCRIM_OPACITY : 0,
          transition: `opacity ${LOADER_FADE_MS}ms cubic-bezier(0.25, 0.46, 0.45, 0.94)`,
        }}
      />
    </div>
  );
}
