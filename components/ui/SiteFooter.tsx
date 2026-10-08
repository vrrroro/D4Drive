import Link from 'next/link';
import { StackPanel } from '@/components/motion/StackPanel';
import { formatPhone, listActiveBranches, type BranchRow } from '@/lib/services/branches';
import { Annotation } from './Annotation';
import { ButtonLink } from './ButtonLink';

/**
 * The last card in every page's stack: charcoal, dealt in with a clockwise
 * lean, the brand cropped by the bottom of the page.
 *
 * Branches come from the database. If it is down, the footer still renders
 * without them rather than taking the page with it.
 */
export async function SiteFooter() {
  let branches: BranchRow[] = [];
  try {
    branches = await listActiveBranches();
  } catch (error) {
    console.error('[footer]', error);
  }
  const year = new Date().getFullYear();

  return (
    <StackPanel as="footer" tone="night" tilt={1} pin={false} className="overflow-hidden" aria-label="Site footer">
      <div className="px-[var(--gutter)] pt-[clamp(5rem,9vw,9rem)]">
        <div className="grid grid-cols-1 gap-16 lg:grid-cols-12 lg:gap-x-12">
          <div className="lg:col-span-5">
            <p className="t-label leading-relaxed text-[var(--color-blush)]">
              Self-drive cars
              <br />
              delivered in Bengaluru
            </p>

            {branches.length > 0 && (
              <ul className="mt-12 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                {branches.map((branch) => {
                  const phone = formatPhone(branch.phone);
                  return (
                    <li key={branch.id}>
                      <p className="font-display text-2xl font-light text-[var(--color-paper)]">{branch.name.replace(/^D4Drive\s+/, '')}</p>
                      <p className="mt-2 font-body text-sm font-light leading-relaxed text-[var(--color-blush)]/80">
                        {branch.address}, {branch.city}
                      </p>
                      <a href={phone.href} className="mt-1 inline-block font-body text-sm text-[var(--color-blush)] underline decoration-[var(--color-blush)]/40 underline-offset-4 transition-colors hover:text-[var(--color-paper)]">
                        {phone.display}
                      </a>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <div className="relative lg:col-span-5 lg:col-start-8">
            <p className="t-sub text-[var(--color-paper)]">
              Pick a car.
              <br />
              We bring it to you.
            </p>
            <ButtonLink href="/cars" variant="blush" size="lg" className="mt-10 w-full sm:w-auto">
              Browse the fleet
            </ButtonLink>
            <Annotation
              arrow="long"
              tilt={-10}
              arrowClassName="mt-1 h-auto w-[9rem] rotate-[24deg] text-[#e8806f]"
              className="mt-8 text-[#e8806f] md:absolute md:-left-56 md:top-24 md:mt-0 md:w-52"
            >
              {'go on.\npick one.'}
            </Annotation>
          </div>
        </div>

        <div className="mt-24 flex flex-col gap-4 border-t border-[var(--color-blush)]/20 pt-6 sm:flex-row sm:flex-wrap sm:items-center">
          <p className="t-label text-[var(--color-blush)]/80 sm:border-r sm:border-[var(--color-blush)]/25 sm:pr-4">
            &copy; {year} D4Drive
          </p>
          <p className="t-label text-[var(--color-blush)]/80 sm:border-r sm:border-[var(--color-blush)]/25 sm:pr-4">
            Payment on this site is simulated
          </p>
          <Link href="/credits" className="t-label text-[var(--color-blush)] transition-colors hover:text-[var(--color-paper)]">
            Photo credits
          </Link>
        </div>
      </div>

      {/* Cropped by the bottom of the page: only the top of the letters shows. */}
      <p
        aria-hidden="true"
        className="t-condensed -mb-[0.31em] mt-8 select-none whitespace-nowrap px-[var(--gutter)] text-[clamp(10rem,44vw,52rem)] text-[var(--color-blush)]"
      >
        D4Drive
      </p>
    </StackPanel>
  );
}
