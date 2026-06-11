'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useCart, useCustomer, money, getPrimaryImg, catOf } from '../../lib/storeContext';
import { 
  ArrowLeft, Cart as CartIcon, CheckCircle, Trash, Minus, Plus, Bag, Lock, Shield, 
  User, MapPin, CreditCard, Tag, X, AlertCircle, FileText as Copy, Download, Home
} from '../ui/Icons';
import { Spinner } from '../ui/index';

const PROVINCES = [
  'Gauteng','Western Cape','KwaZulu-Natal','Eastern Cape',
  'Mpumalanga','Limpopo','North West','Free State','Northern Cape',
];

/* ── Shared helpers ──────────────────────────────────────────────────────────── */
function CkField({ label, className = '', as: As = 'input', ...props }) {
  return (
    <div className={`ck-field ${className}`}>
      <label className="ck-field__label">{label}</label>
      <As {...props} className="ck-field__input" />
    </div>
  );
}

/* ── Invoice generator ───────────────────────────────────────────────────────── */
export function printInvoice(order) {
  const Rfmt = (n) => {
    const abs = Math.abs(n || 0).toFixed(2);
    const [int, dec] = abs.split('.');
    return 'R ' + int.replace(/\B(?=(\d{3})+(?!\d))/g, ',') + '.' + dec;
  };

  const s        = typeof window !== 'undefined' ? window.__settings || {} : {};
  const biz      = s.business || {};
  const bank     = order.eftBankDetails || s.eft || {};
  const bizName  = biz.name    || 'Amahle Blue';
  const bizAddr  = biz.address || 'Unit H, 13 Main Reef Road, Dunswart, Boksburg, Gauteng, South Africa';
  const bizPhone = biz.phone   || '067 101 4345';
  const bizEmail = biz.email   || 'info@amahle-blue.co.za';
  const vatNum   = biz.vatNumber || '';

  const VAT_RATE  = 0.15;
  const vatAmount = (order.total || 0) - (order.total || 0) / (1 + VAT_RATE);

  const payMethod   = order.paymentMethod || order.payment?.method || '';
  const payStatus   = order.paymentStatus || (order.payment?.status === 'paid' ? 'Paid' : order.payment?.status) || 'Pending';
  const orderStatus = order.orderStatus   || order.status || '';
  const isPaid      = payStatus === 'Paid' || order.payment?.status === 'paid';
  const isEFT       = payMethod === 'EFT';
  const isCOD       = payMethod === 'COD';
  const eftRef      = order.eftReference || order.orderNumber;
  const codFee      = order.codFee || 0;
  const payStatusColor = isPaid ? '#159A4C' : payStatus.includes('Reject') ? '#dc2626' : '#d97706';

  const rows = (order.items || []).map(i => `
    <tr>
      <td style="padding:10px 14px;border-bottom:1px solid #f1f5f9;font-size:13px;color:#334155;">${i.name}${i.variation ? ` <span style="color:#94a3b8;font-size:11px">(${i.variation})</span>` : ''}</td>
      <td style="padding:10px 14px;border-bottom:1px solid #f1f5f9;text-align:center;font-size:13px;color:#64748b;">${i.qty}</td>
      <td style="padding:10px 14px;border-bottom:1px solid #f1f5f9;text-align:right;font-size:13px;color:#64748b;">${Rfmt(i.price)}</td>
      <td style="padding:10px 14px;border-bottom:1px solid #f1f5f9;text-align:right;font-size:13px;font-weight:700;color:#0B2545;">${Rfmt(i.price * i.qty)}</td>
    </tr>`).join('');

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width"/>
  <title>Invoice ${order.invoiceNumber || order.orderNumber}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Helvetica, Arial, sans-serif; background: #fff; color: #0B2545; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .page { max-width: 720px; margin: 0 auto; padding: 40px 40px 60px; }
    @media print { body { background: #fff; } .no-print { display: none !important; } .page { padding: 20px; } }
    h1 { font-size: 28px; font-weight: 800; color: #0B2545; }
    table { width:100%; border-collapse:collapse; }
    th { background:#f8fafc; padding:9px 14px; text-align:left; font-size:11px; font-weight:700; color:#64748b; text-transform:uppercase; letter-spacing:1px; }
    th:last-child, td:last-child { text-align:right; }
    td.center, th.center { text-align:center; }
  </style>
</head>
<body>
<div class="page">
  <div class="no-print" style="text-align:right;margin-bottom:24px;">
    <button onclick="window.print()" style="background:#1E50E0;color:#fff;border:none;padding:10px 22px;border-radius:8px;font-size:13px;font-weight:700;cursor:pointer;">
      🖨️ Print / Save PDF
    </button>
  </div>
  <div style="background:linear-gradient(135deg,#1E50E0,#0B2545);padding:32px 36px;border-radius:16px;margin-bottom:32px;">
    <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:16px;">
      <div>
        <div style="color:#7FC4FF;font-size:11px;letter-spacing:3px;text-transform:uppercase;margin-bottom:4px;">${bizName}</div>
        <h1 style="color:#fff;font-size:26px;font-weight:800;margin:0;">TAX INVOICE</h1>
      </div>
      <div style="text-align:right;">
        <div style="color:#bfdbfe;font-size:13px;">${order.invoiceNumber || order.orderNumber}</div>
        <div style="color:#7FC4FF;font-size:12px;margin-top:2px;">${new Date(order.createdAt).toLocaleDateString('en-ZA',{day:'numeric',month:'long',year:'numeric'})}</div>
      </div>
    </div>
  </div>
  <table style="margin-bottom:4px;">
    <thead>
      <tr><th>Product</th><th class="center">Qty</th><th>Unit Price</th><th>Amount</th></tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>
  <table style="margin-bottom:32px;">
    <tbody>
      <tr style="border-top:2px solid #e2e8f0;">
        <td colspan="3" style="padding:14px 14px;text-align:right;font-size:16px;font-weight:800;color:#0B2545;">Total (incl. VAT)</td>
        <td style="padding:14px 14px;text-align:right;font-size:18px;font-weight:800;color:#1E50E0;">${Rfmt(order.total)}</td>
      </tr>
    </tbody>
  </table>
</div>
</body></html>`;

  const win = window.open('', '_blank', 'width=800,height=900,scrollbars=yes');
  if (!win) { alert('Please allow pop-ups to download the invoice.'); return; }
  win.document.write(html);
  win.document.close();
  win.focus();
  setTimeout(() => { try { win.print(); } catch {} }, 600);
}

/* ── CartPage ────────────────────────────────────────────────────────────────── */
export function CartPage({ onGoHome, onCheckout }) {
  const { detailed, count, subtotal, setQty, remove, clear } = useCart();

  const [shippingRates, setShippingRates] = useState([]);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    setShippingRates(window.SHIPPING_RATES || []);
    const onShipping = () => setShippingRates(window.SHIPPING_RATES || []);
    window.addEventListener('ab:shipping-loaded', onShipping);
    return () => window.removeEventListener('ab:shipping-loaded', onShipping);
  }, []);

  const defaultRate = shippingRates.find(r => r.isDefault);
  const FREE_SHIP_DYN = defaultRate?.freeThreshold > 0 ? defaultRate.freeThreshold : 750;

  const delivery  = count > 0 ? (subtotal >= FREE_SHIP_DYN ? 0 : (defaultRate?.charge ?? 85)) : 0;
  const total     = subtotal + delivery;
  const remaining = Math.max(0, FREE_SHIP_DYN - subtotal);
  const pct       = Math.min(100, (subtotal / FREE_SHIP_DYN) * 100);

  if (count === 0) {
    return (
      <div className="checkout-empty">
        <div className="shop-page__empty-icon" style={{ marginBottom: '1.25rem' }}>
          <Bag size={36} />
        </div>
        <h2 className="font-display text-[24px] font-extrabold text-ink">Your cart is empty</h2>
        <p className="mt-2 text-slate-500 text-[15px] max-w-xs">Browse our cleaning, car-care and sanitiser range.</p>
        <button onClick={onGoHome} className="mt-6 rounded-full bg-cobalt text-white font-bold px-8 py-3.5 hover:bg-cobalt-700 transition">
          Start shopping
        </button>
      </div>
    );
  }

  return (
    <div className="cart-page ab-page-enter">
      <div className="cart-page__header">
        <div className="cart-page__header-inner">
          <button onClick={onGoHome} className="cart-page__back-link">
            <ArrowLeft size={16} /> Continue Shopping
          </button>
          <div className="cart-page__title-row">
            <CartIcon size={22} className="cart-page__title-icon" />
            <h1 className="cart-page__title">Your Cart</h1>
            <span className="cart-page__count">
              {count} item{count !== 1 ? 's' : ''}
            </span>
          </div>
        </div>
      </div>

      <div className="cart-page__main">
        <div className="cart-page__grid">
          <div className="cart-page__left">
            {/* Free shipping progress */}
            <div className="cart-progress">
              {remaining > 0 ? (
                <p className="cart-progress__text">
                  Add <span className="cart-progress__amount">{money(remaining)}</span> more for{' '}
                  <span style={{ fontWeight: 600, color: '#0B2545' }}>free delivery</span>
                </p>
              ) : (
                <p className="cart-progress__text cart-progress__text--success">
                  <CheckCircle size={16} /> You've unlocked free delivery!
                </p>
              )}
              <div className="cart-progress__bar-wrap">
                <div className="cart-progress__bar" style={{ width: `${pct}%` }} />
              </div>
            </div>

            {/* Cart items */}
            <div className="cart-items">
              {detailed.map((item) => {
                const { product, qty, variation, price, size, maxStock, outOfStock, lowStock } = item;
                const c = catOf(product.cat);
                return (
                  <div key={`${product.id}-${variation || ''}`} className="cart-item">
                    <div className="cart-item__img-wrap">
                      <img src={getPrimaryImg(product)} alt={product.name} className="cart-item__img" onError={e=>{e.target.onerror=null;e.target.src='/assets/products/placeholder.svg'}} />
                    </div>
                    <div className="cart-item__details">
                      <div className="cart-item__header">
                        <div>
                          <p className="cart-item__title">{product.name}</p>
                          <p className="cart-item__meta">{size} · {c?.short}</p>
                          <div className="cart-item__price-wrap">
                            <span className="cart-item__price-unit">{money(price)} each</span>
                            {lowStock && <span className="cart-item__badge cart-item__badge--amber">Only {maxStock} left</span>}
                            {outOfStock && <span className="cart-item__badge cart-item__badge--red">Out of Stock</span>}
                          </div>
                        </div>
                        <button onClick={() => remove(product.id, variation)} className="cart-item__remove" aria-label="Remove">
                          <Trash size={17} />
                        </button>
                      </div>
                      <div className="cart-item__controls">
                        <div className="cart-qty">
                          <button onClick={() => setQty(product.id, qty - 1, variation)} className="cart-qty__btn" aria-label="Decrease"><Minus size={14} /></button>
                          <span className="cart-qty__val">{qty}</span>
                          <button onClick={() => setQty(product.id, qty + 1, variation)} disabled={qty >= maxStock || outOfStock}
                            className="cart-qty__btn" aria-label="Increase">
                            <Plus size={14} />
                          </button>
                        </div>
                        <span className="cart-item__price-total">{money(price * qty)}</span>
                      </div>
                      {typeof maxStock === 'number' && maxStock > 0 && maxStock <= 10 && !outOfStock && (
                        <p className="cart-item__stock-warning">Only {maxStock} left in stock</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="cart-page__footer">
              <button onClick={onGoHome} className="cart-page__back-link" style={{ marginBottom: 0 }}>
                <ArrowLeft size={15} /> Continue Shopping
              </button>
              <button onClick={clear} className="cart-page__clear-btn">
                Clear cart
              </button>
            </div>
          </div>

          {/* Summary sidebar */}
          <div className="order-summary">
            <h3 className="order-summary__title">Order Summary</h3>
            <div className="order-summary__list order-summary__list--scrollable">
              {detailed.map(({ product, qty, variation, price, size }) => (
                <div key={`${product.id}-${variation || ''}`} className="order-summary__row">
                  <span className="order-summary__row-label">{product.name}{variation ? ` (${size})` : ''} ×{qty}</span>
                  <span className="order-summary__row-val">{money(price * qty)}</span>
                </div>
              ))}
            </div>
            <div className="order-summary__totals">
              <div className="order-summary__row">
                <span>Subtotal</span>
                <span className="order-summary__row-val" style={{ color: '#0B2545' }}>{money(subtotal)}</span>
              </div>
              <div className="order-summary__row">
                <span>Delivery</span>
                <span className="order-summary__row-val" style={{ color: delivery === 0 ? '#159A4C' : '#0B2545' }}>
                  {delivery === 0 ? 'FREE' : money(delivery)}
                </span>
              </div>
            </div>
            <div className="order-summary__grand-total">
              <span>Total</span>
              <span>{money(total)}</span>
            </div>
            <button onClick={onCheckout} className="order-summary__btn">
              <Lock size={16} /> Proceed to Checkout
            </button>
            <p className="order-summary__secure">
              <Shield size={13} /> Secure checkout · SSL encrypted
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── CheckoutPage ────────────────────────────────────────────────────────────── */
export function CheckoutPage({ onBack, onSuccess }) {
  const { customer, sessionToken, isLoggedIn, openAuth, apiBase } = useCustomer();
  const { detailed, subtotal, count, clear, coupon, setCoupon } = useCart();

  const [form, setForm] = useState({
    name: customer?.name || '', email: customer?.email || '', phone: customer?.phone || '',
    addrLine: '', addrCity: '', addrProvince: '', addrPostal: '', addrCountry: 'South Africa',
    payment: '', notes: '',
  });
  const [selectedAddr, setSelectedAddr] = useState('');
  const [placing,      setPlacing]      = useState(false);
  const [error,        setError]        = useState('');

  /* Coupon state */
  const [couponInput,   setCouponInput]   = useState(coupon?.code || '');
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponError,   setCouponError]   = useState('');

  /* Dynamic Shipping Rates */
  const [delivery, setDelivery] = useState(0);
  const [shippingRates, setShippingRates] = useState([]);
  const [settings, setSettings] = useState(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    setShippingRates(window.SHIPPING_RATES || []);
    const onShipping = () => setShippingRates(window.SHIPPING_RATES || []);
    window.addEventListener('ab:shipping-loaded', onShipping);
    return () => window.removeEventListener('ab:shipping-loaded', onShipping);
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const res  = await fetch(`${apiBase}/api/settings`);
        if (res.ok) setSettings(await res.json());
      } catch {}
    })();
  }, [apiBase]);

  useEffect(() => {
    let rate = 85; // absolute fallback
    let matchingRate = null;
    const rates = shippingRates.filter(r => r.status === 'active');

    // Find specific match first
    if (form.addrCountry && form.addrProvince) {
      matchingRate = rates.find(r => r.country === form.addrCountry && r.region && form.addrProvince.includes(r.region));
    }
    if (!matchingRate && form.addrCountry) {
      matchingRate = rates.find(r => r.country === form.addrCountry && !r.region && !r.isDefault);
    }
    if (!matchingRate) {
      matchingRate = rates.find(r => r.isDefault);
    }

    if (matchingRate) {
      if (matchingRate.freeThreshold > 0 && subtotal >= matchingRate.freeThreshold) {
        rate = 0;
      } else {
        rate = matchingRate.charge;
      }
    } else {
      if (subtotal >= 750) rate = 0; // fallback free shipping
    }
    setDelivery(rate);
  }, [form.addrCountry, form.addrProvince, subtotal, shippingRates]);

  const couponDiscount = coupon?.discount || 0;
  const codFee         = form.payment === 'COD' ? (settings?.cod?.codFee || 0) : 0;
  const total          = Math.max(0, subtotal + delivery - couponDiscount + codFee);

  const idemKey = useRef(`idem_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`);

  useEffect(() => {
    if (!customer) return;
    setForm(f => ({ ...f, name: customer.name || f.name, email: customer.email || f.email, phone: customer.phone || f.phone }));
    const def = customer.addresses?.find(a => a.isDefault);
    if (def) applyAddress(def);
  }, [customer]);

  function applyAddress(addr) {
    setSelectedAddr(addr.id);
    setForm(f => ({ ...f, addrLine: addr.line || '', addrCity: addr.city || '', addrProvince: addr.province || '', addrPostal: addr.postalCode || '' }));
  }

  const f = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }));

  async function applyCoupon(e) {
    if (e) e.preventDefault();
    const code = couponInput.trim().toUpperCase();
    if (!code) return;
    setCouponLoading(true); setCouponError('');
    try {
      const res  = await fetch(`${apiBase}/api/coupons`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ action: 'validate', code, cartTotal: subtotal }),
      });
      const data = await res.json();
      if (!res.ok) { setCouponError(data.error || 'Invalid coupon code.'); setCoupon(null); setCouponLoading(false); return; }
      setCoupon({ code: data.code, discount: data.discount, type: data.type, value: data.value });
      setCouponError('');
    } catch { setCouponError('Network error. Please try again.'); }
    setCouponLoading(false);
  }

  function removeCoupon() { setCoupon(null); setCouponInput(''); setCouponError(''); }

  /* Validate SA phone numbers */
  function isValidSaPhone(raw) {
    if (!raw) return true;
    const digits = String(raw).replace(/[^\d+]/g, '');
    return /^(\+?27|0)[6-8]\d{8}$/.test(digits);
  }

  async function placeOrder(e) {
    e.preventDefault();
    if (!form.name.trim())     { setError('Please enter your full name.'); return; }
    if (!form.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim()))
                               { setError('Please enter a valid email address.'); return; }
    if (form.phone.trim() && !isValidSaPhone(form.phone))
                               { setError('Please enter a valid South African phone number (e.g. 067 101 4345).'); return; }
    if (!form.addrLine.trim()) { setError('Please enter your street address.'); return; }
    if (!form.addrCity.trim()) { setError('Please enter your city or town.'); return; }
    if (!form.addrProvince)    { setError('Please select a province so we can calculate delivery.'); return; }
    if (!form.payment)         { setError('Please select a payment method to continue.'); return; }

    setPlacing(true); setError('');

    const addrString = [form.addrLine, form.addrCity, form.addrProvince, form.addrPostal, form.addrCountry]
      .filter(Boolean).join(', ');

    const payload = {
      customer:       { name: form.name.trim(), email: form.email.trim(), phone: form.phone.trim() },
      address:        addrString,
      addressDetails: { line: form.addrLine.trim(), city: form.addrCity.trim(), province: form.addrProvince, postalCode: form.addrPostal.trim(), country: form.addrCountry },
      items:          detailed.map(({ product, qty, variation, price, size }) => ({ productId: product.id, variation, name: `${product.name} (${size})`, qty, price })),
      subtotal, delivery, couponCode: coupon?.code || null, total,
      payment:        { method: form.payment, status: 'pending' },
      notes:          form.notes.trim(),
      idempotencyKey: idemKey.current,
    };

    const controller = new AbortController();
    const tid = setTimeout(() => controller.abort(), 30000);
    try {
      const headers = { 'Content-Type': 'application/json' };
      if (sessionToken) headers['Authorization'] = `Bearer ${sessionToken}`;
      const res  = await fetch(`${apiBase}/api/orders`, { method: 'POST', headers, body: JSON.stringify(payload), signal: controller.signal });
      clearTimeout(tid);

      const text = await res.text();
      let data = {};
      try { data = text ? JSON.parse(text) : {}; }
      catch { data = { error: `Unexpected response from server (status ${res.status}).` }; }

      if (!res.ok) { setError(data.error || 'Failed to place order. Please try again.'); return; }
      if (!data || !data.id) { setError('Order response was incomplete. Please refresh and check My Orders before retrying.'); return; }

      clear();
      try { localStorage.removeItem('ab_products'); } catch {}
      onSuccess(data);
    } catch (err) {
      clearTimeout(tid);
      setError(err.name === 'AbortError' ? 'Request timed out. Please try again.' : 'Network error. Please check your connection and try again.');
    } finally {
      setPlacing(false);
    }
  }

  if (count === 0) {
    return (
      <div className="checkout-empty">
        <p>
          Your cart is empty.{' '}
          <button onClick={onBack}>Go back</button>
        </p>
      </div>
    );
  }

  return (
    <div className="cart-page ab-page-enter">
      <div className="cart-page__header">
        <div className="cart-page__header-inner">
          <button onClick={onBack} className="cart-page__back-link">
            <ArrowLeft size={16} /> Back to cart
          </button>
          <div className="cart-page__title-row">
            <Lock size={20} className="cart-page__title-icon" />
            <h1 className="cart-page__title">Checkout</h1>
          </div>
        </div>
      </div>

      <div className="cart-page__main">
        <div className="cart-page__grid">

          <form id="ck-form" onSubmit={placeOrder} className="checkout-form">
            {/* Sign-in prompt */}
            {!isLoggedIn && (
              <div className="checkout-section checkout-auth-prompt">
                <div>
                  <p className="title">Sign in for faster checkout</p>
                  <p className="sub">Save addresses, track orders, and speed up future checkouts</p>
                </div>
                <button type="button" onClick={openAuth}>Sign in</button>
              </div>
            )}

            {/* Customer details */}
            <div className="checkout-section">
              <h3 className="checkout-section__title">
                <User size={17} /> Customer Details
              </h3>
              <div className="checkout-section__grid">
                <CkField label="Full name *" value={form.name} onChange={f('name')} placeholder="Your full name" required style={{ gridColumn: '1 / -1' }} />
                <CkField label="Email address *" type="email" value={form.email} onChange={f('email')} placeholder="your@email.com" required />
                <CkField label="Phone number" type="tel" value={form.phone} onChange={f('phone')} placeholder="067 000 0000" />
              </div>
            </div>

            {/* Saved addresses */}
            {isLoggedIn && customer?.addresses?.length > 0 && (
              <div className="checkout-section">
                <h3 className="checkout-section__title">
                  <MapPin size={16} /> Saved Addresses
                </h3>
                <div className="checkout-section__grid">
                  {customer.addresses.map(addr => (
                    <button key={addr.id} type="button" onClick={() => applyAddress(addr)}
                      className={`checkout-address-btn ${selectedAddr === addr.id ? 'checkout-address-btn--active' : ''}`}>
                      <div className={`radio ${selectedAddr === addr.id ? 'radio--active' : ''}`}>
                        {selectedAddr === addr.id && <span className="dot" />}
                      </div>
                      <div className="details">
                        <p className="label">{addr.label}</p>
                        <p className="text">{addr.line}{addr.city ? `, ${addr.city}` : ''}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Delivery address */}
            <div className="checkout-section">
              <h3 className="checkout-section__title">
                <MapPin size={17} /> Delivery Address
              </h3>
              <div className="checkout-section__grid">
                <CkField label="Street address *" value={form.addrLine} onChange={f('addrLine')} placeholder="12 Main Street, Unit 4" required style={{ gridColumn: '1 / -1' }} />
                <CkField label="City / Town *" value={form.addrCity} onChange={f('addrCity')} placeholder="Johannesburg" required />
                <div className="ck-field">
                  <label className="ck-field__label">Province *</label>
                  <select value={form.addrProvince} onChange={f('addrProvince')} className="ck-field__input" required>
                    <option value="">Select province…</option>
                    {PROVINCES.map(p => <option key={p}>{p}</option>)}
                  </select>
                </div>
                <CkField label="Postal code" value={form.addrPostal} onChange={f('addrPostal')} placeholder="2000" />
                <div className="ck-field">
                  <label className="ck-field__label">Country</label>
                  <select value={form.addrCountry} onChange={f('addrCountry')} className="ck-field__input">
                    {['South Africa','Zimbabwe','Mozambique','Botswana','Namibia','Lesotho','Eswatini','Zambia','Other'].map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
              </div>
            </div>

            {/* Payment method */}
            <div className="checkout-section">
              <h3 className="checkout-section__title">
                <CreditCard size={17} /> Payment Method
              </h3>

              <div className="checkout-section__grid" role="radiogroup" aria-label="Select payment method">
                {/* Cash on Delivery */}
                {settings?.cod?.enabled !== false && (
                  <label className={`checkout-payment-btn ${form.payment === 'COD' ? 'checkout-payment-btn--active' : ''}`}>
                    <input
                      type="radio" name="paymentMethod" value="COD"
                      checked={form.payment === 'COD'}
                      onChange={() => setForm(p => ({ ...p, payment: 'COD' }))}
                    />
                    <div className="details">
                      <p className={`label ${form.payment === 'COD' ? 'label--active' : ''}`}>
                        Cash on Delivery
                      </p>
                      <p className="text">Pay in cash when your order is delivered.</p>
                    </div>
                  </label>
                )}

                {/* EFT / Bank Transfer */}
                {settings?.eft?.enabled !== false && (
                  <label className={`checkout-payment-btn ${form.payment === 'EFT' ? 'checkout-payment-btn--active' : ''}`}>
                    <input
                      type="radio" name="paymentMethod" value="EFT"
                      checked={form.payment === 'EFT'}
                      onChange={() => setForm(p => ({ ...p, payment: 'EFT' }))}
                    />
                    <div className="details">
                      <p className={`label ${form.payment === 'EFT' ? 'label--active' : ''}`}>
                        EFT / Bank Transfer
                      </p>
                      <p className="text">Pay directly into our bank account. Details provided after checkout.</p>
                    </div>
                  </label>
                )}
              </div>

              {form.payment === 'EFT' && (
                <div className="checkout-note checkout-note--info" style={{ marginTop: '1rem' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                  <p>Bank details and your payment reference will be shown after placing your order and emailed to you.</p>
                </div>
              )}

              {settings?.cod?.enabled === false && settings?.eft?.enabled === false && (
                <div className="checkout-note checkout-note--error" style={{ marginTop: '1rem' }}>
                  <p>No payment methods are currently available. Please contact us for assistance.</p>
                </div>
              )}
            </div>

            {/* Coupon code */}
            <div className="checkout-section">
              <h3 className="checkout-section__title">
                <Tag size={16} /> Coupon Code
              </h3>
              {coupon ? (
                <div className="checkout-coupon-active">
                  <div className="details">
                    <CheckCircle size={16} />
                    <div>
                      <p className="label">{coupon.code} applied</p>
                      <p className="sub">
                        {coupon.type === 'percentage' ? `${coupon.value}% off` : `${money(coupon.value)} off`} — saving {money(coupon.discount)}
                      </p>
                    </div>
                  </div>
                  <button type="button" onClick={removeCoupon} className="remove">
                    <X size={16} />
                  </button>
                </div>
              ) : (
                <div className="checkout-coupon">
                  <input value={couponInput} onChange={e => { setCouponInput(e.target.value.toUpperCase()); setCouponError(''); }}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); applyCoupon(e); } }}
                    placeholder="Enter coupon code"
                    className={`checkout-coupon__input ${couponError ? 'checkout-coupon__input--error' : ''}`} />
                  <button type="button" onClick={applyCoupon} disabled={couponLoading || !couponInput.trim()}
                    className="checkout-coupon__btn">
                    {couponLoading ? 'Checking…' : 'Apply'}
                  </button>
                </div>
              )}
              {couponError && <p className="checkout-note checkout-note--error checkout-note--shake" style={{ marginTop: '0.75rem' }}>{couponError}</p>}
            </div>

            {/* Order notes */}
            <div className="checkout-section">
              <h3 className="checkout-section__title">Order Notes (optional)</h3>
              <textarea value={form.notes} onChange={f('notes')} rows={3}
                placeholder="Special instructions, delivery notes, or any other requests…"
                className="checkout-textarea" />
            </div>

            {error && (
              <div className="checkout-note checkout-note--error checkout-note--shake">
                <AlertCircle size={17} />
                <p>{error}</p>
              </div>
            )}
          </form>

          {/* Summary sidebar */}
          <div className="order-summary">
            <h3 className="order-summary__title">Order Summary</h3>
            <div className="order-summary__list order-summary__list--scrollable">
              {detailed.map(({ product, qty, variation, price, size }) => (
                <div key={`${product.id}-${variation || ''}`} className="order-summary__item">
                  <div className="order-summary__item-img">
                    <img src={getPrimaryImg(product)} alt={product.name} onError={e=>{e.target.onerror=null;e.target.src='/assets/products/placeholder.svg'}} />
                  </div>
                  <div className="order-summary__item-details">
                    <p className="title">{product.name}</p>
                    <p className="meta">{size} ×{qty}</p>
                  </div>
                  <span className="order-summary__item-price">{money(price * qty)}</span>
                </div>
              ))}
            </div>

            <div className="order-summary__totals">
              <div className="order-summary__row">
                <span>Subtotal</span>
                <span className="order-summary__row-val" style={{ color: '#0B2545' }}>{money(subtotal)}</span>
              </div>
              {coupon && (
                <div className="order-summary__row" style={{ color: '#159A4C' }}>
                  <span>Coupon discount</span>
                  <span className="order-summary__row-val">−{money(couponDiscount)}</span>
                </div>
              )}
              <div className="order-summary__row">
                <span>Delivery to {form.addrProvince || 'SA'}</span>
                <span className="order-summary__row-val" style={{ color: delivery === 0 ? '#159A4C' : '#0B2545' }}>
                  {delivery === 0 ? 'FREE' : money(delivery)}
                </span>
              </div>
              {form.payment === 'COD' && codFee > 0 && (
                <div className="order-summary__row" style={{ color: '#d97706' }}>
                  <span>Cash on Delivery fee</span>
                  <span className="order-summary__row-val">{money(codFee)}</span>
                </div>
              )}
            </div>

            <div className="order-summary__grand-total">
              <span>Total</span>
              <span>{money(total)}</span>
            </div>

            <button type="submit" form="ck-form" disabled={placing} className="order-summary__btn">
              {placing ? <Spinner size={18} /> : <><Lock size={16} /> Place Order</>}
            </button>
            <p className="order-summary__secure">
              <Shield size={13} /> Secure checkout · SSL encrypted
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── OrderConfirmedPage ──────────────────────────────────────────────────────── */
export function OrderConfirmedPage({ order, onGoHome, onGoOrders }) {
  const [proof,    setProof]    = useState(null);
  const [uploading, setUploading] = useState(false);
  const [upError,  setUpError]  = useState('');
  const [upOk,     setUpOk]     = useState(false);
  const [settings, setSettings] = useState(null);
  const { apiBase, sessionToken, isLoggedIn } = useCustomer();
  const fileRef = useRef(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${apiBase}/api/settings`);
        if (res.ok) setSettings(await res.json());
      } catch {}
    })();
  }, [apiBase]);

  if (!order) {
    return (
      <div className="order-confirmed__error">
        <p>No recent order found.</p>
        <button onClick={onGoHome}>Return Home</button>
      </div>
    );
  }

  const { isCOD, isEFT } = { isCOD: order.paymentMethod === 'COD', isEFT: order.paymentMethod === 'EFT' };
  const eftConfig = order.eftBankDetails || settings?.eft || {};
  const showEFTInfo = isEFT && (!order.paymentStatus || order.paymentStatus.toLowerCase() !== 'paid');

  function copyToClipboard(text) {
    navigator.clipboard.writeText(text);
  }

  async function uploadProof(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const ALLOWED = new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf']);
    if (!ALLOWED.has(file.type)) { setUpError('Only PDF, JPG, PNG, or WEBP files are allowed.'); return; }
    if (file.size > 5 * 1024 * 1024) { setUpError('File must be under 5 MB.'); return; }
    setProof(file);
    setUpError('');
    setUploading(true);
    try {
      const headers = { 'Content-Type': file.type, 'x-filename': file.name };
      if (sessionToken) headers['Authorization'] = `Bearer ${sessionToken}`;
      const res = await fetch(`${apiBase}/api/proof?orderId=${encodeURIComponent(order.id)}`, {
        method: 'POST', headers, body: file,
      });
      const data = await res.json();
      if (!res.ok) { setUpError(data.error || 'Upload failed. Please try again.'); setProof(null); setUploading(false); return; }
      setUpOk(true);
      setProof(null);
    } catch { setUpError('Network error. Please try again.'); }
    setUploading(false);
  }

  return (
    <div className="order-confirmed ab-page-enter">
      <div className="order-confirmed__container">
        <div className="order-confirmed__card">
          <div className="order-confirmed__header">
            <div className="order-confirmed__icon">
              <CheckCircle size={32} />
            </div>
            <h1 className="order-confirmed__title">Order Confirmed!</h1>
            <p className="order-confirmed__sub">Thank you for shopping with Amahle Blue.</p>
            <span className="order-confirmed__number">Order {order.orderNumber}</span>
          </div>

          <div className="order-confirmed__body">
            {showEFTInfo && (
              <div className="order-confirmed__eft">
                <h3 className="order-confirmed__eft-title">
                  <CreditCard size={16} /> EFT Payment Instructions
                </h3>
                <div className="order-confirmed__eft-grid">
                  <div className="order-confirmed__eft-item">
                    <p className="label">Bank Name</p>
                    <p className="val">{eftConfig.bankName || 'FNB'}</p>
                  </div>
                  <div className="order-confirmed__eft-item">
                    <p className="label">Account Number</p>
                    <p className="val">
                      {eftConfig.accountNumber || '1234567890'}
                      <button onClick={() => copyToClipboard(eftConfig.accountNumber || '1234567890')} title="Copy">
                        <Copy size={14} />
                      </button>
                    </p>
                  </div>
                  <div className="order-confirmed__eft-item">
                    <p className="label">Branch Code</p>
                    <p className="val">{eftConfig.branchCode || '250655'}</p>
                  </div>
                  <div className="order-confirmed__eft-item">
                    <p className="label">Account Holder</p>
                    <p className="val">{eftConfig.accountHolder || 'Amahle Blue'}</p>
                  </div>
                </div>
                <p className="order-confirmed__eft-note">
                  Please use <strong>{order.eftReference || order.orderNumber}</strong> as your payment reference.
                </p>
              </div>
            )}

            {showEFTInfo && (
              <div style={{ marginTop: '1rem', padding: '1.25rem', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#0B2545', marginTop: 0, marginBottom: '0.75rem' }}>
                  Upload Proof of Payment
                </h3>
                {upOk ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1rem', background: '#f0fdf4', borderRadius: '8px', border: '1px solid #bbf7d0' }}>
                    <CheckCircle size={16} style={{ color: '#159A4C', flexShrink: 0 }} />
                    <p style={{ fontSize: '13px', color: '#15803d', margin: 0 }}>Proof uploaded! We'll verify and confirm your order shortly.</p>
                  </div>
                ) : isLoggedIn ? (
                  <>
                    <p style={{ fontSize: '13px', color: '#64748b', marginTop: 0, marginBottom: '0.75rem' }}>
                      Already paid? Upload your proof of payment to speed up order verification.
                    </p>
                    <input
                      ref={fileRef}
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp,application/pdf"
                      onChange={uploadProof}
                      style={{ display: 'none' }}
                    />
                    <button
                      type="button"
                      onClick={() => fileRef.current?.click()}
                      disabled={uploading}
                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', padding: '0.625rem 1.25rem', background: uploading ? '#94a3b8' : '#1E50E0', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: 700, cursor: uploading ? 'not-allowed' : 'pointer', width: '100%' }}
                    >
                      {uploading ? 'Uploading…' : (proof ? `Uploading: ${proof.name.slice(0, 28)}…` : 'Select & Upload Proof')}
                    </button>
                    {upError && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem', padding: '0.5rem 0.75rem', background: '#fef2f2', borderRadius: '8px', border: '1px solid #fecaca' }}>
                        <AlertCircle size={13} style={{ color: '#dc2626', flexShrink: 0 }} />
                        <p style={{ fontSize: '12px', color: '#dc2626', margin: 0 }}>{upError}</p>
                      </div>
                    )}
                    <p style={{ fontSize: '11px', color: '#94a3b8', marginTop: '0.5rem', marginBottom: 0 }}>Accepted: PDF, JPG, PNG, WEBP · Max 5 MB</p>
                  </>
                ) : (
                  <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>
                    <button type="button" onClick={onGoOrders} style={{ color: '#1E50E0', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600, padding: 0, fontSize: '13px' }}>Sign in &amp; go to My Orders</button>{' '}to upload your proof of payment.
                  </p>
                )}
              </div>
            )}

            <div className="order-confirmed__details">
              <div className="order-confirmed__section">
                <p className="title">Delivery Address</p>
                <p className="content" dangerouslySetInnerHTML={{ __html: (order.address || '').replace(/,\s*/g, ',<br>') }} />
              </div>
              <div className="order-confirmed__section">
                <p className="title">Contact Details</p>
                <p className="content">
                  {order.customer?.name}<br />
                  {order.customer?.email}<br />
                  {order.customer?.phone}
                </p>
              </div>
            </div>

            <div className="order-confirmed__total">
              <p className="label">Total Paid/Due</p>
              <p className="val">{money(order.total)}</p>
            </div>

            <div className="order-confirmed__actions">
              <button onClick={() => printInvoice(order)} className="order-confirmed__btn order-confirmed__btn--secondary">
                <Download size={16} /> Download Invoice
              </button>
              <button onClick={onGoOrders} className="order-confirmed__btn order-confirmed__btn--secondary">
                View My Orders
              </button>
              <button onClick={onGoHome} className="order-confirmed__btn order-confirmed__btn--primary">
                <Home size={16} /> Return to Store
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
