import { IntroSequence } from '@/components/intro/IntroSequence';
import { FilmOnRequest } from '@/components/intro/FilmOnRequest';
import { Button } from '@/components/ui/Button';
import { ButtonLink } from '@/components/ui/ButtonLink';
import { getSession } from '@/lib/auth/guards';

/**
 * The landing page.
 *
 * A Server Component. The only client JavaScript on this route is the intro
 * sequence, which is an isolated leaf. Everything below it renders on the
 * server and ships no bundle of its own.
 */
export default async function HomePage() {
  // Read on the server so a signed-in visitor skips the gate without a
  // client round trip, and without ever seeing the panel flash up.
  const session = await getSession();

  return (
    <main>
      {/* Without JavaScript the intro can never advance, and its
          server-rendered loader would cover the page for good. */}
      <noscript>
        <style>{'[data-intro-layer]{display:none!important}'}</style>
      </noscript>
      <IntroSequence authenticated={session !== null} />

      {/* Inert while the intro covers it, so Tab cannot reach links that
          sit invisibly behind the film (IntroSequence toggles this). */}
      <div data-intro-cover>

        {/* Hero. min-h-[100dvh], never h-screen: the iOS Safari address bar
            collapses the viewport unit mid-scroll and shifts the layout on the
            most important screen in the product. */}
        <section className="relative flex min-h-[100dvh] items-end px-8 pb-20 pt-24 md:px-16 md:pb-32">
          <div className="mx-auto w-full max-w-[1600px]">
            <div className="grid grid-cols-1 gap-12 md:grid-cols-12">
              <div className="md:col-span-10 md:col-start-2">
                <div className="h-px w-8 bg-[var(--ink)] md:w-12" />

                {/* Two lines at every width, per DESIGN.md section 10. The brand
                    line moved into the subtext rather than stacking four lines
                    of display type above the fold. Fluid size, so each line stays
                    whole from 375px (48px type) to 1600px (128px, text-9xl). */}
                <h1 className="font-display mt-8 text-[clamp(3rem,10.5vw,8rem)] leading-[0.9] text-[var(--ink)]">
                  <span className="italic-safe inline-block font-display italic text-[var(--accent-text)]">
                    Delivered
                  </span>
                  <br />
                  <span className="whitespace-nowrap">to your door.</span>
                </h1>

                <p className="mt-10 max-w-[48ch] font-body text-base leading-relaxed text-[var(--muted)] md:text-lg">
                  Drive easy, book smart. Pick a car, choose your dates, and we
                  bring it to you.
                </p>

                <div className="mt-12 flex flex-col gap-4 sm:flex-row">
                  <ButtonLink href="/cars" size="lg">
                    Browse the fleet
                  </ButtonLink>
                  <ButtonLink href="/bookings" variant="secondary" size="lg">
                    My bookings
                  </ButtonLink>
                  <FilmOnRequest />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* One deliberate charcoal band. DESIGN.md section 1 permits exactly one
            as a composition device; every other section stays on ground. */}
        <section className="border-t border-[var(--ink)]/10 bg-[var(--color-ink)] px-8 py-20 md:px-16 md:py-32">
          <div className="mx-auto w-full max-w-[1600px]">
            <div className="grid grid-cols-1 gap-16 md:grid-cols-12">
              <div className="md:col-span-5">
                <div className="h-px w-8 bg-[var(--color-carmine)] md:w-12" />
                {/* Emphasis is italic in paper here, not carmine: carmine on
                    charcoal measures about 2.5:1 and fails even the 3:1 large
                    text floor. Gold never sets text (DESIGN.md section 1). */}
                <h2 className="font-display mt-8 text-4xl leading-[0.95] text-[var(--color-paper)] md:text-6xl">
                  Delivered where
                  <br />
                  you already{' '}
                  <span className="italic-safe inline-block font-display italic text-[var(--color-paper)]">
                    are
                  </span>
                </h2>
              </div>

              <div className="md:col-span-5 md:col-start-8">
                <p className="drop-cap drop-cap-on-dark font-body text-base leading-relaxed text-[var(--color-paper)]/80">
                  Doorstep delivery runs from each branch to any address within
                  fifteen kilometres. The first five are free, and the fee is shown
                  before you pay, not after. If you would rather collect the car
                  yourself, self-pickup costs nothing at all.
                </p>
              </div>
            </div>
          </div>
        </section>

        <footer className="border-t border-[var(--ink)]/20 px-8 py-16 md:px-16">
          <div className="mx-auto flex w-full max-w-[1600px] flex-col justify-between gap-8 md:flex-row md:items-end">
            <p className="font-display text-3xl text-[var(--ink)]">D4Drive</p>
            <p className="font-body text-[10px] uppercase tracking-[0.25em] text-[var(--muted)]">
              Payment on this site is simulated
            </p>
          </div>
        </footer>
      </div>
    </main>
  );
}
