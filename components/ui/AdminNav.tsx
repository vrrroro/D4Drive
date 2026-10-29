'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSignOut } from './use-sign-out';

/**
 * An admin's header: every operations page, and Sign out, in the island
 * itself rather than behind a menu. No "My bookings" or public fleet: an
 * admin's places are the operations pages.
 *
 * On a phone the row is wider than the screen, so it scrolls sideways
 * inside the island (IslandDock measures the clipped width).
 */
const LINKS = [
  { href: '/admin', label: 'Operations' },
  { href: '/admin/fleet', label: 'Fleet admin' },
  { href: '/admin/bookings', label: 'Bookings admin' },
  { href: '/admin/reports', label: 'Reports' },
  { href: '/admin/database', label: 'Database' },
];

export function AdminNav({ className }: { className: string }) {
  const pathname = usePathname();
  const { signOut, busy } = useSignOut();

  return (
    <div className="admin-nav flex items-center gap-5 sm:gap-7" data-admin-nav>
      {LINKS.map((link) => {
        const current = pathname === link.href;
        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={current ? 'page' : undefined}
            className={`${className} ${current ? 'text-[var(--header-accent)]' : ''}`}
          >
            {link.label}
          </Link>
        );
      })}
      <button type="button" onClick={signOut} disabled={busy} className={`${className} disabled:opacity-50`}>
        Sign out
      </button>
    </div>
  );
}
