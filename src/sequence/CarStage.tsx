import { forwardRef, useImperativeHandle, useRef } from "react";
import { CAR } from "@/lib/sequence";
import { cn } from "@/lib/cn";

export interface CarStageHandle {
  /** Play forward and stop on `target` seconds, frame-accurately. */
  playTo: (target: number) => Promise<void>;
  element: () => HTMLVideoElement | null;
  seek: (t: number) => Promise<void>;
}

interface Props {
  /** `hold` desaturates and eases in a slow push while the login is up. */
  mood: "clear" | "hold";
  onReady?: () => void;
}

function seekTo(v: HTMLVideoElement, t: number) {
  return new Promise<void>((resolve) => {
    if (Math.abs(v.currentTime - t) < 0.005) return resolve();
    let settled = false;
    const done = () => {
      if (settled) return;
      settled = true;
      v.removeEventListener("seeked", done);
      resolve();
    };
    v.addEventListener("seeked", done);
    v.currentTime = t;
    window.setTimeout(done, 700);
  });
}

export const CarStage = forwardRef<CarStageHandle, Props>(function CarStage(
  { mood, onReady },
  ref,
) {
  const vRef = useRef<HTMLVideoElement>(null);
  const hold = mood === "hold";

  useImperativeHandle(ref, () => ({
    element: () => vRef.current,
    seek: (t) => (vRef.current ? seekTo(vRef.current, t) : Promise.resolve()),
    playTo: (target) =>
      new Promise<void>((resolve) => {
        const v = vRef.current;
        if (!v) return resolve();
        v.playbackRate = 1;

        let settled = false;
        let raf = 0;
        let lastSeen = -1;
        let stalledMs = 0;

        const stop = () => {
          cancelAnimationFrame(raf);
          clearInterval(watchdog);
          v.removeEventListener("timeupdate", check);
        };

        const land = (snap: boolean) => {
          if (settled) return;
          settled = true;
          stop();
          v.pause();
          // Stop within a frame of the mark. Overrunning by more than a couple
          // of frames snaps back; less than that is imperceptible and a seek
          // would cost a decode hiccup for nothing.
          if (snap || v.currentTime - target > 0.06) {
            void seekTo(v, target).then(resolve);
          } else resolve();
        };

        const check = () => {
          if (!settled && (v.currentTime >= target - 0.012 || v.ended)) land(false);
        };

        const loop = () => {
          check();
          if (!settled) raf = requestAnimationFrame(loop);
        };

        // rAF is frozen in a hidden tab and `timeupdate` keeps firing, so the
        // two together cover both states. The watchdog measures a genuine
        // stall — playback that is not advancing while the page is on screen —
        // rather than a wall-clock deadline, which a backgrounded tab or a slow
        // connection would trip through no fault of its own.
        const watchdog = window.setInterval(() => {
          if (settled) return;
          check();
          if (settled || document.visibilityState !== "visible") return;
          stalledMs = v.currentTime === lastSeen ? stalledMs + 500 : 0;
          lastSeen = v.currentTime;
          if (stalledMs >= 9000) land(true);
        }, 500);

        v.addEventListener("timeupdate", check);
        raf = requestAnimationFrame(loop);
        void v.play().catch(() => {});
      }),
  }));

  return (
    <video
      ref={vRef}
      src={CAR.src}
      poster={CAR.poster}
      muted
      playsInline
      preload="auto"
      aria-hidden
      onCanPlayThrough={onReady}
      className={cn(
        "absolute inset-0 h-full w-full object-cover",
        "transition-[filter,transform] ease-lux",
        hold
          ? "scale-[1.05] [filter:grayscale(1)_contrast(1.06)_brightness(0.97)] duration-[6000ms]"
          : "scale-100 [filter:grayscale(0)] duration-[1600ms]",
      )}
    />
  );
});
