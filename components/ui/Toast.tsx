'use client';

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { X } from 'lucide-react';
import { Z } from '@/lib/constants';

type ToastKind = 'success' | 'error' | 'info';

interface Toast {
  id: number;
  message: string;
  kind: ToastKind;
}

interface ToastApi {
  show: (message: string, kind?: ToastKind) => void;
}

const ToastContext = createContext<ToastApi | null>(null);

export function useToast(): ToastApi {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used inside ToastProvider');
  }
  return context;
}

const DURATION_MS = 5000;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(0);
  const timers = useRef(new Map<number, ReturnType<typeof setTimeout>>());

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((t) => t.id !== id));
    const timer = timers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
  }, []);

  const show = useCallback(
    (message: string, kind: ToastKind = 'info') => {
      const id = nextId.current;
      nextId.current += 1;

      setToasts((current) => [...current, { id, message, kind }]);

      // Tracked in a ref so dismissing early can clear the pending timer
      // rather than leaving it to fire against an already-removed toast.
      timers.current.set(
        id,
        setTimeout(() => dismiss(id), DURATION_MS),
      );
    },
    [dismiss],
  );

  const api = useMemo(() => ({ show }), [show]);

  return (
    <ToastContext.Provider value={api}>
      {children}

      {/* aria-live so a toast is announced without stealing focus. An alert
          role would interrupt, which is wrong for a transient confirmation. */}
      <div
        aria-live="polite"
        aria-atomic="false"
        style={{ zIndex: Z.toast }}
        className="pointer-events-none fixed bottom-8 right-8 flex w-full max-w-sm flex-col gap-3"
      >
        <AnimatePresence initial={false}>
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              layout
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
              className={[
                'pointer-events-auto flex items-start justify-between gap-4 border-l-2 p-5 shadow-[0_8px_24px_rgba(0,0,0,0.12)]',
                toast.kind === 'error'
                  ? 'border-l-[var(--color-carmine)] bg-[var(--color-ink)]'
                  : 'border-l-[var(--color-foil)] bg-[var(--color-ink)]',
              ].join(' ')}
            >
              <p className="font-body text-sm leading-relaxed text-[var(--color-paper)]">
                {toast.message}
              </p>
              <button
                type="button"
                onClick={() => dismiss(toast.id)}
                aria-label="Dismiss notification"
                className="shrink-0 text-[var(--color-paper)]/60 transition-colors duration-500 hover:text-[var(--color-paper)]"
              >
                <X className="h-4 w-4" strokeWidth={1.5} />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}
