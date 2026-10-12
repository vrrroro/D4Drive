/**
 * The slim line that ends every page: the year, the payment note, and who
 * made it. (The fleet photos are credited under each one on its car page,
 * and in full on /credits.) The branch list and "Browse the fleet" are
 * `LocationsSection`, which only the landing and the signed-out fleet show.
 *
 * Transparent, so it continues whatever page it closes rather than starting
 * a card of its own.
 */
export function SiteFooter() {
  const year = new Date().getFullYear();
  const item = 't-label text-[var(--muted)]';

  return (
    <footer aria-label="Site footer" className="site-footer px-[var(--gutter)] pb-8 pt-6">
      <div className="flex flex-col gap-4 border-t border-current/15 pt-6 sm:flex-row sm:flex-wrap sm:items-center">
        <p className={`${item} sm:border-r sm:border-current/20 sm:pr-4`}>&copy; {year} D4Drive</p>
        <p className={item}>Payment on this site is simulated</p>
        <p className="font-display text-base font-light italic sm:ml-auto">This Was Bloomed By Rohit</p>
      </div>
    </footer>
  );
}
