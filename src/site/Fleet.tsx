import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { BODIES, FLEET, type Body, type Motor } from "@/data/fleet";
import { ParticleImage } from "@/fx/ParticleImage";
import { Reveal } from "@/ui/Reveal";
import { Button } from "@/ui/Button";
import { cn } from "@/lib/cn";

function Spec({ term, value }: { term: string; value: string }) {
  return (
    <div>
      <dt className="font-sans text-[9px] uppercase tracking-[0.24em] text-ash">{term}</dt>
      <dd className="mt-2 font-sans text-[13px] text-ink">{value}</dd>
    </div>
  );
}

function Card({ motor, index }: { motor: Motor; index: number }) {
  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 28 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -14 }}
      transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
      className={cn(
        "group flex flex-col pt-8 transition-colors duration-700 ease-lux",
        motor.signature ? "border-t-2 border-t-gold" : "border-t border-t-ink",
      )}
    >
      <ParticleImage
        src={motor.image}
        alt={`${motor.model}, ${motor.designation}`}
        className="aspect-[4/3] w-full transition-shadow duration-[1200ms] ease-lux group-hover:shadow-hero"
        delay={(index % 3) * 0.12}
      />

      <div className="mt-8 flex items-baseline justify-between gap-6">
        <h3 className="font-display text-3xl text-ink transition-colors duration-500 ease-lux group-hover:text-gold">
          {motor.model}
        </h3>
        <span className="shrink-0 font-sans text-[10px] uppercase tracking-[0.24em] text-ash">
          {motor.designation} · {motor.year}
        </span>
      </div>

      <p className="mt-5 max-w-sm font-display text-[15px] italic leading-relaxed text-ash">
        {motor.note}
      </p>

      <dl className="mt-8 grid grid-cols-3 gap-6 border-t border-ink/10 pt-6">
        <Spec term="Output" value={motor.power} />
        <Spec term="0–60" value={motor.sprint} />
        <Spec term="Drive" value={motor.drive} />
      </dl>

      <div className="mt-auto flex items-end justify-between gap-6 pt-10">
        <div>
          <span className="font-sans text-[9px] uppercase tracking-[0.26em] text-ash">
            From
          </span>
          <p className="mt-2 font-display text-2xl text-ink">
            £{motor.daily.toLocaleString()}
            <span className="ml-1 font-sans text-xs tracking-wide text-ash">/ day</span>
          </p>
        </div>
        <Button variant="primary" size="sm">
          Reserve
        </Button>
      </div>
    </motion.article>
  );
}

export function Fleet() {
  const [body, setBody] = useState<Body | "all">("all");
  const shown = useMemo(
    () => (body === "all" ? FLEET : FLEET.filter((m) => m.body === body)),
    [body],
  );

  return (
    <section id="collection" className="relative border-t border-ink/10 px-8 py-24 md:px-16 md:py-32">
      <div className="mx-auto max-w-[1600px]">
        <div className="grid grid-cols-12 items-end gap-x-8 gap-y-10">
          <div className="col-span-12 lg:col-span-7">
            <Reveal className="flex items-center gap-5">
              <span className="h-px w-8 bg-gold md:w-12" />
              <span className="font-sans text-[10px] font-medium uppercase tracking-[0.3em] text-ash">
                The collection
              </span>
            </Reveal>
            <Reveal delay={0.08}>
              <h2 className="mt-8 font-display text-5xl leading-[0.92] text-ink md:text-7xl">
                Seven cars.
                <br />
                <em className="text-gold">One livery.</em>
              </h2>
            </Reveal>
          </div>

          <Reveal delay={0.14} className="col-span-12 lg:col-span-5">
            <p className="dropcap max-w-md text-base leading-relaxed text-ash">
              Every car in the garage wears Sandgold, hand-laid over eleven days.
              It is not a colour you choose. It is the reason people look twice
              at a junction, and the reason we only keep seven.
            </p>
          </Reveal>
        </div>

        <div className="mt-16 flex flex-wrap gap-x-10 gap-y-4 border-t border-ink/10 pt-8 md:mt-20">
          {BODIES.map((option) => (
            <button
              key={option.id}
              onClick={() => setBody(option.id)}
              aria-pressed={body === option.id}
              className={cn(
                "relative pb-2 font-sans text-[10px] font-medium uppercase tracking-[0.28em]",
                "transition-colors duration-500 ease-lux",
                body === option.id ? "text-ink" : "text-ash hover:text-ink",
              )}
            >
              {option.label}
              {body === option.id && (
                <motion.span
                  layoutId="fleet-rule"
                  className="absolute inset-x-0 bottom-0 h-px bg-gold"
                  transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                />
              )}
            </button>
          ))}
        </div>

        <motion.div
          layout
          className="mt-14 grid grid-cols-1 gap-x-12 gap-y-20 md:grid-cols-2 lg:grid-cols-3"
        >
          <AnimatePresence mode="popLayout">
            {shown.map((motor, i) => (
              <Card key={motor.slug} motor={motor} index={i} />
            ))}
          </AnimatePresence>
        </motion.div>
      </div>
    </section>
  );
}
