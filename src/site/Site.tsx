import { useLayoutEffect } from "react";
import { motion } from "motion/react";
import { Header } from "./Header";
import { Hero } from "./Hero";
import { Fleet } from "./Fleet";
import { Experience } from "./Experience";
import { Enquiries, Footer } from "./Enquiries";
import { GridLines } from "@/ui/Reveal";
import type { Role } from "@/sequence/LoginPanel";

export function Site({ role, onSignOut }: { role: Role; onSignOut: () => void }) {
  useLayoutEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 1.3, ease: [0.16, 1, 0.3, 1] }}
      className="grain-fixed relative min-h-screen bg-paper"
    >
      <GridLines />
      <Header role={role} onSignOut={onSignOut} />
      <main>
        <Hero role={role} />
        <Fleet />
        <Experience />
        <Enquiries />
      </main>
      <Footer />
    </motion.div>
  );
}
