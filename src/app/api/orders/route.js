/**
 * API Route: /api/orders
 *
 * Handles order lifecycle management:
 *   POST   — Create a new customer order (validate cart, compute totals, debit coupon, send emails).
 *   GET    — Fetch orders. Admins receive all orders; customers receive only their own.
 *   PATCH  — Update order/payment status (admin). Customers may cancel pending orders only.
 *
 * IMPORTANT: Email helper functions (sendCODEmail, sendEFTEmail, sendOrderConfirmedEmail, etc.)
 * are defined as hoisted async functions within THIS file and are NOT imported from lib/email.js.
 * They call the internal `sendEmail()` function which uses the Resend API.
 * Do not add stubs for them in lib/email.js.
 */
import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { connectToDatabase } from '../../../lib/mongoose';
import { Order, Product, Settings, Coupon, ShippingRate, StockHistory } from '../../../lib/models';
import { verifySession } from '../../../lib/auth';
import { verifyCustomerCookie } from '../../../lib/customerAuth';
import { formatZar } from '../../../utils/currency';

/* ── Next invoice + order number ─────────────────────────────────────────────── */
/**
 * Atomically increments the invoice and order number counters stored in
 * `global_settings`, then returns formatted human-readable identifiers.
 *
 * Counter storage: Settings document { key: 'global_settings', value: { invoiceCounter, orderCounter } }
 * Starting values: invoiceCounter=1000, orderCounter=10000 (seeded in db.js).
 *
 * Output formats:
 *   invoiceNumber → "INV-2025-1001"  (year + zero-padded 4-digit counter)
 *   orderNumber   → "#10001"         (plain incrementing number with # prefix)
 *
 */
async function nextInvoiceAndOrderNumber() {
  await Settings.updateOne(
    { key: 'global_settings' },
    {
      $setOnInsert: {
        key: 'global_settings',
        value: { invoiceCounter: 1000, orderCounter: 10000 },
      },
    },
    { upsert: true }
  );

  const doc = await Settings.findOneAndUpdate(
    { key: 'global_settings' },
    {
      $setOnInsert: { key: 'global_settings' },
      $inc: {
        'value.invoiceCounter': 1,
        'value.orderCounter': 1,
      },
    },
    { new: true, upsert: true, lean: true }
  );

  const invoiceCounter = Number(doc.value?.invoiceCounter);
  const orderCounter = Number(doc.value?.orderCounter);
  if (!Number.isFinite(invoiceCounter) || !Number.isFinite(orderCounter)) {
    throw orderPatchError('Order counters are not configured correctly.', 500);
  }
  const year = new Date().getFullYear();

  return {
    invoiceNumber: `INV-${year}-${String(invoiceCounter).padStart(4, '0')}`,
    orderNumber:   `#${orderCounter}`,
  };
}

/* ── Province-based shipping ─────────────────────────────────────────────────── */
/**
 * Resolves the shipping charge for an order using a priority-based lookup.
 *
 * Resolution priority (first match wins):
 *   1. Province-specific rate: country + region match (e.g., "South Africa" + "Gauteng").
 *   2. Country-wide rate: country match with no specific region and not the default rate.
 *   3. Default rate: the ShippingRate document flagged with isDefault=true.
 *   4. Legacy fallback: if no ShippingRate document matches, falls back to per-province
 *      rates stored in global_settings.shipping.provinceRates, then to the flat fee.
 *
 * Free shipping is applied when the subtotal meets or exceeds a rate's freeThreshold.
 *
 * @param {number} subtotal - Order subtotal (before delivery and COD fee).
 * @param {string} province - Customer's province/region (from address details).
 * @param {string} country  - Customer's country (from address details).
 * @returns {{ charge: number, name: string }} The shipping charge and display name.
 */
const SIMPLE_STATUS_FROM_DESCRIPTIVE = {
  'Order Placed': 'pending',
  'Awaiting Payment': 'pending',
  Confirmed: 'confirmed',
  Processing: 'processing',
  Dispatched: 'shipped',
  Delivered: 'delivered',
  Cancelled: 'cancelled',
};

const DESCRIPTIVE_STATUS_FROM_SIMPLE = {
  pending: null,
  confirmed: 'Confirmed',
  processing: 'Processing',
  packed: 'Processing',
  shipped: 'Dispatched',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
};

const ORDER_TRANSITIONS = {
  pending: new Set(['confirmed', 'cancelled']),
  confirmed: new Set(['processing', 'cancelled']),
  processing: new Set(['shipped', 'cancelled']),
  packed: new Set(['shipped', 'cancelled']),
  shipped: new Set(['delivered']),
  delivered: new Set([]),
  cancelled: new Set([]),
};

const DEDUCTED_STATES = new Set(['confirmed', 'processing', 'packed', 'shipped', 'delivered']);

function orderPatchError(message, status = 400) {
  const err = new Error(message);
  err.status = status;
  return err;
}

function normalizeOrderStatus(value) {
  if (!value) return '';
  return SIMPLE_STATUS_FROM_DESCRIPTIVE[value] || String(value).toLowerCase();
}

function describeOrderStatus(simple, prev) {
  if (simple === 'pending') {
    return (prev.paymentMethod === 'EFT' || prev.payment?.method === 'EFT') ? 'Awaiting Payment' : 'Order Placed';
  }
  return DESCRIPTIVE_STATUS_FROM_SIMPLE[simple] || simple;
}

function assertValidOrderTransition(prev, next, actorRole, isCustomerOnly) {
  const from = normalizeOrderStatus(prev.status || prev.orderStatus || 'pending');
  const to = normalizeOrderStatus(next);
  if (!ORDER_TRANSITIONS[from] || !ORDER_TRANSITIONS[from].has(to)) {
    throw orderPatchError(`Invalid order status transition: ${from} to ${to}.`, 400);
  }
  if (!isCustomerOnly && to === 'cancelled' && actorRole !== 'admin') {
    throw orderPatchError('Forbidden', 403);
  }
}

function actorName(session) {
  return session?.user?.username || session?.username || session?.email || 'system';
}

async function writeStockHistory(entry, session) {
  await StockHistory.create([{
    id: `stock_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    ...entry,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  }], { session });
}

async function deductOrderItemStock(order, item, session, performedBy) {
  const qty = Math.max(1, Number(item.qty) || 0);
  if (!item.productId || qty <= 0) return;

  const now = Date.now();
  const variation = item.variation ? String(item.variation) : '';
  let product;
  let previousStock;
  let newStock;

  if (variation) {
    product = await Product.findOne({ id: item.productId, 'variants.name': variation }).session(session).lean();
    if (!product) throw orderPatchError(`Insufficient stock for "${item.name || item.productId}" (${variation}).`, 400);

    const variant = product.variants?.find(v => v.name === variation);
    previousStock = Number(variant?.stock) || 0;
    newStock = previousStock - qty;

    const result = await Product.updateOne(
      {
        id: item.productId,
        stock: { $gte: qty },
        'variants.name': variation,
        'variants.stock': { $gte: qty },
        'variants.outOfStock': { $ne: true },
      },
      {
        $inc: { stock: -qty, 'variants.$.stock': -qty },
        $set: {
          updatedAt: now,
          outOfStock: (Number(product.stock) || 0) - qty <= 0,
          'variants.$.outOfStock': newStock <= 0,
        },
      },
      { session }
    );
    if (result.modifiedCount !== 1) {
      throw orderPatchError(`Insufficient stock for "${item.name || item.productId}" (${variation}).`, 400);
    }
  } else {
    product = await Product.findOne({ id: item.productId }).session(session).lean();
    if (!product) throw orderPatchError(`Insufficient stock for "${item.name || item.productId}".`, 400);

    previousStock = Number(product.stock) || 0;
    newStock = previousStock - qty;

    const result = await Product.updateOne(
      { id: item.productId, stock: { $gte: qty }, outOfStock: { $ne: true } },
      { $inc: { stock: -qty }, $set: { outOfStock: newStock <= 0, updatedAt: now } },
      { session }
    );
    if (result.modifiedCount !== 1) {
      throw orderPatchError(`Insufficient stock for "${item.name || item.productId}".`, 400);
    }
  }

  await writeStockHistory({
    productId: item.productId,
    variationName: variation || null,
    change: -qty,
    type: 'sale',
    reason: `Order ${order.orderNumber || order.id} stock deduction`,
    previousStock,
    newStock,
    performedBy,
  }, session);
}

async function restoreOrderItemStock(order, item, session, performedBy) {
  const qty = Math.max(1, Number(item.qty) || 0);
  if (!item.productId || qty <= 0) return;

  const now = Date.now();
  const variation = item.variation ? String(item.variation) : '';
  let product;
  let previousStock;
  let newStock;

  if (variation) {
    product = await Product.findOne({ id: item.productId, 'variants.name': variation }).session(session).lean();
    if (!product) throw orderPatchError(`Cannot restore stock for "${item.name || item.productId}" (${variation}).`, 400);

    const variant = product.variants?.find(v => v.name === variation);
    previousStock = Number(variant?.stock) || 0;
    newStock = previousStock + qty;

    const result = await Product.updateOne(
      { id: item.productId, 'variants.name': variation },
      { $inc: { stock: qty, 'variants.$.stock': qty }, $set: { outOfStock: false, 'variants.$.outOfStock': false, updatedAt: now } },
      { session }
    );
    if (result.modifiedCount !== 1) {
      throw orderPatchError(`Stock restoration failed for "${item.name || item.productId}" (${variation}).`, 400);
    }
  } else {
    product = await Product.findOne({ id: item.productId }).session(session).lean();
    if (!product) throw orderPatchError(`Cannot restore stock for "${item.name || item.productId}".`, 400);

    previousStock = Number(product.stock) || 0;
    newStock = previousStock + qty;

    const result = await Product.updateOne(
      { id: item.productId },
      { $inc: { stock: qty }, $set: { outOfStock: false, updatedAt: now } },
      { session }
    );
    if (result.modifiedCount !== 1) {
      throw orderPatchError(`Stock restoration failed for "${item.name || item.productId}".`, 400);
    }
  }

  await writeStockHistory({
    productId: item.productId,
    variationName: variation || null,
    change: qty,
    type: 'refund',
    reason: `Order ${order.orderNumber || order.id} stock restoration`,
    previousStock,
    newStock,
    performedBy,
  }, session);
}

async function persistOrderPatchWithInventory(prev, patch, adminSession) {
  const effectiveNewStatus = patch.status ?? prev.status;
  const statusActuallyChanged = patch.status !== undefined && patch.status !== prev.status;
  const shouldBeDeducted = DEDUCTED_STATES.has(effectiveNewStatus);
  const isCurrentlyDeducted = !!prev.stockDeducted;
  const shouldDeduct = statusActuallyChanged && shouldBeDeducted && !isCurrentlyDeducted;
  const shouldRestore = statusActuallyChanged && !shouldBeDeducted && isCurrentlyDeducted;

  if (!shouldDeduct && !shouldRestore) {
    const updated = await Order.findOneAndUpdate({ id: prev.id }, { $set: patch }, { new: true, lean: true });
    return updated || { ...prev, ...patch };
  }

  const session = await mongoose.startSession();
  let updated;
  try {
    await session.withTransaction(async () => {
      const current = await Order.findOne({ id: prev.id }).session(session).lean();
      if (!current) throw orderPatchError('Order not found', 404);
      if (current.status !== prev.status || !!current.stockDeducted !== isCurrentlyDeducted) {
        throw orderPatchError('Order changed while updating. Please reload and try again.', 409);
      }

      const performedBy = actorName(adminSession);
      for (const item of (current.items || [])) {
        if (shouldDeduct) await deductOrderItemStock(current, item, session, performedBy);
        if (shouldRestore) await restoreOrderItemStock(current, item, session, performedBy);
      }

      if (shouldDeduct) {
        patch.stockDeducted = true;
        if (current.status === 'cancelled' && current.couponId) {
          await Coupon.updateOne({ id: current.couponId }, { $inc: { usedCount: 1 }, $set: { updatedAt: Date.now() } }, { session });
        }
      }

      if (shouldRestore) {
        patch.stockDeducted = false;
        if (current.couponId) {
          await Coupon.updateOne({ id: current.couponId, usedCount: { $gt: 0 } }, { $inc: { usedCount: -1 }, $set: { updatedAt: Date.now() } }, { session });
        }
      }

      updated = await Order.findOneAndUpdate(
        { id: current.id, stockDeducted: isCurrentlyDeducted, status: current.status },
        { $set: patch },
        { new: true, lean: true, session }
      );
      if (!updated) throw orderPatchError('Order changed while updating. Please reload and try again.', 409);
    });
  } finally {
    await session.endSession();
  }

  return updated;
}

async function computeShipping(subtotal, province, country) {
  const rates = await ShippingRate.find({ status: 'active' }).lean();
  let rateObj = null;

  // Priority 1: exact province/region match
  if (country && province) {
    rateObj = rates.find(r => r.country === country && r.region && province.includes(r.region));
  }
  // Priority 2: country-wide rate with no specific region
  if (!rateObj && country) {
    rateObj = rates.find(r => r.country === country && !r.region && !r.isDefault);
  }
  // Priority 3: the catch-all default rate
  if (!rateObj) {
    rateObj = rates.find(r => r.isDefault);
  }

  if (rateObj) {
    if (rateObj.freeThreshold > 0 && subtotal >= rateObj.freeThreshold) return { charge: 0, name: rateObj.name };
    return { charge: rateObj.charge, name: rateObj.name };
  }

  // Priority 4: legacy province-rate fallback from global_settings (pre-ShippingRate era)
  const sDoc = await Settings.findOne({ key: 'global_settings' }).lean();
  const settings = sDoc?.value || {};
  const threshold = settings.shipping?.freeThreshold ?? 750;
  if (subtotal >= threshold) return { charge: 0, name: 'Standard Shipping' };
  const legacyRate = settings.shipping?.provinceRates?.[province] ?? (settings.shipping?.flatFee ?? 85);
  return { charge: legacyRate, name: 'Standard Shipping' };
}

/* ── Payment label ───────────────────────────────────────────────────────────── */
function payLabel(method) {
  return method === 'COD' ? 'Cash on Delivery' : method === 'EFT' ? 'EFT / Bank Transfer' : (method || '');
}

/**
 * Validates a South African mobile number.
 * Accepts formats: 067xxxxxxx, 0067xxxxxxx, +27xxxxxxx.
 * Strips spaces and dashes before testing. SA mobile prefixes: 06x, 07x, 08x.
 */
function isValidSaMobile(raw) {
  const digits = String(raw || '').replace(/[^\d+]/g, '');
  return /^(\+?27|0)[6-8]\d{8}$/.test(digits);
}

/* ════════════════════════════════════════════════════════════════════════════════
   EMAIL FUNCTIONS
   ════════════════════════════════════════════════════════════════════════════════ */

/**
 * Returns the Resend API credentials from environment variables.
 * RESEND_API_KEY — required for emails to be sent (set in .env.local / Vercel env).
 * FROM_EMAIL     — the "from" address shown to recipients. Defaults to a branded noreply.
 */
function emailEnv() {
  return {
    KEY:  process.env.RESEND_API_KEY,
    FROM: process.env.FROM_EMAIL || 'Amahle Blue <sales@amahle-blue.co.za>',
  };
}

/**
 * Core email sender. Calls the Resend API to deliver a transactional email.
 * Silently no-ops if RESEND_API_KEY is missing (e.g. in local dev without credentials).
 * Errors are logged but never thrown — email failures must not break order creation.
 *
 * @param {string|string[]} to - Recipient email address(es).
 * @param {string} subject     - Email subject line.
 * @param {string} html        - Full HTML email body.
 */
async function sendEmail(to, subject, html) {
  const { KEY, FROM } = emailEnv();
  if (!KEY || !to) return;
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method:  'POST',
      headers: { 'Authorization': `Bearer ${KEY}`, 'Content-Type': 'application/json' },
      body:    JSON.stringify({ from: FROM, to: Array.isArray(to) ? to : [to], subject, html }),
    });
    let payload = null;
    try { payload = await res.json(); } catch { payload = null; }
    if (res.ok && payload?.id) {
      console.log(`[orders] email sent id=${payload.id} subject="${subject}"`);
    } else {
      const errMsg = payload?.message || payload?.error || JSON.stringify(payload || {}).slice(0, 200);
      console.error(`[orders] email send failed status=${res.status} error="${errMsg}" subject="${subject}"`);
    }
  } catch (e) {
    console.error(`[orders] email network error subject="${subject}" message="${e.message}"`);
  }
}

function buildItemRows(order) {
  return (order.items || []).map(i =>
    `<tr>
      <td style="padding:10px 16px;border-bottom:1px solid #f1f5f9;font-size:14px;color:#334155;">${i.name}</td>
      <td style="padding:10px 16px;border-bottom:1px solid #f1f5f9;text-align:center;font-size:13px;color:#64748b;">${i.qty}</td>
      <td style="padding:10px 16px;border-bottom:1px solid #f1f5f9;text-align:right;font-size:14px;font-weight:700;color:#0B2545;">${formatZar(i.price * i.qty)}</td>
    </tr>`
  ).join('');
}

function buildTotalsTable(order) {
  const couponRow = (order.couponDiscount || 0) > 0
    ? `<tr><td style="padding:8px 16px;font-size:13px;color:#64748b;">Coupon (${order.couponCode})</td><td></td><td style="padding:8px 16px;text-align:right;font-size:13px;font-weight:600;color:#159A4C;">−${formatZar(order.couponDiscount)}</td></tr>`
    : '';
  const codFeeRow = (order.codFee || 0) > 0
    ? `<tr><td style="padding:8px 16px;font-size:13px;color:#64748b;">COD Fee</td><td></td><td style="padding:8px 16px;text-align:right;font-size:13px;font-weight:600;">${formatZar(order.codFee)}</td></tr>`
    : '';
  return `
    <tr><td style="padding:10px 16px;font-size:14px;color:#64748b;">Subtotal</td><td></td><td style="padding:10px 16px;font-size:14px;font-weight:600;text-align:right;">${formatZar(order.subtotal)}</td></tr>
    ${couponRow}
    <tr><td style="padding:10px 16px;font-size:14px;color:#64748b;">Delivery</td><td></td><td style="padding:10px 16px;font-size:14px;font-weight:600;text-align:right;color:${order.delivery===0?'#159A4C':'#0B2545'}">${order.delivery===0?'FREE':formatZar(order.delivery)}</td></tr>
    ${codFeeRow}
    <tr style="border-top:2px solid #e2e8f0;"><td style="padding:14px 16px;font-size:16px;font-weight:800;color:#0B2545;">Total</td><td></td><td style="padding:14px 16px;font-size:16px;font-weight:800;text-align:right;color:#1E50E0;">${formatZar(order.total)}</td></tr>
  `;
}

function emailWrapper(headerHtml, bodyHtml) {
  return `<!DOCTYPE html>
<html><head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width"/></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:Helvetica,Arial,sans-serif;">
<div style="max-width:560px;margin:40px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(11,37,69,.10);">
  ${headerHtml}
  <div style="padding:32px 40px;">${bodyHtml}</div>
  <div style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:18px 40px;text-align:center;">
    <p style="color:#94a3b8;font-size:12px;margin:0 0 4px;">Questions? Email us at <a href="mailto:info@amahle-blue.co.za" style="color:#1E50E0;">info@amahle-blue.co.za</a></p>
    <p style="color:#cbd5e1;font-size:11px;margin:0;">&copy; ${new Date().getFullYear()} Amahle Blue Cleaning Solutions &middot; Made in &#x1F1FF;&#x1F1E6;</p>
  </div>
</div>
</body></html>`;
}

async function sendCODEmail(order) {
  if (!order?.customer?.email) return;
  const firstName = (order.customer.name || 'there').split(' ')[0];
  const header = `<div style="background:linear-gradient(135deg,#159A4C,#047857);padding:32px 40px;text-align:center;">
    <p style="color:#bbf7d0;font-size:11px;letter-spacing:3px;text-transform:uppercase;margin:0 0 6px;">Amahle Blue</p>
    <h1 style="color:#fff;font-size:22px;font-weight:800;margin:0 0 6px;">Order Placed!</h1>
    <p style="color:#d1fae5;font-size:14px;margin:0;">Hi ${firstName}, your order has been placed successfully.</p>
  </div>`;
  const body = `
    <div style="background:#fef3c7;border:1px solid #fde68a;border-radius:10px;padding:16px 18px;margin-bottom:24px;">
      <p style="font-size:14px;font-weight:700;color:#92400e;margin:0 0 6px;">&#128181; Cash on Delivery</p>
      <p style="font-size:13px;color:#78350f;margin:0;line-height:1.5;">Please keep the required cash amount ready when your order is delivered. Our delivery team will collect payment on arrival.</p>
    </div>
    <div style="background:#eff6ff;border-radius:10px;padding:14px 18px;margin-bottom:24px;">
      <p style="font-size:13px;font-weight:700;color:#1E50E0;margin:0 0 3px;">${order.orderNumber} · ${order.invoiceNumber || ''}</p>
      <p style="font-size:12px;color:#64748b;margin:0;">Payment: Cash on Delivery · <span style="color:#d97706;font-weight:600;">Cash Payment Pending</span></p>
    </div>
    <table style="width:100%;border-collapse:collapse;margin-bottom:16px;border:1px solid #f1f5f9;border-radius:8px;overflow:hidden;">
      <thead><tr style="background:#f8fafc;">
        <th style="padding:9px 16px;text-align:left;font-size:11px;color:#64748b;font-weight:700;text-transform:uppercase;letter-spacing:1px;">Product</th>
        <th style="padding:9px 16px;text-align:center;font-size:11px;color:#64748b;font-weight:700;text-transform:uppercase;letter-spacing:1px;">Qty</th>
        <th style="padding:9px 16px;text-align:right;font-size:11px;color:#64748b;font-weight:700;text-transform:uppercase;letter-spacing:1px;">Total</th>
      </tr></thead>
      <tbody>${buildItemRows(order)}</tbody>
    </table>
    <table style="width:100%;border-collapse:collapse;margin-bottom:24px;background:#f8fafc;border-radius:8px;overflow:hidden;">
      ${buildTotalsTable(order)}
    </table>
    <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:14px 18px;margin-bottom:16px;">
      <p style="font-size:11px;font-weight:700;color:#15803d;text-transform:uppercase;letter-spacing:1px;margin:0 0 4px;">Delivery Address</p>
      <p style="font-size:14px;color:#166534;margin:0;">${order.address}</p>
    </div>
    ${order.notes ? `<p style="font-size:13px;color:#64748b;font-style:italic;margin:0;padding:12px 16px;background:#f8fafc;border-radius:8px;">Note: ${order.notes}</p>` : ''}
  `;
  await sendEmail(order.customer.email, `Order ${order.orderNumber} confirmed — Amahle Blue`, emailWrapper(header, body));
}

async function sendEFTEmail(order) {
  if (!order?.customer?.email) return;
  const firstName = (order.customer.name || 'there').split(' ')[0];
  const bank      = order.eftBankDetails || {};
  const ref       = order.eftReference   || order.orderNumber;

  const bankRows = [
    bank.accountHolder && `<tr><td style="padding:8px 16px;font-size:13px;color:#64748b;width:50%;">Account Holder</td><td style="padding:8px 16px;font-size:13px;font-weight:700;color:#0B2545;">${bank.accountHolder}</td></tr>`,
    bank.bankName      && `<tr><td style="padding:8px 16px;font-size:13px;color:#64748b;">Bank</td><td style="padding:8px 16px;font-size:13px;font-weight:700;color:#0B2545;">${bank.bankName}</td></tr>`,
    bank.accountNumber && `<tr><td style="padding:8px 16px;font-size:13px;color:#64748b;">Account Number</td><td style="padding:8px 16px;font-size:13px;font-weight:700;color:#0B2545;font-family:monospace;">${bank.accountNumber}</td></tr>`,
    bank.branchCode    && `<tr><td style="padding:8px 16px;font-size:13px;color:#64748b;">Branch Code</td><td style="padding:8px 16px;font-size:13px;font-weight:700;color:#0B2545;font-family:monospace;">${bank.branchCode}</td></tr>`,
    bank.accountType   && `<tr><td style="padding:8px 16px;font-size:13px;color:#64748b;">Account Type</td><td style="padding:8px 16px;font-size:13px;font-weight:700;color:#0B2545;">${bank.accountType}</td></tr>`,
    bank.swiftCode     && `<tr><td style="padding:8px 16px;font-size:13px;color:#64748b;">SWIFT Code</td><td style="padding:8px 16px;font-size:13px;font-weight:700;color:#0B2545;font-family:monospace;">${bank.swiftCode}</td></tr>`,
  ].filter(Boolean).join('');

  const header = `<div style="background:linear-gradient(135deg,#1E50E0,#0B2545);padding:32px 40px;text-align:center;">
    <p style="color:#7FC4FF;font-size:11px;letter-spacing:3px;text-transform:uppercase;margin:0 0 6px;">Amahle Blue</p>
    <h1 style="color:#fff;font-size:22px;font-weight:800;margin:0 0 6px;">Order Received!</h1>
    <p style="color:#bfdbfe;font-size:14px;margin:0;">Hi ${firstName}, please complete your EFT payment to confirm your order.</p>
  </div>`;
  const body = `
    <div style="background:#eff6ff;border-radius:10px;padding:14px 18px;margin-bottom:24px;">
      <p style="font-size:13px;font-weight:700;color:#1E50E0;margin:0 0 3px;">${order.orderNumber} · ${order.invoiceNumber || ''}</p>
      <p style="font-size:12px;color:#64748b;margin:0;">Payment: EFT / Bank Transfer · <span style="color:#d97706;font-weight:600;">Awaiting EFT Payment</span></p>
    </div>
    <div style="background:#fef3c7;border:1px solid #fde68a;border-radius:10px;padding:14px 18px;margin-bottom:16px;text-align:center;">
      <p style="font-size:11px;font-weight:700;color:#92400e;text-transform:uppercase;letter-spacing:1px;margin:0 0 6px;">Your Payment Reference</p>
      <p style="font-size:22px;font-weight:800;color:#1E50E0;margin:0 0 4px;font-family:monospace;">${ref}</p>
      <p style="font-size:12px;color:#78350f;margin:0;">Use this reference when making your EFT payment.</p>
    </div>
    ${bankRows ? `
    <div style="margin-bottom:24px;">
      <p style="font-size:11px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:1px;margin:0 0 8px;">Bank Details</p>
      <table style="width:100%;border-collapse:collapse;background:#f8fafc;border-radius:8px;overflow:hidden;"><tbody>${bankRows}</tbody></table>
      <div style="background:#1E50E0;color:#fff;padding:12px 16px;border-radius:8px;margin-top:8px;text-align:center;">
        <p style="font-size:13px;font-weight:700;margin:0;">Amount Payable: ${formatZar(order.total)}</p>
      </div>
    </div>` : ''}
    <p style="font-size:13px;color:#64748b;margin:0 0 24px;line-height:1.6;background:#f8fafc;border-radius:8px;padding:14px 16px;">
      Please use your order number as the payment reference. Your order will be processed after the payment has been verified.
      ${bank.instructions ? `<br/><br/><em>${bank.instructions}</em>` : ''}
    </p>
    <table style="width:100%;border-collapse:collapse;margin-bottom:16px;border:1px solid #f1f5f9;border-radius:8px;overflow:hidden;">
      <thead><tr style="background:#f8fafc;">
        <th style="padding:9px 16px;text-align:left;font-size:11px;color:#64748b;font-weight:700;text-transform:uppercase;letter-spacing:1px;">Product</th>
        <th style="padding:9px 16px;text-align:center;font-size:11px;color:#64748b;font-weight:700;text-transform:uppercase;letter-spacing:1px;">Qty</th>
        <th style="padding:9px 16px;text-align:right;font-size:11px;color:#64748b;font-weight:700;text-transform:uppercase;letter-spacing:1px;">Total</th>
      </tr></thead>
      <tbody>${buildItemRows(order)}</tbody>
    </table>
    <table style="width:100%;border-collapse:collapse;margin-bottom:24px;background:#f8fafc;border-radius:8px;overflow:hidden;">
      ${buildTotalsTable(order)}
    </table>
    <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:14px 18px;margin-bottom:16px;">
      <p style="font-size:11px;font-weight:700;color:#15803d;text-transform:uppercase;letter-spacing:1px;margin:0 0 4px;">Delivery Address</p>
      <p style="font-size:14px;color:#166534;margin:0;">${order.address}</p>
    </div>
  `;
  await sendEmail(order.customer.email, `Order ${order.orderNumber} received — please complete your EFT payment`, emailWrapper(header, body));
}

async function sendAdminEmail(order) {
  const to = process.env.ADMIN_EMAIL || process.env.FROM_EMAIL;
  if (!to) return;
  const header = `<div style="background:linear-gradient(135deg,#1E50E0,#0B2545);padding:28px 40px;text-align:center;">
    <h1 style="color:#fff;font-size:20px;font-weight:800;margin:0;">&#x1F6CD; New Order Received</h1>
    <p style="color:#bfdbfe;font-size:13px;margin:4px 0 0;">From ${order.customer?.name || 'a customer'}</p>
  </div>`;
  const body = `
    <div style="background:#eff6ff;border-radius:10px;padding:14px 18px;margin-bottom:20px;">
      <p style="font-size:14px;font-weight:700;color:#1E50E0;margin:0 0 3px;">${order.orderNumber} · ${order.invoiceNumber || ''}</p>
      <p style="font-size:12px;color:#64748b;margin:0;">${order.customer?.name} · ${order.customer?.email}${order.customer?.phone ? ` · ${order.customer.phone}` : ''}</p>
      <p style="font-size:12px;color:#64748b;margin:4px 0 0;">Payment: <strong>${payLabel(order.paymentMethod || order.payment?.method)}</strong> · <strong>${order.paymentStatus || order.payment?.status}</strong></p>
    </div>
    <table style="width:100%;border-collapse:collapse;margin-bottom:16px;border:1px solid #f1f5f9;border-radius:8px;overflow:hidden;">
      <thead><tr style="background:#f8fafc;">
        <th style="padding:9px 16px;text-align:left;font-size:11px;color:#64748b;">Product</th>
        <th style="padding:9px 16px;text-align:center;font-size:11px;color:#64748b;">Qty</th>
        <th style="padding:9px 16px;text-align:right;font-size:11px;color:#64748b;">Total</th>
      </tr></thead>
      <tbody>${buildItemRows(order)}</tbody>
    </table>
    <p style="font-size:15px;font-weight:800;color:#1E50E0;text-align:right;margin:0 0 12px;">Order Total: ${formatZar(order.total)}</p>
    <div style="background:#f8fafc;border-radius:8px;padding:12px 16px;">
      <p style="font-size:12px;color:#64748b;margin:0;">Delivery to: ${order.address}</p>
    </div>
  `;
  await sendEmail(to, `New Order ${order.orderNumber} — ${formatZar(order.total)} (${payLabel(order.paymentMethod || order.payment?.method)})`, emailWrapper(header, body));
}

async function sendOrderConfirmedEmail(order) {
  if (!order?.customer?.email) return;
  const firstName = (order.customer.name || 'there').split(' ')[0];
  const isCOD     = (order.paymentMethod || order.payment?.method) === 'COD';
  const header    = `<div style="background:linear-gradient(135deg,#1E50E0,#0B2545);padding:32px 40px;text-align:center;">
    <p style="color:#7FC4FF;font-size:11px;letter-spacing:3px;text-transform:uppercase;margin:0 0 6px;">Amahle Blue</p>
    <h1 style="color:#fff;font-size:22px;font-weight:800;margin:0 0 6px;">Order Confirmed!</h1>
    <p style="color:#bfdbfe;font-size:14px;margin:0;">Hi ${firstName}, your order has been confirmed and is being prepared.</p>
  </div>`;
  const body = `
    <div style="background:#eff6ff;border-radius:10px;padding:14px 18px;margin-bottom:20px;">
      <p style="font-size:13px;font-weight:700;color:#1E50E0;margin:0 0 3px;">${order.orderNumber}</p>
      <p style="font-size:12px;color:#64748b;margin:0;">Status: <span style="color:#2563eb;font-weight:600;">Confirmed</span> · Payment: <span style="color:#16a34a;font-weight:600;">${order.paymentStatus || 'Paid'}</span></p>
    </div>
    ${isCOD ? `<div style="background:#fef3c7;border:1px solid #fde68a;border-radius:10px;padding:14px 18px;margin-bottom:20px;">
      <p style="font-size:13px;font-weight:700;color:#92400e;margin:0 0 4px;">&#128181; Cash on Delivery</p>
      <p style="font-size:13px;color:#78350f;margin:0;line-height:1.5;">Please have <strong>${formatZar(order.total)}</strong> in cash ready when your order is delivered.</p>
    </div>` : ''}
    <p style="font-size:14px;color:#334155;line-height:1.6;margin:0 0 20px;">Your order has been confirmed and is being prepared for dispatch. We'll send you another email when it's on its way.</p>
    <div style="background:#f8fafc;border-radius:8px;padding:12px 16px;">
      <p style="font-size:12px;color:#64748b;margin:0;">Delivering to: ${order.address}</p>
    </div>
  `;
  await sendEmail(order.customer.email, `Order ${order.orderNumber} confirmed — Amahle Blue`, emailWrapper(header, body));
}

async function sendOrderDispatchedEmail(order) {
  if (!order?.customer?.email) return;
  const firstName = (order.customer.name || 'there').split(' ')[0];
  const isCOD     = (order.paymentMethod || order.payment?.method) === 'COD';
  const header    = `<div style="background:linear-gradient(135deg,#0E7490,#164E63);padding:32px 40px;text-align:center;">
    <p style="color:#a5f3fc;font-size:11px;letter-spacing:3px;text-transform:uppercase;margin:0 0 6px;">Amahle Blue</p>
    <h1 style="color:#fff;font-size:22px;font-weight:800;margin:0 0 6px;">&#x1F69A; Order Dispatched!</h1>
    <p style="color:#cffafe;font-size:14px;margin:0;">Hi ${firstName}, your order is on its way!</p>
  </div>`;
  const body = `
    <div style="background:#ecfeff;border-radius:10px;padding:14px 18px;margin-bottom:20px;">
      <p style="font-size:13px;font-weight:700;color:#0E7490;margin:0 0 3px;">${order.orderNumber}</p>
      <p style="font-size:12px;color:#64748b;margin:0;">Status: <span style="color:#0E7490;font-weight:600;">Dispatched</span></p>
    </div>
    ${isCOD ? `<div style="background:#fef3c7;border:1px solid #fde68a;border-radius:10px;padding:14px 18px;margin-bottom:20px;">
      <p style="font-size:13px;font-weight:700;color:#92400e;margin:0 0 4px;">&#128181; Cash Payment Reminder</p>
      <p style="font-size:13px;color:#78350f;margin:0;line-height:1.5;">Please have <strong>${formatZar(order.total)}</strong> in cash ready for the delivery driver.</p>
    </div>` : ''}
    <p style="font-size:14px;color:#334155;line-height:1.6;margin:0 0 20px;">Your order is on its way to you. ${order.trackingNumber ? `Tracking: <strong>${order.carrier || ''} ${order.trackingNumber}</strong>` : ''}</p>
    <div style="background:#f8fafc;border-radius:8px;padding:12px 16px;">
      <p style="font-size:12px;color:#64748b;margin:0;">Delivering to: ${order.address}</p>
    </div>
  `;
  await sendEmail(order.customer.email, `Your order ${order.orderNumber} is on its way — Amahle Blue`, emailWrapper(header, body));
}

async function sendOrderDeliveredEmail(order) {
  if (!order?.customer?.email) return;
  const firstName = (order.customer.name || 'there').split(' ')[0];
  const isCOD     = (order.paymentMethod || order.payment?.method) === 'COD';
  const header    = `<div style="background:linear-gradient(135deg,#159A4C,#047857);padding:32px 40px;text-align:center;">
    <p style="color:#bbf7d0;font-size:11px;letter-spacing:3px;text-transform:uppercase;margin:0 0 6px;">Amahle Blue</p>
    <h1 style="color:#fff;font-size:22px;font-weight:800;margin:0 0 6px;">&#x2705; Order Delivered!</h1>
    <p style="color:#d1fae5;font-size:14px;margin:0;">Hi ${firstName}, your order has been delivered.</p>
  </div>`;
  const body = `
    <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:14px 18px;margin-bottom:20px;">
      <p style="font-size:13px;font-weight:700;color:#159A4C;margin:0 0 3px;">${order.orderNumber}</p>
      <p style="font-size:12px;color:#64748b;margin:0;">Status: <span style="color:#159A4C;font-weight:600;">Delivered</span></p>
    </div>
    ${isCOD ? `<div style="background:#fef3c7;border:1px solid #fde68a;border-radius:10px;padding:14px 18px;margin-bottom:20px;">
      <p style="font-size:13px;font-weight:700;color:#92400e;margin:0 0 4px;">&#128181; Cash Payment Due</p>
      <p style="font-size:13px;color:#78350f;margin:0;line-height:1.5;">Please pay <strong>${formatZar(order.total)}</strong> in cash to the delivery driver.</p>
    </div>` : ''}
    <p style="font-size:14px;color:#334155;line-height:1.6;margin:0 0 20px;">Thank you for shopping with Amahle Blue! We hope you enjoy your order. If you have any questions, please don't hesitate to contact us.</p>
  `;
  await sendEmail(order.customer.email, `Order ${order.orderNumber} delivered — Amahle Blue`, emailWrapper(header, body));
}

async function sendCashCollectedEmail(order) {
  if (!order?.customer?.email) return;
  const firstName = (order.customer.name || 'there').split(' ')[0];
  const header    = `<div style="background:linear-gradient(135deg,#159A4C,#047857);padding:32px 40px;text-align:center;">
    <p style="color:#bbf7d0;font-size:11px;letter-spacing:3px;text-transform:uppercase;margin:0 0 6px;">Amahle Blue</p>
    <h1 style="color:#fff;font-size:22px;font-weight:800;margin:0 0 6px;">&#x2705; Payment Received!</h1>
    <p style="color:#d1fae5;font-size:14px;margin:0;">Hi ${firstName}, your cash payment has been collected.</p>
  </div>`;
  const body = `
    <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:14px 18px;margin-bottom:20px;">
      <p style="font-size:13px;font-weight:700;color:#159A4C;margin:0 0 3px;">${order.orderNumber} — ${formatZar(order.total)}</p>
      <p style="font-size:12px;color:#64748b;margin:0;">Payment: <span style="color:#159A4C;font-weight:700;">Paid (Cash Collected)</span></p>
    </div>
    <p style="font-size:14px;color:#334155;line-height:1.6;margin:0 0 20px;">Thank you for your payment of <strong>${formatZar(order.total)}</strong>. Your transaction is now complete.</p>
  `;
  await sendEmail(order.customer.email, `Payment received for order ${order.orderNumber} — Amahle Blue`, emailWrapper(header, body));
}

async function sendPaymentVerifiedEmail(order) {
  if (!order?.customer?.email) return;
  const firstName = (order.customer.name || 'there').split(' ')[0];
  const header    = `<div style="background:linear-gradient(135deg,#159A4C,#047857);padding:32px 40px;text-align:center;">
    <p style="color:#bbf7d0;font-size:11px;letter-spacing:3px;text-transform:uppercase;margin:0 0 6px;">Amahle Blue</p>
    <h1 style="color:#fff;font-size:22px;font-weight:800;margin:0 0 6px;">&#x2705; Payment Verified!</h1>
    <p style="color:#d1fae5;font-size:14px;margin:0;">Hi ${firstName}, your EFT payment has been verified.</p>
  </div>`;
  const body = `
    <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:14px 18px;margin-bottom:20px;">
      <p style="font-size:13px;font-weight:700;color:#159A4C;margin:0 0 3px;">${order.orderNumber} — ${formatZar(order.total)}</p>
      <p style="font-size:12px;color:#64748b;margin:0;">Payment: <span style="color:#159A4C;font-weight:700;">Paid · Verified</span></p>
    </div>
    <p style="font-size:14px;color:#334155;line-height:1.6;margin:0 0 20px;">
      We have verified your EFT payment of <strong>${formatZar(order.total)}</strong>. Your order has been confirmed and is being prepared for dispatch.
      You will receive another email when your order is on its way.
    </p>
  `;
  await sendEmail(order.customer.email, `EFT payment verified — Order ${order.orderNumber} confirmed`, emailWrapper(header, body));
}

async function sendPaymentRejectedEmail(order, note) {
  if (!order?.customer?.email) return;
  const firstName = (order.customer.name || 'there').split(' ')[0];
  const header    = `<div style="background:linear-gradient(135deg,#dc2626,#991b1b);padding:32px 40px;text-align:center;">
    <p style="color:#fecaca;font-size:11px;letter-spacing:3px;text-transform:uppercase;margin:0 0 6px;">Amahle Blue</p>
    <h1 style="color:#fff;font-size:22px;font-weight:800;margin:0 0 6px;">Payment Rejected</h1>
    <p style="color:#fecaca;font-size:14px;margin:0;">Hi ${firstName}, there was an issue with your proof of payment.</p>
  </div>`;
  const body = `
    <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:10px;padding:14px 18px;margin-bottom:20px;">
      <p style="font-size:13px;font-weight:700;color:#dc2626;margin:0 0 3px;">${order.orderNumber}</p>
      <p style="font-size:12px;color:#64748b;margin:0;">Payment Status: <span style="color:#dc2626;font-weight:600;">Payment Rejected</span></p>
    </div>
    ${note ? `<div style="background:#fef3c7;border:1px solid #fde68a;border-radius:10px;padding:14px 18px;margin-bottom:20px;">
      <p style="font-size:12px;font-weight:700;color:#92400e;margin:0 0 4px;">Reason:</p>
      <p style="font-size:13px;color:#78350f;margin:0;">${note}</p>
    </div>` : ''}
    <p style="font-size:14px;color:#334155;line-height:1.6;margin:0 0 20px;">
      Unfortunately, we could not verify your proof of payment for order <strong>${order.orderNumber}</strong>.
      Please upload a new, clear proof of payment to your account dashboard, or contact us for assistance.
    </p>
    <p style="font-size:13px;color:#64748b;margin:0;">The EFT reference for your order is: <strong style="font-family:monospace;">${order.eftReference || order.orderNumber}</strong></p>
  `;
  await sendEmail(order.customer.email, `Action required — Proof of payment rejected for ${order.orderNumber}`, emailWrapper(header, body));
}

async function sendCorrectedProofEmail(order, note) {
  if (!order?.customer?.email) return;
  const firstName = (order.customer.name || 'there').split(' ')[0];
  const header    = `<div style="background:linear-gradient(135deg,#d97706,#92400e);padding:32px 40px;text-align:center;">
    <p style="color:#fef3c7;font-size:11px;letter-spacing:3px;text-transform:uppercase;margin:0 0 6px;">Amahle Blue</p>
    <h1 style="color:#fff;font-size:22px;font-weight:800;margin:0 0 6px;">Proof Correction Required</h1>
    <p style="color:#fef3c7;font-size:14px;margin:0;">Hi ${firstName}, we need a corrected proof of payment.</p>
  </div>`;
  const body = `
    <div style="background:#fef3c7;border:1px solid #fde68a;border-radius:10px;padding:14px 18px;margin-bottom:20px;">
      <p style="font-size:13px;font-weight:700;color:#92400e;margin:0 0 3px;">${order.orderNumber}</p>
      <p style="font-size:12px;color:#64748b;margin:0;">Status: <span style="color:#d97706;font-weight:600;">Corrected Proof Requested</span></p>
    </div>
    ${note ? `<div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:10px;padding:14px 18px;margin-bottom:20px;">
      <p style="font-size:12px;font-weight:700;color:#c2410c;margin:0 0 4px;">Correction Needed:</p>
      <p style="font-size:13px;color:#7c2d12;margin:0;">${note}</p>
    </div>` : ''}
    <p style="font-size:14px;color:#334155;line-height:1.6;margin:0 0 20px;">
      Please log in to your account and upload a corrected proof of payment. Make sure your proof clearly shows the payment amount of
      <strong>${formatZar(order.total)}</strong> and the reference <strong style="font-family:monospace;">${order.eftReference || order.orderNumber}</strong>.
    </p>
  `;
  await sendEmail(order.customer.email, `Corrected proof of payment needed — ${order.orderNumber}`, emailWrapper(header, body));
}

/* ════════════════════════════════════════════════════════════════════════════════
   REQUEST HANDLERS
   ════════════════════════════════════════════════════════════════════════════════ */

export async function POST(req) {
  try {
    let body;
    try { body = await req.json(); } catch { body = {}; }
    
    const custSession = await verifyCustomerCookie(req);
    const idemKey = (body.idempotencyKey || '').trim();

    const customer = body.customer || {};
    const customerPhone = String(customer.phone || '').trim();
    if (!customer.name?.trim())  return NextResponse.json({ error: 'Customer name is required.' }, { status: 400 });
    if (!customer.email?.trim()) return NextResponse.json({ error: 'Customer email is required.' }, { status: 400 });
    if (!customerPhone)          return NextResponse.json({ error: 'Mobile number is required.' }, { status: 400 });
    if (!isValidSaMobile(customerPhone)) {
      return NextResponse.json({ error: 'Please enter a valid South African mobile number (e.g. 067 101 4345).' }, { status: 400 });
    }
    if (!body.address?.trim())   return NextResponse.json({ error: 'Delivery address is required.' }, { status: 400 });

    const items = Array.isArray(body.items) ? body.items : [];
    if (!items.length) return NextResponse.json({ error: 'Cart is empty.' }, { status: 400 });

    const VALID_PAY = ['EFT', 'COD'];
    const payMethod = VALID_PAY.includes(body.payment?.method) ? body.payment.method : null;
    if (!payMethod) return NextResponse.json({ error: 'Please select a valid payment method (COD or EFT).' }, { status: 400 });

    await connectToDatabase();

    /* Idempotency guard — prevents duplicate orders from network retries or double-clicks.
     * The client generates a unique key (e.g. a UUID) and sends it with the request.
     * If an order with this key already exists, return the original order instead of
     * creating a new one. EFT bank details and internal notes are stripped from the
     * response for customer-facing safety. */
    if (idemKey) {
      const existing = await Order.findOne({ idempotencyKey: idemKey }).lean();
      if (existing) {
        const { eftBankDetails, internalNotes, ...safeOrder } = existing;
        return NextResponse.json(safeOrder, { status: 200 });
      }
    }

    let sDoc = await Settings.findOne({ key: 'global_settings' }).lean();
    let settings = sDoc?.value || {};

    if (payMethod === 'COD' && settings.cod?.enabled === false) {
      return NextResponse.json({ error: 'Cash on Delivery is currently unavailable. Please select EFT / Bank Transfer.' }, { status: 400 });
    }
    if (payMethod === 'EFT' && settings.eft?.enabled === false) {
      return NextResponse.json({ error: 'EFT / Bank Transfer is currently unavailable. Please select Cash on Delivery.' }, { status: 400 });
    }

    const validatedItems = [];
    const productsList = await Product.find({ id: { $in: items.map(i => i.productId) }, status: 'active' }).lean();

    for (const item of items) {
      const product = productsList.find(p => p.id === item.productId);
      if (!product) return NextResponse.json({ error: 'One or more products are unavailable.' }, { status: 400 });

      const qty = parseInt(item.qty, 10);
      if (!qty || qty < 1) return NextResponse.json({ error: `Invalid quantity for "${product.name}".` }, { status: 400 });

      if (product.outOfStock) {
        return NextResponse.json({ error: `"${product.name}" is out of stock.` }, { status: 400 });
      }

      let price = product.price;
      let size = product.size;
      let stockAvail = typeof product.stock === 'number' ? product.stock : 999;
      let variationName = item.variation || null;

      if (product.variants && product.variants.length > 0) {
        const variant = product.variants.find(v => v.name === item.variation);
        if (!variant) {
          return NextResponse.json({ error: `Please select a size for "${product.name}".` }, { status: 400 });
        }
        if (variant.outOfStock) {
          return NextResponse.json({ error: `"${product.name} (${variant.name})" is out of stock.` }, { status: 400 });
        }
        stockAvail = typeof variant.stock === 'number' ? variant.stock : 999;
        price = variant.price;
        size = variant.name;
      }

      if (stockAvail < qty) {
        return NextResponse.json({
          error: `Only ${stockAvail} unit${stockAvail === 1 ? '' : 's'} of "${product.name}${variationName ? ` (${variationName})` : ''}" available.`,
        }, { status: 400 });
      }
      validatedItems.push({ productId: product.id, name: `${product.name} (${size})`, qty, price, variation: variationName });
    }

    const subtotal = Math.round(validatedItems.reduce((s, i) => s + i.price * i.qty, 0) * 100) / 100;

    if (payMethod === 'COD') {
      const minCOD = settings.cod?.minOrderAmount || 0;
      const maxCOD = settings.cod?.maxOrderAmount || 0;
      if (minCOD > 0 && subtotal < minCOD) {
        return NextResponse.json({ error: `Cash on Delivery requires a minimum order of ${formatZar(minCOD)}.` }, { status: 400 });
      }
      if (maxCOD > 0 && subtotal > maxCOD) {
        return NextResponse.json({ error: `Cash on Delivery is only available for orders up to ${formatZar(maxCOD)}.` }, { status: 400 });
      }
    }

    const province = body.addressDetails?.province || '';
    const country = body.addressDetails?.country || 'South Africa';
    const { charge: delivery, name: shippingRateName } = await computeShipping(subtotal, province, country);

    let couponDiscount = 0, couponCode = null, couponId = null;
    if (body.couponCode) {
      const code = (body.couponCode || '').toUpperCase().trim();
      const c = await Coupon.findOne({ code }).lean();
      if (c && c.active && !(c.expiresAt && Date.now() > c.expiresAt) && !(c.maxUses > 0 && c.usedCount >= c.maxUses)) {
        if (subtotal >= (c.minOrderValue || 0)) {
          if (c.type === 'percentage') {
            couponDiscount = Math.round(subtotal * (c.value / 100) * 100) / 100;
          } else {
            couponDiscount = Math.min(c.value, subtotal);
          }
          couponCode = c.code;
          couponId = c.id;
        }
      }
    }

    const codFee = payMethod === 'COD' ? Math.round((settings.cod?.codFee || 0) * 100) / 100 : 0;
    const total  = Math.round((subtotal + delivery - couponDiscount + codFee) * 100) / 100;

    const paymentStatus = payMethod === 'COD' ? 'Cash Payment Pending' : 'Awaiting EFT Payment';
    const orderStatus   = payMethod === 'COD' ? 'Order Placed'         : 'Awaiting Payment';

    const eftBankDetails = payMethod === 'EFT' ? {
      bankName:      settings.eft?.bankName      || '',
      accountHolder: settings.eft?.accountHolder || '',
      accountNumber: settings.eft?.accountNumber || '',
      branchCode:    settings.eft?.branchCode    || '',
      accountType:   settings.eft?.accountType   || '',
      swiftCode:     settings.eft?.swiftCode     || '',
      instructions:  settings.eft?.instructions  || '',
    } : null;

    const { invoiceNumber, orderNumber } = await nextInvoiceAndOrderNumber();

    const newOrder = {
      id:             `ORD-${Date.now()}`,
      orderNumber,
      invoiceNumber,
      customer: {
        name:  customer.name.trim(),
        email: customer.email.trim().toLowerCase(),
        phone: customerPhone,
        id:    custSession?.customerId || null,
      },
      addressDetails: body.addressDetails || null,
      address:        body.address.trim(),
      items:          validatedItems,
      subtotal,
      delivery,
      shippingRateName,
      couponDiscount,
      couponCode,
      couponId,
      codFee,
      total,
      currency:       'ZAR',
      paymentMethod:  payMethod,
      paymentStatus,
      orderStatus,
      eftReference:   payMethod === 'EFT' ? orderNumber : null,
      eftBankDetails,
      proofOfPaymentUrl:        null,
      proofOfPaymentStorageKey: null,
      proofOfPaymentMetadata:   null,
      invoiceUrl:               null,
      internalNotes:            '',
      status:  'pending',
      payment: { method: payMethod, status: 'pending' },
      paymentStatusHistory: [{
        previousStatus: null,
        newStatus:      paymentStatus,
        changedBy:      'system',
        note:           'Order created',
        createdAt:      Date.now(),
      }],
      notes:          (body.notes || '').trim(),
      idempotencyKey: idemKey || null,
      customerId:     custSession?.customerId || null,
      stockDeducted:  false,
      createdAt:      Date.now(),
      updatedAt:      Date.now(),
    };

    await Order.create(newOrder);

    if (couponId) {
      await Coupon.updateOne({ id: couponId }, { $inc: { usedCount: 1 }, $set: { updatedAt: Date.now() } });
    }

    if (payMethod === 'COD') { sendCODEmail(newOrder).catch(() => {}); }
    else                     { sendEFTEmail(newOrder).catch(() => {}); }
    sendAdminEmail(newOrder).catch(() => {});

    return NextResponse.json(newOrder, { status: 201 });
  } catch (error) {
    console.error('POST /api/orders error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(req) {
  try {
    await connectToDatabase();
    const adminSession    = verifySession(req);
    const customerSession = adminSession ? null : await verifyCustomerCookie(req);

    if (!adminSession && !customerSession) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const orders = await Order.find({}).lean();
    if (adminSession) return NextResponse.json(orders, { status: 200 });
    
    const { customerId, email } = customerSession;
    const mine = orders
      .filter(o =>
        o.customerId === customerId ||
        (o.customer?.email && o.customer.email.toLowerCase() === email.toLowerCase())
      )
      .map(({ internalNotes, idempotencyKey, eftBankDetails: _b, ...safe }) => {
        if (safe.paymentMethod === 'EFT' || safe.payment?.method === 'EFT') {
          safe.eftBankDetails = _b;
        }
        return safe;
      });
    return NextResponse.json(mine, { status: 200 });
  } catch (error) {
    console.error('GET /api/orders error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(req) {
  try {
    await connectToDatabase();
    const adminSession    = verifySession(req);
    const customerSession = adminSession ? null : await verifyCustomerCookie(req);

    if (!adminSession && !customerSession) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    let body;
    try { body = await req.json(); } catch { body = {}; }

    const { id, status, orderStatus, notes, internalNotes, paymentStatus, trackingNumber, carrier, trackingLink, dispatchDate, statusNote } = body;
    if (!id) return NextResponse.json({ error: 'Missing order id' }, { status: 400 });

    const prev = await Order.findOne({ id }).lean();
    if (!prev) return NextResponse.json({ error: 'Order not found' }, { status: 404 });

    const isCustomerOnly = customerSession && !adminSession;

    if (isCustomerOnly) {
      const isOwner = prev.customerId === customerSession.customerId ||
        prev.customer?.email?.toLowerCase() === customerSession.email.toLowerCase();
      if (!isOwner) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      if (status !== 'cancelled') return NextResponse.json({ error: 'Customers can only cancel orders.' }, { status: 403 });
      assertValidOrderTransition(prev, 'cancelled', 'customer', true);
    }

    const patch = { updatedAt: Date.now() };

    const requestedSimpleStatus = (() => {
      if (orderStatus !== undefined) return SIMPLE_STATUS_FROM_DESCRIPTIVE[orderStatus] || '';
      if (status !== undefined) return normalizeOrderStatus(status);
      return '';
    })();

    if (requestedSimpleStatus) {
      assertValidOrderTransition(prev, requestedSimpleStatus, adminSession?.role || 'customer', isCustomerOnly);
      patch.status = requestedSimpleStatus;
      patch.orderStatus = describeOrderStatus(requestedSimpleStatus, prev);
    }

    if (!isCustomerOnly) {
      if (notes !== undefined) patch.notes = String(notes).slice(0, 2000);
      if (internalNotes !== undefined) {
        const noteText = String(internalNotes).slice(0, 4000).trim();
        if (noteText) {
          const existing = Array.isArray(prev.internalNotes) ? prev.internalNotes : [];
          patch.internalNotes = [...existing, {
            note:      noteText,
            addedBy:   adminSession?.user?.username || adminSession?.username || 'admin',
            createdAt: Date.now(),
          }];
        }
      }
      if (trackingNumber !== undefined) patch.trackingNumber = String(trackingNumber).slice(0, 80);
      if (carrier        !== undefined) patch.carrier        = String(carrier).slice(0, 80);
      if (trackingLink   !== undefined) patch.trackingLink   = String(trackingLink).slice(0, 500);
      if (dispatchDate   !== undefined) {
        if (dispatchDate) {
          const parsedDate = new Date(dispatchDate);
          patch.dispatchDate = isNaN(parsedDate.getTime()) ? null : parsedDate.getTime();
        } else {
          patch.dispatchDate = null;
        }
      }

      if (paymentStatus !== undefined) {
        const VALID_PAY_STATUS = [
          'pending', 'paid', 'failed', 'refunded',
          'Cash Payment Pending', 'Awaiting EFT Payment',
          'Proof of Payment Submitted', 'Payment Verification Required',
          'Paid', 'Refunded', 'Failed',
          'Payment Rejected', 'Corrected Proof Requested',
        ];
        if (!VALID_PAY_STATUS.includes(paymentStatus)) {
          return NextResponse.json({ error: 'Invalid payment status.' }, { status: 400 });
        }

        const simpleStatus = (() => {
          if (paymentStatus === 'paid'     || paymentStatus === 'Paid')     return 'paid';
          if (paymentStatus === 'failed'   || paymentStatus === 'Failed')   return 'failed';
          if (paymentStatus === 'refunded' || paymentStatus === 'Refunded') return 'refunded';
          return 'pending';
        })();

        const descriptiveStatus = (() => {
          if (paymentStatus === 'paid')     return 'Paid';
          if (paymentStatus === 'failed')   return 'Failed';
          if (paymentStatus === 'refunded') return 'Refunded';
          if (paymentStatus === 'pending') {
            const method = prev.paymentMethod || prev.payment?.method || '';
            return method === 'EFT' ? 'Awaiting EFT Payment' : 'Cash Payment Pending';
          }
          return paymentStatus;
        })();

        const prevPayStatus = prev.paymentStatus || prev.payment?.status || 'pending';
        const paymentStatusChanged = descriptiveStatus !== prevPayStatus;

        patch.payment       = { ...(prev.payment || {}), status: simpleStatus };
        patch.paymentStatus = descriptiveStatus;

        if (descriptiveStatus === 'Paid' && (prev.paymentMethod === 'EFT' || prev.payment?.method === 'EFT')) {
          if (!patch.orderStatus && (prev.orderStatus === 'Awaiting Payment' || prev.status === 'pending')) {
            patch.orderStatus = 'Confirmed';
            patch.status      = 'confirmed';
          }
        }

        if (paymentStatusChanged) {
          const prevHistory = Array.isArray(prev.paymentStatusHistory) ? prev.paymentStatusHistory : [];
          patch.paymentStatusHistory = [
            ...prevHistory,
            {
              previousStatus: prevPayStatus,
              newStatus:      descriptiveStatus,
              changedBy:      adminSession?.user?.username || adminSession?.username || 'admin',
              note:           statusNote || '',
              createdAt:      Date.now(),
            },
          ];
        }
      }
    }

    /* ── Stock & Coupon adjustment on order status change ───────────────────────────
     *
     * Stock is managed via a `stockDeducted` flag on the order to ensure that
     * inventory is never double-counted regardless of how many times the status
     * changes between active and inactive states.
     *
     * DEDUCTION: When an order transitions INTO an active fulfillment state
     * (confirmed / processing / shipped / delivered) and stock has NOT yet been
     * deducted, inventory is decremented for each line item. Variants have their
     * own stock field; for single-variant products the parent stock is kept in sync.
     *
     * RESTORATION: When an order transitions OUT of an active state (e.g. cancelled
     * from confirmed) and stock WAS previously deducted, inventory is restored.
     * For products with a single variant, both variant.stock and product.stock are
     * restored together.
     *
     * COUPON: The coupon usedCount is also adjusted symmetrically — decremented on
     * deduction, incremented on restoration — so usage limits remain accurate.
     */
    const updated = await persistOrderPatchWithInventory(prev, patch, adminSession);

    /*
    const effectiveNewStatus = patch.status ?? prev.status;
    const DEDUCTED_STATES = ['confirmed', 'processing', 'shipped', 'delivered'];
    const statusActuallyChanged = patch.status !== undefined && patch.status !== prev.status;
    const shouldBeDeducted = DEDUCTED_STATES.includes(effectiveNewStatus);
    const isCurrentlyDeducted = !!prev.stockDeducted;
    
    if (statusActuallyChanged && shouldBeDeducted && !isCurrentlyDeducted) {
      const itemProductIds = (prev.items || []).map(item => item.productId).filter(Boolean);
      const allProducts = await Product.find({ id: { $in: itemProductIds } }).lean();
      
      // Step 1: Verify all items have sufficient stock before committing any changes
      for (const item of (prev.items || [])) {
        const product = allProducts.find(p => p.id === item.productId);
        if (!product) continue;
        if (product.outOfStock) {
          return NextResponse.json({ error: `Cannot confirm order: Product "${product.name}" is marked out of stock.` }, { status: 400 });
        }
        let stockAvail = typeof product.stock === 'number' ? product.stock : 999;
        let displayName = product.name;
        
        if (item.variation && product.variants && product.variants.length > 0) {
          const variant = product.variants.find(v => v.name === item.variation);
          if (!variant) continue;
          if (variant.outOfStock) {
            return NextResponse.json({ error: `Cannot confirm order: Size "${variant.name}" of "${product.name}" is marked out of stock.` }, { status: 400 });
          }
          stockAvail = typeof variant.stock === 'number' ? variant.stock : 999;
          displayName = `${product.name} (${variant.name})`;
        }
        
        if (stockAvail < item.qty) {
          return NextResponse.json({ error: `Cannot confirm order: Only ${stockAvail} unit(s) of "${displayName}" available, but ${item.qty} required.` }, { status: 400 });
        }
      }

      // Step 2: All items validated — deduct stock and mark variants out of stock if needed
      for (const item of (prev.items || [])) {
        const product = allProducts.find(p => p.id === item.productId);
        if (!product) continue;

        let changed = false;
        let pUpdate = {};

        if (item.variation && product.variants && product.variants.length > 0) {
          const variantIdx = product.variants.findIndex(v => v.name === item.variation);
          if (variantIdx !== -1) {
            const variants = product.variants.map(v => ({ ...v }));
            const prevVarStock = variants[variantIdx].stock || 0;
            const newVarStock = Math.max(0, prevVarStock - item.qty);
            variants[variantIdx].stock = newVarStock;
            if (newVarStock <= 0) variants[variantIdx].outOfStock = true;
            pUpdate.variants = variants;
            changed = true;
          }
        } else {
          const prevProductStock = product.stock || 0;
          const newProductStock = Math.max(0, prevProductStock - item.qty);
          pUpdate.stock = newProductStock;
          if (newProductStock <= 0) pUpdate.outOfStock = true;
          changed = true;
          // For single-variant products, keep the lone variant's stock in sync with the parent
          if (product.variants && product.variants.length === 1) {
            pUpdate.variants = [{ ...product.variants[0], stock: newProductStock }];
            if (newProductStock <= 0) pUpdate.variants[0].outOfStock = true;
          }
        }

        if (changed) {
          pUpdate.updatedAt = Date.now();
          // Recalculate aggregate product.stock from all variant stocks (if variants exist)
          if (pUpdate.variants && pUpdate.variants.length > 0) {
            pUpdate.stock = pUpdate.variants.reduce((acc, v) => acc + (v.stock || 0), 0);
          }
          await Product.updateOne({ id: product.id }, { $set: pUpdate });
        }
      }

      patch.stockDeducted = true;

      // If this order was previously cancelled and is being re-activated,
      // increment the coupon usedCount to correctly reflect the usage
      if (prev.status === 'cancelled' && prev.couponId) {
        await Coupon.updateOne({ id: prev.couponId }, { $inc: { usedCount: 1 }, $set: { updatedAt: Date.now() } });
      }

    } else if (statusActuallyChanged && !shouldBeDeducted && isCurrentlyDeducted) {
      const itemProductIds = (prev.items || []).map(item => item.productId).filter(Boolean);
      const allProducts = await Product.find({ id: { $in: itemProductIds } }).lean();
      
      for (const item of (prev.items || [])) {
        const product = allProducts.find(p => p.id === item.productId);
        if (!product) continue;

        let changed = false;
        let pUpdate = {};

        if (item.variation && product.variants && product.variants.length > 0) {
          const variantIdx = product.variants.findIndex(v => v.name === item.variation);
          if (variantIdx !== -1) {
            const variants = product.variants.map(v => ({ ...v }));
            const prevVarStock = variants[variantIdx].stock || 0;
            const newVarStock = prevVarStock + item.qty;
            variants[variantIdx].stock = newVarStock;
            variants[variantIdx].outOfStock = false;
            pUpdate.variants = variants;
            changed = true;
          }
        } else {
          const prevProductStock = product.stock || 0;
          const newProductStock = prevProductStock + item.qty;
          pUpdate.stock = newProductStock;
          pUpdate.outOfStock = false;
          changed = true;
          if (product.variants && product.variants.length === 1) {
            pUpdate.variants = [{ ...product.variants[0], stock: newProductStock, outOfStock: false }];
          }
        }

        if (changed) {
          pUpdate.updatedAt = Date.now();
          if (pUpdate.variants && pUpdate.variants.length > 0) {
            pUpdate.stock = pUpdate.variants.reduce((acc, v) => acc + (v.stock || 0), 0);
          }
          await Product.updateOne({ id: product.id }, { $set: pUpdate });
        }
      }

      patch.stockDeducted = false;

      if (prev.couponId) {
        const coupon = await Coupon.findOne({ id: prev.couponId }).lean();
        if (coupon && coupon.usedCount > 0) {
          await Coupon.updateOne({ id: prev.couponId }, { $inc: { usedCount: -1 }, $set: { updatedAt: Date.now() } });
        }
      }
    }

    const updated = { ...prev, ...patch };
    await Order.updateOne({ id }, { $set: patch });
    */

    if (!isCustomerOnly) {
      const prevOrderStatus = prev.orderStatus || prev.status;
      const newOrderStatus  = updated.orderStatus || updated.status;
      const prevPayStatus   = prev.paymentStatus  || prev.payment?.status;
      const newPayStatus    = updated.paymentStatus;
      const payMethod       = updated.paymentMethod || updated.payment?.method;

      // Trigger transactional emails on order status transitions.
      // Emails are fired-and-forgotten (.catch(() => {})) so a failed email
      // delivery never rolls back or errors the PATCH response.
      if (newOrderStatus !== prevOrderStatus) {
        if (newOrderStatus === 'Confirmed')  sendOrderConfirmedEmail(updated).catch(() => {});
        if (newOrderStatus === 'Dispatched') sendOrderDispatchedEmail(updated).catch(() => {});
        if (newOrderStatus === 'Delivered')  sendOrderDeliveredEmail(updated).catch(() => {});
      }

      // Trigger payment-specific emails when the payment status changes.
      // The payment method determines which email template is used for 'Paid' transitions.
      if (newPayStatus && newPayStatus !== prevPayStatus) {
        if (newPayStatus === 'Paid' && payMethod === 'COD') {
          // Cash physically collected by driver — notify customer of receipt
          sendCashCollectedEmail(updated).catch(() => {});
        } else if (newPayStatus === 'Paid' && payMethod === 'EFT') {
          // Admin verified EFT bank transfer — notify customer of confirmation
          sendPaymentVerifiedEmail(updated).catch(() => {});
        } else if (newPayStatus === 'Payment Rejected') {
          sendPaymentRejectedEmail(updated, statusNote || '').catch(() => {});
        } else if (newPayStatus === 'Corrected Proof Requested') {
          sendCorrectedProofEmail(updated, statusNote || '').catch(() => {});
        }
      }
    }

    return NextResponse.json(updated, { status: 200 });
  } catch (error) {
    if (error?.status) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('PATCH /api/orders error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
