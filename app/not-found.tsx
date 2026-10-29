import { StackPanel } from '@/components/motion/StackPanel';
import { Annotation } from '@/components/ui/Annotation';
import { ButtonLink } from '@/components/ui/ButtonLink';
import { RotatingWord } from '@/components/ui/RotatingWord';

const EXCUSES = ['not here', 'on a road trip', 'out of range', 'stuck at Silk Board', 'taking the long way'];

export default function NotFound() {
  return (
    <StackPanel tone="studio" className="panel flex min-h-[100dvh] flex-col justify-center pt-[calc(var(--header-h)+3rem)]" aria-labelledby="nf-title">
      <h1 id="nf-title" className="t-mega">
        Wrong turn.
      </h1>
      <p className="mt-10 flex flex-wrap items-baseline gap-x-4">
        <span className="t-eyebrow text-[var(--muted)]">This page is</span>
        <span className="t-condensed text-[clamp(3rem,7vw,7rem)] text-[var(--accent-text)]">
          <RotatingWord words={EXCUSES} label={`This page is ${EXCUSES.join(', ')}.`} holdMs={1200} />
        </span>
      </p>
      <p className="t-body mt-8 max-w-[44ch] text-[var(--muted)]">That page does not exist. The fleet is still where you left it.</p>
      <div className="relative mt-12 flex w-fit items-end gap-6">
        <ButtonLink href="/cars" size="lg">
          Browse the fleet
        </ButtonLink>
        <Annotation tilt={-8} arrow="long" arrowClassName="mt-1 h-auto w-28 -scale-x-100 text-[var(--accent-text)]" className="hidden w-48 text-[var(--accent-text)] md:block">
          {'this way.'}
        </Annotation>
      </div>
    </StackPanel>
  );
}
