import { useEffect, useState } from "react";
import { cn } from "@/lib/cn";
import type { Role } from "@/sequence/LoginPanel";

const NAV = [
  { href: "#collection", label: "Collection" },
  { href: "#experience", label: "Experience" },
  { href: "#enquiries", label: "Enquiries" },
];

export function Header({ role, onSignOut }: { role: Role; onSignOut: () => void }) {
  const [lifted, setLifted] = useState(false);

  useEffect(() => {
    const onScroll = () => setLifted(window.scrollY > 32);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-30 border-b transition-colors duration-700 ease-lux",
        lifted ? "border-ink/10 bg-paper/95" : "border-transparent bg-transparent",
      )}
    >
      <div className="mx-auto flex h-20 max-w-[1600px] items-center justify-between px-8 md:h-24 md:px-16">
        <a
          href="#top"
          className="font-sans text-[11px] font-medium uppercase tracking-[0.44em] text-ink"
        >
          D4Drive
        </a>

        <nav className="hidden items-center gap-14 md:flex">
          {NAV.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="font-sans text-[10px] font-medium uppercase tracking-[0.28em] text-ink transition-colors duration-500 ease-lux hover:text-gold"
            >
              {item.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-4 md:gap-8">
          <span className="hidden items-center gap-3 sm:flex">
            <span className="h-px w-6 bg-gold" />
            <span className="font-sans text-[10px] font-medium uppercase tracking-[0.28em] text-ash">
              {role === "concierge" ? "Concierge" : "Member"}
            </span>
          </span>
          <button
            onClick={onSignOut}
            className="font-sans text-[10px] font-medium uppercase tracking-[0.28em] text-ash underline decoration-transparent underline-offset-[6px] transition-colors duration-500 ease-lux hover:text-gold hover:decoration-gold"
          >
            Sign out
          </button>
        </div>
      </div>
    </header>
  );
}
