import { getSession } from '@/lib/auth/guards';
import { CarAdvisor } from './CarAdvisor';

/**
 * The car advisor is for customers and visitors choosing a car. A signed-in
 * admin has the operations pages instead, so it is not mounted for them on
 * any page. A Server Component: the role comes from the session cookie, and
 * signing in or out refreshes it (router.refresh in the auth flows).
 */
export async function AdvisorGate() {
  const session = await getSession();
  if (session?.role === 'admin') return null;
  return <CarAdvisor />;
}
