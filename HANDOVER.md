# Amahle Blue — Client Handover Guide

**Website:** https://www.amahle-blue.co.za  
**Admin Panel:** https://www.amahle-blue.co.za/admin

---

## 1. Accessing the Admin Panel

Go to **https://www.amahle-blue.co.za/admin** and sign in with your admin username and password.

The admin panel is only accessible to authorised staff. Never share your credentials. If you need to add a new admin user, contact your developer.

---

## 2. Managing Orders

Orders arrive from two payment methods: **COD (Cash on Delivery)** and **EFT (Bank Transfer)**.

### COD Orders
1. Go to **Orders** in the admin panel.
2. Filter by status **"Order Placed"** to see new COD orders.
3. Confirm the order and contact the customer to arrange delivery.
4. Move the order through the workflow: **Order Placed → Confirmed → Processing → Dispatched → Delivered**.
5. When the driver collects cash, mark **Cash Collected** on the order.

### EFT Orders
1. Filter orders by status **"Awaiting Payment"** to see new EFT orders.
2. The customer uploads their proof of payment (POPviewer).
3. Verify the bank deposit against the order total.
4. If payment is confirmed: click **Confirm Payment** on the order. This marks it paid and triggers a confirmation email to the customer.
5. If there is a problem with the payment, use the **Request Correction** option to send the customer a message explaining what to fix.
6. Move through the same workflow: **Confirmed → Processing → Dispatched → Delivered**.

### Cancelling an Order
- You can cancel any order that has not yet been dispatched.
- Customers can self-cancel orders that are still in **"Order Placed"** or **"Awaiting Payment"** status.
- Cancelling an order automatically restores stock for those products.

### Adding a Tracking Number
When dispatching, enter the courier tracking number and carrier name in the order. The system sends an automated dispatch email to the customer with tracking details.

---

## 3. Managing Products

Go to **Products** in the admin panel.

### Adding a New Product
1. Click **Add Product**.
2. Fill in: Name, Category, Price, Description, Images.
3. If the product has variants (e.g. 500ml and 1L), enable variants and add each size with its own price and stock level.
4. Set the **Stock** quantity.
5. Toggle **Active** to make it visible in the shop.

### Editing a Product
1. Click the product name to open it.
2. Edit any field and save.
3. Prices update immediately on the live site.

### Managing Stock
- Update stock directly on the product or variant.
- When an order is confirmed, stock is automatically deducted.
- If an order is cancelled, stock is automatically restored.
- The **low stock threshold** (default: 10 units) triggers a warning badge in the shop to encourage customers to buy.

### Removing a Product
- Set the product to **Inactive** to hide it from the shop without deleting it.
- Only delete a product if you are sure it will never be sold again. Deleted products cannot be recovered from past orders.

---

## 4. Managing Categories

Go to **Categories** in the admin panel.

Categories appear in the navigation bar and filter the shop page. You can:
- Add a new category (name, slug, order)
- Rename an existing category
- Reorder categories using the display order field
- Hide a category by setting it inactive

Product categories must match what is set on each product. If you rename a category, update the products assigned to it.

---

## 5. Managing Coupons & Discounts

Go to **Coupons** in the admin panel.

### Creating a Coupon
1. Click **Add Coupon**.
2. Set the code (e.g. `SAVE10`), type (percentage or fixed amount), and value.
3. Optionally set: minimum order value, expiry date, maximum uses, maximum uses per customer.
4. Set the coupon to **Active**.

### Deactivating a Coupon
Toggle the coupon to **Inactive** to stop it from being used without deleting it. Deactivated coupons can be reactivated at any time.

---

## 6. Managing Shipping Rates

Go to **Shipping** in the admin panel.

Shipping rates are matched by province/region. You can:
- Add a new rate for a specific province
- Set a rate for "All" provinces as a fallback
- Enable free shipping above a certain order value
- Deactivate a rate to remove it

The system picks the most specific matching rate for each order. If no specific match is found, the fallback "All" rate is used.

---

## 7. Managing FAQs

Go to **FAQs** in the admin panel.

- Add new questions and answers
- Edit existing entries
- Reorder FAQs using the order field
- Deactivate FAQs to hide them without deleting

FAQs appear on the FAQ page on the website and on the homepage FAQ section.

---

## 8. Managing Reviews

Go to **Reviews** in the admin panel.

Customer reviews appear on the homepage. You can:
- Add reviews manually (name, rating, text, product name)
- Edit or remove reviews
- Hide reviews by setting them inactive

---

## 9. Managing Newsletter Subscribers

Go to **Newsletter** in the admin panel.

This shows customers who signed up for your newsletter from the website. You can export the list for use in your email marketing platform (e.g. Mailchimp, MailBlaze).

---

## 10. Managing Customers

Go to **Customers** in the admin panel.

This shows all customers who have placed orders or created an account. You can view their order history and contact details.

---

## 11. Settings

Go to **Settings** in the admin panel.

### Bank Details (for EFT)
Update your bank account details here. These appear in EFT confirmation emails and on the order confirmation page. Keep these accurate at all times.

- Bank name
- Account holder name
- Account number
- Branch code
- Account type (e.g. Cheque / Current)

### COD Fee
If you charge a fee for Cash on Delivery orders, set it here. Set to 0 for no fee.

### Contact Details
Update your phone number and email address shown on the website.

---

## 12. Customer Accounts & OTP Login

Customers log in using their email address — no password required. The system sends a 6-digit one-time code to their email that expires in 10 minutes.

Customers can:
- View their order history
- See order status and tracking
- Cancel pending orders

You do not need to create customer accounts manually — they are created automatically when a customer places an order or signs in.

---

## 13. Policy Pages

The following policy pages are live on the website. To update the content of these pages, contact your developer:

| Page | URL |
|------|-----|
| Delivery Policy | https://www.amahle-blue.co.za/delivery-policy |
| Returns & Refunds | https://www.amahle-blue.co.za/returns-refunds |
| Privacy Policy | https://www.amahle-blue.co.za/privacy-policy |
| Terms & Conditions | https://www.amahle-blue.co.za/terms-conditions |

---

## 14. Contact & Support

For technical issues with the website or admin panel, contact your developer.

For domain/hosting questions, contact your domain provider and Vercel (vercel.com).

For email delivery issues (OTP not arriving, order emails not sending), check:
1. The spam/junk folder
2. That your email API key (Resend) is valid and active
3. That your FROM email domain is verified in Resend

---

*Last updated: June 2026*
