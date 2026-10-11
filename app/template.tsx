import type { ReactNode } from 'react';

/**
 * Re-mounted on every navigation (unlike the layout), so each page arrives
 * with a short rise and fade instead of snapping in. CSS only
 * (globals.css, `.page-enter`): it plays without waiting for hydration,
 * collapses under reduced motion, and stands aside while a view transition
 * (CarLink) is carrying a photo across.
 */
export default function Template({ children }: { children: ReactNode }) {
  return <div className="page-enter">{children}</div>;
}
