import { motion } from "motion/react";
import type { ReactNode } from "react";

interface Props {
  children: ReactNode;
  delay?: number;
  className?: string;
}

/** Slow rise out of a soft blur. The house entrance for everything typographic. */
export function Reveal({ children, delay = 0, className }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 34, filter: "blur(7px)" }}
      whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      viewport={{ once: true, margin: "0px 0px -12% 0px" }}
      transition={{ duration: 1.15, delay, ease: [0.16, 1, 0.3, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/** Four hairlines on the column boundaries — the magazine grid, made visible. */
export function GridLines() {
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-10 hidden lg:block"
    >
      <div className="mx-auto h-full max-w-[1600px] px-16">
        <div className="relative h-full">
          {[0, 1 / 3, 2 / 3, 1].map((p) => (
            <span
              key={p}
              className="absolute top-0 h-full w-px bg-ink/10"
              style={{ left: `${p * 100}%` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
