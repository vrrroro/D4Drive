/**
 * Loading state for a server-rendered route while its data streams in.
 *
 * Quiet on purpose: a status line for assistive technology and a carmine rule
 * that breathes in opacity. No skeleton boxes pretending to be the page.
 */
export function RouteLoading({ label }: { label: string }) {
  return (
    <section className="panel tone-studio min-h-[100dvh] pt-[calc(var(--header-h)+clamp(2rem,4vw,4rem))]" data-tone="light" aria-busy="true">
      <div className="h-px w-16 animate-pulse bg-[var(--color-carmine)] motion-reduce:animate-none" />
      <p role="status" className="t-label mt-8 text-[var(--muted)]">
        {label}
      </p>
    </section>
  );
}
