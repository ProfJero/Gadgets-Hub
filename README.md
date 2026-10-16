# Gadgets Hub · Where Tech Meets Trust

A mobile-first e-commerce platform for laptops and accessories, built for Ghana.
**Stack:** React + Vite + Tailwind · Firebase (Auth, Firestore, Hosting) · Cloudinary (images) · Paystack (MoMo & cards).

> The older static HTML prototype is kept in `Gadgets Hub/` for reference. The live app is everything at the repo root.

## What's inside

**Storefront (customers)**
- Fast, app-like mobile UI with a bottom tab bar, sticky "Buy now" bar and swipeable galleries.
- Instant search with typo tolerance ("lenevo" still finds Lenovo), plus recent and popular searches.
- Filters: price band, condition (Brand New / UK-Used / Refurbished), brand, RAM, SSD, processor, use-case and in-stock.
- **Laptop Finder** quiz (use, budget, condition, priority), **side-by-side compare**, wishlist and recently viewed items.
- Product pages show a delivery estimate for the chosen region, warranty, returns, verified reviews, "complete your setup" accessories and "notify me when back in stock".
- **One-page checkout** with guest checkout, Ghana phone validation and network detection (MTN/Telecel/AT), all 16 regions, GhanaPost GPS, saved addresses, store pickup and promo codes.
- Payments: **Paystack** (MoMo + cards), **manual MoMo transfer** (customer enters the transaction ID) and **pay on delivery** (with a configurable maximum).
- Order tracking by order number + phone, a printable receipt, WhatsApp support everywhere, and a data-saver mode for mobile data.
- Account area: orders, addresses, profile and wishlist. Installable as an app (PWA manifest); the offline cache keeps pages working on patchy data.

**Admin (`/admin`)**
- Dashboard: today and month revenue, a 7/30/90-day sales chart, top sellers, sales by region, low stock and recent orders.
- Orders: status tabs, search, CSV export, one-tap status progression, WhatsApp/call the customer with pre-written messages, payment controls, internal notes, timeline and a printable invoice. Confirming an order **deducts stock**; cancelling it **restores** stock.
- Products: Cloudinary drag-and-drop multi-upload, reorder images, specs, highlights, cost price → profit margin, inline stock edits, bulk publish/hide/delete, duplicate and CSV export.
- Also: categories, inventory (stock value, receive stock, restock requests), customers (registered + guest buyers, lifetime value, block), review moderation, coupons, homepage banners, flash sale with countdown, and featured brands.
- **Staff & roles:** the owner adds minor admins (Admin / Manager / Sales staff presets, or custom permissions: products, orders, customers, marketing, reports, settings, staff). Staff can be suspended or removed. An **activity log** records who did what.
- Settings: store info, delivery fee + ETA per region, free-delivery threshold, pickup, payment methods, Cloudinary and policies.

Permissions are enforced by **Firestore security rules** (`firestore.rules`), not only by the UI. They are covered by 57 automated tests (`tests/`).

## Setup (one time)

1. **Install:** `npm install`
2. **Firebase console** (project `gadgets-hub-c4fac`):
   - Authentication → Sign-in method → enable **Email/Password** and **Google**.
   - Authentication → Settings → Authorized domains → add your live domain.
   - Create a Firestore database (production mode).
3. **Deploy the security rules:** `npx firebase login` then `npm run deploy:rules`
4. **Cloudinary:** Settings → Upload → *Add upload preset* → **Signing mode: Unsigned**. You'll enter the cloud name and preset name in Admin → Settings → Integrations (or in `.env.local`, see `.env.example`).
5. **Run locally:** `npm run dev`
6. **Become the owner:** register on the site, then open **`/setup`** and click *Claim store ownership*. This works once only; the first claim wins.
7. In **Admin → Settings**, set your phone/WhatsApp, delivery fees, MoMo number, and Paystack **public** key (`pk_live_…`). Then add products, or click *Load demo catalogue* on the dashboard to try things out.
8. **Go live:** `npm run deploy` (build + Firebase Hosting).

## Notes & recommended next steps
- **Verifying Paystack payments:** online payments are marked paid from the browser callback, so staff should confirm the reference in the Paystack dashboard before dispatch (the order page prompts this). For automatic verification, add a Cloud Function webhook that calls Paystack's `/transaction/verify` with your **secret** key. This needs the Firebase Blaze plan.
- **Prices are re-checked against the live catalogue** at checkout. Staff confirm each order before stock is deducted, so a tampered total would be caught at confirmation. A server-side order function would make this airtight.
- Deleting a product doesn't delete its images from Cloudinary (that requires a signed API call). Clean up in the Cloudinary media library if needed.
- The demo catalogue uses Unsplash photos. Replace them with your own product photos before launch.

## Development
| Command | What it does |
| --- | --- |
| `npm run dev` | Dev server against the live Firebase project |
| `npm run emulators` + `npm run dev:emulators` | Fully local: Auth + Firestore emulators, no real data touched |
| `npm run test:rules` | Runs the security-rules test suite on the emulator |
| `npm run build` | Production build to `dist/` |
