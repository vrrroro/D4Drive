import Link from 'next/link';
import { IntroSequence } from '@/components/intro/IntroSequence';
import { Button } from '@/components/ui/Button';

/**
 * The landing page.
 *
 * A Server Component. The only client JavaScript on this route is the intro
 * sequence, which is an isolated leaf. Everything below it renders on the
 * server and ships no bundle of its own.
 */
export default function HomePage() {
  return (
    <main>
      <IntroSequence />

      {/* Hero. min-h-[100dvh], never h-screen: the iOS Safari address bar
          collapses the viewport unit mid-scroll and shifts the layout on the
          most important screen in the product. */}
      <section className="relative flex min-h-[100dvh] items-end px-8 pb-20 pt-24 md:px-16 md:pb-32">
        <div className="mx-auto w-full max-w-[1600px]">
          <div className="grid grid-cols-1 gap-12 md:grid-cols-12">
            <div className="md:col-span-7 md:col-start-2">
              <div className="h-px w-8 bg-[var(--ink)] md:w-12" />

              <h1 className="font-display mt-8 text-5xl leading-[0.9] text-[var(--ink)] md:text-8xl lg:text-9xl">
                Drive easy.
                <br />
                Book smart.
                <br />
                <span className="italic-safe inline-block font-display italic text-[var(--color-carmine)]">
                  Delivered
                </span>{' '}
                to you.
              </h1>

              <p className="mt-10 max-w-[48ch] font-body text-base leading-relaxed text-[var(--muted)] md:text-lg">
                Pick a car, choose your dates, and we bring it to your door.
              </p>

              <div className="mt-12 flex flex-col gap-4 sm:flex-row">
                <Link href="/cars">
                  <Button size="lg">Browse the fleet</Button>
                </Link>
                <Link href="/bookings">
                  <Button variant="secondary" size="lg">
                    My bookings
                  </Button>
                </Link>
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
              <h2 className="font-display text-4xl leading-[0.95] text-[var(--color-paper)] md:text-6xl">
                Delivered where
                <br />
                you already{' '}
                <span className="italic-safe inline-block font-display italic text-[var(--color-foil)]">
                  are
                </span>
              </h2>
            </div>

            <div className="md:col-span-5 md:col-start-8">
              <p className="drop-cap font-body text-base leading-relaxed text-[var(--color-paper)]/70">
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
    </main>
  );
}
