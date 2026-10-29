import type { Metadata } from 'next';
import { AuthPanel } from '@/components/auth/AuthPanel';
import { safeNextPath } from '@/lib/safe-redirect';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = { title: 'Sign in' };

/**
 * Standalone sign in and register, for visitors sent here by a protected
 * page (with `?next=`) or by the header. The panel swings in from the left,
 * carmine, the way the reference system's contact overlay arrives.
 *
 * `next` is checked on the server, so an absolute or protocol-relative URL
 * never reaches the client as a redirect target.
 */
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const raw = (await searchParams).next;
  const next = safeNextPath(typeof raw === 'string' ? raw : null);

  return <AuthPanel id="sign-in" tone="hot" next={next} headingLevel="h1" tryRefresh swing />;
}
