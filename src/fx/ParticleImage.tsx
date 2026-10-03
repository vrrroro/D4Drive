import { useRef } from "react";
import { cn } from "@/lib/cn";
import { useParticleAssemble } from "./use-particles";
import type { ParticleOptions } from "./particle-stage";

interface Props {
  src: string;
  alt: string;
  /** Wrapper classes — set the aspect ratio here. */
  className?: string;
  imgClassName?: string;
  /** Stagger sibling photographs so a grid does not land all at once. */
  delay?: number;
  tuning?: Partial<ParticleOptions> & { duration?: number };
  eager?: boolean;
}

/**
 * A photograph that condenses out of sand as it scrolls into view.
 *
 * Desaturation is passed to the shader rather than left to CSS: the grains are
 * sampled from the raw file, so without it the sand would arrive in full colour
 * and snap to grey the instant it landed.
 */
export function ParticleImage({
  src,
  alt,
  className,
  imgClassName,
  delay = 0,
  tuning,
  eager = false,
}: Props) {
  const ref = useRef<HTMLImageElement>(null);

  const settled = useParticleAssemble(ref, {
    duration: 1.7 + delay,
    spread: 190,
    gravity: -0.22,
    swirl: 54,
    drift: 0.6,
    stagger: 0.74,
    sweep: 0.5,
    sweepAngle: -0.5,
    size: 1.1,
    fade: 0.8,
    desaturate: 1,
    ...tuning,
  });

  return (
    <div
      className={cn(
        "relative overflow-hidden bg-taupe/45 shadow-frame [box-shadow:var(--inset-hair)]",
        className,
      )}
    >
      <img
        ref={ref}
        src={src}
        alt={alt}
        loading={eager ? "eager" : "lazy"}
        decoding="async"
        data-settled={settled ? "" : undefined}
        className={cn(
          "h-full w-full object-cover grayscale transition-[filter,transform,opacity]",
          "duration-[1800ms] ease-lux group-hover:scale-[1.05] group-hover:grayscale-0",
          imgClassName,
        )}
      />
    </div>
  );
}
