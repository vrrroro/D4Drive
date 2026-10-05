'use client';

import { useEffect, useRef, useSyncExternalStore } from 'react';
import { Button } from '@/components/ui/Button';
import { POSTER_TIME, VIDEO_SOURCES } from './constants';

const QUERY = '(prefers-reduced-motion: reduce)';

function subscribe(onChange: () => void) {
  const media = window.matchMedia(QUERY);
  media.addEventListener('change', onChange);
  return () => media.removeEventListener('change', onChange);
}

/**
 * The manual play control promised by docs/VIDEO_STATE_MACHINE.md section 7.
 *
 * Reduced motion skips the film, but that is a stated preference, not a
 * prohibition. This offers it back, only to those visitors, as an explicit
 * choice: a native modal dialog (focus trap and Escape for free) with the
 * browser's own controls, so pausing and muting are in the viewer's hands.
 */
export function FilmOnRequest() {
  const reduced = useSyncExternalStore(
    subscribe,
    () => window.matchMedia(QUERY).matches,
    () => false,
  );
  const dialogRef = useRef<HTMLDialogElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return undefined;
    // Closing by Escape, the button, or the backdrop all stop the film.
    const stop = () => videoRef.current?.pause();
    dialog.addEventListener('close', stop);
    return () => dialog.removeEventListener('close', stop);
  }, [reduced]);

  if (!reduced) return null;

  return (
    <>
      <Button variant="secondary" size="lg" onClick={() => dialogRef.current?.showModal()}>
        Play the film
      </Button>

      <dialog
        ref={dialogRef}
        aria-label="The D4Drive film"
        className="m-auto w-full max-w-5xl bg-[var(--color-ink)] p-0 backdrop:bg-[var(--color-ink)]/80"
        onClick={(event) => {
          if (event.target === event.currentTarget) event.currentTarget.close();
        }}
      >
        <video
          ref={videoRef}
          controls
          playsInline
          preload="none"
          poster={VIDEO_SOURCES.poster}
          className="aspect-video w-full"
          onLoadedMetadata={(event) => {
            event.currentTarget.currentTime = POSTER_TIME;
          }}
        >
          <source src={VIDEO_SOURCES.webm1080} type="video/webm" />
          <source src={VIDEO_SOURCES.mp41080} type="video/mp4" />
        </video>
        <form method="dialog" className="flex justify-end p-4">
          <Button type="submit" variant="secondary" onDark size="sm">
            Close
          </Button>
        </form>
      </dialog>
    </>
  );
}
