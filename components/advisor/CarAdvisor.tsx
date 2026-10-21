'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useId, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import { ArrowUp, MessagesSquare, X } from 'lucide-react';
import { CarPhoto } from '@/components/ui/CarPhoto';
import { usePrefersReducedMotion } from '@/components/motion/use-prefers-reduced-motion';
import { MAX_TURNS, MAX_USER_CHARS, type AdvisorCar, type AdvisorEvent, type AdvisorReply } from '@/lib/advisor/schema';
import { Z } from '@/lib/constants';
import { formatCurrency } from '@/lib/services/pricing';

type Entry = { role: 'user'; content: string } | { role: 'assistant'; content: string; cars: AdvisorCar[] };

const SUGGESTIONS = [
  'Seven seats for a family trip to Mysuru',
  'An automatic for city traffic, under ₹2,500 a day',
  'Something electric for this weekend',
];

const EASE = [0.16, 1, 0.3, 1] as const;

const NO_ANSWER = 'The advisor could not answer just now. Try again in a moment.';

/**
 * Reads /api/advisor's stream, one JSON event a line, passing each draft
 * (the checked reply so far) to `onDraft`, and returns the final reply.
 */
async function readReply(response: Response, onDraft: (text: string) => void): Promise<AdvisorReply> {
  if (!response.ok || !response.body) {
    const body = (await response.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error ?? NO_ANSWER);
  }
  const reader = response.body.pipeThrough(new TextDecoderStream()).getReader();
  let buffered = '';
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buffered += value;
    let newline: number;
    while ((newline = buffered.indexOf('\n')) >= 0) {
      const line = buffered.slice(0, newline).trim();
      buffered = buffered.slice(newline + 1);
      if (!line) continue;
      const event = JSON.parse(line) as AdvisorEvent;
      if (event.type === 'draft') onDraft(event.text);
      else if (event.type === 'error') throw new Error(event.error);
      else return { reply: event.reply, cars: event.cars };
    }
  }
  throw new Error(NO_ANSWER);
}

/**
 * The car advisor: a small chat that floats at the bottom right of every
 * public page and helps a visitor pick a car.
 *
 * It sends the conversation, text only, to /api/advisor, where a local
 * language model (Ollama) answers from the live fleet through two database tools (lib/advisor). A
 * reply can carry up to three cars; each links to its page. The reply
 * streams in a sentence at a time, each checked by the server first; the
 * growing draft is hidden from screen readers, which hear the finished reply.
 *
 * Mounted once in the root layout, so a conversation survives moving
 * between pages. The panel opens with transform and opacity only; under
 * reduced motion it simply appears. Scrolling inside it is kept from Lenis
 * (`data-lenis-prevent`), so the wheel scrolls the messages, not the page.
 */
export function CarAdvisor() {
  const pathname = usePathname();
  const reduced = usePrefersReducedMotion();
  const [open, setOpen] = useState(false);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [draft, setDraft] = useState('');
  const [pending, setPending] = useState(false);
  const [live, setLive] = useState('');
  const [error, setError] = useState<string | null>(null);

  const launcherRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const panelId = useId();
  const titleId = useId();
  const inputId = useId();

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  // Keep the newest message in view.
  useEffect(() => {
    const list = listRef.current;
    if (list) list.scrollTop = list.scrollHeight;
  }, [entries, pending, error, live]);

  // The operations pages have their own tools; the advisor is for customers.
  if (pathname.startsWith('/admin')) return null;

  function close() {
    setOpen(false);
    launcherRef.current?.focus();
  }

  async function send(text: string) {
    const content = text.trim();
    if (!content || pending) return;
    const next: Entry[] = [...entries, { role: 'user', content }];
    setEntries(next);
    setDraft('');
    setError(null);
    setPending(true);

    try {
      // The newest turns only, always starting with the visitor's.
      const messages = next.slice(-(MAX_TURNS - 1)).map(({ role, content: c }) => ({ role, content: c }));
      const response = await fetch('/api/advisor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages }),
      });
      const result = await readReply(response, setLive);
      setEntries([...next, { role: 'assistant', content: result.reply, cars: result.cars }]);
    } catch (caught) {
      // Give the message back, so trying again is one press.
      setEntries(entries);
      setDraft(content);
      setError(caught instanceof TypeError ? 'Could not reach the server. Check your connection.' : (caught as Error).message);
    } finally {
      setPending(false);
      setLive('');
    }
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void send(draft);
  }

  function onInputKey(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      void send(draft);
    }
  }

  function onPanelKey(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'Escape') {
      event.stopPropagation();
      close();
    }
  }

  return (
    <div className="advisor" style={{ zIndex: Z.advisor }} data-advisor>
      <AnimatePresence>
        {open && (
          <motion.div
            key="panel"
            id={panelId}
            role="dialog"
            aria-labelledby={titleId}
            onKeyDown={onPanelKey}
            className="advisor-panel"
            data-advisor-panel
            initial={reduced ? false : { opacity: 0, y: 18, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduced ? { opacity: 0, transition: { duration: 0 } } : { opacity: 0, y: 12, scale: 0.98 }}
            transition={{ duration: 0.38, ease: EASE }}
          >
            <div className="flex items-start justify-between gap-4 border-b border-[var(--ink)]/10 px-5 pb-4 pt-5">
              <div>
                <p className="t-label text-[var(--accent-text)]">Car advisor</p>
                <h2 id={titleId} className="mt-2 font-display text-[1.6rem] font-light leading-none">
                  Which car?
                </h2>
              </div>
              <button type="button" onClick={close} aria-label="Close the car advisor" className="advisor-icon-button">
                <X aria-hidden className="h-4 w-4" strokeWidth={1.5} />
              </button>
            </div>

            <div ref={listRef} data-lenis-prevent className="advisor-list" aria-live="polite" aria-busy={pending || undefined}>
              {entries.length === 0 ? (
                <div className="flex flex-col gap-4">
                  <p className="font-body text-[0.95rem] font-light leading-relaxed">
                    Tell me who is coming, where you are going and what you would like to spend. I will pick from the fleet.
                  </p>
                  <ul className="flex flex-col gap-2">
                    {SUGGESTIONS.map((s) => (
                      <li key={s}>
                        <button type="button" onClick={() => void send(s)} className="advisor-suggestion">
                          {s}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <ol className="flex flex-col gap-5">
                  {entries.map((entry, i) => (
                    <li key={i} className={entry.role === 'user' ? 'flex justify-end' : ''} data-advisor-entry={entry.role}>
                      {entry.role === 'user' ? (
                        <p className="advisor-mine">
                          <span className="sr-only">You: </span>
                          {entry.content}
                        </p>
                      ) : (
                        <div>
                          <p className="whitespace-pre-line font-body text-[0.95rem] font-light leading-relaxed">
                            <span className="sr-only">Advisor: </span>
                            {entry.content}
                          </p>
                          {entry.cars.length > 0 && (
                            <ul className="mt-4 flex flex-col gap-3" aria-label="Suggested cars">
                              {entry.cars.map((car) => (
                                <li key={car.id}>
                                  <Link href={`/cars/${car.id}`} className="advisor-car group" data-advisor-car={car.id}>
                                    <CarPhoto src={car.image} name={`${car.brand} ${car.model}`} aspect="aspect-[3/2]" decorative className="w-24 shrink-0" />
                                    <span className="flex min-w-0 flex-col">
                                      <span className="t-label text-[var(--muted)]">{car.brand}</span>
                                      <span className="advisor-car-name font-display text-lg font-light leading-tight">{car.model}</span>
                                      <span className="mt-0.5 font-body text-xs text-[var(--muted)]">
                                        {formatCurrency(car.pricePerDay)} a day, {car.seats} seats, <span className="capitalize">{car.fuel}</span>
                                      </span>
                                    </span>
                                  </Link>
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      )}
                    </li>
                  ))}
                </ol>
              )}

              {pending && live && (
                <p aria-hidden="true" className="mt-5 whitespace-pre-line font-body text-[0.95rem] font-light leading-relaxed" data-advisor-draft>
                  {live}
                </p>
              )}
              {pending && !live && (
                <p className="advisor-thinking mt-5 font-body text-sm text-[var(--muted)]" data-advisor-pending>
                  Looking through the fleet<span aria-hidden="true" className="advisor-dots"><span>.</span><span>.</span><span>.</span></span>
                </p>
              )}
              {error && (
                <p role="alert" className="mt-5 font-body text-sm text-[var(--accent-text)]">
                  {error}
                </p>
              )}
            </div>

            <form onSubmit={onSubmit} className="border-t border-[var(--ink)]/10 px-5 pb-4 pt-3">
              <div className="flex items-center justify-between">
                <label htmlFor={inputId} className="t-label text-[var(--muted)]">
                  Your message
                </label>
                {entries.length > 0 && !pending && (
                  <button
                    type="button"
                    onClick={() => {
                      setEntries([]);
                      setError(null);
                      inputRef.current?.focus();
                    }}
                    className="t-label text-[var(--muted)] underline decoration-1 underline-offset-4 transition-colors hover:text-[var(--accent-text)]"
                  >
                    Start over
                  </button>
                )}
              </div>
              <div className="mt-2 flex items-end gap-3">
                <textarea
                  ref={inputRef}
                  id={inputId}
                  rows={2}
                  value={draft}
                  maxLength={MAX_USER_CHARS}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={onInputKey}
                  className="advisor-input"
                />
                <button type="submit" disabled={pending || draft.trim() === ''} aria-label="Send" className="advisor-send">
                  <ArrowUp aria-hidden className="h-4 w-4" strokeWidth={1.75} />
                </button>
              </div>
              <p className="mt-3 font-body text-[0.7rem] leading-snug text-[var(--muted)]">
                Answered by an AI model running on our own server, from the live fleet. It can make mistakes: the car page has the final word.
              </p>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      <button
        ref={launcherRef}
        type="button"
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        onClick={() => (open ? close() : setOpen(true))}
        className="advisor-launcher"
        data-advisor-launcher
      >
        {open ? <X aria-hidden className="h-4 w-4" strokeWidth={1.5} /> : <MessagesSquare aria-hidden className="h-4 w-4" strokeWidth={1.5} />}
        <span className="t-label">{open ? 'Close' : 'Which car?'}</span>
      </button>
    </div>
  );
}
