import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

/* Fonts are bundled, not fetched from a CDN. Two reasons: no flash of fallback
   type on a page whose whole personality is its type, and — because they stay
   same-origin — html-to-image can embed them when it rasterises the login for
   the particle dissolve. A Google Fonts link would fail that step on CORS.

   Latin subsets only, and only the three faces actually used. Every declared
   @font-face is fetched and inlined as a data URI during that rasterisation,
   so the full multi-script families turned the dissolve into a five-second
   stall. Add a subset back here if the copy ever needs one. */
import "@fontsource/playfair-display/latin-400.css";
import "@fontsource/playfair-display/latin-400-italic.css";
/* Inter Variable's own latin @font-face is declared in index.css — the variable
   package has no per-subset entry point to import. */

import "./index.css";
import App from "./App";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
