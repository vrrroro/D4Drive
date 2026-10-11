# D4Drive Design System

**Design read:** editorial maximalism, carmine edition. A fashion-magazine
spread (hairline serif at poster scale, a condensed wordmark cropped by the page
edge) that someone has scribbled over with a red pen, built around a film of a
red 911 that the visitor scrubs with their own scroll.

The system is an adaptation of the "Lil Boxes" reference (playful editorial
maximalism) to D4Drive's existing identity. From the reference: the type trio
and the marker, the stacked "dealt card" panels, corner-anchored gradient
fields, inertial scrolling with lagging headings, red-pen annotations with
self-drawing arrows, keycap controls, letters as photo windows, the ghost stack
of names, the rotating roast word, the trailing cursor halo, the escalating
easter egg. From D4Drive, kept on purpose: the palette drawn from the film,
square corners, paper grain, italic emphasis in the display family, realistic
Indian-market copy, and the hard bans (dashes, fake numbers, fake screenshots).

Where the two disagreed, the decision is recorded in place below.

---

## 1. Colour

The film is a carmine 911 on a white studio cyclorama. Every colour is that car,
that studio, or ink.

| Token | Hex | Role |
|---|---|---|
| `--color-ground` | `#F9F8F6` | Alabaster: the cyclorama, lifted. The page. |
| `--color-ink` | `#1A1A1A` | Charcoal. Text, rules, the night panel. |
| `--color-studio` | `#E9E6E2` | The cyclorama itself. Studio panels. |
| `--color-carmine` | `#A82519` | The car. **The one accent.** |
| `--color-ember` | `#C2412D` | Carmine in sunlight. Hot field hotspot only. |
| `--color-carmine-deep` | `#7D1A12` | Carmine in shade. Hot field edge, hover wipes. |
| `--color-oxblood` | `#4D120C` | Hard offset shadows under condensed type. |
| `--color-blush` | `#F3E4DC` | The pale flank reflection. Text on carmine and charcoal. |
| `--color-muted` | `#6C6863` | Secondary text on ground. |
| `--color-foil` | `#D4AF37` | Gold. Defined, currently unused. Never signals state. |
| `--color-paper` | `#FFFFFF` | Body text on carmine. |

**One accent.** The reference runs coral, red, pink and a sky-blue counterpoint.
D4Drive keeps a single accent: ember, carmine-deep and oxblood are the same hue
at different light, not new colours, and the cool counterpoint is the charcoal
night panel instead of sky blue.

**Fields, never flat, never centred.** Panels use radial gradients anchored to a
corner, a different corner per field:

| Field | Gradient | Used for |
|---|---|---|
| `--grad-hot` | ember to carmine to carmine-deep, from 10% 10% | The fleet, the confirmation, the carmine sign-in |
| `--grad-studio` | warm grey to studio to ground, from 10% 90% | Catalog and form pages |
| `--grad-night` | warm charcoal, from 90% 10% | The footer, the checkout summary |

**Contrast, measured** (WCAG):

| Pair | Ratio | Use |
|---|---|---|
| ink on ground | 16.40 | Body |
| carmine on ground | 6.72 | Accent text |
| carmine on studio | 5.73 | Accent text on studio panels |
| white on carmine | 7.13 | Body on the hot field |
| white on ember | 5.14 | Body at the hot field's brightest corner |
| blush on carmine | 5.76 | Labels on the hot field (large text only near ember: 4.14) |
| blush on charcoal | 14.04 | Footer |
| `#E8806F` on charcoal | 6.42 | Accent on the night panel |

**Dark mode** flips ground, ink, studio and muted, and `--accent-text` becomes
`#E66256` (carmine on near-black is 2.4:1). Hot and night panels do not change.
Red-pen notes on the page ground use `--accent-text`; notes drawn over the
film stay carmine, because the film is light in either mode.

---

## 2. Type

| Family | Role | Notes |
|---|---|---|
| **Fraunces** (variable, optical size) | Display: mega headings, hero lines, chapter heads, prices, form values | Light (300 to 350) at poster sizes, crushed leading, tracked in. Emphasis is Fraunces italic, the same family, never a second face. |
| **Six Caps** | The condensed voice: the cropped `D4Drive` wordmarks, the rotating word, booking references | Stands in for the reference's Humane (not on a free licence we could verify): the same ultra-tall, ultra-narrow build. |
| **Inter** | Everything read: body at 300, labels and buttons at 600 uppercase | |
| **Shadows Into Light Two** | The red pen. Annotations only. | Tilted, blurred 0.35px so it reads as ink. Never carries information the page does not also say. |

The reference's fifth face (Urbanist, for footer meta) is dropped: Inter
labels do the same job and it saved a font file.

Scale, as classes in `globals.css`:

| Class | Size | Leading | Tracking |
|---|---|---|---|
| `.t-mega` | `clamp(3.25rem, 11.5vw, 12rem)` | 0.8 | -0.035em |
| `.t-hero` | `clamp(2.75rem, 7.6vw, 9.5rem)` | 0.82 | -0.03em |
| `.t-display` | `clamp(2.25rem, 5.2vw, 6rem)` | 0.88 | -0.025em |
| `.t-sub` | `clamp(1.75rem, 3.4vw, 3.5rem)` | 1 | -0.015em |
| `.t-body` | `clamp(1.0625rem, 1.25vw, 1.375rem)`, Inter 300 | 1.55 | |
| `.t-eyebrow` | `clamp(0.75rem, 0.95vw, 0.95rem)`, Inter 600 caps | 1.2 | 0.22em |
| `.t-label` | `0.6875rem`, Inter 600 caps | 1.3 | 0.2em |
| `.t-condensed` | set per use | 0.76 | 0 |
| `.t-marker` | `clamp(1.5rem, 2.2vw, 2.6rem)` | 0.92 | |

Display leading is always under 1: lines are allowed to touch. Reading text
stays left-aligned (the reference justifies; rivers in Inter 300 are not worth
it) and under about 75 characters.

All four families are self-hosted through `next/font`. The marker face is not
preloaded: notes arrive after the first paint.

---

## 3. Shape and depth

**Border radius is 0, everywhere, at rest and in every state.** This is the
largest place D4Drive overrides the reference, which rounds everything to 8px.
The dealt-card entrance keeps its scale and tilt but not its rounded corners;
keycaps are square. Round things the system genuinely needs (the cursor halo,
the red dot, the circular badge) are drawn in SVG, which the rule does not
reach.

**Keycaps** (`.keycap`): outlined on the bottom edge only (`border-bottom` plus a
1px `box-shadow`), as if seen from slightly above. Hover presses them in:
`translate(2px, 2px)`, the outline drops, a soft top-left shadow appears, and
like every button it fills red with white type. Used for back links,
pagination and admin actions.

**Every button hovers red with white type** (the owner's rule, 2026-10-12):
primary, blush, secondary and keycaps share `--btn-hover-bg`, carmine, or the
deeper carmine on a carmine panel so the hover still shows. Text links only
turn the accent colour.

**Shadows**: `--shadow-float` (`40px 40px 80px` at 35% ink) under tilted
photographs and the checkout summary; `--shadow-glass` for the admin editor.
Nothing else casts a shadow.

---

## 4. Motion

**The scroll is the playhead.** Nothing on the landing plays on its own. The
film is scrubbed by the scroll, forward and back (`docs/VIDEO_STATE_MACHINE.md`).

| Element | Motion | Driven by |
|---|---|---|
| Whole site | Inertial wheel scrolling (Lenis, lerp 0.085). Touch stays native. | `components/motion/SmoothScroll.tsx` |
| Landing film | 264 stills drawn to a canvas from the scroll position | `components/film/FilmStage.tsx` |
| Film chapters | Fade with the scroll, drift on a spring: the heading lag | `FilmChapter.tsx` |
| Hero | One orchestrated entrance after the loader: lines slide in from either side, wordmark letters bounce up, the red dot pops; then the black slab fades in between them and the scroll opens it, pushing the type away | `FilmHero.tsx`, `FilmStage.tsx` |
| Grey stage | The studio grey multiplied over the film and page while it plays; back to the ground with the smoke | `.film-tone`, `timeline.stageTone` |
| Panels | Dealt in: scale 0.9 to 1, plus or minus 0.7 degrees to 0, as the top reaches the screen top. Pinned until the next slides over. | `components/motion/StackPanel.tsx` |
| Notes | Arrow strokes draw themselves once, on view | `HandArrow.tsx` |
| Header | Colours follow the panel beneath, 300ms; a frosted grey bar once the page has moved | `HeaderTone.tsx` |
| Cursor | A carmine halo trails the pointer on a spring | `CursorHalo.tsx` |
| Hover | Fleet names, wordmark letters, the detail photo's tilt, keycaps | CSS and Motion |

Rules:

- **CSS and Motion animate `transform` and `opacity` only**, plus colour
  transitions. Two deliberate exceptions, both paint-only: the canvas the film
  is drawn into (pixels, not layout), and the stroke dash that draws a note's
  arrow (a few hundred pixels of SVG).
- **No scroll event listeners.** Scroll-linked values come from Motion's
  `useScroll`, visibility from IntersectionObserver. Lenis moves the native
  scroll position; it does not add listeners in our code. No
  `requestAnimationFrame` loop touches React state: the film canvas draws on
  demand, outside React.
- **Reduced motion** (`prefers-reduced-motion: reduce`) turns off: smooth
  scrolling, the film scrub (chapters become a document with stills, and the
  film is offered as a video with controls), the dealt-card transforms, the
  heading lag, the cursor halo, the hero entrance, the typing (first word only),
  the badge spin, and every hover transform. Colour transitions stay. Every one
  of these is also a CSS media query, so nothing moves before hydration either.
- `useReducedMotion` from Motion is not used for anything that changes markup:
  it disagrees with the server on the first render. Use
  `components/motion/use-prefers-reduced-motion.ts`.

---

## 5. Layout

Full-bleed panels (`.panel`), each a corner-anchored field, sharing one gutter:
`--gutter: clamp(1.25rem, 6vw, 8rem)`. Inside, a 12-column grid with
`gap-x-12`, and asymmetric splits (7/5, 5/7, 3/4/5). No 50/50 splits, no centred
heroes. `min-h-[100dvh]`, never `h-screen`.

Panels stack: each pins once its bottom meets the bottom of the screen
(`top: min(0, viewport - height)`) and the next one is dealt in over it. The
page ends with a slim footer line; the branch list (`LocationsSection`) flows on
from the sign-in panel on the landing and the signed-out fleet, on the same
ground, never as a card of its own.

The landing is different: a 1000vh track (850vh on portrait) with the film pinned
inside it, copy placed in the space the film leaves at each moment (the clear
band above the car, the floor below it, the flanks while it faces the camera,
the smoke once it has gone), ending on the sign-in panel. On portrait screens the
film sits in a band that follows the car, with copy above and below.

---

## 6. Signature elements

1. **Fraunces at 12vw, light, crushed.**
2. **Six Caps wordmarks cropped by the screen edge**: the boot loader, the hero,
   the footer.
3. **Letters as photo windows**: hover a letter of the hero wordmark and a fleet
   photograph shows through the glyph.
4. **Red-pen notes** with self-drawing arrows. One SVG arrow, rotated and flipped
   to point anywhere, as the reference does with a single arrow clip.
5. **Stacked, dealt panels.**
6. **Corner-anchored fields**: hot, studio, night.
7. **Inertial scrolling with lagging headings.**
8. **The trailing cursor halo.** The native cursor stays.
9. **The rotating roast word**: "Your ride is _late again_".
10. **3D-tilted photographs** that straighten on hover: the detail page, the
    fleet preview.
11. **The ghost stack**: every model name piled at a fifth of a line; point at
    one and it becomes a bold headline with its photograph beside it.
12. **Keycap controls.**
13. **The header chameleon**: its colours follow the panel beneath.
14. **The escalating red dot**: six clicks of increasingly tired badges, then the
    film's own engine note. Sound only ever starts from a click.
15. **No visible scrollbar; the page fades in.**

Kept from D4Drive: **paper grain** (fixed, 2%, `pointer-events-none`) and the
**film** itself. The fixed **gridlines** are retired: with full-bleed panels and
percentage columns they no longer landed on anything real, which was the
condition for keeping them.

---

## 7. Components

| Component | Notes |
|---|---|
| `SiteHeader` | Fixed. The condensed `D4DRIVE` wordmark at the top left (hidden on the landing until the film starts), Fleet, Sign in and the typed "Let's ___" link (signed out only), or "Signed in as *Name*" with `AccountMenu`. Transparent at the top, frosted grey once the page moves. Skip link. |
| `SiteFooter` | The slim line on every page: year, simulated payment, photo credits, "This Was Bloomed By Rohit". |
| `LocationsSection` | Real branches from the database, "Browse the fleet" with its note, the whole wordmark. Landing and signed-out fleet only. |
| `BackToTop` | A small up arrow at the left edge, red on hover. |
| `AuthPanel` | Sign in and register as one three-column panel (brand, heading, form). Light at the end of the film, hot and swinging in on `/login`. |
| `FleetIndex` | The ghost stack where there is a mouse and room; photo cards otherwise. One list of links serves both. |
| `CarPhoto` | Studio composite, or a labelled "Photograph pending" slot. Never a stock image or a CSS shape. |
| `Field` | Underline input, label always above, error and helper slots always present. `tone` light, dark, hot; `size="lg"` sets values in Fraunces. |
| `Button`, `ButtonLink` | Primary (charcoal, red wipe), blush (on carmine and charcoal, presses like a keycap, fills red), secondary (fills red), link. |
| `Annotation`, `HandArrow` | Notes. Real text, readable in place; arrows decorative. |
| `Wordmark`, `RotatingWord`, `EasterEgg` | Decorative or labelled for assistive technology as described in each file. |
| `StackPanel` | Tone, tilt, pin. |

---

## 8. Fleet photography

Every car is a freely licensed Wikimedia Commons photograph, cut out and set on
the film's cyclorama (lifted toward the alabaster ground) with a contact shadow,
so the fleet reads as one shoot with the hero film.

- Front-left three-quarter view, the angle the 911 shows as it turns toward the
  camera. Neutral paints where Commons had them; the Thar and Virtus GT are red
  because no neutral photo of those exact models was usable.
- Same width, same ground line, 3:2, 1600px WebP.
- Readable number plates blurred. Mirroring only where the badge survives it
  (the Nexon EV, whose "EV" badge is too small to read at any display size).
- Author, licence and source for every image in `public/cars/credits.json`,
  shown under each photo on its detail page and in full on `/credits`.
- `scripts/fleet-photos/` rebuilds them.

---

## 9. Copy

Cheeky, never untrue. Jokes are allowed to tease the visitor's current ride;
they never make a claim about D4Drive the page does not back up. The 911 in the
film is not in the fleet, and the page says so ("this one isn't for rent.
sadly."). Every number in the copy (cars, branches, rates, delivery tiers) is
read from the database or `lib/constants.ts`. Names, places and prices are
Bengaluru-real.

---

## 10. Hard bans

- **Zero em dashes and en dashes** in anything a user can see. `npm run lint:copy`.
- **No scroll cues.** The film's first frame and its copy invite the scroll.
- **No fake numbers**, no "98% on time", no invented counts.
- **No fake screenshots** built from divs, and **no stock photos**: a car without
  a photo gets a labelled slot.
- **No generic identities**: no "John Doe", no "Acme".
- **No section-number eyebrows** (`01 / FLEET`). Eyebrows capped at
  `ceil(sectionCount / 3)` per page.
- **No decorative status dots.** A dot conveys real state or is the easter egg.
- **No autoplaying sound.**
- **No hand-drawn SVG icons.** Icons are Lucide at `strokeWidth 1.5`. The arrows,
  the halo and the badge are the system's own marks, not icons.

---

## 11. Pre-merge checklist

- [ ] Zero em and en dashes in user-visible copy (`npm run lint:copy`)
- [ ] One accent: carmine and its own ramp; no new hue
- [ ] Radius 0 on every element in every state
- [ ] Contrast: body text 4.5:1 against its own field, light and dark
- [ ] Labels above inputs; error and helper slots present
- [ ] Every number in copy comes from the database or `lib/constants.ts`
- [ ] Reduced motion: no scrub, no transforms, every chapter readable
- [ ] No JavaScript: no loader covering the page, chapters and fleet readable
- [ ] No scroll event listeners; no rAF loop touching React state
- [ ] Every `useEffect` with a listener, timer or observer cleans up
- [ ] `min-h-[100dvh]`, never `h-screen`
- [ ] Loading, empty and error states on every async surface
- [ ] Photographs credited (`public/cars/credits.json`)
- [ ] Landing checked at 1440x900, 390x844, reduced motion, and dark mode
- [ ] `npm run lint`, `typecheck`, `test`, `test:db`, `build`, `smoke`
