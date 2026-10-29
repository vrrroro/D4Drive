'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { readCsrfToken } from '@/lib/csrf';

/**
 * Signs out and goes home. `busy` is true while the request is in flight,
 * for disabling the button. Shared by the customer's account menu and the
 * admin's header links.
 */
export function useSignOut(onDone?: () => void) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function signOut() {
    if (busy) return;
    setBusy(true);
    try {
      await fetch('/api/auth/logout', { method: 'POST', headers: { 'x-csrf-token': readCsrfToken() } });
      onDone?.();
      router.push('/');
      // refresh() so Server Components re-render without the session cookie.
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return { signOut, busy };
}
