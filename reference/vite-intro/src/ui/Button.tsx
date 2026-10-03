import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";

type Variant = "primary" | "inverse" | "outline" | "link";
type Size = "sm" | "md" | "lg";

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  children: ReactNode;
}

const SIZES: Record<Size, string> = {
  sm: "h-10 px-6",
  md: "h-12 px-8",
  lg: "h-14 px-10",
};

/**
 * The gold layer slides in from the left rather than the background changing
 * colour — a transform is cheap and gives the fill a direction. The label
 * flips to charcoal as it arrives; white-on-gold would only be 1.9:1.
 */
const VARIANTS: Record<Variant, { shell: string; label: string; wash: string }> = {
  primary: {
    shell: "bg-ink text-paper shadow-key hover:shadow-key-hover",
    label: "group-hover/btn:text-ink",
    wash: "bg-gold",
  },
  inverse: {
    shell: "bg-paper text-ink shadow-key hover:shadow-key-hover",
    label: "group-hover/btn:text-ink",
    wash: "bg-gold",
  },
  outline: {
    shell: "border border-current text-current",
    label: "group-hover/btn:text-ink",
    wash: "bg-gold",
  },
  link: {
    shell: "h-auto px-0 text-current",
    label: "group-hover/btn:text-gold",
    wash: "hidden",
  },
};

export function Button({
  variant = "primary",
  size = "md",
  className,
  children,
  ...props
}: Props) {
  const v = VARIANTS[variant];
  return (
    <button
      {...props}
      className={cn(
        "group/btn relative inline-flex items-center justify-center overflow-hidden",
        "font-sans text-[11px] font-medium uppercase tracking-[0.2em]",
        "transition-shadow duration-500 ease-lux",
        "disabled:pointer-events-none disabled:opacity-50",
        variant !== "link" && SIZES[size],
        v.shell,
        className,
      )}
    >
      <span
        aria-hidden
        className={cn(
          "absolute inset-0 -translate-x-full transition-transform duration-500 ease-lux",
          "group-hover/btn:translate-x-0 motion-reduce:hidden",
          v.wash,
        )}
      />
      <span
        className={cn(
          "relative z-10 flex items-center gap-3 transition-colors duration-300 ease-lux",
          v.label,
        )}
      >
        {children}
      </span>
    </button>
  );
}
