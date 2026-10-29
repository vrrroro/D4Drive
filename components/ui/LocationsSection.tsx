import { formatPhone, listActiveBranches, type BranchRow } from '@/lib/services/branches';
import { Annotation } from './Annotation';
import { ButtonLink } from './ButtonLink';

/**
 * Where to find us, and the way into the fleet.
 *
 * Not a card: it shares the ground of the sign-in panel above it, so the
 * landing reads as one page that keeps going after the film. Shown after the
 * sign-in on the landing and at the end of the fleet for signed-out visitors.
 *
 * Branches come from the database. If it is down, the section still renders
 * without them rather than taking the page with it.
 */
export async function LocationsSection({ showFleetLink = true }: { showFleetLink?: boolean }) {
  let branches: BranchRow[] = [];
  try {
    branches = await listActiveBranches();
  } catch (error) {
    console.error('[locations]', error);
  }

  return (
    <section aria-labelledby="locations-title" data-tone="light" className="tone-ground px-[var(--gutter)] pb-[clamp(4rem,8vw,8rem)] pt-[clamp(4rem,8vw,8rem)]">
      <div className="flex flex-col gap-12 lg:flex-row lg:items-end lg:justify-between">
        <h2 id="locations-title" className="t-label leading-relaxed text-[var(--muted)]">
          Cars brought to you
          <br />
          across Bengaluru
        </h2>

        {showFleetLink && (
          <div className="flex flex-col items-start gap-8 lg:flex-row lg:items-center lg:gap-10">
            <p className="t-sub">
              Pick a car.
              <br />
              We bring it to you.
            </p>
            {/* The note sits to the button's left, its arrow running into it. */}
            <div className="flex items-center gap-4">
              <Annotation
                arrow="long"
                tilt={-8}
                arrowClassName="mt-1 h-auto w-[5rem] rotate-[4deg] text-[var(--accent-text)]"
                className="hidden w-32 flex-col items-end text-right text-[var(--accent-text)] xl:flex"
              >
                {'go on.\npick one.'}
              </Annotation>
              <ButtonLink href="/cars" size="lg">
                Browse the fleet
              </ButtonLink>
            </div>
          </div>
        )}
      </div>

      {/* Ten branches: five across, two rows, on a laptop. */}
      {branches.length > 0 && (
        <ul className="mt-16 grid grid-cols-1 gap-x-8 gap-y-12 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
          {branches.map((branch) => {
            const phone = formatPhone(branch.phone);
            return (
              <li key={branch.id}>
                <p className="font-display text-2xl font-light">{branch.name.replace(/^D4Drive\s+/, '')}</p>
                <p className="mt-2 font-body text-sm font-light leading-relaxed text-[var(--muted)]">
                  {branch.address}, {branch.city}
                </p>
                <a
                  href={phone.href}
                  className="mt-1 inline-block font-body text-sm underline decoration-current/40 underline-offset-4 transition-colors hover:text-[var(--accent-text)]"
                >
                  {phone.display}
                </a>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
