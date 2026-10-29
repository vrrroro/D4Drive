import { useEffect, useRef } from "react";
import { LOGO } from "@/lib/sequence";

interface Props {
  /** True once the film that follows can play through. Releases the loop. */
  ready: boolean;
  onSettled: () => void;
}

/**
 * The mark, spinning.
 *
 * Two stacked copies of the clip cross-dissolve into one another to make an
 * endless spin: the source is a half-rotation with a dolly-in and has no
 * matching frame pair, so a hard splice would visibly jump. The dissolve runs
 * long (700ms) on purpose — at that length it reads as a camera move rather
 * than a cut.
 *
 * The loop is the loading state and the deceleration is the loaded state: once
 * the car film can play through, the active copy is released to run out to its
 * natural settle, decelerating as it goes.
 */
export function LogoLoader({ ready, onSettled }: Props) {
  const aRef = useRef<HTMLVideoElement>(null);
  const bRef = useRef<HTMLVideoElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const readyRef = useRef(ready);
  const settledRef = useRef(onSettled);
  readyRef.current = ready;
  settledRef.current = onSettled;

  useEffect(() => {
    const a = aRef.current;
    const b = bRef.current;
    if (!a || !b) return;

    const layers = [a, b];
    let active = 0;
    let fadeStart = 0;
    let releasing = false;
    let raf = 0;
    let done = false;
    const mountedAt = performance.now();

    a.style.opacity = "1";
    b.style.opacity = "0";

    const play = (v: HTMLVideoElement) => void v.play().catch(() => {});
    play(a);

    const finish = () => {
      if (done) return;
      done = true;
      cancelAnimationFrame(raf);
      settledRef.current();
    };

    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      const cur = layers[active];
      const other = layers[1 - active];

      if (barRef.current && !releasing) {
        const p = Math.min((now - mountedAt) / 1000 / LOGO.minSpin, 1);
        barRef.current.style.transform = `scaleX(${p})`;
      }

      if (fadeStart) {
        const t = Math.min((now - fadeStart) / (LOGO.crossfade * 1000), 1);
        const eased = t * t * (3 - 2 * t);
        cur.style.opacity = String(1 - eased);
        other.style.opacity = String(eased);
        if (t >= 1) {
          cur.pause();
          cur.currentTime = 0;
          active = 1 - active;
          fadeStart = 0;
        }
        return;
      }

      if (releasing) {
        const span = LOGO.duration - LOGO.settleFrom;
        const p = Math.min(Math.max((cur.currentTime - LOGO.settleFrom) / span, 0), 1);
        const eased = 1 - (1 - p) ** 2;
        cur.playbackRate = Math.max(1 + (LOGO.settleRate - 1) * eased, 0.1);
        if (barRef.current) barRef.current.style.transform = "scaleX(1)";
        if (cur.ended || cur.currentTime >= LOGO.duration - 0.06) finish();
        return;
      }

      if (cur.currentTime >= LOGO.loopAt - LOGO.crossfade) {
        if (readyRef.current && (now - mountedAt) / 1000 >= LOGO.minSpin) {
          releasing = true;
        } else {
          other.currentTime = 0;
          play(other);
          fadeStart = now;
        }
      }
    };

    raf = requestAnimationFrame(tick);
    a.addEventListener("ended", finish);
    b.addEventListener("ended", finish);

    // Never strand a visitor on a loading screen, whatever the network does —
    // but only count time the page was actually on screen. A backgrounded tab
    // gets its rAF and its media decoding frozen, and burning the guard down
    // while nothing can advance would drop them straight past the film.
    let watchedMs = 0;
    const guard = window.setInterval(() => {
      if (document.visibilityState === "visible") watchedMs += 500;
      if (watchedMs >= 16000) finish();
    }, 500);

    return () => {
      cancelAnimationFrame(raf);
      clearInterval(guard);
      a.removeEventListener("ended", finish);
      b.removeEventListener("ended", finish);
    };
  }, []);

  return (
    <div className="grain absolute inset-0 grid place-items-center overflow-hidden bg-paper">
      {/* The box is cut to the clip's own 828×1108, so the two copies sit
          exactly on top of one another and the soft mask below lands on the
          real edge of the picture rather than on a letterboxed element. */}
      <div className="relative aspect-[828/1108] w-[min(86vw,56vh)]">
        {[aRef, bRef].map((ref, i) => (
          <video
            key={i}
            ref={ref}
            src={LOGO.src}
            poster={i === 0 ? LOGO.poster : undefined}
            muted
            playsInline
            preload="auto"
            aria-hidden
            /* Multiply sinks the clip's white studio ground into the page
               ground; the radial mask feathers what is left of the join, so
               there is no visible plate around the mark. */
            className="absolute inset-0 h-full w-full object-cover mix-blend-multiply"
            style={{
              opacity: i === 0 ? 1 : 0,
              maskImage:
                "radial-gradient(ellipse 78% 76% at 50% 47%, #000 58%, transparent 100%)",
            }}
          />
        ))}
      </div>

      <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-center gap-6 px-8 pb-8 md:px-16 md:pb-12">
        <span className="font-sans text-[10px] font-medium uppercase tracking-[0.42em] text-ink">
          D4Drive
        </span>
        <span className="h-px w-8 bg-ink/20" />
        <span className="font-display text-[12px] italic text-ash">
          Preparing the garage
        </span>
      </div>

      <div className="absolute inset-x-0 bottom-0 h-px bg-ink/10">
        <div
          ref={barRef}
          className="h-full origin-left scale-x-0 bg-gold"
          style={{ transition: "transform 240ms linear" }}
        />
      </div>
    </div>
  );
}
