# D4Drive Design System

**Design read:** premium-consumer landing with a video-gated entry, for
design-conscious renters who care what the car looks like parked outside their
building. Luxury editorial language, built on Tailwind v4 with Playfair Display
and Inter, with the hero video carrying the visual weight.

**Dials:** `DESIGN_VARIANCE 8` / `MOTION_INTENSITY 7` / `VISUAL_DENSITY 3`.

Variance is above the premium-consumer preset of 7 because the brief demands
extreme asymmetry. Motion is above 6 because the entry sequence is the product's
single strongest moment. Density is 3: this page breathes.

---

## 1. Colour

The film is a red Porsche 911 turning on a white studio cyclorama, ending in a
burnout. The palette is built from that footage outward, so the site and the
asset read as one object rather than a video dropped into an unrelated template.

Two measured facts drove the palette. The paint sits at hue 5, saturation 0.85,
sampled off the encoded frames rather than picked by eye. And the studio ground
is already a warm near-white, which is why the alabaster page ground was kept
rather than replaced: when the film ends, it resolves into a background the page
already has.

| Token | Hex | Role |
|---|---|---|
| `--ground` | `#F9F8F6` | Warm alabaster. Roughly 90% of all surface. |
| `--ink` | `#1A1A1A` | Rich charcoal. Primary text and hard 1px rules. |
| `--surface` | `#EBE5DE` | Pale taupe. Subtle elevation, alternate bands. |
| `--muted` | `#6C6863` | Warm grey. Secondary text, captions, metadata. |
| `--carmine` | `#A82519` | The car. The one accent. |
| `--foil` | `#D4AF37` | Gold. A material, not an accent. See the rule below. |
| `--paper` | `#FFFFFF` | Only on carmine or charcoal grounds. |

### The one-accent rule

The taste-skill caps a page at one accent colour and locks it across every
section. The EDRD nominated gold. The video nominated crimson. They cannot both
be the accent, so:

**Carmine is the accent.** Every interactive state, focus ring, active nav item,
emphasised headline word, and primary CTA fill uses `--carmine`. It is the only
saturated colour on the page and it appears in every section.

**Gold is demoted to foil.** It appears only as a 1px hairline rule and only where
a divider is already earning its place, in the way a gold foil stamp sits on a
book cover. Gold never touches text, never fills a shape, never signals a hover,
and never exceeds one hairline per section. If gold is carrying meaning, the
implementation is wrong.

This also settles a standing conflict with the taste-skill, which bans the
warm-cream plus brass palette as the default reach for premium-consumer briefs
because every AI-built luxury site ships it. Alabaster with a brass accent is
squarely inside that banned family. Alabaster with a deep carmine drawn from the
actual hero asset is not.

`--carmine` on `--ground` measures 6.72:1 and white on carmine measures 7.13:1.
Both clear AA for body text and AAA for large text.

### Theme

The page locks light. One deliberate charcoal band is permitted as a composition
device and is used exactly once, for the section directly after the video reveal,
where the eye is still adjusted to the darker footage. No other section inverts.

A `prefers-color-scheme: dark` variant inverts ground and ink while holding
carmine and foil constant. Tokens are defined once on `:root` and redefined only
inside the dark block. No colour gets its only definition inside a media query.

---

## 2. Type

**Playfair Display** for display, **Inter** for body and UI.

The taste-skill discourages both as defaults: Playfair because "creative brief
equals serif" is the most-tested AI tell, and Inter because it is the default
everyone reaches for. Both are permitted here on the explicit-brief override.
Playfair sits in the skill's approved serif rotation pool, and the brief names
both fonts directly. This is a stated brand decision, not a default reach.

Self-hosted through `next/font/google`. Never a `<link>` to Google Fonts in
production, because that is a render-blocking third-party round trip on the
critical path.

| Role | Size | Treatment |
|---|---|---|
| Hero | `text-6xl` to `text-9xl` | Playfair 400, `leading-[0.9]` |
| Section head | `text-5xl` to `text-7xl` | Playfair 400 |
| Subsection | `text-3xl` to `text-4xl` | Playfair 400 |
| Body | `text-base` to `text-lg` | Inter 400, `leading-relaxed`, `max-w-[65ch]` |
| UI and buttons | `text-xs` | Inter 500, `uppercase`, `tracking-[0.2em]` |
| Micro | `text-[10px]` | Inter 400, `uppercase`, `tracking-[0.25em]` |

**Emphasis within a headline uses Playfair italic in carmine.** Same family, never
a second family injected mid-headline. Mixed-family emphasis is amateur.

**Italic descender clearance is mandatory.** Any italic display word containing
`y g j p q` gets `leading-[1.1]` minimum plus `pb-1` on the wrapper. At
`leading-[0.9]` the descender clips, and the hero word most likely to be
emphasised is "Delivered", which has a descender.

---

## 3. Shape and depth

**Border radius is 0 everywhere.** No exceptions, on any element, in any state.
This is the shape-consistency lock for the project.

**Borders are 1px.** Full-opacity `--ink` for hard architectural lines,
10% to 20% opacity for dividers. Prefer a single `border-t` over a full box.

Shadows are soft and tinted, never harsh black drops:

| Element | Rest | Hover |
|---|---|---|
| Card | `0 2px 8px rgba(0,0,0,0.02)` | `0 8px 24px rgba(0,0,0,0.06)` |
| Image | `0 4px 24px rgba(0,0,0,0.08)` | `0 8px 32px rgba(0,0,0,0.12)` |
| Primary button | `0 4px 16px rgba(0,0,0,0.15)` | `0 8px 24px rgba(0,0,0,0.25)` |
| Video stage | `0 8px 32px rgba(0,0,0,0.12)` | static |

Images carry an inner framing border via
`shadow-[inset_0_0_0_1px_rgba(0,0,0,0.06)]`.

---

## 4. Motion

Everything is slow. Nothing snaps.

| Tier | Duration | Applies to |
|---|---|---|
| Interaction | 500ms | Buttons, links, borders, transforms |
| Colour | 700ms | Background and text colour shifts, loader fade |
| Cinematic | 1500ms to 2000ms | Images, grayscale reveals, the video-to-content reveal |

Easing is `cubic-bezier(0.25, 0.46, 0.45, 0.94)` or `ease-out`. Never `ease-in`
or `ease-in-out`, which read mechanical.

**Only `transform` and `opacity` animate.** Never `width`, `height`, `top`, or
`left`. The loader bar is `scaleX` from a left origin.

**Scroll listeners are banned.** No `window.addEventListener('scroll')`, no
`window.scrollY` in React state, no `requestAnimationFrame` loop that touches
state. Use Motion's `useScroll` and `useTransform`, IntersectionObserver, or CSS
`animation-timeline: view()`.

**Reduced motion is mandatory.** At `MOTION_INTENSITY 7` every animation on this
page is gated. Under `prefers-reduced-motion: reduce`, transforms and scales
collapse to nothing and only colour transitions survive. The intro sequence takes
the recovered path described in `docs/VIDEO_STATE_MACHINE.md`.

**Images default to grayscale** and reveal to full colour over 1500ms to 2000ms
on hover, paired with `scale-105`. The exception is any frame containing the
carmine car, which stays in colour, because the whole palette is built on it and
desaturating it would break the through-line.

---

## 5. Layout

12 columns, `max-w-[1600px]`, `px-8` mobile and `px-16` desktop.

**Asymmetry is required.** No 50/50 splits. Use 7/5, or offset column starts
(`col-start-2`, `col-start-6`). Primary content sits bottom-left, not centred.

**Vertical rhythm is generous.** `py-20` mobile, `py-24` to `py-32` desktop.
Component gaps of `gap-12` to `gap-16`. If the space feels slightly too large, it
is probably right.

**Never `h-screen`.** Always `min-h-[100dvh]`, or the iOS Safari address bar
causes a layout jump on the most important screen in the product.

**Grid over flex maths.** Never `w-[calc(33%-1rem)]`. Use
`grid grid-cols-1 md:grid-cols-3 gap-6`.

---

## 6. Components

### Buttons

Rectangular, `h-12` default, `px-8` to `px-10`, `uppercase text-xs
tracking-[0.2em]` Inter 500.

**Primary:** charcoal ground, white text. On hover a carmine layer slides in from
`translate-x-[-100%]` to `translate-x-0` over 500ms. Requires an inner `<span>`
at `z-10` so the label sits above the sliding layer. Shadow deepens on hover.

**Secondary:** transparent, 1px charcoal border. Fills to charcoal with inverted
text over 500ms.

**Link:** text only, carmine underline expanding on hover.

Label text must fit one line at desktop. Three words maximum on a primary CTA,
ideally one or two. A wrapped CTA is broken.

One label per intent across the whole page. "Book now" and "Reserve" and "Start
your booking" are the same intent, so exactly one of them exists.

### Inputs

Bottom border only, transparent ground, `h-12`, `px-0 py-2`. Input text is Inter.
Placeholder is Playfair italic in `--muted`, which is the detail that makes the
form feel editorial rather than administrative.

Focus moves the border to `--carmine`. No ring, no glow.

**Labels sit above inputs, always.** Placeholder-as-label is banned outright; it
fails screen readers and vanishes the moment the user types. Error text sits
below. Every input in the auth gate and the booking flow needs its label,
helper slot, and error slot present in markup from the first commit.

Placeholder and helper text must clear 4.5:1 against the panel ground. Over the
video, the auth panel needs an opaque or heavily scrimmed backing, because
nothing passes contrast against moving footage.

### Cards

Defined by a single `border-t`, not a full box. `p-8` mobile to `p-12` desktop.
Transparent ground with a barely visible hover shift. Featured items get a
`border-t-4` in carmine.

---

## 7. Signature elements

These keep the page from reading as a template. Two of them contradict taste-skill
bans and are kept on the explicit-brief override, with caps attached.

1. **Vertical text labels.** `writing-mode: vertical-rl`, uppercase, wide
   tracking, on the video stage edge. The taste-skill bans rotated vertical text
   as an agency cliché. Kept because the brief names it, but capped at **two
   instances page-wide**, and each must label something real. Hidden below 768px.

2. **Drop caps.** Playfair, `text-7xl`, `float-left`, `mr-3`, `leading-[0.8]`, on
   the opening paragraph of at most two sections.

3. **Mixed italic headlines.** One emphasised word per headline, Playfair italic,
   carmine.

4. **Visible gridlines.** Four fixed 1px vertical rules at `--ink` 20%,
   `pointer-events-none`. The taste-skill bans hairline grids drawn purely to make
   a page feel designed. Kept because the brief names it, on the condition that
   the four lines land on **actual 12-column boundaries that real content aligns
   to**. If content does not align to them, they are decoration and must be cut.

5. **Decorative rules.** Short `h-px w-8 md:w-12` lines before labels. This is
   where `--foil` is allowed to appear.

6. **Paper grain.** Fixed SVG fractal noise, 2% opacity, `pointer-events-none`,
   at the top of the z-index scale. **Fixed positioning is mandatory.** Applying
   grain to a scrolling container forces continuous GPU repaints and destroys
   mobile frame rate.

---

## 8. Hard bans

Carried from the taste-skill, non-negotiable, checked before every merge.

**Zero em-dashes.** Neither U+2014 (em dash) nor U+2013 (en dash) may appear
anywhere a user can see them: headlines, body,
labels, buttons, alt text, error messages, commit-facing copy. Use a hyphen, a
comma, a colon, or two sentences. This is the single most-violated rule and it is
binary.

**No scroll cues.** No "Scroll", no arrow prompt, no animated mouse-wheel icon.
The video ending is the transition. It needs no caption.

**No section-number eyebrows.** No `01 / INDEX`, no `002 - Fleet`.

**Eyebrow budget.** Small uppercase labels above section headlines are capped at
`ceil(sectionCount / 3)`. The hero counts as one. Count them mechanically before
merge.

**No version labels in the hero.** No `BETA`, no `V1.0`, no `EARLY ACCESS`.

**No decorative status dots.** A coloured dot may only convey real state, such as
live delivery status, and never appears as list-item ornament.

**No locale or time strips.** No "Bengaluru 14:23 - 28°C" in the header.

**No pills or captions overlaid on images.** No `Fleet - 02` tags on car photos.

**No fake screenshots.** Never build a product UI out of styled divs to simulate
an interface. Use a real screenshot or nothing.

**No hand-rolled SVG icons.** Icons come from one library only.

**No fake-precise numbers.** No invented "98.4% on-time delivery". Either the
number is real or it is marked mock in the markup.

**No generic placeholder identities.** No "John Doe" reviewers, no "Acme" brands.
Names and places are realistic and locale-appropriate for an Indian rental market.

**No three equal feature cards.** The most recognisable AI layout tell.

**No layout family repeated.** Each layout family appears once. Maximum two
consecutive image-plus-text splits before the pattern must break.

---

## 9. Icons

The EDRD names **Lucide React**, and it is used, at `strokeWidth={1.5}`. The
taste-skill discourages Lucide in favour of Phosphor, HugeIcons, Radix, or
Tabler; the explicit brief overrides that preference.

One family only, no mixing, and no hand-drawn paths. Icons here are functional,
never decorative, and the page should work with all of them removed.

---

## 10. Pre-merge checklist

No branch merges to `main` until every line passes.

- [ ] Zero em-dashes and zero en-dashes in user-visible copy
- [ ] One accent (carmine) across every section, gold only as hairline foil
- [ ] Radius 0 on every element in every state
- [ ] Page theme locked light, at most one deliberate charcoal band
- [ ] Dark-mode tokens defined and both modes visually checked
- [ ] Every CTA passes 4.5:1 against its own background
- [ ] No CTA label wraps at desktop
- [ ] Form labels above inputs, error and helper slots present, contrast checked
- [ ] Italic display words with descenders have `leading-[1.1]` and `pb-1`
- [ ] Hero fits the viewport, headline 2 lines maximum, subtext 20 words maximum
- [ ] Hero top padding at most `pt-24`
- [ ] Eyebrow count at most `ceil(sectionCount / 3)`
- [ ] No layout family used twice, at least 4 families across 8 sections
- [ ] Reduced motion collapses every transform on the page
- [ ] No scroll event listeners anywhere in the tree
- [ ] `min-h-[100dvh]`, never `h-screen`
- [ ] Real images throughout, no div-based fakes, no hand-rolled decorative SVG
- [ ] Every `useEffect` with a listener or timer has a cleanup function
- [ ] Loading, empty, and error states exist for every async surface
- [ ] Grain layer is `fixed` and `pointer-events-none`
- [ ] Lighthouse run, LCP under 2.5s, INP under 200ms, CLS under 0.1
