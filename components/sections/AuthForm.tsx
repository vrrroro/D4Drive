'use client';

import { useState, type FormEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Field } from '@/components/ui/Field';
import { readCsrfToken } from '@/lib/csrf';

/**
 * Standalone sign in and register.
 *
 * The intro sequence has its own gate, but a user who lands on a protected
 * route directly, or who has already seen the intro this session, needs a
 * normal page to authenticate on.
 */
export function AuthForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get('next') ?? '/cars';

  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [fields, setFields] = useState<Record<string, string>>({});

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;

    setSubmitting(true);
    setFormError(null);
    setFields({});

    const data = new FormData(event.currentTarget);
    const payload =
      mode === 'login'
        ? {
            email: String(data.get('email') ?? ''),
            password: String(data.get('password') ?? ''),
          }
        : {
            fullName: String(data.get('fullName') ?? ''),
            email: String(data.get('email') ?? ''),
            phone: String(data.get('phone') ?? ''),
            password: String(data.get('password') ?? ''),
          };

    try {
      const response = await fetch(`/api/auth/${mode}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-csrf-token': readCsrfToken() },
        body: JSON.stringify(payload),
      });

      const body = (await response.json().catch(() => ({}))) as {
        error?: string;
        fields?: Record<string, string>;
      };

      if (!response.ok) {
        if (body.fields) setFields(body.fields);
        setFormError(body.error ?? 'That did not work. Try again.');
        setSubmitting(false);
        return;
      }

      // refresh() so Server Components re-read the new session cookie. A plain
      // push would navigate with the old, cached server render.
      router.push(next);
      router.refresh();
    } catch {
      setFormError('Could not reach the server. Check your connection.');
      setSubmitting(false);
    }
  }

  return (
    <div className="w-full max-w-md">
      <div className="h-px w-8 bg-[var(--color-carmine)] md:w-12" />

      <h1 className="font-display mt-8 text-5xl leading-[0.95] text-[var(--ink)] md:text-6xl">
        {mode === 'login' ? (
          <>
            Sign{' '}
            <span className="italic-safe inline-block font-display italic text-[var(--color-carmine)]">
              in
            </span>
          </>
        ) : (
          'Create an account'
        )}
      </h1>

      <form onSubmit={handleSubmit} className="mt-12 flex flex-col gap-6" noValidate>
        {mode === 'register' && (
          <>
            <Field
              label="Full name"
              name="fullName"
              autoComplete="name"
              placeholder="Ananya Krishnan"
              error={fields.fullName}
              required
            />
            <Field
              label="Mobile"
              name="phone"
              inputMode="numeric"
              autoComplete="tel"
              placeholder="9731408852"
              error={fields.phone}
              required
            />
          </>
        )}

        <Field
          label="Email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          error={fields.email}
          required
        />

        <Field
          label="Password"
          name="password"
          type="password"
          autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
          placeholder="At least 12 characters"
          helper={mode === 'register' ? 'Length matters more than symbols.' : undefined}
          error={fields.password}
          required
        />

        {formError && (
          <p role="alert" className="font-body text-sm text-[var(--color-carmine)]">
            {formError}
          </p>
        )}

        <Button type="submit" size="lg" loading={submitting} className="mt-2 w-full">
          {mode === 'login' ? 'Sign in' : 'Create account'}
        </Button>
      </form>

      <p className="mt-10 font-body text-xs text-[var(--muted)]">
        {mode === 'login' ? 'No account yet?' : 'Already registered?'}{' '}
        <button
          type="button"
          onClick={() => {
            setMode(mode === 'login' ? 'register' : 'login');
            setFormError(null);
            setFields({});
          }}
          className="text-[var(--color-carmine)] underline underline-offset-4 transition-colors duration-500 hover:text-[var(--ink)]"
        >
          {mode === 'login' ? 'Create one' : 'Sign in'}
        </button>
      </p>
    </div>
  );
}
