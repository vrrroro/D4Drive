import Link from 'next/link';
import { getSession } from '@/lib/auth/guards';
import { Z } from '@/lib/constants';
import { HeaderTone } from './HeaderTone';
import { getFirstName } from '@/lib/services/users';
import { AccountMenu } from './AccountMenu';
import { LetsCta } from './LetsCta';

const HEADER_ID = 'site-header';

/**
 * Fixed header.
 *
 * A Server Component, so the signed-in state comes from the session cookie
 * during render instead of flashing in after a client fetch. Its colours come
 * from the panel underneath (HeaderTone). Transparent at the top of a page;
 * once the page has moved it gains a frosted bar, so content passes under it
 * instead of colliding with it.
 *
 * The condensed wordmark is the logo. On the landing it stays hidden until
 * the film starts (globals.css, `.film-track[data-film-phase]`), because the
 * hero already shows it at full size.
 */
export async function SiteHeader() {
  const session = await getSession();
  const name = session ? await getFirstName(session.userId).catch(() => null) : null;
  const link = 't-label whitespace-nowrap transition-colors duration-300 hover:text-[var(--header-accent)]';

  return (
    <header
      id={HEADER_ID}
      data-tone="light"
      style={{ zIndex: Z.nav }}
      className="site-header fixed inset-x-0 top-0 h-[var(--header-h)] text-[var(--header-fg)]"
    >
      <a
        href="#main"
        className="t-label sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:bg-[var(--ground)] focus:p-3 focus:text-[var(--ink)]"
      >
        Skip to content
      </a>
      <nav aria-label="Primary" className="flex h-full items-center justify-between gap-6 px-[var(--gutter)]">
        <Link
          href="/"
          aria-label="D4Drive, home"
          className="header-logo t-condensed block pt-[0.08em] text-[2.6rem] transition-[color,opacity] duration-500 hover:text-[var(--header-accent)]"
        >
          D4Drive
        </Link>

        <div className="flex items-center gap-4 sm:gap-7">
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
