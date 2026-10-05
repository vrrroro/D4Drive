interface CarPhotoProps {
  src: string | null;
  /** Make and model, used for alt text and the placeholder label. */
  name: string;
  /** Tailwind aspect class. The slot reserves its box either way, so no CLS. */
  aspect?: string;
  /** Grayscale at rest, colour and scale on group hover (DESIGN.md section 4). */
  hoverReveal?: boolean;
  /** Eager-load the first image on a page, which is its LCP candidate. */
  priority?: boolean;
  /**
   * Inside a link or card whose heading already names the car, the photo
   * adds nothing for a screen reader except a repeat of the name, so it is
   * hidden from the accessibility tree and the image gets empty alt text.
   */
  decorative?: boolean;
  className?: string;
}

/**
 * A car photograph, or a clearly labelled slot where one will go.
 *
 * DESIGN.md requires real images and bans filling a gap with stock photos or
 * CSS shapes. No photograph of the seeded cars has been sourced yet, so the
 * slot says so in words. `data-placeholder` lets a test or an audit find
 * every one that is still waiting.
 */
export function CarPhoto({
  src,
  name,
  aspect = 'aspect-[4/5]',
  hoverReveal = false,
  priority = false,
  decorative = false,
  className = '',
}: CarPhotoProps) {
  const frame = `relative ${aspect} overflow-hidden bg-[var(--surface)] shadow-[0_4px_24px_rgba(0,0,0,0.08)] ${className}`;

  if (!src) {
    return (
      <div
        {...(decorative
          ? { 'aria-hidden': true }
          : { role: 'img', 'aria-label': `Photograph of the ${name} not yet available` })}
        data-placeholder="car-photo"
        className={`${frame} flex items-end shadow-[inset_0_0_0_1px_rgba(0,0,0,0.06)]`}
      >
        {/* Ink, not muted: muted on the taupe slot measures just under 4.5:1. */}
        <p className="p-6 font-body text-[10px] uppercase tracking-[0.25em] text-[var(--ink)]/80">
          Photograph pending
        </p>
      </div>
    );
  }

  return (
    <div className={frame}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={decorative ? '' : name}
        loading={priority ? 'eager' : 'lazy'}
        decoding="async"
        className={`h-full w-full object-cover shadow-[inset_0_0_0_1px_rgba(0,0,0,0.06)] ${
          hoverReveal
            ? 'grayscale transition-[filter,transform] duration-[1500ms] ease-[cubic-bezier(0.25,0.46,0.45,0.94)] group-hover:scale-105 group-hover:grayscale-0 motion-reduce:transition-none motion-reduce:group-hover:scale-100'
            : ''
        }`}
      />
    </div>
  );
}
