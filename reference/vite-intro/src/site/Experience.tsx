import { Reveal } from "@/ui/Reveal";
import { ParticleImage } from "@/fx/ParticleImage";

const STEPS = [
  {
    n: "01",
    title: "Choose",
    body: "Pick the machine from the collection. No tiers, no upsell, no surprise at the kerb — the car in the photograph is the car that arrives.",
  },
  {
    n: "02",
    title: "Name the morning",
    body: "Forty-eight hours of notice is all we ask. Tell us the address and the hour; the concierge handles the rest without a phone call.",
  },
  {
    n: "03",
    title: "Drive",
    body: "It is delivered washed, fuelled and warmed. When you are finished, leave it where it stands and walk away. Someone will come for it.",
  },
];

const VOICES = [
  {
    quote:
      "They left it on the drive at six in the morning, engine warm, without ringing the bell. I have not used another service since.",
    name: "Marguerite Okonkwo",
    role: "Collector, Zürich",
  },
  {
    quote:
      "The Speedster arrived on a Friday that did not deserve it, and made the weekend worth remembering anyway.",
    name: "Tomás Herrera",
    role: "Architect, Lisbon",
  },
  {
    quote:
      "Seven cars is the whole point. Nobody is pretending to have a hundred, so nothing about it feels like a fleet.",
    name: "Iris Lindqvist",
    role: "Member since 2019",
  },
];

export function Experience() {
  return (
    <>
      {/* Dark movement — the palette inverts wholesale rather than tinting. */}
      <section
        id="experience"
        className="grain relative overflow-hidden bg-ink px-8 py-24 text-paper md:px-16 md:py-32"
      >
        <div className="mx-auto max-w-[1600px]">
          <div className="grid grid-cols-12 gap-x-8 gap-y-12">
            <div className="col-span-12 lg:col-span-5">
              <Reveal className="flex items-center gap-5">
                <span className="h-px w-8 bg-gold md:w-12" />
                <span className="font-sans text-[10px] font-medium uppercase tracking-[0.3em] text-taupe/60">
                  The experience
                </span>
              </Reveal>
              <Reveal delay={0.08}>
                <h2 className="mt-8 font-display text-5xl leading-[0.92] md:text-6xl">
                  Three moves,
                  <br />
                  then <em className="text-gold">the road.</em>
                </h2>
              </Reveal>
            </div>

            <div className="col-span-12 lg:col-span-6 lg:col-start-7">
              {STEPS.map((step, i) => (
                <Reveal key={step.n} delay={i * 0.1}>
                  <div className="grid grid-cols-[auto_1fr] gap-x-8 border-t border-paper/15 py-10 md:gap-x-12">
                    <span className="font-display text-2xl text-gold">{step.n}</span>
                    <div>
                      <h3 className="font-display text-2xl md:text-3xl">{step.title}</h3>
                      <p className="mt-4 max-w-md text-[15px] leading-relaxed text-taupe/70">
                        {step.body}
                      </p>
                    </div>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="relative px-8 py-24 md:px-16 md:py-32">
        <div className="mx-auto max-w-[1600px]">
          <div className="grid grid-cols-12 gap-x-8 gap-y-16">
            <Reveal className="col-span-12 lg:col-span-5">
              <ParticleImage
                src="/fleet/sport-classic.jpg"
                alt="Sport Classic, rear three-quarter, studio"
                className="group aspect-[4/3] w-full"
                tuning={{ sweepAngle: 0.6 }}
              />
              <p className="mt-6 flex items-center gap-4 font-sans text-[10px] uppercase tracking-[0.28em] text-ash">
                <span className="h-px w-8 bg-ink/25" />
                Sport Classic — ducktail, manual
              </p>
            </Reveal>

            <div className="col-span-12 lg:col-span-6 lg:col-start-7">
              <Reveal className="flex items-center gap-5">
                <span className="h-px w-8 bg-gold md:w-12" />
                <span className="font-sans text-[10px] font-medium uppercase tracking-[0.3em] text-ash">
                  In their words
                </span>
              </Reveal>

              <div className="mt-12">
                {VOICES.map((voice, i) => (
                  <Reveal key={voice.name} delay={i * 0.08}>
                    <figure className="group border-l border-ink/20 py-8 pl-6 transition-all duration-700 ease-lux hover:border-gold hover:pl-9 md:pl-8">
                      <blockquote className="font-display text-xl leading-relaxed text-ink md:text-2xl">
                        “{voice.quote}”
                      </blockquote>
                      <figcaption className="mt-6 flex items-center gap-4">
                        <span className="h-px w-6 bg-ink/25 transition-colors duration-700 ease-lux group-hover:bg-gold" />
                        <span className="font-sans text-[10px] uppercase tracking-[0.26em] text-ink transition-colors duration-700 ease-lux group-hover:text-gold">
                          {voice.name}
                        </span>
                        <span className="font-sans text-[10px] uppercase tracking-[0.26em] text-ash">
                          {voice.role}
                        </span>
                      </figcaption>
                    </figure>
                  </Reveal>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
