'use client';

import { motion } from 'motion/react';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/Button';
import { Field } from '@/components/ui/Field';
import { useParticleDissolve, usePrewarmCapture } from '@/components/fx/use-particles';
import { Z } from '@/lib/constants';
import { DISSOLVE_MS, GATE_FADE_MS } from './constants';

export type AuthMode = 'login' | 'register';

export interface AuthPayload {
  email: string;
  password: string;
  fullName?: string;
  phone?: string;
}

interface AuthGateProps {
  /** GATED or AUTHENTICATING: the panel is up and interactive. */
  visible: boolean;
  submitting: boolean;
  /** UNLOCKED onward: the type turns to sand and the backing fades. */
  dissolving: boolean;
  error: string | null;
  fieldErrors: Record<string, string>;
  onSubmit: (mode: AuthMode, payload: AuthPayload) => void;
  onModeChange: () => void;
  /** Fired once the dissolve (or its CSS fallback) has finished. */
  onDissolved: () => void;
}

/**
 * The sign-in panel held over the paused frame.
 *
 * Two layers. The backing is opaque charcoal, because nothing passes a
 * contrast check against footage and a frosted panel over video is how an
 * accessible form becomes unreadable. The type sits on a transparent plate
 * above it. On success the backing fades while the plate is rasterised and
 * blown off the car as sand, so it is the letters that leave, not a box.
 */
export function AuthGate({
  visible,
  submitting,
  dissolving,
  error,
  fieldErrors,
  onSubmit,
  onModeChange,
  onDissolved,
}: AuthGateProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const plateRef = useRef<HTMLDivElement>(null);
  const firstFieldRef = useRef<HTMLInputElement>(null);
  const [mode, setMode] = useState<AuthMode>('login');

  const { dissolve } = useParticleDissolve(
    plateRef,
    {
      duration: DISSOLVE_MS / 1000,
      spread: 260,
      gravity: -0.12,
      swirl: 74,
      stagger: 0.72,
      sweep: 0.6,
      sweepAngle: -0.32,
      size: 1.1,
      fade: 0.9,
    },
    GATE_FADE_MS,
  );

  // Resolve the font embed while the visitor is still typing.
  usePrewarmCapture(plateRef, visible);

  const onDissolvedRef = useRef(onDissolved);
  onDissolvedRef.current = onDissolved;

  useEffect(() => {
    if (!dissolving) return;
    // The focused field is about to vanish. Leaving focus on an invisible
    // input would strand a keyboard user.
    if (panelRef.current?.contains(document.activeElement)) {
      (document.activeElement as HTMLElement | null)?.blur();
    }
    let cancelled = false;
    void dissolve().then(() => {
      if (!cancelled) onDissolvedRef.current();
    });
    return () => {
      cancelled = true;
    };
  }, [dissolving, dissolve]);

  // Move focus into the panel when it opens, so a keyboard user is not left
  // tabbing through a page they cannot see behind the overlay.
  useEffect(() => {
    if (!visible) return undefined;
    const timer = setTimeout(() => firstFieldRef.current?.focus(), GATE_FADE_MS);
    return () => clearTimeout(timer);
  }, [visible]);

  // Focus trap. While the gate is up it is the only interactive region, so Tab
  // must cycle within it rather than escaping to content behind the overlay.
  useEffect(() => {
    if (!visible) return undefined;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return;
      const panel = panelRef.current;
      if (!panel) return;

      const focusable = panel.querySelectorAll<HTMLElement>(
        'input:not([disabled]), button:not([disabled]), [href], select, textarea',
      );
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (!first || !last) return;

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [visible]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;

    const form = new FormData(event.currentTarget);
    const read = (name: string) => String(form.get(name) ?? '');
    onSubmit(mode, {
      email: read('email'),
      password: read('password'),
      ...(mode === 'register' ? { fullName: read('fullName'), phone: read('phone') } : {}),
    });
  }

  function switchMode() {
    setMode(mode === 'login' ? 'register' : 'login');
    onModeChange();
  }

  const interactive = visible && !dissolving;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: visible || dissolving ? 1 : 0 }}
      transition={{ duration: GATE_FADE_MS / 1000, ease: [0.25, 0.46, 0.45, 0.94] }}
      style={{ zIndex: Z.authGate, pointerEvents: interactive ? 'auto' : 'none' }}
      className="fixed inset-0 flex items-center justify-center overflow-y-auto px-6 py-10"
      aria-hidden={!interactive}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="auth-gate-title"
        className="relative my-auto w-full max-w-md"
      >
        <div
          aria-hidden="true"
          style={{
            opacity: dissolving ? 0 : 1,
            transition: `opacity ${GATE_FADE_MS}ms cubic-bezier(0.25, 0.46, 0.45, 0.94)`,
          }}
          className="absolute inset-0 border-t-4 border-t-[var(--color-carmine)] bg-[var(--color-ink)] shadow-[0_8px_32px_rgba(0,0,0,0.4)]"
        />

        <div ref={plateRef} className="relative p-8 md:p-12">
          <h2
            id="auth-gate-title"
            className="font-display text-4xl leading-[0.95] text-[var(--color-paper)] md:text-5xl"
          >
            {mode === 'login' ? (
              <>
                Sign in to{' '}
                <span className="italic-safe inline-block font-display italic text-[var(--color-paper)]">
                  drive
                </span>
              </>
            ) : (
              'Create your account'
            )}
          </h2>

          <form onSubmit={handleSubmit} className="mt-10 flex flex-col gap-6" noValidate>
            {mode === 'register' && (
              <>
                <Field
                  label="Full name"
                  name="fullName"
                  type="text"
                  autoComplete="name"
                  placeholder="Ananya Krishnan"
                  error={fieldErrors.fullName}
                  onDark
                  required
                />
                <Field
                  label="Mobile"
                  name="phone"
                  inputMode="numeric"
                  autoComplete="tel"
                  placeholder="9731408852"
                  error={fieldErrors.phone}
                  onDark
                  required
                />
              </>
            )}

            <Field
              ref={firstFieldRef}
              label="Email"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              error={fieldErrors.email}
              onDark
              required
            />

            <Field
              label="Password"
              name="password"
              type="password"
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              placeholder="At least 12 characters"
              helper={mode === 'register' ? 'Length matters more than symbols.' : undefined}
              error={fieldErrors.password}
              onDark
              required
            />

            <p
              role="alert"
              className="min-h-5 font-body text-sm text-[var(--color-paper)]"
            >
              {error}
            </p>

            <Button type="submit" loading={submitting} onDark className="w-full">
              {mode === 'login' ? 'Sign in' : 'Create account'}
            </Button>
          </form>

          <p className="mt-8 font-body text-xs text-[var(--color-paper)]/70">
            {mode === 'login' ? 'No account yet?' : 'Already registered?'}{' '}
            <button
              type="button"
              onClick={switchMode}
              className="text-[var(--color-paper)] underline underline-offset-4 transition-colors duration-500 hover:text-[var(--color-paper)]/70"
            >
              {mode === 'login' ? 'Create one' : 'Sign in'}
            </button>
          </p>
        </div>
      </div>
    </motion.div>
  );
}
