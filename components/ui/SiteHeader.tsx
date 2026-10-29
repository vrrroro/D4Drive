import Link from 'next/link';
import { getSession } from '@/lib/auth/guards';
import { Z } from '@/lib/constants';
import { HeaderTone } from './HeaderTone';
import { getFirstName } from '@/lib/services/users';
import { AccountMenu } from './AccountMenu';
import { LetsCta } from './LetsCta';

const HEADER_ID = 'site-header';

/**
 * The header: a floating island.
 *
 * A small pane of frosted glass centred at the top of the screen, carrying
 * the condensed wordmark (home) and the links, with the page passing under
 * it (globals.css, `.site-header`). Its tint follows the panel beneath
 * (HeaderTone), and its glass thickens once the page has moved.
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
        className="t-label sr-only focus:not-sr-only focus:absolute focus:left-0 focus:top-[calc(100%+0.5rem)] focus:bg-[var(--ground)] focus:p-3 focus:text-[var(--ink)]"
      >
        Skip to content
      </a>
      <nav aria-label="Primary" className="flex h-full items-center gap-5 pl-5 pr-5 sm:gap-7 sm:pl-6 sm:pr-6">
        <Link
          href="/"
          aria-label="D4Drive, home"
          className="header-logo t-condensed block pt-[0.08em] text-[2.1rem] transition-colors duration-300 hover:text-[var(--header-accent)]"
        >
          D4Drive
        </Link>

        <span aria-hidden="true" className="h-5 w-px bg-current opacity-20" />

        <div className="flex items-center gap-5 sm:gap-7">
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
    </header>
  );
}
