import { AuthPanel, WelcomePanel } from '@/components/auth/AuthPanel';
import { FilmChapter } from '@/components/film/FilmChapter';
import { FilmHero } from '@/components/film/FilmHero';
import { FilmStory } from '@/components/film/FilmStory';
import { FilmOnRequest } from '@/components/film/FilmOnRequest';
import { Annotation } from '@/components/ui/Annotation';
import { LocationsSection } from '@/components/ui/LocationsSection';
import { RotatingWord } from '@/components/ui/RotatingWord';
import { getSession } from '@/lib/auth/guards';
import { DELIVERY_TIERS, MAX_DELIVERY_KM } from '@/lib/constants';
import { FILM_MANIFEST, frameSrc } from '@/lib/film-manifest';
import { LAST_BEAT } from '@/components/film/timeline';
import { listActiveBranches, listFleetPhotos } from '@/lib/services/branches';
import { formatCurrency } from '@/lib/services/pricing';
import { getFirstName } from '@/lib/services/users';

export const dynamic = 'force-dynamic';

/** What a Bengaluru ride is usually doing when you need it. */
const ROAST = [
  'late again',
  'surge priced',
  'cancelled on you',
  'twenty minutes away',
  'stuck at Silk Board',
  'asking where you are',
  'already full',
  'out of charge',
  'not answering',
];

/** The still at a beat of the film (30 a second), whatever the cut. */
const still = (beat: number) => frameSrc(Math.round((beat / LAST_BEAT) * (FILM_MANIFEST.count - 1)));

function list(items: string[]): string {
  if (items.length <= 1) return items.join('');
  return `${items.slice(0, -1).join(', ')} or ${items[items.length - 1]}`;
}

/**
 * The landing page: the film, scrubbed by the scroll, telling the company's
 * story in the spaces it leaves, then dissolving into the sign-in panel as
 * the car leaves frame.
 *
 * A Server Component: every number and name in the copy comes from the
 * database or lib/constants, and the session decides whether the film ends
 * on a form or a welcome.
 */
export default async function HomePage() {
  const session = await getSession();
  const [branches, photos, firstName] = await Promise.all([
    listActiveBranches().catch(() => []),
    listFleetPhotos().catch(() => [] as string[]),
    session ? getFirstName(session.userId).catch(() => null) : Promise.resolve(null),
  ]);

  const firstTier = DELIVERY_TIERS[0];
  const branchNames = branches.map((b) => b.name.replace(/^D4Drive\s+/, ''));

  return (
    <>
      <FilmStory label="The D4Drive film">
        <FilmHero images={photos} />

        <FilmChapter id="flank" still={{ src: still(70), alt: 'A red sports coupe side on, in a white studio.' }}>
          <h2 className="ch-top-left ch-head t-display absolute text-[var(--ink)]">
            We bring the car.
            <br />
            <span className="italic">You</span> take the wheel.
          </h2>
          <p className="ch-top-right ch-body-top t-body absolute max-w-[min(30vw,26rem)] text-[var(--ink)]">
            D4Drive is car rental for Bengaluru, brought to you. Pick a car, choose your dates and pay once. We drive it to
            your door and hand you the keys.
          </p>
          <Annotation
            tilt={9}
            arrow="loop"
            arrowClassName="mt-1 h-auto w-[clamp(3.5rem,5.5vw,6.5rem)] rotate-[58deg] text-[var(--color-carmine)]"
            className="ch-landscape-only absolute left-[44vw] top-[9dvh] text-[var(--color-carmine)] [&_.t-marker]:text-[clamp(1.1rem,1.5vw,1.8rem)]"
          >
            {"this one isn't\nfor rent. sadly."}
          </Annotation>
        </FilmChapter>

        <FilmChapter id="roast" still={{ src: still(120), alt: 'The coupe head-on, facing the camera.' }}>
          <div className="ch-left-flank absolute">
            <p className="t-eyebrow text-[var(--ink)]">Your ride is</p>
            <p className="t-condensed mt-4 text-[clamp(3.2rem,6.6vw,8.4rem)] text-[var(--color-carmine)] [text-shadow:0.024em_0.024em_0_var(--color-oxblood)]">
              <RotatingWord words={ROAST} label={`Your ride is ${list(ROAST)}.`} shuffle holdMs={1100} />
            </p>
          </div>
          <h2 className="ch-right-flank t-hero absolute text-[clamp(2.6rem,6.4vw,8rem)] text-[var(--ink)]">
            We can
            <br />
            help.
          </h2>
          <p className="ch-bottom-right ch-landscape-only t-body absolute text-right text-[var(--ink)]">
            Book in about two minutes. The car turns up on the day you pick, at your door or ready to collect.
          </p>
        </FilmChapter>

        <FilmChapter id="delivery" still={{ src: still(176), alt: 'The coupe at three quarters, turned to the right.' }}>
          <h2 className="ch-top-left ch-head t-display absolute max-w-[46vw] text-[var(--ink)]">
            Free delivery inside {firstTier.maxKm} km.
          </h2>
          <dl className="ch-top-right ch-landscape-only absolute grid grid-cols-[auto_auto] items-baseline gap-x-8 gap-y-2 text-[var(--ink)]">
            {DELIVERY_TIERS.map((tier, i) => (
              <div key={tier.maxKm} className="contents">
                <dt className="t-label text-[var(--muted)]">
                  {i === 0 ? 'Up to' : `${DELIVERY_TIERS[i - 1]!.maxKm} to`} {tier.maxKm} km
                </dt>
                <dd className="t-sub text-right">{tier.fee === 0 ? 'Free' : formatCurrency(tier.fee)}</dd>
              </div>
            ))}
          </dl>
          <Annotation
            tilt={-9}
            arrow="long"
            arrowClassName="ml-auto mt-1 h-auto w-[7.5rem] rotate-[6deg] text-[var(--color-carmine)]"
            className="ch-landscape-only absolute right-[calc(var(--gutter)+17rem)] top-[calc(var(--header-h)+3dvh)] w-48 text-right text-[var(--color-carmine)]"
          >
            {'shown before\nyou pay'}
          </Annotation>
          <p className="ch-bottom-left t-body absolute text-[var(--ink)]">
            Further than {MAX_DELIVERY_KM} km from the car&apos;s branch, we cannot deliver yet. Collect it instead: free at
            its own branch
            {branchNames.length > 1 && (
              <>, or at any of our {branchNames.length} branches within {MAX_DELIVERY_KM} km for the same fee as a delivery</>
            )}
            .
          </p>
        </FilmChapter>

        <FilmChapter id="takeoff" still={{ src: still(240), alt: 'The coupe leaving frame through tyre smoke.' }}>
          <div className="ch-smoke absolute">
            <h2 className="t-mega text-[var(--ink)]">Your turn.</h2>
            <p className="t-body mt-8 max-w-[34ch] text-[var(--ink)]">
              Sign in, or make an account in a minute, and pick a car.
            </p>
            <div className="mt-8">
              <FilmOnRequest />
            </div>
          </div>
          <Annotation
            tilt={-6}
            arrow="long"
            arrowClassName="mt-2 h-auto w-[clamp(7rem,11vw,12rem)] rotate-[-4deg] text-[var(--color-carmine)]"
            className="ch-landscape-only absolute left-[24vw] top-[64dvh] text-[var(--color-carmine)]"
          >
            there it goes.
          </Annotation>
        </FilmChapter>
      </FilmStory>

      {session ? (
        <WelcomePanel id="sign-in" name={firstName ?? 'there'} />
      ) : (
        <AuthPanel id="sign-in" tone="light" next="/cars" />
      )}
      <LocationsSection />
    </>
  );
}
