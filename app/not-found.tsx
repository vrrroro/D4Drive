import Link from 'next/link';
import { Button } from '@/components/ui/Button';

export default function NotFound() {
  return (
    <main className="flex min-h-[100dvh] items-center px-8 md:px-16">
      <div className="mx-auto w-full max-w-[1600px]">
        <div className="grid grid-cols-1 md:grid-cols-12">
          <div className="md:col-span-6 md:col-start-2">
            <div className="h-px w-8 bg-[var(--color-carmine)] md:w-12" />
            <h1 className="font-display mt-8 text-5xl leading-[0.9] text-[var(--ink)] md:text-8xl">
              Wrong{' '}
              <span className="italic-safe inline-block font-display italic text-[var(--color-carmine)]">
                turn
              </span>
            </h1>
            <p className="mt-8 max-w-[48ch] font-body text-[var(--muted)]">
              That page does not exist. The fleet is still where you left it.
            </p>
            <Link href="/cars" className="mt-12 inline-block">
              <Button size="lg">Browse the fleet</Button>
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
