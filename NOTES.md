# Amahle Blue — Project Notes

**Brand:** Amahle Blue &nbsp;|&nbsp; **Type:** Next.js E-Commerce &nbsp;|&nbsp; **Purpose:** Sell premium cleaning & car care products online

🌐 **Production:** https://www.amahle-blue.co.za

---

## 🗺️ Project Mind Map

```
Amahle Blue Website
├── Customer Storefront
│   ├── Home, Shop, Product Details
│   ├── Cart (guest + logged-in)
│   └── Checkout / Order Confirmation
│
├── Customer Account
│   ├── Email OTP Login
│   ├── Session Restore
│   └── Logout
│
├── Admin Panel
│   ├── Dashboard
│   ├── Orders (COD + EFT management)
│   ├── Products & Categories
│   ├── Inventory & Stock
│   ├── Customers, Reviews, FAQs
│   └── Shipping, Coupons, Settings
│
├── Payments
│   ├── COD — Cash on Delivery
│   └── EFT — Manual Bank Transfer + proof upload
│
├── Backend
│   ├── MongoDB Atlas (11 models)
│   ├── API Routes (15 routes)
│   ├── Admin Auth (JWT)
│   └── Customer Auth (Email OTP, HTTP-only session cookie)
│
└── Deployment
    ├── Vercel (project: maxwell-nextjs)
    ├── GitHub master branch
    └── amahle-blue.co.za (+ www)
```

---

## ✅ Phase Status

| Phase | Status | Focus |
|-------|--------|-------|
| Phase 1 | ✅ Complete | Foundation — storefront, admin, DB, basic checkout |
| Phase 2 | ✅ Complete | Production hardening — OTP auth, COD/EFT, stock, email, invoices |
| Phase 3A | ✅ Complete | XSS patch, cart low-stock badge restore |
| Phase 3B | 🔲 Next | Customer polish, business pages, invoice UI, mobile UX, handover |

---

## ✅ Completed Features

- Customer storefront (home, shop, product details, cart)
- Guest checkout — no forced login
- Email OTP login + session restore + logout
- COD payment flow
- EFT payment flow + proof-of-payment upload
- Order confirmation page
- Admin panel (dashboard, orders, products, categories, stock, customers, coupons, FAQs, shipping, settings)
- Order status management (pending → processing → shipped → delivered)
- COD cash collected / outstanding tracking
- EFT manual approval flow
- Product variants / sizes with per-variant pricing and stock
- Stock deduction on order, restore on cancel
- Low-stock warnings (variant-specific)
- Category management (dynamic from DB)
- Invoice / print bill
- MongoDB Atlas connected
- Vercel production deployment

---

## ⚠️ Important Rules

- **Do not rebuild.** Phase 1, 2, and 3A must not be broken.
- **Guest checkout must stay working.** Do not force login before placing an order.
- **COD and EFT are the only payment methods.** No card/gateway.
- **Admin panel is working.** Preserve all admin logic.
- **Phase 3 = small safe changes only.** Fix confirmed issues only.
- Always use `useAuth()` hook for session token in admin modals — never read from `localStorage` directly.
- Categories are dynamic from DB — never hardcode the category list.
- Use relative imports — no `@/` path alias configured in this project.
- MongoDB Atlas must have `0.0.0.0/0` in IP allowlist for Vercel to connect.

---

## 📁 Folder Structure

```
Maxwell-NextJS/
├── data/maxwell-products.json     # Demo product seed (imported, not read via fs)
├── public/assets/ & thumbs/       # Static images
├── scripts/                        # DB index scripts (local use)
└── src/
    ├── app/
    │   ├── [...store]/page.js      # Storefront catch-all route
    │   ├── admin/                  # Admin SPA entry (layout + page)
    │   ├── api/                    # 15 API routes
    │   │   ├── auth/ (logout, me, otp/request, otp/verify, route)
    │   │   ├── orders, products, categories, carts
    │   │   ├── customers, shipping, settings, proof
    │   │   └── coupons, faqs, reviews, newsletter, upload, seed-demo
    │   ├── layout.js, page.js
    │   └── robots.js, sitemap.js
    ├── components/
    │   ├── admin/                  # 15 admin page components
    │   ├── store/                  # 11 storefront components
    │   └── ui/                     # Icons, shared exports
    ├── lib/
    │   ├── auth.js                 # Admin JWT helpers
    │   ├── customerAuth.js         # Customer OTP + session helpers
    │   ├── db.js                   # MongoDB connection + demo seed
    │   ├── email.js                # Resend email sender
    │   ├── models.js               # Mongoose model re-exports
    │   ├── mongoose.js             # Connection pool
    │   ├── seo.js                  # Metadata helpers
    │   └── storeContext.js         # Global store state (cart, user, shipping)
    ├── models/                     # 11 Mongoose schemas
    │   └── Product, Order, Customer, Cart, Category, Coupon,
    │       Faq, Review, Setting, ShippingRate, StockHistory
    ├── utils/
    │   ├── accounting.js, currency.js, invoice.js
    └── scripts/                    # DB health-check + stock fix utilities
```

---

## 🚀 Current Production Info

| | |
|---|---|
| **Domains** | https://www.amahle-blue.co.za · https://amahle-blue.co.za |
| **Platform** | Vercel — project `maxwell-nextjs` |
| **Database** | MongoDB Atlas — connected |
| **Master HEAD** | `3a0e94b` — XSS patch on order confirm + cart low-stock badge |
| **Build status** | ✅ READY |
| **Admin panel** | ✅ Working |

> Full deployment history and bug fix details → see `memory/` MD files.

---

## ➡️ Next Step

**Phase 3B** — customer UI polish, business/policy pages, invoice design, mobile UX, footer/navigation improvements, and client handover preparation.
