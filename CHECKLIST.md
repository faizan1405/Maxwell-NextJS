# Amahle Blue — Delivery Checklist

**Project:** Amahle Blue E-Commerce Website  
**Built with:** Next.js 15, MongoDB Atlas, Vercel  
**Handover date:** June 2026

---

## Infrastructure

- [x] Production domain live: https://www.amahle-blue.co.za
- [x] www redirect live: https://amahle-blue.co.za → www
- [x] HTTPS working on both domains
- [x] Vercel auto-deploy from GitHub `master` branch
- [x] MongoDB Atlas connected (0.0.0.0/0 in IP allowlist for Vercel)
- [x] Sitemap live: https://www.amahle-blue.co.za/sitemap.xml
- [x] Robots.txt live: https://www.amahle-blue.co.za/robots.txt

---

## Storefront — Customer Journey

- [x] Homepage loads: hero, products, trust strip, about, reviews, contact, FAQ
- [x] Shop page: product grid, category filter, search
- [x] Product cards: image, name, price, variants, stock badge, low-stock warning
- [x] Add to cart (guest and logged-in)
- [x] Cart: item list, quantities, subtotal, delivery estimate, coupon code
- [x] Checkout: address form, COD / EFT payment selection, order placement
- [x] Coupon validation: active/inactive, expiry, usage limits, per-customer limits
- [x] Order confirmation page: order number, items, total, payment-specific instructions
- [x] EFT confirmation: bank details displayed, proof of payment upload link
- [x] COD confirmation: delivery info displayed
- [x] Guest checkout (no login required)

---

## Customer Authentication

- [x] Sign in button opens auth modal
- [x] Email OTP request sends 6-digit code (expires 10 minutes)
- [x] OTP verify: timing-safe compare, atomic consumed flag (no double-use)
- [x] Session cookie set (HTTP-only) after successful OTP
- [x] Session restore on page reload
- [x] Logout clears session
- [x] Account page: profile, order history, order status
- [x] Customer can cancel pending orders from account page

---

## Admin Panel

- [x] Admin login at /admin with JWT session
- [x] Dashboard: order counts, revenue summary, low-stock alerts
- [x] Orders: list, filter by status, search
- [x] Order detail: items, totals, customer info, status workflow
- [x] COD order workflow: Place → Confirm → Process → Dispatch → Deliver → Cash collected
- [x] EFT order workflow: Awaiting Payment → Confirm Payment → Process → Dispatch → Deliver
- [x] Proof of payment viewable in admin
- [x] Admin can reject payment and request correction (triggers customer email)
- [x] Tracking number + carrier entry on dispatch
- [x] Order cancellation (restores stock automatically)
- [x] Product management: add, edit, delete, activate/deactivate
- [x] Product variants: per-variant price and stock
- [x] Stock management: manual adjustment, deduction on order, restore on cancel
- [x] Category management: add, edit, reorder, activate/deactivate
- [x] Coupon management: percentage and fixed-amount, expiry, usage limits
- [x] Shipping rate management: by province, fallback rate, free shipping threshold
- [x] Customer list: view, order history
- [x] Reviews management: add, edit, activate/deactivate
- [x] FAQ management: add, edit, reorder, activate/deactivate
- [x] Newsletter subscribers: view list
- [x] Settings: bank details (EFT), COD fee, contact details

---

## Email Notifications

- [x] COD order: customer confirmation email
- [x] EFT order: customer confirmation email with bank details
- [x] EFT order: admin notification email
- [x] EFT payment confirmed: customer confirmation email
- [x] EFT payment rejected: customer email with reason
- [x] EFT payment correction requested: customer email
- [x] Order dispatched: customer email with tracking number
- [x] OTP sign-in: code delivery email
- [x] All email templates: HTML-escaped (XSS-safe)
- [x] Fallback: Resend → Gmail SMTP → dev log

---

## Policy Pages

- [x] Delivery Policy: https://www.amahle-blue.co.za/delivery-policy
- [x] Returns & Refunds: https://www.amahle-blue.co.za/returns-refunds
- [x] Privacy Policy: https://www.amahle-blue.co.za/privacy-policy
- [x] Terms & Conditions: https://www.amahle-blue.co.za/terms-conditions
- [x] Policy links in footer
- [x] Policy links in mobile menu
- [x] "Last updated: June 2026" on all policy pages
- [x] Back-to-top button on all policy pages

---

## SEO & Meta

- [x] Page title and description set for all routes
- [x] Per-route metadata for policy pages and FAQ (generateMetadata)
- [x] Open Graph tags (title, description, image)
- [x] Twitter card tags
- [x] Canonical URLs pointing to www.amahle-blue.co.za
- [x] Sitemap includes homepage + all policy pages
- [x] Non-production deployments blocked from indexing (robots: noindex)
- [x] JSON-LD: Organisation and WebSite schema in layout

---

## Security

- [x] Admin JWT signed with secret (HTTP-only, Secure, SameSite=Strict)
- [x] Customer OTP session: HTTP-only cookie
- [x] OTP: timing-safe hash compare, atomic consumed flag
- [x] Write-time sanitization on order POST (name, address, notes strip `<>`)
- [x] HTML escaping in all email templates
- [x] XSS protection on order confirmation page
- [x] Newsletter subscription: rate-limit + input validation
- [x] API routes validate required fields and reject bad input

---

## Mobile

- [x] Responsive layout on all screen sizes
- [x] Mobile navigation drawer: categories + policies + auth
- [x] Touch-friendly buttons and inputs
- [x] Cart and checkout usable on mobile

---

## Known Limitations

- The storefront is a client-rendered SPA. All store routes (`/shop`, `/cart`, `/faq`, etc.) serve the same HTML shell — rich per-route metadata (title, description) is only available for the policy pages and FAQ, which use `generateMetadata` in the catch-all route.
- No card payment gateway integrated. Payment methods are COD and EFT only.
- No automated courier integration. Tracking numbers are entered manually by admin.
- EFT proof-of-payment is manually verified by admin — no automated bank statement matching.

---

*Checklist generated: June 2026*
