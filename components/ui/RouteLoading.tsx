/**
 * Loading state for a server-rendered route while its data streams in.
 *
 * Quiet on purpose: a status line for assistive technology and a rule that
 * breathes in opacity (the only property it animates). No skeleton boxes
 * pretending to be the page; DESIGN.md bans div-built fakes of real UI.
 */
export function RouteLoading({ label }: { label: string }) {
  return (
    <main className="px-8 pt-24 pb-20 md:px-16" aria-busy="true">
      <div className="mx-auto w-full max-w-[1600px]">
        <div className="h-px w-8 animate-pulse bg-[var(--color-carmine)] motion-reduce:animate-none md:w-12" />
        <p
          role="status"
          className="mt-8 font-body text-[10px] uppercase tracking-[0.25em] text-[var(--muted)]"
        >
          {label}
        </p>
      </div>
    </main>
  );
}
