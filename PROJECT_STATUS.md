# Project Status and Milestones

**Current phase:** Phase 14, the owner's UI revisions (Phase 13 done 2026-10-12, PR #25)
**Status:** Phases 12 and 13 complete in code; Phase 14 in progress on `feature/ux-revisions`
**Last updated:** 2026-10-12

Work only the active phase. Tick boxes as sub-tasks land, in the same commit as
the work. When a phase is finished, set the next one as current here and in the
"Current state" section of `CLAUDE.md`.

**Verified on 2026-10-05 (cloud sandbox, Ubuntu 24.04, Node 22, MySQL 8.0.46):**
`npm ci`, `npm run db:setup`, `npm run lint:copy`, `npm run typecheck`,
`npm run test:db` (34 pass, 0 skipped: the double-booking and refresh-rotation
tests run against MySQL), `npm test` without a database (27 pass, 2 skipped),
`npm run build`, and `npm run smoke` (27 browser checks pass against
`next start`).

---

## Phase order

| Order | Phase | State |
|---|---|---|
| 1 | 0 to 8: Foundation through Admin | Done in code, see ticks |
| 2 | 10: Close the gaps | Done |
| 3 | 11: Port the Vite intro effects | Done (optional logo loader blocked, see below) |
| 4 | 9: Hardening | Done (device and assistive-technology checks need hardware) |
| 5 | 12: Scroll film and editorial redesign | Done 2026-10-08, PR #24 |
| 6 | 13: Database coursework (the DBMS rubric) | Done 2026-10-12, PR #25 |
| 7 | 14: The owner's UI revisions (18 items) | **Active**, branch `feature/ux-revisions` stacked on 13 |

---

### Phase 13: Database coursework (done 2026-10-12, PR #25)

The owner's course rubric, verbatim in substance: 6 to 8 related tables with
PKs and FKs; NOT NULL, UNIQUE, CHECK and DEFAULT constraints; at least 10
meaningful records per table; an ER diagram and the relational schema; at
least 15 meaningful queries (retrieval, joins, aggregation, subqueries and
more); at least 2 procedures and 2 functions for real business operations; at
least 1 cursor; at least 2 triggers; INSERT, UPDATE and DELETE demonstrated;
connectivity from a programming language; and an interactive demonstration of
User operation, SQL or stored program, database processing, update or
retrieval, result, explainable per transaction (operation, tables, component,
effect, result). **Not a collection of independent programs: every component
must serve the application.**

Design decisions (stated assumptions, see `docs/DATABASE.md`):
- 8th table `booking_status_log`, written only by triggers: the audit trail the admin sees.
- `deliveries.pickup_branch_id`: self-pickup can be at any branch (Phase 14 item 13 needs it). Collecting away from the car's home branch is charged on the same distance tiers as delivery.
- Booking creation moves into `sp_create_booking` (lock, overlap check, fee, three inserts, one transaction). TypeScript keeps validation and maps SIGNALs to HTTP codes.
- Connectivity is the Next.js app itself, through `mysql2` (Node), which the rubric allows ("any other suitable programming language").

- [x] Plan recorded (this list)
- [x] Schema: `booking_status_log`, `pickup_branch_id`, `branches.pincode`, `payments.refunded_at`, stronger CHECK/UNIQUE/DEFAULT constraints (2026-10-12)
- [x] Seed: at least 10 meaningful rows in every table: 11 branches, 12 users, 10 cars, 14 bookings, 14 deliveries, 14 payments, 16 refresh tokens, 27 status-log rows written by the triggers (2026-10-12)
- [x] `database/routines.sql`: 3 functions (`fn_haversine_km`, `fn_delivery_fee`, `fn_car_available`), 3 procedures (`sp_create_booking`, `sp_cancel_booking`, `sp_end_of_day_close` with a cursor), 5 triggers (status log on insert and update, refund on cancel, delivered stamp, withdraw guard), view `v_booking_details`; `db:setup` learns `DELIMITER` and loads schema, routines, seed (2026-10-12). Every procedure path verified by hand against MySQL 8.0.
- [x] App wired to them: booking through `sp_create_booking`, availability through `fn_car_available`, customer cancellation (My bookings, `POST /api/bookings/:id/cancel`), admin end-of-day close (`POST /api/admin/operations/close`), withdraw (`POST /api/admin/cars/:id/withdraw`) and FK-protected hard delete (`DELETE /api/admin/cars/:id`), session purge inside the close; DB refusals map to 4xx in `handleRouteError` (2026-10-12)
- [x] `database/queries.sql`: 18 named queries; `/admin/reports` reads and runs them from the file (2026-10-12)
- [x] Admin "Reports" page and admin "How the database works" page (`/admin/database`): live inventory from information_schema, ERD, relational schema, 14 transactions in the five-question format, three "Try it" panels showing SQL, bound values and rows, the trigger feed (2026-10-12)
- [x] `docs/DATABASE.md` (the write-up, with a five minute demo script), `docs/erd.svg` from `npm run build:erd`, `docs/ERD.md`, `ARCHITECTURE.md`, `README.md` updated (2026-10-12)
- [x] Tests against MySQL: `tests/routines.test.ts` (9), `tests/queries.test.ts`, `tests/walkthrough.test.ts`; `test:db` 56 pass (2026-10-12)
- [x] Full verification (2026-10-12): `lint`, `lint:copy`, `typecheck`, `npm test` (40 pass, 4 skip; corrected, see the CHANGELOG fix), `test:db` (57 pass), `build`, `smoke` (41/41 against `next start`), `check:leaks` (clean); `/admin`, `/admin/database`, `/admin/reports` reviewed at 1440x900 (`scripts/shoot.mjs`)

### Phase 14: The owner's UI revisions (active; all 18 items done in code 2026-10-12, verification left)

Owner's list of 2026-10-12, numbered as given. Decisions the owner made when
asked (2026-10-12):

- **Item 2 colours:** "grey stage, dark text". During the film the page and
  the film are toned to the studio grey; text and header stay charcoal. After
  the film it returns to the light page.
- **Item 6 logo:** the condensed `D4DRIVE` wordmark replaces the serif logo at
  the **top left**; hidden on the landing's first screen, shown once the film
  starts and on every other page.
- **Item 13 map:** OpenStreetMap (Leaflet tiles), address search through our
  own server to OpenStreetMap's Nominatim geocoder; no API key.
- **Items 3, 8, 12 footer:** the flowing locations section ("Browse the
  fleet") appears only after the landing's sign-in panel and at the end of the
  fleet page for signed-out visitors. Every other page, sign-in included, ends
  with a slim line (up arrow, credits, "This Was Bloomed By Rohit").

- [x] 1. (2026-10-12: `closedSlab`, `slabAlpha`, `heroPush`; the slab fades in 1.5s after the slogan, or with the first scroll) Film opens from blank space between the slogan and the wordmark: a black rectangle fades in there and grows with the scroll, pushing the type above and below away (no peeking window)
- [x] 2. (2026-10-12: `.film-tone` multiply layer, `stageTone`; four holds in `SEGMENTS`; chapters fully shown through their holds) During the film the page, text and header turn grey (the page's grey); the film pauses on each shot so its copy can be read, then continues; after the film it fades back and the header returns to white; then flows smoothly into sign-in
- [x] 3. (2026-10-12: `LocationsSection` flows on from sign-in on the landing and the signed-out fleet; both notes re-aimed) Footer is no longer a separate card: sign-in flows on into locations and the fleet button. Arrows of "go on. you know you want to." and "go on, pick one." placed accurately on their buttons
- [x] 4. (2026-10-12: "self-drive" removed from all copy; note and arrow gone; the wordmark sized to the height left, line box 0.92) Landing wordmark shown whole, not clipped; remove the "self-drive cars" note and its arrow to the dot; remove every "self-drive" from the site
- [x] 5. (2026-10-12: v2 cut at 60 stills a second by motion interpolation, decode ahead of the playhead, eased segments, the holds) Film scrub much smoother (more in-between frames, holds)
- [x] 6. (2026-10-12: `header-logo`, hidden via `.film-track[data-film-phase='hero']`; frosted bar from `data-scrolled`) Header logo: none on the landing's first screen; the landing's wordmark appears top right once the film starts; after the first scroll the header has a grey glass background and content passes under it
- [x] 7. (2026-10-12: scroll bug fixed in `SmoothScroll`, Lenis kept the old page's eased target; the fleet is one grey studio field) "Fleet" link: no jump to the end of the home page; lands on the fleet page top ("pick a car"), on the grey gradient, not a floating red card
- [x] 8. (2026-10-12: `FleetIndex` deck, `.fleet-card-grey` hover, `AuthPanel` + `LocationsSection` only when signed out) Fleet page: overlay-card effect on the car photos while scrolling, popping up slightly; hover greys the car and its name; the closing sign-in ending only for signed-out visitors
- [x] 9. (2026-10-12: `CarLink` view transition carries the photo; `.page-enter` on every page; `.car-tilt` level at rest) Car click: smooth transition to the detail page; the detail photo is level, tilting only on hover
- [x] 10. (2026-10-12: inside the car's grey field, one Reserve button at the end) "How it gets to you" moves out of its red card into the detail view under the photo and facts; one Reserve button at the end
- [x] 11. (2026-10-12: `--btn-hover-bg`, deeper carmine on carmine panels; keycaps too) Every button hovers red with white text
- [x] 12. (2026-10-12: `/booking/:id` redirects to `/login?next=`; sign-in ends with the slim line only) Reserve while signed out goes to sign-in directly, without the footer's fleet block
- [x] 13. (2026-10-12: `.page-enter`; two-column checkout that fits a 900px screen; collection at any branch with its distance and fee; `--select-bg` grey lists; `AddressPicker` with OpenStreetMap search, map tap and "use my location", distance worked out from the pin) Smooth transition into checkout; fix spacing on every page; checkout and summary fit about one screen; delivery dropdown lists collection from every branch; dropdowns grey and readable; doorstep address chosen by search or on a map, distance computed from the branch (no latitude and longitude fields)
- [x] 14. (2026-10-12: beside the Payment heading, pointing into it; the method list is grey) "Relax. Nobody gets charged." note placed at the payment area; payment dropdown grey
- [x] 15. (2026-10-12) Confirmation stays red; "keep this one. the keys know it." becomes "this is important."
- [x] 16. (2026-10-12: Let's link signed-out only; no example names, numbers, emails, cards or UPI IDs in any form) Signed in: no rotating "Let's ___" link (signed-out only); no example name, number or other placeholder info
- [x] 17. (2026-10-12: `AccountMenu`) Signed in shows "Signed in as <u>Name</u>"; clicking opens a menu: My bookings, Fleet, and the rest
- [x] 18. (2026-10-12: `BackToTop` is a small arrow at the left edge; `SiteFooter` is the slim line) No "back to the top" button: a small up arrow on the left. Footer line: "This Was Bloomed By Rohit"

---

### Phase 12: Scroll film and editorial redesign (done 2026-10-08)

The owner's brief: scrub the hero film with the scroll instead of playing it
outright, tell the company's story in the spaces it leaves, fade into sign-in as
the car takes off, restyle every page to the "Lil Boxes" editorial-maximalism
system while keeping D4Drive's identity, and give the fleet real photographs
with one consistent look. Contract: `docs/VIDEO_STATE_MACHINE.md`. System:
`DESIGN.md`.

- [x] Film as 264 WebP stills (`npm run build:frames`), car position per frame, engine clip
- [x] Canvas scrubber with coarse-to-fine loading, nearest-frame fallback, in-between blending
- [x] Hero window opening out of the headline; five chapters placed in the film's empty space; smoke fades into the sign-in panel
- [x] Portrait band mode that follows the car
- [x] Reduced motion and no-script: a plain document of chapters with stills, film on request
- [x] Smooth scrolling (Lenis), dealt-in stacked panels, heading lag, cursor halo, header chameleon, back-to-top
- [x] Type and tokens: Fraunces, Six Caps, Inter, marker; ember, oxblood, blush, studio; corner-anchored fields; radius 0 kept
- [x] Red-pen notes with self-drawing arrows; wordmark letters as windows onto the fleet; rotating roast word; easter egg
- [x] Every page restyled; the catalog's ghost stack (cards on touch)
- [x] Fleet photographs: ten Commons photos, cut out and composited on the cyclorama, credited (`/credits`), seeded
- [x] Unit tests for the timeline; smoke test rewritten (41 checks)
- [ ] Scrubbing on a real iPhone and Android phone: memory with 132 stills, Lenis off on touch (needs devices)
- [ ] Lighthouse re-run on the new landing (the boot loader is the LCP candidate; measure it)

### Phase 0: Foundation and toolchain (done)

- [x] Create the GitHub repository
- [x] Write `.gitignore` and `.env.example`, confirm `.env` is excluded
- [x] Scaffold Next.js 15 with TypeScript strict and Tailwind v4
- [x] Configure `@theme` tokens from `DESIGN.md`, both light and dark
- [x] Wire `next/font/google` for Playfair Display and Inter
- [x] Add `npm run lint:copy` to fail the build on em-dashes and en-dashes
- [x] Security headers and a per-request nonce CSP in `middleware.ts`
- [x] CI runs copy lint, typecheck, tests, build, and audit (`.github/workflows/ci.yml`)

### Phase 1: Database (mostly done)

- [x] Write `docs/ERD.md`, derived from `database/schema.sql`
- [x] Write `database/schema.sql` in 3NF with indexes and foreign keys
- [x] Write `database/seed.sql`: 1 admin, 3 branches, 10 realistic cars
- [x] Build `lib/db.ts` as a single pooled `mysql2/promise` instance
- [x] `npm run db:setup` creates the database and loads schema and seed
- [x] Confirm the booking overlap index supports the locking query (covering range scan, see `docs/ERD.md` section 5)

### Phase 2: Auth and session (mostly done)

- [x] Argon2id hashing helpers (`lib/auth/hash.ts`)
- [x] `jose` sign and verify, access plus refresh tokens (`lib/auth/tokens.ts`)
- [x] `httpOnly` `Secure` `SameSite=Lax` cookie helpers (`lib/auth/cookies.ts`)
- [x] `POST /api/auth/register` and `POST /api/auth/login` with zod validation
- [x] `POST /api/auth/logout` and `GET /api/auth/me`
- [x] `POST /api/auth/refresh` with rotation and reuse detection (`refresh_tokens` table)
- [x] Rate limiting on auth routes (`lib/auth/rate-limit.ts`)
- [x] CSRF double-submit token on state-changing admin routes
- [x] `requireSession` and `requireAdmin` guards (`lib/auth/guards.ts`)

### Phase 3: Design system in code (mostly done)

- [x] `Button` with variants
- [x] `Field` with label, error slot, italic placeholder
- [x] `Card` built on `border-t` (`components/ui/Card.tsx`)
- [x] `Toast` system
- [x] Fixed gridlines and paper grain layers
- [x] Z-index scale in `lib/constants.ts`
- [x] Verify every component at radius 0 and in both colour schemes (computed in a browser, Phase 9)

### Phase 4: The intro sequence (done in code)

Specification is `docs/VIDEO_STATE_MACHINE.md`.

- [x] `scripts/build-video-assets.mjs`: poster stills, MP4 and WebM, two sizes
- [x] Video variants and posters committed to `public/videos` and `public/posters`
- [x] `useIntroMachine` as a pure reducer, unit tested with no DOM
- [x] `BootLoader`, `VideoStage`, `AuthGate`, `IntroSequence`
- [x] Recovered path: reduced motion, media error, stall, returning visitor
- [x] Verify on a throttled connection (Phase 9)
- [ ] Verify on iOS Safari and Android Chrome (needs physical devices, see Phase 9)

### Phase 5: Car catalog (done)

- [x] `GET /api/cars` with filters, `GET /api/cars/:id`, availability endpoint
- [x] Catalog page with `searchParams` filters, car detail page
- [x] Empty and error states

### Phase 6: Booking engine (done in code)

- [x] Haversine distance service, unit tested
- [x] Pricing service, unit tested
- [x] Availability service with `SELECT ... FOR UPDATE` locking
- [x] `POST /api/bookings` as one transaction across booking, delivery, payment
- [x] Checkout page
- [x] Concurrency test passes against a real MySQL 8

### Phase 7: Payment simulation and post-booking (done)

- [x] Mock card and UPI payment UI, labelled as simulated
- [x] Confirmation page
- [x] `pdfkit` invoice at `GET /api/bookings/:id/invoice`, authorisation in the query
- [x] Customer bookings dashboard with delivery tracking

### Phase 8: Admin (done)

- [x] Dashboard, fleet management, booking transitions, delivery lifecycle
- [x] Every admin route behind `requireAdmin`; status changes checked against a transition graph

---

### Phase 10: Close the gaps (done 2026-10-05)

- [x] Add `POST /api/auth/refresh`: verify refresh cookie, rotate both tokens, 401 on failure; client retries once on 401 (`lib/api-client.ts`)
- [x] Write `docs/ERD.md` from `database/schema.sql`
- [x] Extract a shared `Card` component and use it in catalog and admin (and the customer bookings list)
- [x] Run against a real MySQL 8 (`npm run db:setup`), then `npm run test:db` so the double-booking test runs instead of skipping
- [x] Smoke test in the browser: register, log in, intro, catalog, book, invoice, admin status change (`npm run smoke`)
- [x] Car photography: labelled "Photograph pending" slots (`components/ui/CarPhoto.tsx`); seed `image_url` is `NULL`, picsum removed from seed and CSP
- [x] Photographs of the ten seeded cars in `public/cars/` (Phase 12): Creative Commons photos of each model, composited onto the film's studio. Real photos of D4Drive's own cars can replace them through the admin fleet page.

Found and fixed while closing the gaps:

- [x] `scripts/db-setup.mjs` had a syntax error (`'\'` instead of `'\\'`), so `npm run db:setup` had never run
- [x] Double-booking test leaked a booking into the next test; it now clears before each test
- [x] Invoices returned 500 in production builds (`pdfkit` bundled without its font files); `serverExternalPackages`
- [x] Editing a car in admin wiped its photo and description (fields had no default values)
- [x] `?next=` on `/login` was an open redirect

### Phase 11: Port the Vite intro effects (done 2026-10-05)

Source: `reference/vite-intro/` (read its `REFERENCE.md` first). Target: `components/intro/`.
Keep `docs/VIDEO_STATE_MACHINE.md` as the contract; extend it, do not break it.

- [x] Port the WebGL2 particle stage into `components/fx/` with the reduced-motion and no-WebGL fallbacks (both verified in a browser)
- [x] `AuthGate`: on successful login, dissolve the panel's type into particles instead of a plain fade
- [x] Landing reveal: scatter the film's last frame into the landing content
- [ ] Optional: logo spin loader in `BootLoader`, if a carmine-palette logo clip exists. **Blocked:** the only clip (`reference/vite-intro/public/media/logo-spin.mp4`) is solid gold metal, which `DESIGN.md` forbids as a fill. Needs a carmine render of the mark from the owner.
- [x] Catalog cards assemble from particles on first view (data still from the API); CSS failsafe keeps them visible without JS
- [x] Recolour everything to `DESIGN.md` (carmine accent, gold hairline only), rupees, no em-dashes
- [x] Update `docs/VIDEO_STATE_MACHINE.md` (section 10, `CLEAR_ERROR`, corrected `POSTER_TIME`) and unit tests (`CLEAR_ERROR`, authenticated skip, particle helpers)
- [x] Delete ported files from `reference/vite-intro/`. The folder keeps only the blocked logo loader and its media; delete it once that is decided
- [x] Fix `AuthGate` register mode: it has no mobile field and submits to the login endpoint, so registering from the gate always fails
- [x] Send `ALREADY_AUTHENTICATED`: the contract's signed-in skip of the gate was never wired up
- [x] Video dimming animated `filter`; now an opacity scrim
- [x] VideoStage re-registered every listener on each render (unstable callbacks)

### Phase 9: Hardening (done 2026-10-05, except real-device checks)

Every number below was measured in the cloud sandbox against `next start` on
MySQL 8.0.46, with headless Chromium 140. The scripts are kept in the repo
(`npm run smoke`, `npm run check:leaks`); the one-off audit scripts are
described in the CHANGELOG entry for this date.

- [x] Full pre-merge checklist (`DESIGN.md` section 10) across every page. Mechanical items verified in a browser or by grep: zero dashes, radius 0 computed on every element in both schemes, one charcoal band, axe-clean contrast in light and dark, no CTA wraps, labels above inputs with error and helper slots, italic descender clearance, hero two lines at 320 to 1920px with a 16-word subtext and `pt-24`, eyebrows within budget, reduced motion collapses every transform (CSS plus `MotionConfig`), no scroll listeners, no `h-screen`, no div fakes or hand-rolled SVG (only the sanctioned grain), every effect cleans up, loading, empty, and error states present, grain fixed and `pointer-events-none`. "At least 4 layout families across 8 sections" does not apply: the landing has three sections.
- [x] Lighthouse: LCP under 2.5s, INP under 200ms, CLS under 0.1. With real throttling (`--throttling-method=devtools`, Slow 4G, 4x CPU) LCP is 1.6 to 1.7s on `/`, `/cars`, `/cars/1`, `/login`; CLS at most 0.002; desktop LCP 0.6 to 0.7s. Lighthouse's default simulated mode reports 2.4 to 3.0s on mobile because it estimates from the post-hydration script graph; measured LCP equals FCP on every page. INP has no Lighthouse lab metric, so Event Timing was recorded during real typing, select, and submit interactions at 4x CPU: worst 80ms (gate submit while the dissolve starts). Accessibility 100 on every page measured.
- [x] Responsive pass at 375, 768, 1024, and 1600 (plus 320 and 360 for the nav): no horizontal overflow, no wrapped CTA, one-line nav, on all 11 pages
- [x] Keyboard-only navigation of the intro and the booking flow: 12 checks, including the gate's focus trap in both directions, Enter to submit, nothing reachable behind the film (`inert`), single tab stops on cards and Reserve, visible focus rings, and a booking completed without a mouse
- [x] Screen reader pass on forms and the auth gate, automated: axe-core (WCAG 2.1 AA plus best practice) clean on the gate open, after a failed sign-in, and in register mode with field errors, and on every page in both colour schemes; the accessibility tree shows every field named by its label and every error as its own alert
- [ ] Screen reader pass with a real screen reader (VoiceOver, NVDA, TalkBack). **Cannot be done in the sandbox:** no assistive technology runs headless. The automated pass above is the substitute until someone runs it.
- [x] Verify no error response leaks a stack trace or SQL fragment (`npm run check:leaks`: 37 hostile requests with the database up, again with it stopped, and every authenticated page against a dead database)
- [x] Throttled network: Slow 4G reaches the gate in 2.2s; Fast 3G takes the recovered path at the 6s ceiling; Slow 3G reaches the recovered landing in 11.4s (the script bundle's own arrival). Never a stuck loader.
- [ ] Device check: iOS Safari and Android Chrome. **Cannot be done in the sandbox:** needs physical devices or a device cloud. `playsInline`, `min-h-[100dvh]`, and the reduced-motion path are in place for exactly these.
- [ ] Particle frame cost on a real GPU. **Cannot be measured here:** the sandbox renders WebGL with SwiftShader on the CPU, where card assembly adds about 500ms of TBT on desktop `/cars` (0ms with particles off). On a GPU the draw cost is negligible; confirm on a device. Captures are already queued one at a time on idle and card grain is coarsened to 2.5px.

Found and fixed in this phase:

- [x] `next lint` (deprecated, removed in Next 16) replaced by the ESLint CLI with a flat `eslint.config.mjs`; ESLint now runs in CI (2026-10-07)

- [x] `npm audit --audit-level=high` failed (9 high). Production now has 0: Next 15.5.27, `sharp` and friends updated, nested PostCSS lifted by an `overrides` entry. The 5 left are dev-only (`braces` under `eslint-config-next`, no patched release), so CI gates on `--omit=dev` and prints the full audit as information
- [x] Gridlines sat at sixths of an unpadded box; now drawn by the content's own 12-column grid at column 1, 5, 9 starts and column 12 end, shown from 1024px
- [x] `Button` link variant animated `width`; now `scaleX`. Named transition properties replace `transition-all`
- [x] `<Link><Button>` nested a button in an anchor; new `ButtonLink` renders one element
- [x] `/favicon.ico` 404; generated `app/icon` (D4 on carmine) also served at `/favicon.ico`
- [x] Hero headline ran to four lines; now two at every width, the tagline moved into the subtext
- [x] Reduced motion had no manual play control; "Play the film" opens a native dialog with controls
- [x] Landing links were reachable by Tab behind the film; now `inert` until the reveal
- [x] Without JavaScript the boot loader covered the landing forever; a `<noscript>` style hides the intro layers
- [x] The charcoal band set its emphasis in gold; the success toast used a gold border as a state signal. Both gone
- [x] Dark mode: carmine text measured 2.4:1; text and focus rings use `--accent-text` (#E66256, same hue) in dark only
- [x] `--muted` measured 4.42:1 on taupe panels; `.surface-panel` remaps it (4.91:1)
- [x] Motion's JS animations ignored reduced motion; `MotionConfig reducedMotion="user"`
- [x] Field errors on the dark gate were carmine on charcoal; now paper with the carmine underline
- [x] Mobile nav overlapped the wordmark at 375px
- [x] Card photos and placeholders inside links repeated the car name to screen readers; now decorative there
- [x] Route ids accepted `0x10`, `1e3`, and `1e20`; strict `parsePositiveId` everywhere
- [x] Admin status changes could race; compare-and-set updates, invalid transitions now 409
- [x] Admin car with an unknown branch returned 500; now 400. Duplicate registration on edit now 409
- [x] No loading states; `loading.tsx` on every data route
- [x] Unused font weights preloaded; Playfair 400 and Inter 400/500 only
- [x] Particle captures embedded a dozen unused font subsets; latin faces only, captures queued on idle
- [x] The boot loader's floor and ceiling counted from hydration; now from navigation start
- [x] Checkout accepted a return date before pickup without saying so; inline error added

---

## Open decisions

- **Typeface:** Phase 12 replaced Playfair Display with Fraunces (the reference system's serif: light weights at poster size) and uses Six Caps in place of Humane, whose licence could not be confirmed. Swap back by changing `app/layout.tsx` if the brief needs Playfair.
- **Fleet photo colours:** two cars (Thar, Virtus GT) are red; no usable neutral photo of those exact models existed. Replace with the owner's own photos when available.
- **Hidden scrollbar:** the reference system hides it site-wide; kept, with the back-to-top keycap. Easy to restore in `globals.css` if users miss it.

- **Express tier:** `ARCHITECTURE.md` asks whether the course rubric needs a visibly separate Express server. **Still unanswered and deliberately not decided by an agent.** Every API route is a thin handler over `lib/services/*`, so lifting them into Express later is mechanical.
- **Dark-mode accent text:** `DESIGN.md` holds carmine constant in dark mode, but carmine text on the dark ground measures 2.4:1. Text and focus rings use `#E66256` (same hue) in dark only; fills stay `#A82519`. Confirm or replace.
- **Hero copy:** the headline is now "Delivered to your door." with "Drive easy, book smart." in the subtext, to meet the two-line cap. Confirm the wording.
- **Logo loader:** needs a carmine render of the mark, or a decision to drop it.
- **`EDRD.md` vs `DESIGN.md`:** EDRD is the original brief (gold accent). `DESIGN.md` supersedes it (carmine accent). Follow `DESIGN.md`.

---

## Summary (2026-10-05)

### What was done this session

On branch `integrate/combine-frontends`, three commits, one per phase:

1. **Phase 10, close the gaps.** Refresh-token rotation with reuse detection
   and a client that retries once on 401; `docs/ERD.md` with the measured
   overlap query plan; shared `Card`; labelled photo slots instead of random
   stock images. The first real MySQL run surfaced and fixed four latent bugs
   (db:setup never ran, a leaky test, invoices 500ing in production builds,
   admin edits wiping photos) and an open redirect.
2. **Phase 11, the Vite intro effects.** WebGL2 particle stage in
   `components/fx/`; the gate's type dissolves on sign-in, the film's last
   frame scatters into the landing, catalog cards assemble on view. CSS
   fallbacks for reduced motion, no WebGL2, and no JavaScript. Fixed the
   gate's broken register mode and wired the signed-in skip.
3. **Phase 9, hardening.** Measured Lighthouse, INP, responsive, keyboard,
   axe in both colour schemes, error leaks with the database up and down, and
   throttled networks, then fixed 24 issues they and the checklist surfaced
   (listed under Phase 9).

Verification at the end: `lint`, `lint:copy`, `typecheck`, `npm test`
(38 pass, 2 skipped without MySQL), `test:db` (45 pass), `build`,
`npm audit --omit=dev` (0), `smoke` (35 browser checks), `check:leaks`.

### What is left

| Item | Why it is not done | Who |
|---|---|---|
| Review and merge PR #23 | Pushed 2026-10-07; agents do not merge their own work to `main` | Owner |
| Review and merge PR #24 (Phase 12) | Stacked on PR #23; merge #23 first | Owner |
| Own photos of the fleet | The current ones are Commons photos of the same models | Owner, optional |
| Film scrubbing on real phones | Needs devices | Owner or a device cloud |
| Logo spin loader | Only a gold render of the mark exists | Owner |
| iOS Safari, Android Chrome | Needs physical devices | Owner or a device cloud |
| VoiceOver, NVDA, TalkBack pass | Needs a real screen reader | Owner |
| Particle cost on a real GPU | Sandbox WebGL is CPU-rendered | Owner, on any laptop |
| Express tier | Course-rubric decision | Owner (Open decisions) |
| Confirm dark accent tint and hero copy | Design decisions taken under stated assumptions | Owner (Open decisions) |
| Dev-only `braces` advisory | No patched release exists | Watch the informational CI audit |
