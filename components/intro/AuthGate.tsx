'use client';

import { motion } from 'motion/react';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/Button';
import { Field } from '@/components/ui/Field';
import { Z } from '@/lib/constants';
import { GATE_FADE_MS } from './constants';

interface AuthGateProps {
  visible: boolean;
  submitting: boolean;
  error: string | null;
  onSubmit: (email: string, password: string) => void;
}

/**
 * The login panel held over the paused first frame.
 *
 * The panel has an opaque backing rather than a translucent one. Nothing
 * passes a contrast check against moving footage, and a frosted overlay on top
 * of a video is the most common way an otherwise accessible form becomes
 * unreadable in practice.
 */
export function AuthGate({ visible, submitting, error, onSubmit }: AuthGateProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const firstFieldRef = useRef<HTMLInputElement>(null);
  const [mode, setMode] = useState<'login' | 'register'>('login');

  // Move focus into the panel when it opens, so a keyboard user is not left
  // tabbing through a page they cannot see behind the overlay.
  useEffect(() => {
    if (visible) {
      const timer = setTimeout(() => firstFieldRef.current?.focus(), GATE_FADE_MS);
      return () => clearTimeout(timer);
    }
    return undefined;
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
    const email = String(form.get('email') ?? '');
    const password = String(form.get('password') ?? '');

    // The submit gesture is what authorises playback under browser autoplay
    // policy, which is why this handler runs synchronously to the machine
    // transition rather than awaiting anything first.
    onSubmit(email, password);
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: visible ? 1 : 0 }}
      transition={{ duration: GATE_FADE_MS / 1000, ease: [0.25, 0.46, 0.45, 0.94] }}
      style={{ zIndex: Z.authGate, pointerEvents: visible ? 'auto' : 'none' }}
      className="fixed inset-0 flex items-center justify-center px-6"
      aria-hidden={!visible}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="auth-gate-title"
        className="w-full max-w-md border-t-4 border-t-[var(--color-carmine)] bg-[var(--color-ink)] p-8 shadow-[0_8px_32px_rgba(0,0,0,0.4)] md:p-12"
      >
        <p className="font-body text-[10px] uppercase tracking-[0.3em] text-[var(--color-paper)]/60">
          D4Drive
        </p>

        <h2
          id="auth-gate-title"
          className="font-display mt-3 text-4xl leading-[0.95] text-[var(--color-paper)] md:text-5xl"
        >
          {mode === 'login' ? (
            <>
              Sign in to{' '}
              <em className="italic-safe inline-block not-italic">
                <span className="font-display italic text-[var(--color-foil)]">drive</span>
              </em>
            </>
          ) : (
            'Create your account'
          )}
        </h2>

        <form onSubmit={handleSubmit} className="mt-10 flex flex-col gap-6" noValidate>
          {mode === 'register' && (
            <Field
              label="Full name"
              name="fullName"
              type="text"
              autoComplete="name"
              placeholder="Ananya Krishnan"
              onDark
              required
            />
          )}

          <Field
            ref={firstFieldRef}
            label="Email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
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
            error={error ?? undefined}
            onDark
            required
          />

          <Button type="submit" loading={submitting} className="mt-2 w-full">
            {mode === 'login' ? 'Sign in' : 'Create account'}
          </Button>
        </form>

        <p className="mt-8 font-body text-xs text-[var(--color-paper)]/60">
          {mode === 'login' ? 'No account yet?' : 'Already registered?'}{' '}
          <button
            type="button"
            onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
            className="text-[var(--color-foil)] underline underline-offset-4 transition-colors duration-500 hover:text-[var(--color-paper)]"
          >
            {mode === 'login' ? 'Create one' : 'Sign in'}
          </button>
        </p>
      </div>
    </motion.div>
  );
}
