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
      <div className="grid grid-cols-1 gap-16 lg:grid-cols-12 lg:gap-x-12">
        <div className="lg:col-span-7">
          <h2 id="locations-title" className="t-label leading-relaxed text-[var(--muted)]">
            Cars brought to you
            <br />
            across Bengaluru
          </h2>

          {branches.length > 0 && (
            <ul className="mt-12 grid grid-cols-1 gap-x-10 gap-y-9 sm:grid-cols-2 xl:grid-cols-3">
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
        </div>

        {showFleetLink && (
          <div className="lg:col-span-4 lg:col-start-9 lg:pt-16">
            <p className="t-sub">
              Pick a car.
              <br />
              We bring it to you.
            </p>
            {/* The note hangs under the button, its arrow rising to the button. */}
            <div className="relative mt-10 inline-block">
              <ButtonLink href="/cars" size="lg">
                Browse the fleet
              </ButtonLink>
              <Annotation
                arrow="swoop"
                tilt={-8}
                arrowClassName="order-first mr-[34%] h-auto w-[5.5rem] -scale-y-100 rotate-[-14deg] text-[var(--accent-text)]"
                className="absolute right-[-4rem] top-[calc(100%+0.15rem)] hidden w-56 flex-col items-end gap-1 text-right text-[var(--accent-text)] md:flex"
              >
                {'go on.\npick one.'}
              </Annotation>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
