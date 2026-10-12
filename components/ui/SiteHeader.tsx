import Link from 'next/link';
import { getSession } from '@/lib/auth/guards';
import { Z } from '@/lib/constants';
import { HeaderTone } from './HeaderTone';
import { getFirstName } from '@/lib/services/users';
import { AccountMenu } from './AccountMenu';
import { IslandDock } from './IslandDock';
import { LetsCta } from './LetsCta';

const HEADER_ID = 'site-header';

/**
 * The header.
 *
 * At the top of a page: the condensed wordmark (home) top left, the links top
 * right, straight on the page. Once the page has moved, the two slide
 * together into a floating island of frosted glass, centred at the top, that
 * grows and shrinks with the typed word in "Let's ...". IslandDock does the
 * measuring and the docking; globals.css (`.site-header`) the glass and the
 * glide. Its tint follows the panel beneath (HeaderTone).
 *
 * A Server Component, so the signed-in state comes from the session cookie
 * during render instead of flashing in after a client fetch.
 */
export async function SiteHeader() {
  const session = await getSession();
  const name = session ? await getFirstName(session.userId).catch(() => null) : null;
  const link = 't-label whitespace-nowrap transition-colors duration-300 hover:text-[var(--header-accent)]';

  return (
    <header id={HEADER_ID} data-tone="light" style={{ zIndex: Z.nav }} className="site-header text-[var(--header-fg)]">
      <a
        href="#main"
        className="t-label pointer-events-auto sr-only focus:not-sr-only focus:absolute focus:left-[var(--gutter)] focus:top-[calc(100%+0.5rem)] focus:bg-[var(--ground)] focus:p-3 focus:text-[var(--ink)]"
      >
        Skip to content
      </a>
      <div aria-hidden="true" className="island-glass" data-island-glass />
      <nav aria-label="Primary" className="contents">
        <div className="header-logo-slot" data-island-logo>
          <Link
            href="/"
            aria-label="D4Drive, home"
            className="header-logo t-condensed block pt-[0.08em] text-[2.1rem] transition-colors duration-300 hover:text-[var(--header-accent)]"
          >
            D4Drive
          </Link>
        </div>

        <div className="header-links gap-5 sm:gap-7" data-island-links>
          <span aria-hidden="true" className="header-divider h-5 w-px bg-current" />
          <Link href="/cars" className={`${link} ${session ? 'max-sm:hidden' : ''}`}>
            Fleet
          </Link>
          {session ? (
            <AccountMenu name={name ?? 'you'} isAdmin={session.role === 'admin'} />
          ) : (
            <>
              <Link href="/login" className={link}>
                Sign in
              </Link>
              {/* The rotating invitation is for visitors who have not started yet. */}
              <LetsCta className="hidden lg:inline-flex" />
            </>
          )}
        </div>
      </nav>
      <HeaderTone targetId={HEADER_ID} />
      <IslandDock targetId={HEADER_ID} />
    </header>
  );
}
