import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Reveal } from "@/ui/Reveal";
import { Button } from "@/ui/Button";
import { Field } from "@/ui/Field";
import { cn } from "@/lib/cn";

const QUESTIONS = [
  {
    q: "Is there a minimum hire?",
    a: "One day, door to door, counted in twenty-four hour blocks from the moment it lands on your kerb. Most members take three.",
  },
  {
    q: "What happens if the weather turns?",
    a: "Move the booking, at no cost, up to the hour before delivery. The Speedster in particular is not a car we will hand over into a storm.",
  },
  {
    q: "Do you deliver outside the city?",
    a: "Anywhere within a four-hour radius, at no charge. Beyond that we quote the transporter at cost and add nothing to it.",
  },
  {
    q: "Why is every car the same colour?",
    a: "Because a collection reads as a collection. Sandgold is laid by hand over eleven days, and it is the only paint in the building.",
  },
];

export function Enquiries() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <section
      id="enquiries"
      className="relative border-t border-ink/10 px-8 py-24 md:px-16 md:py-32"
    >
      <div className="mx-auto max-w-[1600px]">
        <div className="grid grid-cols-12 gap-x-8 gap-y-16">
          <div className="col-span-12 lg:col-span-4">
            <Reveal className="flex items-center gap-5">
              <span className="h-px w-8 bg-gold md:w-12" />
              <span className="font-sans text-[10px] font-medium uppercase tracking-[0.3em] text-ash">
                Enquiries
              </span>
            </Reveal>
            <Reveal delay={0.08}>
              <h2 className="mt-8 font-display text-5xl leading-[0.92] text-ink md:text-6xl">
                The <em className="text-gold">details.</em>
              </h2>
            </Reveal>
            <Reveal delay={0.16}>
              <p className="mt-8 max-w-xs text-[15px] leading-relaxed text-ash">
                Anything not answered here, the concierge will take by telephone
                between seven and eleven, any day of the week.
              </p>
            </Reveal>
          </div>

          <div className="col-span-12 lg:col-span-7 lg:col-start-6">
            {QUESTIONS.map((item, i) => {
              const isOpen = open === i;
              return (
                <Reveal key={item.q} delay={i * 0.06}>
                  <div className="border-t border-ink/15">
                    <button
                      onClick={() => setOpen(isOpen ? null : i)}
                      aria-expanded={isOpen}
                      className="group flex w-full items-center justify-between gap-8 py-8 text-left"
                    >
                      <span
                        className={cn(
                          "font-display text-xl transition-colors duration-500 ease-lux md:text-2xl",
                          isOpen ? "text-gold" : "text-ink group-hover:text-gold",
                        )}
                      >
                        {item.q}
                      </span>
                      <span
                        className={cn(
                          "relative grid size-8 shrink-0 place-items-center border transition-all duration-500 ease-lux",
                          isOpen
                            ? "rotate-90 border-gold text-gold"
                            : "border-ink/25 text-ink group-hover:border-gold",
                        )}
                        aria-hidden
                      >
                        <span className="absolute h-px w-3 bg-current" />
                        <span
                          className={cn(
                            "absolute h-3 w-px bg-current transition-opacity duration-500",
                            isOpen && "opacity-0",
                          )}
                        />
                      </span>
                    </button>

                    <AnimatePresence initial={false}>
                      {isOpen && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
                          className="overflow-hidden"
                        >
                          <p className="max-w-xl pb-10 text-[15px] leading-relaxed text-ash">
                            {item.a}
                          </p>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </Reveal>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

export function Footer() {
  return (
    <footer className="grain relative overflow-hidden bg-ink px-8 pt-24 pb-12 text-paper md:px-16 md:pt-32">
      <div className="mx-auto max-w-[1600px]">
        <div className="grid grid-cols-12 gap-x-8 gap-y-16">
          <div className="col-span-12 lg:col-span-6">
            <Reveal>
              <h2 className="font-display text-5xl leading-[0.9] md:text-7xl">
                Tell us
                <br />
                <em className="text-gold">when.</em>
              </h2>
            </Reveal>
          </div>

          <Reveal delay={0.1} className="col-span-12 lg:col-span-5 lg:col-start-8">
            <p className="max-w-sm text-[15px] leading-relaxed text-taupe/70">
              One letter a season: what has joined the collection, what has left,
              and where we are driving next.
            </p>
            <form
              onSubmit={(e) => e.preventDefault()}
              className="mt-10 flex flex-col gap-6 sm:flex-row sm:items-end"
            >
              <Field
                label="Electronic mail"
                type="email"
                hint="you@house.com"
                className="flex-1"
              />
              <Button variant="inverse" size="md" type="submit">
                Join
              </Button>
            </form>
          </Reveal>
        </div>

        <div className="mt-24 flex flex-col gap-8 border-t border-paper/15 pt-10 md:flex-row md:items-center md:justify-between">
          <span className="font-sans text-[11px] font-medium uppercase tracking-[0.44em]">
            D4Drive
          </span>
          <nav className="flex flex-wrap gap-x-10 gap-y-3">
            {["Terms", "Insurance", "Privacy", "Press"].map((label) => (
              <a
                key={label}
                href="#"
                onClick={(e) => e.preventDefault()}
                className="font-sans text-[10px] uppercase tracking-[0.26em] text-taupe/60 transition-colors duration-500 ease-lux hover:text-gold"
              >
                {label}
              </a>
            ))}
          </nav>
          <span className="font-sans text-[10px] uppercase tracking-[0.26em] text-taupe/40">
            © {new Date().getFullYear()} — All rights reserved
          </span>
        </div>
      </div>
    </footer>
  );
}
