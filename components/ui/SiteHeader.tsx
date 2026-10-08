import Link from 'next/link';
import { getSession } from '@/lib/auth/guards';
import { Z } from '@/lib/constants';
import { HeaderTone } from './HeaderTone';
import { LetsCta } from './LetsCta';
import { SignOutButton } from './SignOutButton';

const HEADER_ID = 'site-header';

/**
 * Fixed, transparent header.
 *
 * A Server Component, so the signed-in state comes from the session cookie
 * during render instead of flashing in after a client fetch. Its colours come
 * from the panel underneath (HeaderTone), so there is no bar behind it.
 */
export async function SiteHeader() {
  const session = await getSession();
  const link = 't-label whitespace-nowrap transition-colors duration-300 hover:text-[var(--header-accent)]';

  return (
    <header
      id={HEADER_ID}
      data-tone="light"
      style={{ zIndex: Z.nav }}
      className="site-header fixed inset-x-0 top-0 h-[var(--header-h)] text-[var(--header-fg)] transition-colors duration-300"
    >
      <a
        href="#main"
        className="t-label sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:bg-[var(--ground)] focus:p-3 focus:text-[var(--ink)]"
      >
        Skip to content
      </a>
      <nav aria-label="Primary" className="flex h-full items-center justify-between gap-6 px-[var(--gutter)]">
        <Link href="/" className="font-display text-[1.65rem] font-normal leading-none tracking-[-0.02em] transition-colors duration-300 hover:text-[var(--header-accent)]">
          D4Drive
        </Link>

        <div className="flex items-center gap-4 sm:gap-7">
          <Link href="/cars" className={`${link} ${session?.role === 'admin' ? 'max-[399px]:hidden' : ''}`}>
            Fleet
          </Link>
          {session ? (
            <>
              <Link href="/bookings" className={link}>
                Bookings
              </Link>
              {session.role === 'admin' && (
                <Link href="/admin" className={link}>
                  Admin
                </Link>
              )}
              <SignOutButton className={link} />
            </>
          ) : (
            <Link href="/login" className={link}>
              Sign in
            </Link>
          )}
          <LetsCta className="hidden lg:inline-flex" />
        </div>
      </nav>
      <HeaderTone targetId={HEADER_ID} />
    </header>
  );
}
