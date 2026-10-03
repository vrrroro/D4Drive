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

## 3. UI/UX Requirements
- **Landing Page Hook:** A cinematic opening film (logo → car reveal → login → particle dissolve) leads into the site. *(Built — see `README.md`.)*
- **Styling:** Luxury / editorial design system defined in `EDRD.md` (alabaster, charcoal, gold; Playfair Display + Inter; 0px radii). This replaces the original Bootstrap navy/blue theme.
- **Responsiveness:** Flawless mobile, tablet, and desktop views.
- **Feedback:** Use Toast notifications for all async actions (booking, login, errors). Loading states on all buttons.