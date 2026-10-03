import { Reveal } from "@/ui/Reveal";
import { Button } from "@/ui/Button";
import { ParticleImage } from "@/fx/ParticleImage";
import type { Role } from "@/sequence/LoginPanel";

const STATS = [
  { value: "07", label: "Cars in the collection" },
  { value: "48h", label: "Notice for a delivery" },
  { value: "1", label: "Livery, no exceptions" },
  { value: "24/7", label: "Concierge on the line" },
];

export function Hero({ role }: { role: Role }) {
  return (
    <section id="top" className="relative px-8 pt-36 pb-20 md:px-16 md:pt-52 md:pb-32">
      <div className="mx-auto max-w-[1600px]">
        <div className="grid grid-cols-12 items-start gap-x-8 gap-y-16 lg:gap-x-12">
          {/* Type sits left and low; the photograph is dropped a third of the
              way down the column beside it. Nothing here is centred. */}
          <div className="col-span-12 lg:col-span-7">
            <Reveal className="flex items-center gap-5">
              <span className="h-px w-8 bg-gold md:w-12" />
              <span className="font-sans text-[10px] font-medium uppercase tracking-[0.3em] text-ash">
                {role === "concierge" ? "Concierge desk" : "Vol. 01 — Sandgold"}
              </span>
            </Reveal>

            <Reveal delay={0.08}>
              <h1 className="mt-10 font-display text-[3.25rem] leading-[0.88] text-ink md:text-8xl lg:text-[6.5rem] xl:text-[7.5rem]">
                Extraordinary
                <br />
                machines,
                <br />
                <em className="text-gold">by the day.</em>
              </h1>
            </Reveal>

            <Reveal delay={0.16}>
              <p className="mt-12 max-w-md text-base leading-relaxed text-ash md:text-lg">
                Seven cars, one livery, no counter to queue at. Choose the
                machine, name the morning, and it arrives washed, fuelled and
                warmed on your kerb.
              </p>
            </Reveal>

            <Reveal delay={0.24} className="mt-12 flex flex-wrap items-center gap-x-10 gap-y-6">
              <a href="#collection">
                <Button variant="primary" size="lg">
                  View the collection
                </Button>
              </a>
              <a
                href="#experience"
                className="font-sans text-[10px] font-medium uppercase tracking-[0.28em] text-ink underline decoration-ink/20 underline-offset-[7px] transition-colors duration-500 ease-lux hover:text-gold hover:decoration-gold"
              >
                How it works
              </a>
            </Reveal>
          </div>

          <div className="relative col-span-12 lg:col-span-5 lg:mt-32">
            <span className="writing-vertical absolute -left-10 top-0 hidden font-sans text-[10px] uppercase tracking-[0.42em] text-ash xl:block">
              Editorial / Vol. 01
            </span>
            <ParticleImage
              src="/fleet/turbo-s.jpg"
              alt="911 Turbo S in the house Sandgold livery, three-quarter view"
              className="group aspect-[4/3] w-full shadow-hero"
              eager
              tuning={{ duration: 2.1, spread: 240 }}
            />
            <p className="mt-6 flex items-center gap-4 font-sans text-[10px] uppercase tracking-[0.28em] text-ash">
              <span className="h-px w-8 bg-ink/25" />
              Turbo S — 992.1
            </p>
          </div>
        </div>

        <dl className="mt-24 grid grid-cols-2 gap-x-8 gap-y-12 border-t border-ink pt-12 md:mt-32 md:grid-cols-4">
          {STATS.map((stat, i) => (
            <Reveal key={stat.label} delay={i * 0.07}>
              <dt className="font-display text-4xl text-ink md:text-5xl">{stat.value}</dt>
              <dd className="mt-4 max-w-[14rem] font-sans text-[10px] uppercase leading-relaxed tracking-[0.24em] text-ash">
                {stat.label}
              </dd>
            </Reveal>
          ))}
        </dl>
      </div>
    </section>
  );
}
