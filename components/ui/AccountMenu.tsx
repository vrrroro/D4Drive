'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useId, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { readCsrfToken } from '@/lib/csrf';

interface AccountMenuProps {
  name: string;
  isAdmin: boolean;
}

/**
 * "Signed in as Name", with the account's places in a menu beneath it.
 *
 * A disclosure button rather than an ARIA menu: the items are ordinary links
 * and one button, reached with Tab like everything else. Escape, a click
 * outside, or a new page closes it.
 */
export function AccountMenu({ name, isAdmin }: AccountMenuProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuId = useId();

  useEffect(() => setOpen(false), [pathname]);

  useEffect(() => {
    if (!open) return undefined;
    const onPointer = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };
    document.addEventListener('pointerdown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  async function signOut() {
    if (busy) return;
    setBusy(true);
    try {
      await fetch('/api/auth/logout', { method: 'POST', headers: { 'x-csrf-token': readCsrfToken() } });
      setOpen(false);
      router.push('/');
      // refresh() so Server Components re-render without the session cookie.
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  const item =
    't-label flex w-full items-center px-5 py-3.5 text-left text-[var(--ink)] transition-colors duration-200 hover:bg-[var(--color-carmine)] hover:text-[var(--color-paper)] focus-visible:bg-[var(--color-carmine)] focus-visible:text-[var(--color-paper)] focus-visible:outline-none';

  const links = [
    { href: '/bookings', label: 'My bookings' },
    { href: '/cars', label: 'Fleet' },
    ...(isAdmin
      ? [
          { href: '/admin', label: 'Operations' },
          { href: '/admin/fleet', label: 'Fleet admin' },
          { href: '/admin/bookings', label: 'Bookings admin' },
          { href: '/admin/reports', label: 'Reports' },
        ]
      : []),
  ];

  return (
    <div ref={rootRef} className="relative">
      <button
        ref={buttonRef}
        type="button"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((v) => !v)}
        className="t-label inline-flex items-center gap-2 whitespace-nowrap normal-case tracking-[0.06em] transition-colors duration-300 hover:text-[var(--header-accent)]"
      >
        <span className="uppercase tracking-[0.2em] text-[var(--header-fg)]/75">Signed in as</span>
        <span className="font-display text-[1.05rem] font-normal normal-case tracking-normal underline decoration-1 underline-offset-[5px]">{name}</span>
        <ChevronDown aria-hidden className={`h-3.5 w-3.5 transition-transform duration-300 ${open ? 'rotate-180' : ''}`} strokeWidth={1.75} />
      </button>

      <div
        id={menuId}
        hidden={!open}
        className="island-menu absolute right-[-1.5rem] top-[calc(100%+1.35rem)] min-w-[15rem] py-2"
      >
        <ul className="flex flex-col">
          {links.map((link) => (
            <li key={link.href}>
              <Link href={link.href} className={item} aria-current={pathname === link.href ? 'page' : undefined}>
                {link.label}
              </Link>
            </li>
          ))}
          <li className="mt-2 border-t border-[var(--ink)]/10 pt-2">
            <button type="button" onClick={signOut} disabled={busy} className={`${item} disabled:opacity-50`}>
              Sign out
            </button>
          </li>
        </ul>
      </div>
    </div>
  );
}
