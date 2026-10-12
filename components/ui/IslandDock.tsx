'use client';

import { useEffect } from 'react';

/** The glass pane's own width in globals.css (`.island-glass`); it is scaled from this. */
const GLASS_BASE = 600;

/**
 * Docks the header into an island once the page has moved, and keeps the
 * island fitted to what it carries.
 *
 * Whether the page has moved comes from an IntersectionObserver on the
 * sentinel 24px into the document (app/layout.tsx), not a scroll listener.
 * The sizes come from ResizeObservers on the logo and the links, so every
 * letter the "Let's ..." invitation types or deletes refits the island. Each
 * change writes four custom properties on the header in one animation frame;
 * the CSS transitions on their transforms do the gliding (globals.css,
 * `.site-header`). Nothing here touches React state.
 *
 * Under reduced motion the global rule drops transform transitions, so the
 * header simply jumps between its two layouts.
 */
export function IslandDock({ targetId }: { targetId: string }) {
  useEffect(() => {
    const header = document.getElementById(targetId);
    const logo = header?.querySelector<HTMLElement>('[data-island-logo]');
    const links = header?.querySelector<HTMLElement>('[data-island-links]');
    if (!header || !logo || !links) return undefined;

    let docked = header.dataset.docked === 'true';
    let raf = 0;

    const layout = () => {
      raf = 0;
      const vw = header.clientWidth;
      const gutter = parseFloat(getComputedStyle(header).paddingLeft) || 0;
      const small = vw < 640;
      const pad = small ? 20 : 26;
      const gap = small ? 20 : 28;
      const logoW = logo.offsetWidth;
      const linksW = links.offsetWidth;

      let logoX: number;
      let linksX: number;
      let glassX: number;
      let glassW: number;
      if (docked) {
        glassW = pad + logoW + gap + linksW + pad;
        glassX = (vw - glassW) / 2;
        logoX = glassX + pad;
        linksX = logoX + logoW + gap;
      } else {
        // Undocked, the glass waits, invisible, spread across the page from
        // the logo to the links: docking closes it in around them.
        logoX = gutter;
        linksX = vw - gutter - linksW;
        glassX = gutter - pad;
        glassW = vw - 2 * (gutter - pad);
      }
      const px = (n: number) => `${n.toFixed(1)}px`;
      header.style.setProperty('--logo-x', px(logoX));
      header.style.setProperty('--links-x', px(linksX));
      header.style.setProperty('--glass-x', px(glassX));
      header.style.setProperty('--glass-s', (glassW / GLASS_BASE).toFixed(4));
      header.dataset.docked = docked ? 'true' : 'false';
    };

    const schedule = () => {
      if (!raf) raf = requestAnimationFrame(layout);
    };

    layout();
    const sizes = new ResizeObserver(schedule);
    sizes.observe(header);
    sizes.observe(logo);
    sizes.observe(links);

    const sentinel = document.querySelector('[data-scroll-sentinel]');
    const moved = new IntersectionObserver(([entry]) => {
      if (!entry) return;
      docked = !entry.isIntersecting;
      schedule();
    });
    if (sentinel) moved.observe(sentinel);

    // The header's fonts change its letters' widths once they land.
    void document.fonts?.ready.then(schedule);

    return () => {
      sizes.disconnect();
      moved.disconnect();
      if (raf) cancelAnimationFrame(raf);
    };
  }, [targetId]);

  return null;
}
