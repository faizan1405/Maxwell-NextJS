# Amahle Blue - Complete Project Documentation
*Prepared for Non-Technical & Technical Stakeholders*

---

## 1. Project Overview
**Amahle Blue** is a modern, full-stack e-commerce web application built specifically to sell premium cleaning and car care products. It is designed to be extremely fast, beautiful, and user-friendly. 

Instead of using an expensive platform like Shopify or WooCommerce, this project is a "custom-built" solution using Next.js. This gives the business 100% control over the design, speed, and database without paying monthly subscription fees to third-party e-commerce platforms.

### Project Statistics
* **Total Files:** ~120
* **Total Folders:** ~38
* **HTML Files:** 0 *(Next.js dynamically generates HTML using JavaScript)*
* **CSS/SCSS Files:** 39
* **JavaScript Files:** ~66
* **TypeScript Files:** 0
* **React Components:** ~28
* **Next.js Pages:** 2 main entry points (Storefront and Admin Panel) which dynamically render sub-pages.
* **API Routes:** 15 (Products, Orders, Carts, Reviews, Settings, Shipping, Categories, FAQs, Coupons, Upload, Proof, Auth, Customer Auth, Customers, Seed-Demo)
* **Database Models:** 11
* **Images/Assets:** 14
* **Configuration Files:** ~5 (`package.json`, `next.config.js`, `vercel.json`, etc.)

---

## 2. PROJECT MIND MAP
```text
Amahle Blue E-Commerce
├── Frontend (Next.js / React)
│   ├── Storefront (Customer facing)
│   │   ├── Home / Hero / Features
│   │   ├── Shop / Product Grid
│   │   ├── Cart & Checkout
│   │   └── Customer Account (Orders, Profile)
│   └── Admin Panel (Business facing)
│       ├── Dashboard (Stats & Revenue)
│       ├── Products & Categories Management
│       ├── Orders & Shipping Management
│       ├── Customer Database
│       └── System Settings & Coupons
├── Backend (Next.js API Routes)
│   ├── Products API
│   ├── Orders API
│   ├── Carts API (Guest & Logged in)
│   ├── Customers API
│   ├── Reviews API
│   ├── Categories API
│   ├── Coupons API
│   ├── FAQs API
│   ├── Shipping Rates API
│   ├── Settings API
│   ├── Image Upload API
│   ├── Proof of Payment (PoP) Upload API
│   ├── Admin / Customer Authentication API
│   └── Seed Demo API (admin/dev utility — upserts demo products on demand)
├── Database (MongoDB)
│   ├── Collections: Products, Orders, Customers, Carts
│   ├── Collections: Categories, Coupons, FAQs, Reviews, Settings, ShippingRates
│   └── Tracking: StockHistory, Abandoned Carts
├── Authentication
│   ├── JWT (JSON Web Tokens)
│   ├── Admin Login
│   └── Customer Login/Registration
├── Payments
│   └── Manual EFT / Proof of Payment system
└── Deployment
    ├── Hosting: Vercel
    └── Storage: Vercel Blob (for image uploads)
```

---

## 3. Folder Structure
The codebase is organized cleanly to separate the frontend visuals from the backend logic.

```text
Maxwell-NextJS/
├── data/                      # Static seed data bundled with serverless functions via import
│   └── maxwell-products.json  # 20 demo products across 5 categories
├── scripts/                   # Standalone Node scripts (local use only, not deployed)
│   └── seed-products.mjs      # Local DB seeder (blocked by Atlas IP allowlist locally)
├── next.config.js             # Next.js config — SPA path rewrites for storefront pages
├── vercel.json                # Vercel config — headers and targeted API rewrites
└── src/
    ├── app/                   # Next.js App Router
    │   ├── admin/             # Admin Panel entry (layout.js + page.js)
    │   ├── api/               # Backend API routes (15 routes — one file per resource)
    │   ├── layout.js          # Root HTML shell
    │   └── page.js            # Storefront entry point
    ├── components/            # React UI components
    │   ├── admin/             # Admin Panel pages (Dashboard, Products, Orders, etc.)
    │   ├── store/             # Storefront pages (Hero, Shop, Cart, Checkout, Account)
    │   └── ui/                # Shared micro-components (Icons, index re-exports)
    ├── lib/                   # Shared server + client utilities
    │   ├── auth.js            # JWT helpers — sign and verify admin/customer tokens
    │   ├── db.js              # DB bootstrap: connect + seed demo products on cold start
    │   ├── email.js           # Email utility (transactional emails, future use)
    │   ├── models.js          # Central re-export of all Mongoose models
    │   ├── mongoose.js        # MongoDB connection with global cache (prevents reconnects)
    │   └── storeContext.js    # Storefront global state — cart, user, active page
    ├── models/                # Mongoose schemas (11 total)
    │   ├── Product.js / Order.js / Customer.js / Cart.js
    │   ├── Category.js / Coupon.js / Faq.js / Review.js
    │   └── Setting.js / ShippingRate.js / StockHistory.js
    ├── scripts/               # One-off data migration utilities (src-local)
    │   └── migrateData.js
    └── styles/                # SCSS design system (39 files)
        ├── _global.scss       # Site-wide base styles
        ├── _mixins.scss       # Reusable SCSS mixins
        ├── _variables.scss    # Design tokens (colors, spacing, fonts)
        ├── main.scss          # SCSS entry point — imports all partials
        ├── admin/             # Admin Panel page styles
        │   └── components/    # Reusable admin UI styles (modals, buttons, badges, etc.)
        └── store/             # Storefront page styles
```

---

## 4. Website Flow
**How a user experiences the website from start to finish:**
1. **Discovery:** The user lands on the Homepage. `storeContext.js` loads the products from the database in the background.
2. **Browsing:** The user navigates to the Shop page. They filter by "Car Care" or "Household". 
3. **Selection:** The user clicks "Add to Cart" on a product. The `CartContext` remembers this instantly, updating the little number on the cart icon.
4. **Checkout:** The user opens the cart and clicks Checkout. They enter their shipping details.
5. **Payment:** The user is instructed to pay via EFT (Electronic Funds Transfer) and uploads a screenshot of their Proof of Payment (PoP).
6. **Order Placement:** The system creates an Order in the database, marks it as "pending", and empties the cart.
7. **Fulfillment (Admin):** The business owner logs into the Admin Panel, sees the new order, verifies the PoP image, packs the box, and marks the order as "Shipped".

---

## 5. Frontend Architecture
* **What it does:** Controls everything the user sees and interacts with.
* **Which files control it:** The `src/components/store/` folder and `src/styles/store/` folder.
* **How it works:** It uses React to create interactive pieces (like a cart that slides out smoothly without reloading the page) and SCSS to paint those pieces with colors and animations. 
* **Dependencies involved:** `react`, `react-dom`, `next`.

---

## 6. Backend Architecture
* **What it does:** Acts as the middleman between the frontend website and the database. It enforces security, calculates totals, and saves information.
* **Which files control it:** The `src/app/api/` folder.
* **How it works:** When the frontend needs data (e.g., "Give me all products"), it sends a request to the backend. The backend checks if the request is safe, asks the database for the data, and sends it back to the frontend.

---

## 7. Database Structure
* **What it does:** Permanently stores all business data so it isn't lost when the server restarts.
* **Which files control it:** The `src/models/` folder and `src/lib/mongoose.js`.
* **How it works:** It uses MongoDB (a NoSQL database) to store "Documents". The database has clear blueprints (Schemas) ensuring that every Order has a total price, and every Product has a name.

---

## 8. Authentication System
* **What it does:** Verifies that a user is who they say they are. Keeps customers out of the admin panel.
* **Which files control it:** `src/lib/auth.js` and the `api/auth/` and `api/customer-auth/` routes.
* **How it works:** When someone logs in, they are given a secure, encrypted digital "ticket" (JWT - JSON Web Token). Every time they try to view their orders or change a setting, the system checks if their ticket is valid.

---

## 9. Payment System
* **What it does:** Handles how the business gets paid.
* **Which files control it:** `Checkout process` in `CartComponents.js` and `api/proof/route.js`.
* **How it works:** This system does not use automated credit card gateways (like Stripe). Instead, it uses a manual EFT process. The customer uploads an image of their bank transfer receipt. The image is saved to Vercel Blob Storage, and attached to the order for the Admin to verify manually.

---

## 10. Cart System
* **What it does:** Remembers what the user wants to buy.
* **Which files control it:** `src/lib/storeContext.js` (CartProvider).
* **How it works:** It stores cart items locally on the user's browser (Local Storage) so if they close the tab and come back, their items are still there. It also automatically syncs "Abandoned Carts" to the backend to track missed sales.

---

## 11. Order Management
* **What it does:** Tracks what was sold, to whom, and where it is in the delivery process.
* **Which files control it:** `src/components/admin/OrdersPage.js` and `src/app/api/orders/route.js`.
* **How it works:** An order moves through statuses: `pending` -> `processing` -> `shipped` -> `delivered`. The admin can update these statuses, which updates the customer's account view.

---

## 12. Admin Panel
* **What it does:** The private dashboard for the business owner to run the company.
* **Which files control it:** The entire `src/components/admin/` folder.
* **How it works:** It is a fully secured, separate application built inside the same codebase. It allows the owner to create products, upload images, manage stock levels, view financial reports, and handle shipping fees.

---

## 13. Product Management
* **What it does:** Controls the digital inventory.
* **Which files control it:** `src/components/admin/ProductsPage.js` and `api/products/route.js`.
* **How it works:** Admins can add products, set prices, define sizes/variants (e.g., 500ml vs 5L), track stock levels, and upload product photos.

---

## 14. Customer Flow
* **What it does:** Allows users to create accounts, save addresses, and view order history.
* **Which files control it:** `src/components/store/AccountPage.js` and `api/customers/route.js`.
* **How it works:** Customers can check out as "Guests" or create an account. If they check out as a guest and later create an account with the same email, their past orders are automatically linked.

---

## 15. Third-Party Integrations
* **Vercel:** Hosts the website so it is live on the internet.
* **Vercel Blob:** Stores all the uploaded images (product photos, proof of payment receipts).
* **MongoDB Atlas:** Hosts the database in the cloud.

---

## 16. Environment Variables
* **What it does:** Secret keys that act as passwords for the website to talk to third-party services.
* **Crucial Variables:**
  * `MONGODB_URI`: The connection string to the database.
  * `JWT_SECRET`: A complex secret password used to encrypt login tickets.
  * `BLOB_READ_WRITE_TOKEN`: The password allowing the website to upload images to Vercel.

---

## 17. Security Features
* **Authentication:** Passwords are mathematically scrambled (hashed) before saving.
* **Route Protection:** Backend APIs reject requests that don't have a valid Admin token.
* **Sanitization:** The backend cleans user input to prevent hackers from injecting malicious code into the database.

---

## 18. Potential Risks
* **Manual Payments:** Because payments rely on uploaded images, a malicious user could upload fake receipts. Admins must verify the money actually cleared in the bank account.
* **Database Dependency:** If the MongoDB connection string breaks, the website will lose access to products and orders. *(Note: A fallback mechanism was added to the storefront to show default products if the database fails, ensuring the site never looks broken).*

---

## 19. Technical Debt
* **Shared Styles:** Some SCSS files are very large and complex. If the design needs a complete overhaul in the future, it may take time to untangle the custom CSS.
* **Manual Routing:** The storefront uses a custom `setPage()` React state system to switch between "Home", "Shop", and "Checkout" without actually changing the Next.js physical page routes. While fast, it makes SEO (Search Engine Optimization) harder for individual product pages.

---

## 20. Missing Features
* Automated Credit Card / PayFast / Yoco integration.
* Automated Email Notifications (e.g., "Your order has shipped").
* Search Engine Optimization (SEO) for individual products.

---

## 21. Recommended Improvements
1. **Automated Emails:** Integrate a service like Resend or SendGrid so customers get an automated receipt when they order.
2. **Payment Gateway:** Integrate PayFast or Yoco to eliminate the manual EFT verification step, reducing admin workload.
3. **Dynamic Routing:** Refactor the frontend to use Next.js dynamic routes (`/product/[id]`) so Google can index every product individually.

---

# Maintenance & Operations

## How to Maintain This Project
* **Content:** All products, pricing, and stock can be changed via the Admin Panel at `/admin`. No coding required.
* **Code:** Do not update `package.json` dependencies randomly. Test locally before updating major libraries like Next.js or React to avoid breaking changes.

## How to Deploy This Project
1. Go to Vercel.com and connect your GitHub repository.
2. In the Vercel dashboard, go to Settings > Environment Variables.
3. Add your `MONGODB_URI`, `JWT_SECRET`, and `BLOB_READ_WRITE_TOKEN`.
4. Click Deploy. Vercel will automatically build and publish the site.

## What Will Break If Changed
* **Database Schemas (`src/models/`):** If you change the spelling of a field (e.g., changing `price` to `amount` in `Product.js`), the entire frontend will crash when trying to read the price.
* **API Endpoints:** The frontend relies strictly on endpoints like `/api/carts`. Changing the folder name will break the cart system.
* **Auth Tokens:** Changing the `JWT_SECRET` will immediately log out every single customer and admin.

## Quick Start Guide For New Developers
1. Clone the repository to your local machine.
2. Ensure you have Node.js installed.
3. Run `npm install` to download dependencies.
4. Create a `.env` file in the root directory and add the necessary environment variables (`MONGODB_URI`, `JWT_SECRET`).
5. Run `npm run dev` to start the local development server at `http://localhost:3000`.
6. **Key Files to Know:** Start reading from `src/lib/storeContext.js` to understand how data moves, then look at `src/components/store/ContentSections.js` to see how the UI is built.

---

## Session Notes — 2026-06-12: Add 20 Demo Products

### Goal
Seed 20 demo products across all 5 categories (4 per category): household, industrial, car, car-exterior, sanitiser.

### Files Added / Changed
* **`data/maxwell-products.json`** (new) — 20 product objects with placeholder images from `placehold.co`. Fields: `id`, `name`, `cat`, `price`, `was`, `size`, `rating`, `reviews`, `badge`, `img`, `desc`, `benefits[]`, `sku`, `stock`, `media[]`, `status`.
* **`scripts/seed-products.mjs`** (new) — Standalone Node script that parses `.env.local`, connects to MongoDB Atlas, and upserts products by `id`. Run with `node scripts/seed-products.mjs`. Useful for local seeding once MongoDB Atlas IP allowlist permits.
* **`src/lib/db.js`** (modified) — Seed logic changed from "insert only when DB is empty" to `bulkWrite` with `$setOnInsert` + `upsert: true` keyed on the product `id`. Existing products are never overwritten; only missing demo products get inserted on app boot.

### Architecture Notes
* Products live in **MongoDB Atlas**, not Vercel. Vercel only runs the Next.js app code that talks to MongoDB.
* The JSON file is the *seed source*. The actual persistent storage is the `products` collection in MongoDB.
* The seed runs inside `seedDatabase()` which is called from `dbConnect()` only when a new Mongoose connection is first established (cached connections skip it). On Vercel serverless, this fires on each cold start.

### Issues Encountered (in chronological order)

1. **Local seed script blocked by DNS / MongoDB Atlas IP allowlist.**
   `node scripts/seed-products.mjs` got `querySrv ECONNREFUSED _mongodb._tcp.cluster0.xxx.mongodb.net`. The local machine could not resolve the MongoDB Atlas SRV record. Worked around by deploying to Vercel and letting the app's `dbConnect()` run the seed.

2. **All API calls returning 500 with `MongooseServerSelectionError` after deploy.**
   MongoDB Atlas's IP Access List did not include Vercel's dynamic IPs. Cause: Vercel serverless functions hit different IPs on every cold start.
   **Fix:** MongoDB Atlas → Network Access → Add IP Address → **Allow Access from Anywhere** (`0.0.0.0/0`).

3. **`/shop` returning 404 after deploy.**
   The previous `vercel.json` had a `/(.*)->index.html` rewrite that was intercepting API calls. A separate cleanup commit (`c5c9889`) removed that and moved SPA path rewrites (`/shop`, `/cart`, `/checkout`, `/account`, `/faq`, `/order-confirmed`) into `next.config.js`.
   **Lesson:** when `vercel.json` has a `rewrites` array, it runs at CDN level **before** Next.js. A greedy wildcard rewrite there will eat all routes including API calls. Keep route rewrites in `next.config.js` and reserve `vercel.json` for headers + targeted API rewrites only.

4. **Seed not running on git-triggered deployments.**
   `vercel deploy --prod` from the CLI uploads local files (including untracked ones), but Vercel's GitHub integration only sees what's *committed*. The `data/maxwell-products.json` file was untracked, so git-triggered redeploys had no JSON to seed from — `fs.existsSync(jsonPath)` returned `false` and the seed silently skipped.
   **Fix:** Committed `data/` and `scripts/` to git (commit `6bde2a4`) and pushed to `master`.

### Verification Steps
1. Wait for Vercel git-triggered deployment to finish (~1-2 min per push).
2. Hit `/api/seed-demo?secret=<SEED_SECRET>` once to force-run the upsert.
3. Refresh `/shop` — products appear (4 per category × 5 categories = 20 demos).
4. Check MongoDB Atlas → Browse Collections → `products` to confirm documents.

### Issues 5–7 (later in the session)

5. **`fs.readFileSync` silently failed on Vercel.**
   After committing `data/maxwell-products.json` to git, the seed *still* did not run on Vercel and emitted no logs. Root cause: Next.js serverless functions only package files reachable via static `import` / `require`. The JSON file was in the git repo but was never copied into the deployed function bundle, so `fs.existsSync(jsonPath)` returned `false` and the seed skipped without warning.
   **Fix:** Replaced `fs.readFileSync` with `import demoProducts from '../../data/maxwell-products.json'`. Webpack/Turbopack then bundles the file with the function.

6. **`dbConnect` cache-once pattern hides seed errors.**
   `seedDatabase()` runs only when a new Mongoose connection is established. Once the connection is cached in `global.mongoose`, every subsequent request returns early and the seed never re-runs. If the first cold-start seed silently fails, no later request can recover. Hard to debug because errors are caught and only logged — and Vercel logs sometimes do not surface every `console.log`.
   **Mitigation:** Added an explicit `GET /api/seed-demo?secret=<SEED_SECRET>` endpoint that runs the same upsert on demand and returns the `bulkWrite` result JSON (`upsertedCount`, `matchedCount`, `totalProductsInDB`) or the error/stack. Made debugging instant instead of guessing from missing logs.

7. **Path alias `@/` is not configured in this project.**
   The new seed-demo route initially used `@/lib/db` imports. Build failed with "Module not found: Can't resolve '@/lib/db'" because there is no `jsconfig.json` / `tsconfig.json` mapping `@/` to `src/`. Other API routes use relative paths.
   **Fix:** Use relative imports (`../../../lib/db`, `../../../models/Product`) to match the project's existing convention.

### Resolution
Final commit chain: `75f1dc4` (static import) → `12bbdd8` (one-shot endpoint) → `c173654` (path-alias fix). After the last deployment went READY, hitting `/api/seed-demo?secret=<SEED_SECRET>` returned `{success:true, jsonCount:20, upsertedCount:20, totalProductsInDB:21}`. Shop now shows all 4 products per category across 5 categories.

### Important Operational Reminders (additional)
* **Static imports for any runtime data on Vercel.** If a serverless function needs to read a file at runtime, `import` it. Do not use `fs.readFileSync` on project files — they will not be in the function bundle.
* **Build a debug endpoint before chasing silent caches.** When a one-time bootstrap (seed, migration, cache warm) is supposed to run but produces no logs, do not keep redeploying and waiting. Add an explicit endpoint that runs the operation on demand and returns the result. Five extra minutes of code saves an hour of guesswork.
* **No `@/` path alias here.** Use relative imports in new files.

### Important Operational Reminders
* **`vercel deploy --prod` vs git push** — CLI deploys upload local working-tree files. Git pushes only deploy committed files. If something works after a CLI deploy but breaks after a git-triggered redeploy, untracked files are the prime suspect.
* **MongoDB Atlas IP allowlist** must include `0.0.0.0/0` (or Vercel's IP ranges) for serverless functions to connect.
* **Demo products** are identified by `id` prefix `demo-`. To remove all demo data, run `db.products.deleteMany({ id: /^demo-/ })` in MongoDB.

---
*Documentation End.*
