import Link from 'next/link';
import { getSession } from '@/lib/auth/guards';
import { Z } from '@/lib/constants';
import { SignOutButton } from './SignOutButton';

/**
 * Site navigation.
 *
 * A Server Component, so the signed-in state is read from the session cookie
 * during render rather than fetched on the client and flashed in afterwards.
 *
 * Single line at desktop and capped at 72px, per DESIGN.md section 5. A nav
 * that wraps to two lines at desktop is broken design.
 */
export async function SiteNav() {
  const session = await getSession();

  // Tracking and gaps tighten below 640px so the admin set of four links
  // still fits one line beside the wordmark at 375px.
  const link =
    'whitespace-nowrap font-body text-[10px] uppercase tracking-[0.12em] text-[var(--ink)] transition-colors duration-500 hover:text-[var(--accent-text)] sm:tracking-[0.25em]';

  return (
    <header
      data-intro-cover
      style={{ zIndex: Z.nav }}
      className="fixed inset-x-0 top-0 h-[72px] border-b border-[var(--ink)]/10 bg-[var(--ground)]/90 backdrop-blur"
    >
      <nav aria-label="Primary" className="mx-auto flex h-full w-full max-w-[1600px] items-center justify-between px-8 md:px-16">
        <Link href="/" className="shrink-0 font-display text-lg text-[var(--ink)] sm:text-xl">
          D4Drive
        </Link>

        <div className="flex items-center gap-3 sm:gap-6 md:gap-10">
          {/* Admins carry a fourth link. Below 400px the public fleet link
              gives way for them; Admin reaches the fleet anyway. */}
          <Link
            href="/cars"
            className={`${link} ${session?.role === 'admin' ? 'max-[399px]:hidden' : ''}`}
          >
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
              <SignOutButton />
            </>
          ) : (
            <Link href="/login" className={link}>
              Sign in
            </Link>
          )}
        </div>
      </nav>
    </header>
  );
}
