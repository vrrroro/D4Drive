'use client';

import { motion } from 'motion/react';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { Annotation } from '@/components/ui/Annotation';
import { Button } from '@/components/ui/Button';
import { ButtonLink } from '@/components/ui/ButtonLink';
import { Field, type FieldTone } from '@/components/ui/Field';
import { useParticleDissolve, usePrewarmCapture } from '@/components/fx/use-particles';
import { refreshSession } from '@/lib/api-client';
import { readCsrfToken } from '@/lib/csrf';
import { usePrefersReducedMotion } from '@/components/motion/use-prefers-reduced-motion';

type Mode = 'login' | 'register';
type Tone = 'light' | 'hot';

interface AuthPanelProps {
  tone: Tone;
  /** Where a successful sign-in lands. Already checked by safeNextPath. */
  next: string;
  /** The panel heading's level: h1 on /login, h2 at the end of the film. */
  headingLevel?: 'h1' | 'h2';
  /** Try the refresh token before asking for a password. */
  tryRefresh?: boolean;
  /** Turn the panel's type to sand on success, the way the car left. */
  dissolve?: boolean;
  /** Swing in from the left, tilted, like a card dealt onto the table. */
  swing?: boolean;
  id?: string;
}

const COPY: Record<Mode, { title: string; body: string; submit: string; switchLead: string; switchTo: string }> = {
  login: {
    title: 'Sign in to drive.',
    body: 'Your bookings, invoices and delivery status, in one place.',
    submit: 'Sign in',
    switchLead: 'No account yet?',
    switchTo: 'Create one',
  },
  register: {
    title: 'Make an account.',
    body: 'Four fields, once. After that a booking takes about a minute.',
    submit: 'Create account',
    switchLead: 'Already registered?',
    switchTo: 'Sign in',
  },
};

/**
 * Sign in and register, as one panel.
 *
 * Used twice: at the end of the landing film, where the smoke fades into it,
 * and on /login, where protected pages send visitors with a `next` path.
 */
export function AuthPanel({ tone, next, headingLevel = 'h2', tryRefresh = false, dissolve = false, swing = false, id }: AuthPanelProps) {
  const router = useRouter();
  const reduced = usePrefersReducedMotion();
  const plateRef = useRef<HTMLDivElement>(null);
  const [mode, setMode] = useState<Mode>('login');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [fields, setFields] = useState<Record<string, string>>({});
  const [done, setDone] = useState(false);

  const { dissolve: runDissolve } = useParticleDissolve(
    plateRef,
    { duration: 1.4, spread: 260, gravity: -0.12, swirl: 74, stagger: 0.72, sweep: 0.6, sweepAngle: 0, size: 1.1, fade: 0.9 },
    400,
  );
  usePrewarmCapture(plateRef, dissolve);

  useEffect(() => {
    router.prefetch(next);
  }, [router, next]);

  // Protected pages read only the 15 minute access cookie, so an expired one
  // lands here even when the week-long refresh token is still good.
  useEffect(() => {
    if (!tryRefresh) return undefined;
    let cancelled = false;
    void refreshSession().then((ok) => {
      if (ok && !cancelled) {
        router.replace(next);
        router.refresh();
      }
    });
    return () => {
      cancelled = true;
    };
  }, [tryRefresh, next, router]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setFormError(null);
    setFields({});

    const data = new FormData(event.currentTarget);
    const read = (name: string) => String(data.get(name) ?? '');
    const payload =
      mode === 'login'
        ? { email: read('email'), password: read('password') }
        : { fullName: read('fullName'), email: read('email'), phone: read('phone'), password: read('password') };

    try {
      const response = await fetch(`/api/auth/${mode}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-csrf-token': readCsrfToken() },
        body: JSON.stringify(payload),
      });
      const body = (await response.json().catch(() => ({}))) as { error?: string; fields?: Record<string, string> };

      if (!response.ok) {
        if (body.fields) setFields(body.fields);
        setFormError(body.error ?? 'Those details did not match. Try again.');
        setSubmitting(false);
        return;
      }

      setDone(true);
      // The focused field is about to turn to sand. Leaving focus on an
      // invisible input would strand a keyboard user.
      if (plateRef.current?.contains(document.activeElement)) (document.activeElement as HTMLElement).blur();
      if (dissolve) await runDissolve();
      // refresh() so Server Components re-read the new session cookie.
      router.push(next);
      router.refresh();
    } catch {
      setFormError('Could not reach the server. Check your connection.');
      setSubmitting(false);
    }
  }

  function switchMode() {
    setMode(mode === 'login' ? 'register' : 'login');
    setFormError(null);
    setFields({});
  }

  const copy = COPY[mode];
  const fieldTone: FieldTone = tone === 'hot' ? 'hot' : 'light';
  const Heading = headingLevel;
  const rule = tone === 'hot' ? 'border-[var(--color-blush)]/60' : 'border-[var(--ink)]/25';

  return (
    <PanelShell tone={tone} swing={swing && !reduced} id={id}>
      <div className="grid grid-cols-1 gap-y-14 lg:grid-cols-12 lg:gap-x-12">
        <BrandBlock tone={tone} />

        <div className={`flex flex-col justify-between gap-10 lg:col-span-4 lg:border-l lg:pl-12 ${rule}`}>
          <div>
            <Heading id={id ? `${id}-title` : undefined} className="t-display">
              {copy.title}
            </Heading>
            <p className="t-body mt-8 max-w-[34ch] text-[var(--muted)]">{copy.body}</p>
          </div>
          <p className="font-body text-sm">
            {copy.switchLead}{' '}
            <button type="button" onClick={switchMode} className="underline decoration-1 underline-offset-[6px] transition-colors hover:text-[var(--accent-text)]">
              {copy.switchTo}
            </button>
          </p>
        </div>

        <div ref={plateRef} className="relative lg:col-span-5" aria-busy={submitting || undefined}>
          <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5" aria-labelledby={id ? `${id}-title` : undefined}>
            {mode === 'register' && (
              <>
                <Field label="Full name" name="fullName" autoComplete="name" error={fields.fullName} tone={fieldTone} size="lg" required />
                <Field label="Mobile" name="phone" inputMode="numeric" autoComplete="tel" error={fields.phone} tone={fieldTone} size="lg" required />
              </>
            )}
            <Field label="Email" name="email" type="email" autoComplete="email" error={fields.email} tone={fieldTone} size="lg" required />
            <Field
              label="Password"
              name="password"
              type="password"
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              placeholder="At least 12 characters"
              helper={mode === 'register' ? 'Length matters more than symbols.' : undefined}
              error={fields.password}
              tone={fieldTone}
              size="lg"
              required
            />

            <p role="alert" className="min-h-5 font-body text-sm">
              {formError}
            </p>

            {/* The note hangs from the button: its arrow rises to the button's
                lower edge, the words underneath. */}
            <div className="relative">
              <Button type="submit" size="lg" variant={tone === 'hot' ? 'blush' : 'primary'} loading={submitting || done} className="w-full">
                {copy.submit}
              </Button>
              <Annotation
                tilt={-7}
                arrow="swoop"
                arrowClassName={`order-first mr-[18%] h-auto w-[5.5rem] -scale-y-100 rotate-[-14deg] ${tone === 'hot' ? 'text-[var(--color-blush)]' : 'text-[var(--accent-text)]'}`}
                className={`absolute right-0 top-[calc(100%+0.15rem)] hidden w-[19rem] flex-col items-end gap-1 text-right xl:flex ${tone === 'hot' ? 'text-[var(--color-blush)]' : 'text-[var(--accent-text)]'}`}
              >
                {'go on.\nyou know you want to.'}
              </Annotation>
            </div>
          </form>
        </div>
      </div>
    </PanelShell>
  );
}

/**
 * The same panel for a visitor who is already signed in: no form, just the
 * two places they are most likely heading.
 */
export function WelcomePanel({ name, id }: { name: string; id?: string }) {
  return (
    <PanelShell tone="light" swing={false} id={id}>
      <div className="grid grid-cols-1 gap-y-14 lg:grid-cols-12 lg:gap-x-12">
        <BrandBlock tone="light" />
        <div className="lg:col-span-4 lg:border-l lg:border-[var(--ink)]/25 lg:pl-12">
          <h2 className="t-display">Welcome back, {name}.</h2>
          <p className="t-body mt-8 max-w-[34ch] text-[var(--muted)]">You are signed in. Pick a car, or check on one you have already booked.</p>
        </div>
        <div className="flex flex-col gap-4 lg:col-span-5 lg:justify-end">
          <ButtonLink href="/cars" size="lg" className="w-full">
            Browse the fleet
          </ButtonLink>
          <ButtonLink href="/bookings" size="lg" variant="secondary" className="w-full">
            My bookings
          </ButtonLink>
        </div>
      </div>
    </PanelShell>
  );
}

function PanelShell({ tone, swing, id, children }: { tone: Tone; swing: boolean; id?: string; children: ReactNode }) {
  const className = `panel tone-${tone} relative flex min-h-[100dvh] flex-col justify-center overflow-hidden`;
  const dataTone = tone === 'hot' ? 'hot' : 'light';
  if (!swing) {
    return (
      <section id={id} data-tone={dataTone} aria-labelledby={id ? `${id}-title` : undefined} className={className}>
        {children}
      </section>
    );
  }
  return (
    <motion.section
      id={id}
      data-tone={dataTone}
      aria-labelledby={id ? `${id}-title` : undefined}
      className={className}
      initial={{ x: '-110%', rotate: 4, scale: 0.92 }}
      animate={{ x: 0, rotate: 0, scale: 1 }}
      transition={{ duration: 1, ease: [0.87, 0, 0.13, 1] }}
    >
      {children}
    </motion.section>
  );
}

function BrandBlock({ tone }: { tone: Tone }) {
  return (
    <div className="flex flex-col gap-6 lg:col-span-3">
      <p aria-hidden="true" className={`t-condensed flex flex-col gap-[0.08em] text-[clamp(6.5rem,12vw,13rem)] ${tone === 'hot' ? 'text-[var(--color-blush)]' : 'text-[var(--ink)]'}`}>
        <span>D4</span>
        <span>Drive</span>
      </p>
      <div className="t-label flex flex-col gap-2 text-[var(--muted)]">
        <span>Cars brought to you</span>
        <span>Across Bengaluru</span>
      </div>
    </div>
  );
}
