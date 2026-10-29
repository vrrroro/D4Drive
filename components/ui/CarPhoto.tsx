interface CarPhotoProps {
  src: string | null;
  /** Make and model, for alt text and the placeholder label. */
  name: string;
  /** Tailwind aspect class. The slot reserves its box either way, so no CLS. */
  aspect?: string;
  /** Eager-load the first image on a page, which is its LCP candidate. */
  priority?: boolean;
  /**
   * Inside a link whose text already names the car, the photo would only
   * repeat the name to a screen reader, so it is hidden and its alt is empty.
   */
  decorative?: boolean;
  className?: string;
}

/**
 * A fleet photograph, or a clearly labelled slot where one will go.
 *
 * The seeded fleet's photos are studio composites on the same cyclorama as
 * the hero film (public/cars, credited on /credits). A car added from the
 * admin without a photo gets a slot that says so in words, never a stock
 * image or a CSS-drawn shape; `data-placeholder` lets an audit find them.
 */
export function CarPhoto({ src, name, aspect = 'aspect-[3/2]', priority = false, decorative = false, className = '' }: CarPhotoProps) {
  const frame = `relative block ${aspect} overflow-hidden bg-[var(--studio)] ${className}`;

  if (!src) {
    return (
      <span
        {...(decorative ? { 'aria-hidden': true } : { role: 'img', 'aria-label': `Photograph of the ${name} not yet available` })}
        data-placeholder="car-photo"
        className={`${frame} flex items-end text-[var(--ink)]`}
      >
        <span className="t-label p-6">Photograph pending</span>
      </span>
    );
  }

  return (
    <span className={frame}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={decorative ? '' : name}
        width={1600}
        height={1067}
        loading={priority ? 'eager' : 'lazy'}
        fetchPriority={priority ? 'high' : undefined}
        decoding="async"
        className="h-full w-full object-cover"
      />
    </span>
  );
}
