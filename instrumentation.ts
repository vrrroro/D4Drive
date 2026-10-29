/**
 * Runs once when a Next.js server starts (not during `next build`).
 *
 * Loads the car advisor's model in Ollama and has it read the instructions,
 * so the first visitor to ask does not wait about 17 s for both
 * (lib/advisor/run.ts, warmAdvisor). Fire and forget: the server does not
 * wait for it, and without Ollama it only logs a line.
 */
export async function register() {
  // This exact shape lets the edge build drop the import (and with it
  // mysql2, which the edge runtime cannot load) at compile time.
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    if (process.env.NEXT_PHASE === 'phase-production-build') return;
    const { warmAdvisor } = await import('@/lib/advisor/run');
    void warmAdvisor();
  }
}
