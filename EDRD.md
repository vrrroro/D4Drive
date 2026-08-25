# Engineering Design Requirement Document (EDRD)
**Design System:** Luxury / Editorial

## 1. Executive Summary
**Vibe:** Sophisticated, Timeless, Expensive, Serene, Curated, Deliberate.
**Philosophy:** Elegance through restraint. This system emulates high-end fashion magazines. Success relies on exquisite typography, extreme asymmetric layouts, massive negative space, and cinematic (ultra-slow) motion. 
**Strict Rule:** No rounded corners. No pure black or pure white. No fast, snappy animations.

---

## 2. Technical Stack & Architecture
* **CSS Framework:** Tailwind CSS v4
* **Fonts:** Google Fonts (Playfair Display, Inter)
* **Icons:** Lucide React (strictly thin strokes, 1-2px)
* **Pattern:** Component-based (React/Vue/Svelte) with strict prop-driven variants.

---

## 3. Global Design Tokens (The DNA)

### 3.1 Colors
*Configure these in your global CSS / Tailwind theme variables.*
* **Background (`bg-background`):** `#F9F8F6` (Warm Alabaster) - *Used for 90% of surfaces.*
* **Foreground (`text-foreground`):** `#1A1A1A` (Rich Charcoal) - *Used for primary text and 1px borders.*
* **Muted Background (`bg-muted`):** `#EBE5DE` (Pale Taupe)
* **Muted Foreground (`text-muted`):** `#6C6863` (Warm Grey)
* **Accent (`bg-accent` / `text-accent`):** `#D4AF37` (Metallic Gold) - *Use sparingly for hover/focus.*
* **White (`text-white`):** `#FFFFFF` - *Only on top of dark/gold backgrounds.*

### 3.2 Typography Rules
* **Heading Font:** Playfair Display (Regular 400, Light 300, Italic 400)
* **Body Font:** Inter (Medium 500 for UI, Regular 400 for Body, Light 300 sparingly)
* **Hero Scale:** `text-6xl` to `text-9xl` (4rem - 8rem+) | `leading-[0.9]`
* **Body Scale:** `text-base` to `text-lg` | `leading-relaxed` (1.625)
* **Micro/Labels:** `text-[10px]` to `text-xs` | `uppercase` | `tracking-[0.25em]` to `tracking-[0.3em]`

### 3.3 Borders & Radii
* **Border Radius:** `0px` globally (`rounded-none`). **No exceptions.**
* **Border Width:** `1px` globally. 
* **Border Colors:** `#1A1A1A` (Full opacity for hard lines, 10-20% for dividers).

### 3.4 Depth, Shadows & Texture
* **Texture:** A fixed SVG fractal noise overlay at `z-index: 50`, `opacity: 2%`, `pointer-events-none`.
* **Subtle Shadows (never harsh):**
  * *Cards:* `shadow-[0_2px_8px_rgba(0,0,0,0.02)]` → hover: `shadow-[0_8px_24px_rgba(0,0,0,0.06)]`
  * *Buttons:* `shadow-[0_4px_16px_rgba(0,0,0,0.15)]` → hover: `shadow-[0_8px_24px_rgba(0,0,0,0.25)]`
  * *Hero Image:* `shadow-[0_8px_32px_rgba(0,0,0,0.12)]`
  * *Inner Framing:* `shadow-[inset_0_0_0_1px_rgba(0,0,0,0.04-0.08)]`

---

## 4. Cinematic Motion & Interaction
All motion must emulate a slow, expensive camera pan. Nothing snaps.
* **Easing Function:** `cubic-bezier(0.25, 0.46, 0.45, 0.94)` or Tailwind `ease-out`.
* **UI/Text/Buttons:** `duration-500` to `duration-700`.
* **Images:** `duration-[1500ms]` to `duration-[2000ms]`.
* **Image Hover Rule:** All images default to `grayscale`. On hover: transition to `grayscale-0` AND `scale-105` over 1500-2000ms.

---

## 5. Core Component Specifications

### 5.1 Buttons
* **Shape:** Rectangular (`h-12` default), `px-8` to `px-10`.
* **Typography:** `uppercase text-xs tracking-[0.2em] font-medium`.
* **Primary Variant:** `#1A1A1A` bg, `#FFFFFF` text. 
  * *Hover:* A gold layer (`#D4AF37`) slides in from `translate-x-[-100%]` to `translate-x-0` over 500ms. Requires internal `<span>` for text z-index.
* **Secondary Variant:** Transparent bg, `1px` solid charcoal border.
  * *Hover:* Fills to charcoal, text inverts to white over 500ms.
* **Link Variant:** Text only. Gold underline expands on hover.

### 5.2 Inputs
* **Structure:** Bottom border only (`border-b border-[#1A1A1A]`), `bg-transparent`.
* **Padding:** `px-0 py-2 h-12`.
* **Placeholder:** Playfair Display, *Italic*, `#6C6863`. (Crucial for the editorial feel).
* **Focus State:** `focus-visible:border-[#D4AF37] focus:outline-none focus:ring-0`.

### 5.3 Cards & Containers
* **Structure:** Minimal boxing. Prefer `border-t border-[#1A1A1A]` over full borders.
* **Padding:** `p-8` (mobile) to `p-12` (desktop).
* **Hover:** Barely visible background shift (`hover:bg-[#F9F8F6]/50`). Thicker gold top border (`border-t-4 border-[#D4AF37]`) for featured items.

---

## 6. Layout & Architectural Framework

### 6.1 The Grid & Vertical Lines
* **Container:** 12-column grid, max-width `1600px`, `px-8` (mobile), `px-16` (desktop).
* **Visible Gridlines:** 4 absolute/fixed vertical lines (`w-px bg-[#1A1A1A]/20`) spanning viewport height at column boundaries. Pointer events disabled.
* **Asymmetry:** Avoid 50/50 splits. Use 7/5 or offset alignments (e.g., `col-start-2` or `col-start-6`). 

### 6.2 Spacing (Generous Air)
* **Section Padding:** Massive vertical breathing room: `py-24` to `py-32`.
* **Component Gaps:** `gap-12` to `gap-16`. 
* *Rule of thumb:* If the space feels uncomfortably large at first, it is probably correct.

### 6.3 The "Bold Factor" (Signature Elements)
These must be implemented to avoid looking like a generic template:
1. **Vertical Text:** Decorative side labels using CSS `writing-mode: vertical-rl`, uppercase, wide tracking.
2. **Drop Caps:** Applied to introductory paragraphs. Playfair Display, `text-7xl`, `float-left`, `mr-3`, tight line-height.
3. **Mixed Italic Headlines:** Within `h1/h2`, wrap specific words in `<em>` to render as Playfair Italic, colored Gold `#D4AF37`. (e.g., "Curated *Excellence*").
4. **Horizontal Rules:** Short decorative lines (`h-px w-8 bg-[#1A1A1A]`) placed before labels or between metadata.

---

## 7. Accessibility (A11y) & Edge Cases
* **Contrast:** The #1A1A1A on #F9F8F6 provides AAA contrast (12.6:1).
* **Focus Rings:** Do not remove focus states. Ensure `focus-visible` utilizes the gold accent or a crisp 1px charcoal outline.
* **Reduced Motion:** Wrap heavy cinematic animations in `@media (prefers-reduced-motion: no-preference)`. If disabled, default to color shifts only (no transforms/scales).
* **Responsive Degradation:** On mobile (<768px), drop typography scales from 9xl to 5xl, remove vertical text, and stack columns gracefully while maintaining the grayscale-to-color hover logic.

---

## 8. Anti-Patterns (Strictly Forbidden)
🚫 **`rounded-md`, `rounded-lg`, `rounded-full`** (Everything is 0px radius).
🚫 **`bg-white`, `bg-black`, `text-black`** (Use Alabaster and Charcoal).
🚫 **`duration-150`, `duration-200`** (Too fast/cheap. Minimum 500ms).
🚫 **`shadow-xl`, `shadow-2xl`** (Too harsh. Use the custom rgba tokens).
🚫 **`items-center` on full-width sections** (Prefer bottom-left or asymmetric alignment).