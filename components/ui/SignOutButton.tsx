'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { readCsrfToken } from '@/lib/csrf';

export function SignOutButton({ className = '' }: { className?: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function signOut() {
    if (busy) return;
    setBusy(true);
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        headers: { 'x-csrf-token': readCsrfToken() },
      });
      router.push('/');
      // refresh() so Server Components re-render without the session cookie.
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <button type="button" onClick={signOut} disabled={busy} className={`${className} disabled:opacity-50`}>
      Sign out
    </button>
  );
}
