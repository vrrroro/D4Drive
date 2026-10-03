import { useId, useState, type InputHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

interface Props extends Omit<InputHTMLAttributes<HTMLInputElement>, "placeholder"> {
  label: string;
  /** Rendered as a real element, not a ::placeholder — see the note below. */
  hint?: string;
  /** Which ground the field sits on. */
  tone?: "dark" | "light";
}

/**
 * Underline only — no box, no fill. The hint is set in italic Playfair against
 * the sans-serif input text, which is the single detail that keeps a bare rule
 * from reading as unfinished.
 *
 * The hint is a span rather than the `placeholder` attribute because this panel
 * gets rasterised for the particle dissolve, and `::placeholder` — like every
 * pseudo-element on a replaced element — does not survive that. Left as a real
 * placeholder it rendered as flat white body text in the capture and popped the
 * instant the dissolve began.
 */
export function Field({ label, hint, tone = "dark", className, ...props }: Props) {
  const id = useId();
  const dark = tone === "dark";
  const [empty, setEmpty] = useState(!props.defaultValue && !props.value);

  return (
    <div className={cn("group/field", className)}>
      <label
        htmlFor={id}
        className={cn(
          "block text-[10px] font-medium uppercase tracking-[0.28em] transition-colors duration-500 ease-lux",
          dark
            ? "text-taupe/55 group-focus-within/field:text-gold"
            : "text-ash group-focus-within/field:text-gold",
        )}
      >
        {label}
      </label>

      <div className="relative mt-3">
        <input
          id={id}
          {...props}
          onInput={(e) => {
            setEmpty(e.currentTarget.value.length === 0);
            props.onInput?.(e);
          }}
          className={cn(
            "h-12 w-full border-b bg-transparent px-0 py-2 text-sm outline-none",
            "transition-colors duration-500 ease-lux",
            dark
              ? "border-paper/22 text-paper focus:border-gold"
              : "border-ink/25 text-ink focus:border-gold",
          )}
        />
        {hint && empty && (
          <span
            aria-hidden
            className={cn(
              "pointer-events-none absolute left-0 top-1/2 -translate-y-1/2 font-display text-[15px] italic",
              dark ? "text-taupe/35" : "text-ash/60",
            )}
          >
            {hint}
          </span>
        )}
      </div>
    </div>
  );
}
