# System Architecture

## 1. Tech Stack
- **Frontend:** HTML5, CSS3, Vanilla JS, Bootstrap 5 (Client-side rendering, served statically by Express).
- **Backend:** Node.js, Express.js.
- **Database:** MySQL (relational, 3rd Normal Form).
- **Libraries:** `express`, `mysql2`, `bcryptjs`, `jsonwebtoken`, `dotenv`, `cors`, `multer` (image uploads), `pdfkit` (invoices).

## 2. Directory Structure
```text
D4Drive/
├── package.json
├── server.js
├── .env
├── config/ (db.js)
├── middleware/ (auth, admin, error handlers)
├── routes/ (API route definitions)
├── controllers/ (Req/Res logic)
├── services/ (Business logic: pricing, distance, availability)
├── utils/ (Helpers, validators)
├── database/ (schema.sql, seed.sql)
├── uploads/ (Stored images)
└── public/
    ├── css/, js/, assets/
    ├── index.html, login.html, cars.html, booking.html
    └── admin/ (Dashboard HTML files)