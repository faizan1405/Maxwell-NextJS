'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useCart, useCustomer, useProducts, money, getPrimaryImg, catOf } from '../../lib/storeContext';
import { formatZar } from '../../utils/currency';
import { printInvoice } from '../../utils/invoice';
import {
  ArrowLeft, Cart as CartIcon, CheckCircle, Trash, Minus, Plus, Bag, Lock, Shield,
  User, MapPin, CreditCard, Tag, X, AlertCircle, FileText as Copy, Download, Home
} from '../ui/Icons';
import { Spinner } from '../ui/index';

const PROVINCES = [
  'Gauteng', 'Western Cape', 'KwaZulu-Natal', 'Eastern Cape',
  'Mpumalanga', 'Limpopo', 'North West', 'Free State', 'Northern Cape',
];

/* ── Shared helpers ──────────────────────────────────────────────────────────── */
function CkField({ label, className = '', as: As = 'input', error = '', ...props }) {
  const describedBy = error ? `${props.name || label.replace(/\s+/g, '-').toLowerCase()}-error` : props['aria-describedby'];

  return (
    <div className={`ck-field ${className}`}>
      <label className="ck-field__label">{label}</label>
      <As
        {...props}
        aria-describedby={describedBy}
        aria-invalid={error ? 'true' : props['aria-invalid']}
        className={`ck-field__input ${error ? 'ck-field__input--error' : ''}`}
      />
      {error && <p id={describedBy} className="ck-field__error">{error}</p>}
    </div>
  );
}/* ── CartPage ────────────────────────────────────────────────────────────────── */
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

  const delivery = count > 0 ? (subtotal >= FREE_SHIP_DYN ? 0 : (defaultRate?.charge ?? 85)) : 0;
  const total = subtotal + delivery;
  const remaining = Math.max(0, FREE_SHIP_DYN - subtotal);
  const pct = Math.min(100, (subtotal / FREE_SHIP_DYN) * 100);

  if (count === 0) {
    return (
      <div className="checkout-empty">
        <div className="shop-page__empty-icon" style={{ marginBottom: '1.25rem' }}>
          <Bag size={36} />
        </div>
        <h2 className="checkout-empty__title">Your cart is empty</h2>
        <p className="checkout-empty__desc">Browse our cleaning, car-care and sanitiser range.</p>
        <button
          type="button"
          onClick={onGoHome}
          className="checkout-empty__btn"
        >
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
                  <span style={{ fontWeight: 600, color: '#111111' }}>free delivery</span>
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
                      <img src={getPrimaryImg(product)} alt={product.name} className="cart-item__img" onError={e => { e.target.onerror = null; e.target.src = '/assets/products/placeholder.svg' }} />
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
                <span className="order-summary__row-val" style={{ color: '#111111' }}>{money(subtotal)}</span>
              </div>
              <div className="order-summary__row">
                <span>Delivery</span>
                <span className="order-summary__row-val" style={{ color: delivery === 0 ? '#36F700' : '#111111' }}>
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
  const { customer, isLoggedIn, openAuth, apiBase } = useCustomer();
  const { detailed, subtotal, count, clear, coupon, setCoupon } = useCart();

  const [form, setForm] = useState({
    name: customer?.name || '', email: customer?.email || '', phone: customer?.phone || '',
    addrLine: '', addrCity: '', addrProvince: '', addrPostal: '', addrCountry: 'South Africa',
    payment: '', notes: '',
  });
  const [selectedAddr, setSelectedAddr] = useState('');
  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState('');

  /* Coupon state */
  const [couponInput, setCouponInput] = useState(coupon?.code || '');
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponError, setCouponError] = useState('');

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
        const res = await fetch(`${apiBase}/api/settings`);
        if (res.ok) setSettings(await res.json());
      } catch { }
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
  const codFee = form.payment === 'COD' ? (settings?.cod?.codFee || 0) : 0;
  const total = Math.max(0, subtotal + delivery - couponDiscount + codFee);
  const mobileNumber = form.phone.trim();
  const mobileMissing = !mobileNumber;

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
      const res = await fetch(`${apiBase}/api/coupons`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'validate', code, cartTotal: subtotal }),
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
    if (placing) return;
    if (!form.name.trim()) { setError('Please enter your full name.'); return; }
    if (!form.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) { setError('Please enter a valid email address.'); return; }
    if (!mobileNumber) { setError('Mobile number is required.'); return; }
    if (!isValidSaPhone(mobileNumber)) { setError('Please enter a valid South African phone number (e.g. 067 101 4345).'); return; }
    if (!form.addrLine.trim()) { setError('Please enter your street address.'); return; }
    if (!form.addrCity.trim()) { setError('Please enter your city or town.'); return; }
    if (!form.addrProvince) { setError('Please select a province so we can calculate delivery.'); return; }
    if (!form.payment) { setError('Please select a payment method to continue.'); return; }

    setPlacing(true); setError('');

    const addrString = [form.addrLine, form.addrCity, form.addrProvince, form.addrPostal, form.addrCountry]
      .filter(Boolean).join(', ');

    const payload = {
      customer: { name: form.name.trim(), email: form.email.trim(), phone: mobileNumber },
      address: addrString,
      addressDetails: { line: form.addrLine.trim(), city: form.addrCity.trim(), province: form.addrProvince, postalCode: form.addrPostal.trim(), country: form.addrCountry },
      items: detailed.map(({ product, qty, variation, price, size }) => ({ productId: product.id, variation, name: `${product.name} (${size})`, qty, price })),
      subtotal, delivery, couponCode: coupon?.code || null, total,
      payment: { method: form.payment, status: 'pending' },
      notes: form.notes.trim(),
      idempotencyKey: idemKey.current,
    };

    const controller = new AbortController();
    const tid = setTimeout(() => controller.abort(), 30000);
    try {
      const res = await fetch(`${apiBase}/api/orders`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify(payload), signal: controller.signal });
      clearTimeout(tid);

      const text = await res.text();
      let data = {};
      try { data = text ? JSON.parse(text) : {}; }
      catch { data = { error: `Unexpected response from server (status ${res.status}).` }; }

      if (!res.ok) { setError(data.error || 'Failed to place order. Please try again.'); return; }
      if (!data || !data.id) { setError('Order response was incomplete. Please refresh and check My Orders before retrying.'); return; }

      clear();
      try { localStorage.removeItem('ab_products'); } catch { }
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

          <form id="ck-form" onSubmit={placeOrder} className="checkout-form" noValidate>
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
                <CkField
                  label="Mobile number *"
                  name="phone"
                  type="tel"
                  value={form.phone}
                  onChange={f('phone')}
                  placeholder="067 000 0000"
                  autoComplete="tel"
                  aria-required="true"
                  error={mobileMissing ? 'Mobile number is required.' : ''}
                />
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
                    {['South Africa', 'Zimbabwe', 'Mozambique', 'Botswana', 'Namibia', 'Lesotho', 'Eswatini', 'Zambia', 'Other'].map(c => <option key={c}>{c}</option>)}
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
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
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
                    <img src={getPrimaryImg(product)} alt={product.name} onError={e => { e.target.onerror = null; e.target.src = '/assets/products/placeholder.svg' }} />
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
                <span className="order-summary__row-val" style={{ color: '#111111' }}>{money(subtotal)}</span>
              </div>
              {coupon && (
                <div className="order-summary__row" style={{ color: '#36F700' }}>
                  <span>Coupon discount</span>
                  <span className="order-summary__row-val">−{money(couponDiscount)}</span>
                </div>
              )}
              <div className="order-summary__row">
                <span>Delivery to {form.addrProvince || 'SA'}</span>
                <span className="order-summary__row-val" style={{ color: delivery === 0 ? '#36F700' : '#111111' }}>
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

            <button type="submit" form="ck-form" disabled={placing || mobileMissing} className="order-summary__btn">
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
  const [proof, setProof] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [upError, setUpError] = useState('');
  const [upOk, setUpOk] = useState(false);
  const [settings, setSettings] = useState(null);
  const { apiBase, isLoggedIn } = useCustomer();
  const { products } = useProducts();
  const fileRef = useRef(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${apiBase}/api/settings`);
        if (res.ok) setSettings(await res.json());
      } catch { }
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

  const payMethod = order.paymentMethod || order.payment?.method || '';
  const isCOD = payMethod === 'COD';
  const isEFT = payMethod === 'EFT';
  const eftConfig = order.eftBankDetails || settings?.eft || {};
  const payStatus = order.paymentStatus || (order.payment?.status === 'paid' ? 'Paid' : 'Pending');
  const isPaid = String(payStatus).toLowerCase() === 'paid' || order.payment?.status === 'paid';
  const showEFTInfo = isEFT && !isPaid;
  const vatAmount = (order.total || 0) - (order.total || 0) / 1.15;
  const amountPaid = isPaid ? order.total : 0;
  const balanceDue = isPaid ? 0 : order.total;

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
      const res = await fetch(`${apiBase}/api/proof?orderId=${encodeURIComponent(order.id)}`, {
        method: 'POST',
        headers: { 'Content-Type': file.type, 'x-filename': file.name },
        credentials: 'include',
        body: file,
      });
      const data = await res.json();
      if (!res.ok) { setUpError(data.error || 'Upload failed. Please try again.'); setProof(null); setUploading(false); return; }
      setUpOk(true);
      setProof(null);
    } catch { setUpError('Network error. Please try again.'); }
    setUploading(false);
  }

  const getProductImg = (productId) => {
    const prod = products?.find(p => p.id === productId);
    return prod ? getPrimaryImg(prod) : '/assets/products/placeholder.svg';
  };

  const getPaymentStatusLabel = () => {
    if (isPaid) return 'Paid';
    if (isEFT) {
      if (order.proofOfPaymentUrl || upOk) return 'Awaiting EFT Approval';
      return 'Awaiting EFT Payment';
    }
    return 'Cash Payment Pending';
  };

  const getPaymentBadgeClass = () => {
    if (isPaid) return 'acc-badge--green';
    if (isEFT && (order.proofOfPaymentUrl || upOk)) return 'acc-badge--blue';
    return 'acc-badge--amber';
  };

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

            {/* Useful Order Info Card */}
            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1rem 1.25rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                <span style={{ color: '#64748b' }}>Order Date & Time</span>
                <span style={{ fontWeight: 600, color: '#111111' }}>
                  {order.createdAt ? new Date(order.createdAt).toLocaleString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-'}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', alignItems: 'center' }}>
                <span style={{ color: '#64748b' }}>Order Status</span>
                <span className="acc-badge acc-badge--blue" style={{ fontSize: '11px', textTransform: 'uppercase', fontWeight: 700, padding: '2px 8px', borderRadius: '4px' }}>
                  {order.orderStatus || order.status || 'Pending'}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', alignItems: 'center' }}>
                <span style={{ color: '#64748b' }}>Payment Status</span>
                <span className={`acc-badge ${getPaymentBadgeClass()}`} style={{ fontSize: '11px', textTransform: 'uppercase', fontWeight: 700, padding: '2px 8px', borderRadius: '4px' }}>
                  {getPaymentStatusLabel()}
                </span>
              </div>
              <div style={{ borderTop: '1px dashed #e2e8f0', marginTop: '0.5rem', paddingTop: '0.5rem', fontSize: '13px', color: '#264CFF', fontWeight: 600 }}>
                {isCOD ? (
                  <span>Next Steps: Payment will be collected during delivery.</span>
                ) : (
                  <span>
                    {upOk || order.proofOfPaymentUrl ? (
                      <span style={{ color: '#36F700' }}>Next Steps: Payment proof has been uploaded. Administrative approval is pending.</span>
                    ) : (
                      <span>Next Steps: Payment proof is pending upload. Please transfer the funds using the details below and upload proof to activate processing.</span>
                    )}
                  </span>
                )}
              </div>
            </div>

            {showEFTInfo && (
              <div className="order-confirmed__eft">
                <h3 className="order-confirmed__eft-title">
                  <CreditCard size={16} /> EFT Bank Transfer Details
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
              <div style={{ padding: '1.25rem', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#111111', marginTop: 0, marginBottom: '0.75rem' }}>
                  Upload Proof of Payment
                </h3>
                {upOk ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1rem', background: '#f0fdf4', borderRadius: '8px', border: '1px solid #bbf7d0' }}>
                    <CheckCircle size={16} style={{ color: '#36F700', flexShrink: 0 }} />
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
                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', padding: '0.625rem 1.25rem', background: uploading ? '#94a3b8' : '#264CFF', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: 700, cursor: uploading ? 'not-allowed' : 'pointer', width: '100%' }}
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
                    <button type="button" onClick={onGoOrders} style={{ color: '#264CFF', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600, padding: 0, fontSize: '13px' }}>Sign in &amp; go to My Orders</button>{' '}to upload your proof of payment.
                  </p>
                )}
              </div>
            )}

            {/* Detailed Order Summary Section */}
            <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '1.5rem' }}>
              <h3 style={{ fontSize: '15px', fontWeight: 800, color: '#111111', margin: '0 0 1rem 0' }}>Order Summary</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {(order.items || []).map((item, idx) => (
                  <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ width: '4rem', height: '4rem', overflow: 'hidden', borderRadius: '8px', background: '#f8fafc', border: '1px solid #e2e8f0', flexShrink: 0 }}>
                      <img
                        src={getProductImg(item.productId)}
                        alt={item.name}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        onError={e => { e.target.onerror = null; e.target.src = '/assets/products/placeholder.svg'; }}
                      />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: '14px', fontWeight: 600, color: '#111111', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {item.name}
                      </p>
                      {item.variation && (
                        <p style={{ fontSize: '12px', color: '#64748b', margin: 0 }}>
                          Variation: {item.variation}
                        </p>
                      )}
                      <p style={{ fontSize: '12px', color: '#64748b', margin: '4px 0 0 0' }}>
                        Qty: {item.qty} × {money(item.price)}
                      </p>
                    </div>
                    <div style={{ fontWeight: 700, fontSize: '14px', color: '#111111', flexShrink: 0 }}>
                      {money(item.price * item.qty)}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Delivery address & contacts */}
            <div className="order-confirmed__details" style={{ borderTop: '1px solid #f1f5f9', paddingTop: '1.5rem' }}>
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

            {/* Payment breakdown */}
            <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13.5px', color: '#64748b' }}>
                <span>Subtotal</span>
                <span style={{ fontWeight: 600, color: '#111111' }}>{money(order.subtotal)}</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13.5px', color: '#64748b' }}>
                <span>Delivery</span>
                <span style={{ fontWeight: 600, color: order.delivery === 0 ? '#36F700' : '#111111' }}>
                  {order.delivery === 0 ? 'FREE' : money(order.delivery)}
                </span>
              </div>

              {(order.couponDiscount || 0) > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13.5px', color: '#36F700' }}>
                  <span>Coupon Deduction {order.couponCode ? `(${order.couponCode})` : ''}</span>
                  <span style={{ fontWeight: 700 }}>−{money(order.couponDiscount)}</span>
                </div>
              )}

              {(order.codFee || 0) > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13.5px', color: '#d97706' }}>
                  <span>COD Fee</span>
                  <span style={{ fontWeight: 600 }}>{money(order.codFee)}</span>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13.5px', color: '#64748b' }}>
                <span>Payment Method</span>
                <span style={{ fontWeight: 600, color: '#111111' }}>
                  {order.paymentMethod === 'COD' ? 'Cash on Delivery' : order.paymentMethod === 'EFT' ? 'EFT / Bank Transfer' : (order.paymentMethod || '')}
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13.5px', alignItems: 'center', color: '#64748b' }}>
                <span>Payment Status</span>
                <span className={`acc-badge ${getPaymentBadgeClass()}`} style={{ fontSize: '11px', textTransform: 'uppercase', fontWeight: 700, padding: '2px 8px', borderRadius: '4px' }}>
                  {getPaymentStatusLabel()}
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12.5px', color: '#64748b', borderTop: '1px dashed #e2e8f0', marginTop: '0.25rem', paddingTop: '0.5rem' }}>
                <span>VAT Included (15%)</span>
                <span>{money(vatAmount)}</span>
              </div>

              <div className="order-confirmed__total" style={{ borderTop: '1px solid #e2e8f0', marginTop: '0.25rem', paddingTop: '1rem' }}>
                <p className="label">Final Total</p>
                <p className="val">{money(order.total)}</p>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13.5px', marginTop: '0.25rem' }}>
                <span style={{ color: '#64748b' }}>Amount Paid</span>
                <span style={{ fontWeight: 600, color: '#111111' }}>{money(amountPaid)}</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', fontWeight: 700, color: balanceDue > 0 ? '#b45309' : '#36F700' }}>
                <span>Amount Due / Balance</span>
                <span>{money(balanceDue)}</span>
              </div>
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
