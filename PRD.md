# Product Requirements Document (PRD) - D4Drive

## 1. Overview
**Name:** D4Drive (Drive Easy. Book Smart. Delivered to You.)
**Type:** Online Car Rental Booking & Doorstep Delivery System
**Target Audience:** Customers (Renters) and Administrators (Staff)

## 2. Core Features

### Customer Features
- **Account & Auth:** Register, login securely (JWT), view profile.
- **Car Catalog:** Browse, search, and filter cars (brand, fuel, price, seats).
- **Booking Engine:** Select dates, check real-time availability (no double booking).
- **Delivery System:** Choose self-pickup or doorstep delivery. Calculate distance using Haversine formula (0-5km free, 5-10km ₹100, 10-15km ₹200, >15km unavailable).
- **Checkout:** Price calculation (Days × Rate + Delivery), mock payment gateway (Card/UPI).
- **Post-Booking:** Generate PDF invoice, view active/past bookings, track delivery status.

### Admin Features
- **Dashboard:** Stats on revenue, active bookings, fleet status.
- **Fleet Management:** Add, edit, soft-delete (deactivate) cars.
- **Booking Management:** View all bookings, update statuses (Pending -> Confirmed -> Active -> Completed/Cancelled).
- **Delivery Management:** Update delivery lifecycle (Pending -> Out for Delivery -> Delivered).


## 3. Entry Experience (the product's first impression)

The site does not open on a homepage. It opens on a sequence.

1. **Loader.** Alabaster ground, the `D4Drive` wordmark, and a progress rule
   filling left to right. The rule is driven by the hero film's real buffered
   progress, not a timer, so it never reports a number that is not true.
2. **Reveal.** Once enough of the film has buffered, the loader fades out over
   700ms onto the film's first frame, held paused.
3. **Gate.** A login panel fades up over the frozen frame.
4. **Release.** On successful authentication the panel fades out and the film
   resumes from where it was held.
5. **Arrival.** When the film ends, it transitions into the landing content.

The film features a crimson Porsche, and the site's entire accent palette is
drawn from it, so the asset and the interface read as one object.

Full specification, including autoplay policy, reduced motion, stalled networks,
and returning visitors, is in `docs/VIDEO_STATE_MACHINE.md`.

## 4. UI/UX Requirements
- **Entry sequence:** See section 3. It is the single strongest moment in the product and is specified separately.
- **Styling:** Luxury editorial. Warm alabaster ground, rich charcoal ink, carmine accent drawn from the hero film. Zero border radius. Full system in `DESIGN.md`.
- **Responsiveness:** Flawless mobile, tablet, and desktop views.
- **Feedback:** Use Toast notifications for all async actions (booking, login, errors). Loading states on all buttons.