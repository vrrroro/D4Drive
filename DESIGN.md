# D4Drive Design System

**Design read:** editorial maximalism, carmine edition. A fashion-magazine
spread (hairline serif at poster scale, a condensed wordmark cropped by the page
edge) that someone has scribbled over with a red pen, built around a film of a
red 911 that the visitor scrubs with their own scroll.

The system is an adaptation of the "Lil Boxes" reference (playful editorial
maximalism) to D4Drive's existing identity. From the reference: the type trio
and the marker, the stacked "dealt card" panels, corner-anchored gradient
fields, inertial scrolling with lagging headings, red-pen annotations with
self-drawing arrows, keycap controls, letters as photo windows, the rotating
roast word, the trailing cursor halo (the ghost stack of names and the
escalating easter egg came from it too, and have since been retired). From
D4Drive, kept on purpose: the palette drawn from the film,
square corners, paper grain, italic emphasis in the display family, realistic
Indian-market copy, and the hard bans (dashes, fake numbers, fake screenshots).

Where the two disagreed, the decision is recorded in place below.

---

## 1. Colour

The film is a carmine 911 on a grey studio cyclorama. Every colour is that car,
that studio, or ink.

**One grey, everywhere** (the owner's rule, 2026-10-12, Phase 15). The page,
the film's backdrop and the fleet photographs' backdrop are the same studio
grey, `#BDBCBA`. The film appears out of the page and fades back into it with
no edge, a car photo stands on the page with no box, and one page runs into
the next with no seam. Only the carmine panels (sign-in, confirmation) and the
checkout's charcoal summary are another colour.

| Token | Hex | Role |
|---|---|---|
| `--color-ground` | `#BDBCBA` | The studio grey. The page, every page. |
| `--color-ink` | `#1A1A1A` | Charcoal. Text, rules, the night panel. |
| `--color-studio` | `#BDBCBA` | The same grey (kept as a name for the studio panels). |
| `--color-carmine` | `#A82519` | The car. **The one accent.** |
| `--color-ember` | `#C2412D` | Carmine in sunlight. Hot field hotspot only. |
| `--color-carmine-deep` | `#7D1A12` | Carmine in shade. Hot field edge, hover wipes. |
| `--color-oxblood` | `#4D120C` | Hard offset shadows under condensed type. |
| `--color-blush` | `#F3E4DC` | The pale flank reflection. Text on carmine and charcoal. |
| `--color-muted` | `#45423E` | Secondary text on the grey. |
| `--color-foil` | `#D4AF37` | Gold. Defined, currently unused. Never signals state. |
| `--color-paper` | `#FFFFFF` | Body text on carmine. |

**One accent.** The reference runs coral, red, pink and a sky-blue counterpoint.
D4Drive keeps a single accent: ember, carmine-deep and oxblood are the same hue
at different light, not new colours, and the cool counterpoint is the charcoal
night panel instead of sky blue.

**The grey is flat; the other two fields are corner-anchored** radial
gradients:

| Field | Gradient | Used for |
|---|---|---|
| `--grad-hot` | ember to carmine to carmine-deep, from 10% 10% | The confirmation, the carmine sign-in |
| `--grad-night` | warm charcoal, from 90% 10% | The checkout summary |

**Contrast, measured** (WCAG):

| Pair | Ratio | Use |
|---|---|---|
| ink on the grey | 9.2 | Body |
| muted on the grey | 5.3 | Secondary text |
| carmine-deep on the grey | 5.5 | Small accent text (`--accent-text`) |
| carmine on the grey | 3.8 | Large type only: the hero's "Book smart.", red-pen notes |
| white on carmine | 7.13 | Body on the hot field |
| white on ember | 5.14 | Body at the hot field's brightest corner |
| blush on carmine | 5.76 | Labels on the hot field (large text only near ember: 4.14) |
| blush on charcoal | 14.04 | Footer |
| `#E8806F` on charcoal | 6.42 | Accent on the night panel |

**No dark mode** (the owner's decision, 2026-10-12). A dark page would put the
grey film and the grey car photographs in lit boxes, which is exactly the cut
the one grey removes. The site is light whatever the system asks
(`color-scheme: light`).

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
its dot) are drawn in SVG, which the rule does not
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

**Shadows**: `--shadow-float` (`40px 40px 80px` at 35% ink) under the checkout
summary; `--shadow-glass` for the admin editor; the header island's own soft
drop. Car photographs cast none: they stand on the page.

---

## 4. Motion

**The scroll is the playhead.** Nothing on the landing plays on its own. The
film is scrubbed by the scroll, forward and back (`docs/VIDEO_STATE_MACHINE.md`).

| Element | Motion | Driven by |
|---|---|---|
| Whole site | Inertial wheel scrolling (Lenis, lerp 0.085). Touch stays native. | `components/motion/SmoothScroll.tsx` |
| Landing film | 523 stills drawn to a canvas from the scroll position, one unbroken run with no holds | `components/film/FilmStage.tsx` |
| Film chapters | Fade with the scroll over the moving film, drift on a spring: the heading lag | `FilmChapter.tsx` |
| Loader | The hero's wordmark, in place, filling grey to ink from the bottom as the film arrives; fades onto the hero's own | `BootLoader.tsx` |
| Hero | After the loader the slogan's lines slide in from either side; the wordmark is already there. The first scroll blooms the film out of the grey between them through a soft ellipse with no edge, pushing the type away | `FilmHero.tsx`, `FilmStage.tsx` |
| Panels | Dealt in: scale 0.9 to 1, plus or minus 0.7 degrees to 0, as the top reaches the screen top. Pinned until the next slides over. | `components/motion/StackPanel.tsx` |
| Notes | Arrow strokes draw themselves once, on view | `HandArrow.tsx` |
| Header | At the top of a page, logo top left and links top right, no glass; once the page moves both glide together (760ms) and the glass island closes in around them, and it grows and shrinks with the typed word. Tint follows the panel beneath | `IslandDock.tsx`, `HeaderTone.tsx` |
| Fleet | A car lifts a little, a soft red shadow pools under it, and its words go red on hover | `globals.css`, `.fleet-*` |
| Car page | The fleet's photo flies to the top of the car page (view transition); the details rise in just after it | `CarLink.tsx`, `.car-arrive` |
| Confirmation | A carmine wash slides up over the whole screen and stays, footer included; the booking rises in after it | `.hot-wash` |
| Between pages | None: pages swap straight onto the same grey (a fade from nothing, and the loading placeholders, flashed bare grey) | |
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
  and every hover transform. Colour transitions stay. Every one
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
ground, never as a card of its own, and with no wordmark after it.

The landing is different: a 760vh track (640vh on portrait) with the film pinned
inside it, copy placed in the space the film leaves at each moment (the clear
band above the car, the floor below it, the flanks while it faces the camera,
the smoke once it has gone), ending on the sign-in panel. On portrait screens the
film sits in a band that follows the car, with copy above and below.

---

## 6. Signature elements

1. **Fraunces at 12vw, light, crushed.**
2. **Six Caps wordmarks**: the hero's, whole, at the bottom right (the
   loader fills the same letters grey to ink); the header's.
3. **Letters as photo windows**: hover a letter of the hero wordmark and a fleet
   photograph shows through the glyph.
4. **Red-pen notes** with self-drawing arrows. One SVG arrow, rotated and flipped
   to point anywhere, as the reference does with a single arrow clip.
5. **Stacked, dealt panels.**
6. **One grey**, with the carmine and charcoal fields as the only other grounds.
7. **Inertial scrolling with lagging headings.**
8. **The trailing cursor halo.** The native cursor stays.
9. **The rotating roast word**: "Your ride is _late again_".
10. **Level photographs that tilt toward you on hover** (the car page), the
    owner's rule since 2026-10-12: nothing sits tilted at rest.
11. **The fleet grid**: three across, each car standing on the page with no
    card (it replaced the deck on 2026-10-12, at the owner's request).
12. **Keycap controls.**
13. **The header island**: open at the top of a page (logo left, links
    right, no glass); once the page moves, the two glide together into a
    floating pane of frosted glass, centred, fitted to what it carries and
    resizing with the typed word; its tint follows the panel beneath.
14. **No visible scrollbar; the page fades in.**

Removed at the owner's request (2026-10-12): the escalating red dot (the
easter egg), the back-to-top arrow, and the wordmark at the end of the page.

Kept from D4Drive: **paper grain** (fixed, 2%, `pointer-events-none`) and the
**film** itself. The fixed **gridlines** are retired: with full-bleed panels and
percentage columns they no longer landed on anything real, which was the
condition for keeping them.

---

## 7. Components

| Component | Notes |
|---|---|
| `SiteHeader` | The condensed `D4DRIVE` wordmark, Fleet, Sign in and the typed "Let's ___" link (signed out only), or "Signed in as *Name*" with `AccountMenu` (whose menu hangs from it in glass). Open at the top of a page; docked into a centred island of frosted glass (square, like everything else) once the page moves (`IslandDock`: an IntersectionObserver for the dock, ResizeObservers for the fit, transforms only). Skip link. |
| `SiteFooter` | The slim line on every page: year, simulated payment, "This Was Bloomed By Rohit". (Photo credits left the footer and the account menu at the owner's request; each photo is credited under it on its car page, and `/credits` still lists them all.) |
| `LocationsSection` | Real branches from the database, "Browse the fleet" with its note. Landing and signed-out fleet only. |
| `AuthPanel` | Sign in and register as one three-column panel (brand, heading, form). Light at the end of the film, hot and swinging in on `/login`. |
| `FleetIndex` | The grid: three across on a laptop, two on a tablet, one on a phone. No cards: the photo stands on the grey, the name, specs and price beneath. Hover lifts the car a little, pools a soft carmine shadow under it (a multiplied radial gradient at the photos' ground line, opacity only) and turns its words red. |
| `CarLink` | A link to a car that carries its photo into the car page with a View Transition where the browser has one. |
| `CarPhoto` | Studio composite relit to the page grey, or a labelled "Photograph pending" slot (a thin outline). Never a stock image or a CSS shape. |
| `Field` | Underline input, label always above, error and helper slots always present. `tone` light, dark, hot; `size="lg"` sets values in Fraunces. |
| `Button`, `ButtonLink` | Primary (charcoal, red wipe), blush (on carmine and charcoal, presses like a keycap, fills red), secondary (fills red), link. |
| `Annotation`, `HandArrow` | Notes. Real text, readable in place; arrows decorative. |
| `Wordmark`, `RotatingWord` | Decorative or labelled for assistive technology as described in each file. |
| `StackPanel` | Tone, tilt, pin. |

---

## 8. Fleet photography

Every car is a freely licensed Wikimedia Commons photograph, cut out and set on
the film's cyclorama with a contact shadow, then relit so the backdrop is
exactly the page grey (`build.py --relight-only` does this to the finished
photos), so the fleet reads as one shoot with the hero film and each car
stands on the page with no box.

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
- **No decorative status dots.** A dot conveys real state.
- **No visible cards around cars.** A car photograph stands on the page.
- **No autoplaying sound.**
- **No hand-drawn SVG icons.** Icons are Lucide at `strokeWidth 1.5`. The arrows,
  the halo and the badge are the system's own marks, not icons.

---

## 11. Pre-merge checklist

- [ ] Zero em and en dashes in user-visible copy (`npm run lint:copy`)
- [ ] One accent: carmine and its own ramp; no new hue
- [ ] One grey: no new background shade on any page
- [ ] Radius 0 on every element in every state
- [ ] Contrast: body text 4.5:1 against its own field
- [ ] Labels above inputs; error and helper slots present
- [ ] Every number in copy comes from the database or `lib/constants.ts`
- [ ] Reduced motion: no scrub, no transforms, every chapter readable
- [ ] No JavaScript: no loader covering the page, chapters and fleet readable
- [ ] No scroll event listeners; no rAF loop touching React state
- [ ] Every `useEffect` with a listener, timer or observer cleans up
- [ ] `min-h-[100dvh]`, never `h-screen`
- [ ] Loading, empty and error states on every async surface
- [ ] Photographs credited (`public/cars/credits.json`)
- [ ] Landing checked at 1440x900, 390x844, and reduced motion
- [ ] `npm run lint`, `typecheck`, `test`, `test:db`, `build`, `smoke`
