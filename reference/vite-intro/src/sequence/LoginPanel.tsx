import { useRef, useState, type FormEvent } from "react";
import { motion } from "motion/react";
import { Button } from "@/ui/Button";
import { Field } from "@/ui/Field";
import { cn } from "@/lib/cn";
import { useParticleDissolve, usePrewarmCapture } from "@/fx/use-particles";

export type Role = "member" | "concierge";

const ROLES: { id: Role; label: string; hint: string }[] = [
  { id: "member", label: "Member", hint: "Reserve from the collection" },
  { id: "concierge", label: "Concierge", hint: "Fleet & reservation control" },
];

interface Props {
  onAuthenticated: (role: Role) => void;
}

/** Slow, sequenced arrival — nothing in this panel snaps into place. */
const rise = {
  hidden: { opacity: 0, y: 26, filter: "blur(8px)" },
  shown: { opacity: 1, y: 0, filter: "blur(0px)" },
};

export function LoginPanel({ onAuthenticated }: Props) {
  const plateRef = useRef<HTMLDivElement>(null);
  const [role, setRole] = useState<Role>("member");
  const [busy, setBusy] = useState(false);

  // The panel carries no background of its own: it is type and hairlines on
  // the scrim. So the dissolve turns the *letters* into sand and blows them off
  // the car, rather than shattering an opaque card.
  const { ghosted, dissolve } = useParticleDissolve(plateRef, {
    duration: 1.5,
    spread: 260,
    gravity: -0.12,
    swirl: 74,
    stagger: 0.72,
    sweep: 0.6,
    sweepAngle: -0.32,
    size: 1.1,
    fade: 0.9,
  });

  usePrewarmCapture(plateRef, !busy);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    await dissolve();
    onAuthenticated(role);
  }

  return (
    /* Scrollable rather than centred-and-clipped: the panel is ~650px tall, so
       on a short laptop window or a landscape phone it has to be able to move. */
    <div className="pointer-events-none absolute inset-0 flex items-end overflow-y-auto overscroll-contain md:items-center">
      {/* Editorial gutter mark, desktop only. It sits outside the plate that
          gets rasterised, so it fades on its own rather than turning to sand. */}
      <span
        className={cn(
          "writing-vertical pointer-events-none absolute left-6 top-1/2 hidden -translate-y-1/2",
          "font-sans text-[10px] uppercase tracking-[0.42em] text-taupe/40",
          "transition-opacity duration-700 ease-lux lg:block",
          ghosted && "opacity-0",
        )}
      >
        Vol. 01 — Access
      </span>

      <div className="w-full px-8 py-16 md:px-16 md:py-12 lg:pl-24">
        <motion.div
          ref={plateRef}
          initial="hidden"
          animate="shown"
          transition={{ staggerChildren: 0.11, delayChildren: 0.25 }}
          className={cn(
            "pointer-events-auto w-full max-w-[26rem]",
            ghosted && "pointer-events-none",
          )}
        >
          <motion.div
            variants={rise}
            transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1] }}
            className="flex items-center gap-5"
          >
            <span className="h-px w-8 bg-gold md:w-12" />
            <span className="font-sans text-[10px] font-medium uppercase tracking-[0.3em] text-taupe/70">
              Member Access
            </span>
          </motion.div>

          <motion.h1
            variants={rise}
            transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
            className="mt-8 font-display text-5xl leading-[0.9] text-paper md:text-6xl lg:text-7xl"
          >
            Private
            <br />
            <em className="text-gold">Garage</em>
          </motion.h1>

          <motion.form
            variants={rise}
            transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1] }}
            onSubmit={handleSubmit}
            className="mt-12"
          >
            <div className="flex gap-9 border-b border-paper/12">
              {ROLES.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => setRole(r.id)}
                  aria-pressed={role === r.id}
                  className={cn(
                    "relative pb-3 font-sans text-[10px] font-medium uppercase tracking-[0.28em]",
                    "transition-colors duration-500 ease-lux",
                    role === r.id ? "text-paper" : "text-taupe/45 hover:text-taupe/80",
                  )}
                >
                  {r.label}
                  {role === r.id && (
                    <motion.span
                      layoutId="role-rule"
                      className="absolute inset-x-0 -bottom-px h-px bg-gold"
                      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                    />
                  )}
                </button>
              ))}
            </div>

            <p className="mt-4 font-display text-[13px] italic text-taupe/50">
              {ROLES.find((r) => r.id === role)!.hint}
            </p>

            <div className="mt-10 space-y-8">
              <Field
                label="Identifier"
                name="identifier"
                autoComplete="username"
                hint="you@house.com"
              />
              <Field
                label="Passphrase"
                name="passphrase"
                type="password"
                autoComplete="current-password"
                hint="Your private key"
              />
            </div>

            <div className="mt-12 flex flex-wrap items-center gap-x-10 gap-y-5">
              <Button type="submit" variant="inverse" size="lg" disabled={busy}>
                Enter the Garage
              </Button>
              <a
                href="#"
                onClick={(e) => e.preventDefault()}
                className="font-sans text-[10px] font-medium uppercase tracking-[0.28em] text-taupe/50 underline decoration-transparent underline-offset-[6px] transition-colors duration-500 ease-lux hover:text-gold hover:decoration-gold"
              >
                Request an invitation
              </a>
            </div>
          </motion.form>
        </motion.div>
      </div>
    </div>
  );
}
