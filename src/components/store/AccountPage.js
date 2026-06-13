'use client';
import React, { useState, useEffect, useRef, useMemo, Fragment } from 'react';
import { useCustomer, useCart, useProducts, money, getPrimaryImg } from '../../lib/storeContext';
import { printInvoice } from '../../utils/invoice';
import { 
  CheckCircle, AlertCircle, Check, X, MapPin, Truck, XCircle, FileText, RefreshCw, Package, ChevronRight, Mail, Pencil, Trash, Plus, Star, User, ArrowLeft, LogOut
} from '../ui/Icons';

// Placeholder for ProductReviews
function ProductReviews({ productId }) {
  return (
    <div className="acc-panel acc-panel--slate">
      <p className="acc-panel-text acc-panel-text--slate">Reviews loading...</p>
    </div>
  );
}

function Stars({ value, size = 12 }) {
  const stars = [];
  for (let i = 1; i <= 5; i++) {
    stars.push(
      <Star key={i} size={size} className={i <= value ? 'acc-badge--amber' : 'acc-badge--slate'} fill={i <= value ? 'currentColor' : 'none'} style={i <= value ? { color: '#d97706' } : { color: '#cbd5e1' }} />
    );
  }
  return <div style={{ display: 'flex', gap: '2px' }}>{stars}</div>;
}

const ORDER_STATUSES = ['pending','confirmed','processing','packed','shipped','delivered'];

const STATUS_META = {
  pending:    { label:'Pending',    badge: 'amber' },
  confirmed:  { label:'Confirmed',  badge: 'blue' },
  processing: { label:'Processing', badge: 'indigo' },
  packed:     { label:'Packed',     badge: 'violet' },
  shipped:    { label:'Dispatched', badge: 'sky' },
  delivered:  { label:'Delivered',  badge: 'green' },
  cancelled:  { label:'Cancelled',  badge: 'red' },
  'Order Placed':     { label:'Order Placed',    badge: 'amber' },
  'Awaiting Payment': { label:'Awaiting Payment',badge: 'amber' },
  'Confirmed':        { label:'Confirmed',       badge: 'blue' },
  'Processing':       { label:'Processing',      badge: 'indigo' },
  'Dispatched':       { label:'Dispatched',      badge: 'sky' },
  'Delivered':        { label:'Delivered',       badge: 'green' },
  'Cancelled':        { label:'Cancelled',       badge: 'red' },
};

const PAY_STATUS_META = {
  'Cash Payment Pending':       { label:'Cash Payment Pending',       badge: 'amber' },
  'Awaiting EFT Payment':       { label:'Awaiting EFT Payment',       badge: 'amber' },
  'Proof of Payment Submitted': { label:'Proof Submitted',            badge: 'blue' },
  'Payment Verification Required':{ label:'Under Review',             badge: 'indigo' },
  'Paid':                       { label:'Paid',                       badge: 'green' },
  'Payment Rejected':           { label:'Payment Rejected',           badge: 'red' },
  'Corrected Proof Requested':  { label:'Correction Required',        badge: 'orange' },
  'Refunded':                   { label:'Refunded',                   badge: 'purple' },
  'pending':                    { label:'Pending',                    badge: 'amber' },
  'paid':                       { label:'Paid',                       badge: 'green' },
};

function fmtOrderDate(ts) {
  if (!ts) return '—';
  return new Date(ts).toLocaleDateString('en-ZA', { day:'numeric', month:'short', year:'numeric' });
}

function StatusBadge({ status }) {
  const m = STATUS_META[status] || STATUS_META.pending;
  return <span className={`acc-badge acc-badge--${m.badge}`}>{m.label}</span>;
}

function PayStatusBadge({ payStatus }) {
  const m = PAY_STATUS_META[payStatus] || { label: payStatus || 'Pending', badge: 'amber' };
  return <span className={`acc-badge acc-badge--${m.badge}`}>{m.label}</span>;
}

function CustomerAvatar({ name, size = 48 }) {
  const COLORS = ['#1E50E0','#0B2545','#159A4C','#7C3AED','#0E7490','#B45309'];
  const bg  = COLORS[(name || '?').charCodeAt(0) % COLORS.length];
  const txt = (name || '?').split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
  return (
    <div style={{ width:size, height:size, borderRadius:'50%', background:bg, color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', fontSize:size*0.38, fontWeight:700, flexShrink:0 }}>
      {txt}
    </div>
  );
}

function AccSpinner() {
  return <span style={{ width:14, height:14, border:'2px solid rgba(255,255,255,.3)', borderTopColor:'#fff', borderRadius:'50%', flexShrink:0, display:'inline-block', animation:'spin .7s linear infinite' }} />;
}

/* ─── Proof Upload Widget ────────────────────────────────────────────────────── */
function ProofUploadWidget({ order, sessionToken, apiBase, onProofUploaded }) {
  const [file,       setFile]       = useState(null);
  const [uploading,  setUploading]  = useState(false);
  const [error,      setError]      = useState('');
  const [dragOver,   setDragOver]   = useState(false);
  const fileRef = useRef(null);

  const ALLOWED_TYPES = new Set(['image/jpeg','image/jpg','image/png','image/webp','application/pdf']);
  const MAX_SIZE      = 5 * 1024 * 1024; // 5 MB

  function validateFile(f) {
    if (!f) return 'Please select a file.';
    if (!ALLOWED_TYPES.has(f.type)) return 'Only PDF, JPG, PNG, or WEBP files are allowed.';
    if (f.size > MAX_SIZE) return `File must be under 5 MB (selected: ${(f.size / 1048576).toFixed(1)} MB).`;
    return '';
  }

  function onFileChange(e) {
    const f = e.target.files?.[0];
    if (!f) return;
    const err = validateFile(f);
    setError(err);
    setFile(err ? null : f);
  }

  function onDrop(e) {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files?.[0];
    if (!f) return;
    const err = validateFile(f);
    setError(err);
    setFile(err ? null : f);
  }

  async function upload() {
    if (!file) { setError('Please select a file.'); return; }
    const err = validateFile(file);
    if (err) { setError(err); return; }

    setUploading(true); setError('');
    try {
      const res  = await fetch(`${apiBase}/api/proof?orderId=${encodeURIComponent(order.id)}`, {
        method:  'POST',
        headers: {
          'Content-Type': file.type,
          'x-filename':   file.name,
          'Authorization': `Bearer ${sessionToken}`,
        },
        body: file,
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Upload failed. Please try again.'); setUploading(false); return; }
      setFile(null);
      if (fileRef.current) fileRef.current.value = '';
      onProofUploaded && onProofUploaded(data.order || { ...order, paymentStatus: data.paymentStatus, proofOfPaymentUrl: data.proofUrl });
    } catch { setError('Network error. Please check your connection and try again.'); }
    setUploading(false);
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      <div
        onDragOver={e => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        className={`proof-widget__dropzone ${dragOver ? 'proof-widget__dropzone--active' : file ? 'proof-widget__dropzone--file' : ''}`}
        onClick={() => fileRef.current?.click()}
      >
        <input ref={fileRef} type="file" accept=".pdf,.jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp,application/pdf" onChange={onFileChange} style={{ display: 'none' }} />
        {file ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
            <CheckCircle size={18} style={{ color: '#159A4C', flexShrink: 0 }} />
            <div style={{ textAlign: 'left' }}>
              <p style={{ fontSize: '13px', fontWeight: 700, color: '#159A4C', margin: 0 }}>{file.name}</p>
              <p style={{ fontSize: '11px', color: '#64748b', margin: 0 }}>{(file.size / 1024).toFixed(0)} KB · {file.type.split('/')[1].toUpperCase()}</p>
            </div>
          </div>
        ) : (
          <Fragment>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.5" style={{ margin: '0 auto 0.5rem auto' }}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
            <p style={{ fontSize: '13px', fontWeight: 600, color: '#475569', margin: 0 }}>Drop your proof here or <span style={{ color: '#1E50E0' }}>browse</span></p>
            <p style={{ fontSize: '11px', color: '#94a3b8', marginTop: '0.25rem', marginBottom: 0 }}>PDF, JPG, PNG, WEBP · max 5 MB</p>
          </Fragment>
        )}
      </div>

      {error && (
        <div className="acc-panel acc-panel--red acc-panel-flex" style={{ padding: '0.5rem 0.75rem' }}>
          <AlertCircle size={14} className="acc-panel-icon" style={{ color: '#ef4444' }} />
          <p className="acc-panel-text acc-panel-text--red" style={{ fontSize: '12px' }}>{error}</p>
        </div>
      )}

      <button onClick={upload} disabled={uploading || !file} className="acc-btn-primary">
        {uploading ? (
          <Fragment><AccSpinner /> Uploading…</Fragment>
        ) : (
          <Fragment><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg> Upload Proof</Fragment>
        )}
      </button>
    </div>
  );
}

/* ─── Order Tracker ──────────────────────────────────────────────────────────── */
function OrderTracker({ orderStatus, status }) {
  const STEPS = ['Order Placed','Confirmed','Processing','Dispatched','Delivered'];
  const currentLabel = orderStatus || (() => {
    const map = { pending:'Order Placed', confirmed:'Confirmed', processing:'Processing', packed:'Processing', shipped:'Dispatched', delivered:'Delivered' };
    return map[status] || 'Order Placed';
  })();

  if (orderStatus === 'Awaiting Payment') {
    return (
      <div className="acc-panel acc-panel--amber acc-panel-flex">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2" className="acc-panel-icon"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
        <span className="acc-panel-title acc-panel-title--amber" style={{ fontSize: '14px' }}>Awaiting Payment</span>
      </div>
    );
  }
  if (orderStatus === 'Cancelled' || status === 'cancelled') {
    return (
      <div className="acc-panel acc-panel--red acc-panel-flex">
        <X size={16} className="acc-panel-icon" style={{ color: '#ef4444' }} />
        <span className="acc-panel-title acc-panel-title--red" style={{ fontSize: '14px' }}>Order Cancelled</span>
      </div>
    );
  }
  const activeIdx = STEPS.indexOf(currentLabel);
  return (
    <div className="order-tracker">
      {STEPS.map((s, i) => {
        const done    = i < activeIdx;
        const current = i === activeIdx;
        let circleClass = 'order-tracker__circle--pending';
        if (done) circleClass = 'order-tracker__circle--done';
        else if (current) circleClass = 'order-tracker__circle--current';
        
        return (
          <Fragment key={s}>
            <div className="order-tracker__step">
              <div className={`order-tracker__circle ${circleClass}`}>
                {done ? <Check size={13} /> : <span style={{ fontSize: '10px', fontWeight: 700 }}>{i+1}</span>}
              </div>
              <span style={{ fontSize: '9px', fontWeight: 600, textAlign: 'center', lineHeight: 1.2, color: (done || current) ? '#1E50E0' : '#94a3b8', maxWidth: '48px' }}>
                {s}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={`order-tracker__line ${i < activeIdx ? 'order-tracker__line--done' : 'order-tracker__line--pending'}`} />
            )}
          </Fragment>
        );
      })}
    </div>
  );
}

const CANCELLABLE_STATUSES = ['pending', 'confirmed', 'processing', 'Order Placed', 'Confirmed', 'Processing'];

/* ─── Order Detail Modal ─────────────────────────────────────────────────────── */
function OrderDetailModal({ order, sessionToken, apiBase, onClose, onReorder, onCancel, onProofUploaded }) {
  const [cancelling,  setCancelling]  = useState(false);
  const [cancelError, setCancelError] = useState('');

  if (!order) return null;

  const payMethod   = order.paymentMethod || order.payment?.method || '';
  const isCOD       = payMethod === 'COD';
  const isEFT       = payMethod === 'EFT';
  const payStatus   = order.paymentStatus || (order.payment?.status === 'paid' ? 'Paid' : isCOD ? 'Cash Payment Pending' : 'Awaiting EFT Payment');
  const ordStatus   = order.orderStatus   || order.status || 'pending';
  const bank        = order.eftBankDetails || {};
  const hasBankDetails = isEFT && (bank.bankName || bank.accountNumber);

  const canCancel = CANCELLABLE_STATUSES.includes(ordStatus);

  const canUploadProof = isEFT && ['Awaiting EFT Payment','Proof of Payment Submitted','Payment Verification Required','Corrected Proof Requested','Payment Rejected'].includes(payStatus);
  const isProofSubmitted  = isEFT && ['Proof of Payment Submitted','Payment Verification Required'].includes(payStatus);
  const isRejected        = payStatus === 'Payment Rejected';
  const isCorrectionNeeded = payStatus === 'Corrected Proof Requested';
  const isPaid            = payStatus === 'Paid' || order.payment?.status === 'paid';

  async function handleCancel() {
    if (!confirm('Cancel this order? This cannot be undone.')) return;
    setCancelling(true); setCancelError('');
    const result = await onCancel(order.id);
    setCancelling(false);
    if (result?.error) { setCancelError(result.error); return; }
    onClose();
  }


  return (
    <div className="acc-modal-overlay">
      <div onClick={onClose} className="acc-modal-backdrop" />
      <div className="acc-modal">
        <div className="acc-modal__header">
          <div>
            <div className="acc-modal__title-row">
              <h3 className="acc-modal__title">{order.orderNumber}</h3>
              <StatusBadge status={ordStatus} />
              <PayStatusBadge payStatus={payStatus} />
            </div>
            <p className="acc-modal__meta">
              {fmtOrderDate(order.createdAt)}
              {order.invoiceNumber && <span style={{ marginLeft: '0.5rem', color: '#cbd5e1' }}>· {order.invoiceNumber}</span>}
            </p>
          </div>
          <button onClick={onClose} className="acc-modal__close"><X size={18}/></button>
        </div>

        <div className="acc-modal__body">
          <div>
            <p className="acc-modal__section-title">Order Progress</p>
            <OrderTracker orderStatus={ordStatus} status={order.status} />
          </div>

          {isCOD && (
            <div className={`acc-panel ${isPaid ? 'acc-panel--green' : 'acc-panel--amber'}`}>
              <div className="acc-panel-flex">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={isPaid ? '#15803d' : '#d97706'} strokeWidth="2" className="acc-panel-icon"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>
                <div>
                  <p className={`acc-panel-title ${isPaid ? 'acc-panel-title--green' : 'acc-panel-title--amber'}`}>
                    {isPaid ? 'Cash Payment Collected' : 'Cash on Delivery'}
                  </p>
                  {!isPaid && (
                    <p className="acc-panel-text acc-panel-text--amber" style={{ marginTop: '0.125rem' }}>
                      Please have <strong>{money(order.total)}</strong> in cash ready when your order is delivered.
                    </p>
                  )}
                  {isPaid && (
                    <p className="acc-panel-text acc-panel-text--green" style={{ marginTop: '0.125rem' }}>Payment of <strong>{money(order.total)}</strong> received.</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {isEFT && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div className="acc-panel acc-panel--cobalt-light" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <p className="acc-modal__section-title" style={{ marginBottom: 0 }}>EFT Reference</p>
                  <PayStatusBadge payStatus={payStatus} />
                </div>
                <p style={{ fontFamily: 'monospace', fontSize: '20px', fontWeight: 800, color: '#1E50E0', margin: 0 }}>
                  {order.eftReference || order.orderNumber}
                </p>
                {!isPaid && (
                  <p style={{ fontSize: '12px', color: '#64748b', lineHeight: 1.4, margin: 0 }}>
                    Use this reference number when making your bank transfer. Amount payable: <strong>{money(order.total)}</strong>.
                  </p>
                )}
              </div>

              {isRejected && (
                <div className="acc-panel acc-panel--red acc-panel-flex">
                  <AlertCircle size={16} className="acc-panel-icon" style={{ color: '#ef4444' }} />
                  <div>
                    <p className="acc-panel-title acc-panel-title--red">Payment Rejected</p>
                    <p className="acc-panel-text acc-panel-text--red">Your proof of payment was rejected. Please upload a new, clear proof showing the correct amount and reference.</p>
                  </div>
                </div>
              )}
              {isCorrectionNeeded && (
                <div className="acc-panel acc-panel--orange acc-panel-flex">
                  <AlertCircle size={16} className="acc-panel-icon" style={{ color: '#f97316' }} />
                  <div>
                    <p className="acc-panel-title acc-panel-title--orange">Corrected Proof Required</p>
                    <p className="acc-panel-text acc-panel-text--orange">Please upload a corrected proof of payment as instructed.</p>
                  </div>
                </div>
              )}
              {isProofSubmitted && (
                <div className="acc-panel acc-panel--blue acc-panel-flex">
                  <CheckCircle size={16} className="acc-panel-icon" style={{ color: '#3b82f6' }} />
                  <div>
                    <p className="acc-panel-title acc-panel-title--blue">Proof Submitted — Awaiting Verification</p>
                    <p className="acc-panel-text acc-panel-text--blue">We'll verify your payment within 1–2 business days. You can upload a replacement if needed.</p>
                  </div>
                </div>
              )}
              {isPaid && (
                <div className="acc-panel acc-panel--green acc-panel-flex">
                  <CheckCircle size={16} className="acc-panel-icon" style={{ color: '#159A4C' }} />
                  <p className="acc-panel-title acc-panel-title--green">EFT Payment Verified — Thank you!</p>
                </div>
              )}

              {hasBankDetails && !isPaid && (
                <div className="acc-bank-details">
                  <div className="acc-bank-details__header">Bank Details</div>
                  <div className="acc-bank-details__list">
                    {bank.accountHolder && <div className="acc-bank-details__row"><span className="acc-bank-details__label">Account Holder</span><span className="acc-bank-details__value">{bank.accountHolder}</span></div>}
                    {bank.bankName      && <div className="acc-bank-details__row"><span className="acc-bank-details__label">Bank</span><span className="acc-bank-details__value">{bank.bankName}</span></div>}
                    {bank.accountNumber && <div className="acc-bank-details__row"><span className="acc-bank-details__label">Account Number</span><span className="acc-bank-details__value acc-bank-details__value--mono">{bank.accountNumber}</span></div>}
                    {bank.branchCode    && <div className="acc-bank-details__row"><span className="acc-bank-details__label">Branch Code</span><span className="acc-bank-details__value acc-bank-details__value--mono">{bank.branchCode}</span></div>}
                    {bank.accountType  && <div className="acc-bank-details__row"><span className="acc-bank-details__label">Account Type</span><span className="acc-bank-details__value">{bank.accountType}</span></div>}
                    {bank.swiftCode    && <div className="acc-bank-details__row"><span className="acc-bank-details__label">SWIFT Code</span><span className="acc-bank-details__value acc-bank-details__value--mono">{bank.swiftCode}</span></div>}
                  </div>
                  <div className="acc-bank-details__total">
                    <span style={{ fontSize: '13px', fontWeight: 700 }}>Amount Payable</span>
                    <span style={{ fontSize: '16px', fontWeight: 800 }}>{money(order.total)}</span>
                  </div>
                </div>
              )}

              {canUploadProof && (
                <div className="acc-panel acc-panel--slate" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <p style={{ fontSize: '12px', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>
                    {isProofSubmitted ? 'Replace Proof of Payment' : 'Upload Proof of Payment'}
                  </p>
                  <p style={{ fontSize: '12px', color: '#64748b', lineHeight: 1.4, margin: 0 }}>
                    Upload your bank proof of payment (PDF, JPG, PNG, or WEBP · max 5 MB).
                  </p>
                  <ProofUploadWidget order={order} sessionToken={sessionToken} apiBase={apiBase} onProofUploaded={onProofUploaded} />
                </div>
              )}
            </div>
          )}

          <div>
            <p className="acc-modal__section-title">Items Ordered</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {order.items?.map((item, i) => (
                <div key={i} className="acc-panel acc-panel--slate" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem 1rem' }}>
                  <div>
                    <p style={{ fontSize: '13.5px', fontWeight: 600, color: '#0B2545', margin: 0 }}>{item.name}</p>
                    <p style={{ fontSize: '12px', color: '#94a3b8', margin: 0 }}>Qty: {item.qty} × {money(item.price)}</p>
                  </div>
                  <span style={{ fontWeight: 700, color: '#0B2545', fontSize: '14px' }}>{money(item.price * item.qty)}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="acc-panel acc-panel--slate" style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem', padding: '0.75rem 1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}><span style={{ color: '#64748b' }}>Subtotal</span><span style={{ fontWeight: 600, color: '#0B2545' }}>{money(order.subtotal)}</span></div>
            {(order.couponDiscount || 0) > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}><span style={{ color: '#159A4C', fontWeight: 600 }}>Coupon ({order.couponCode})</span><span style={{ fontWeight: 700, color: '#159A4C' }}>−{money(order.couponDiscount)}</span></div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
              <span style={{ color: '#64748b' }}>Delivery</span>
              <span style={{ fontWeight: 600, color: order.delivery === 0 ? '#159A4C' : '#0B2545' }}>{order.delivery === 0 ? 'FREE' : money(order.delivery)}</span>
            </div>
            {(order.codFee || 0) > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}><span style={{ color: '#64748b' }}>COD Fee</span><span style={{ fontWeight: 600, color: '#0B2545' }}>{money(order.codFee)}</span></div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', borderTop: '1px solid #e2e8f0', paddingTop: '0.5rem', marginTop: '0.25rem' }}>
              <span style={{ fontWeight: 700, color: '#0B2545' }}>Total</span>
              <span style={{ fontWeight: 800, color: '#0B2545' }}>{money(order.total)}</span>
            </div>
          </div>

          {order.address && (
            <div className="acc-panel-flex">
              <MapPin size={16} className="acc-panel-icon" style={{ color: '#1E50E0' }} />
              <div>
                <p className="acc-modal__section-title" style={{ marginBottom: '0.125rem' }}>Delivery Address</p>
                <p style={{ fontSize: '13px', color: '#475569', margin: 0 }}>{order.address}</p>
              </div>
            </div>
          )}

          {order.trackingNumber && (
            <div className="acc-panel-flex">
              <Truck size={16} className="acc-panel-icon" style={{ color: '#1E50E0' }} />
              <div>
                <p className="acc-modal__section-title" style={{ marginBottom: '0.125rem' }}>Tracking</p>
                <p style={{ fontSize: '13px', color: '#475569', margin: 0 }}>{order.carrier ? `${order.carrier} · ` : ''}{order.trackingNumber}</p>
              </div>
            </div>
          )}

          {order.notes && <p className="acc-panel acc-panel--slate" style={{ fontSize: '12.5px', color: '#94a3b8', fontStyle: 'italic', margin: 0, padding: '0.75rem 1rem' }}>Note: {order.notes}</p>}
          {cancelError && <p style={{ fontSize: '12.5px', color: '#ef4444', fontWeight: 600, margin: 0 }}>{cancelError}</p>}
        </div>

        <div className="acc-modal__footer">
          {canCancel && (
            <button onClick={handleCancel} disabled={cancelling} className="acc-btn-outline acc-btn-outline--red">
              {cancelling ? <AccSpinner /> : <XCircle size={15} />}
              {cancelling ? 'Cancelling…' : 'Cancel Order'}
            </button>
          )}
          <button onClick={() => printInvoice(order)} className="acc-btn-outline">
            <FileText size={15} /> Invoice
          </button>
          <button onClick={onClose} className="acc-btn-outline">
            Close
          </button>
          <button onClick={() => { onReorder(order); onClose(); }} className="acc-btn-primary">
            <RefreshCw size={15} /> Reorder
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Orders Tab ─────────────────────────────────────────────────────────────── */
function OrdersTab({ sessionToken, apiBase, onReorder }) {
  const [orders,  setOrders]  = useState(null);
  const [error,   setError]   = useState('');
  const [viewing, setViewing] = useState(null);

  async function loadOrders() {
    try {
      const res  = await fetch(`${apiBase}/api/orders`, { headers: { 'Authorization': `Bearer ${sessionToken}` } });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Failed to load orders.'); setOrders([]); return; }
      const toMs = (v) => {
        if (v == null) return 0;
        if (typeof v === 'number') return Number.isFinite(v) ? v : 0;
        const t = new Date(v).getTime();
        return Number.isFinite(t) ? t : 0;
      };
      setOrders(Array.isArray(data) ? [...data].sort((a, b) => toMs(b.createdAt) - toMs(a.createdAt)) : []);
    } catch { setError('Network error. Please try again.'); setOrders([]); }
  }

  useEffect(() => { loadOrders(); }, [sessionToken, apiBase]);

  async function cancelOrder(orderId) {
    try {
      const res  = await fetch(`${apiBase}/api/orders`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${sessionToken}` },
        body:    JSON.stringify({ id: orderId, status: 'cancelled' }),
      });
      const data = await res.json();
      if (!res.ok) return { error: data.error || 'Failed to cancel order.' };
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: 'cancelled', orderStatus: 'Cancelled' } : o));
      return {};
    } catch { return { error: 'Network error. Please try again.' }; }
  }

  function handleProofUploaded(updatedOrder) {
    setOrders(prev => prev.map(o => o.id === updatedOrder.id ? { ...o, ...updatedOrder } : o));
    setViewing(prev => prev?.id === updatedOrder.id ? { ...prev, ...updatedOrder } : prev);
  }

  if (orders === null) return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem 0' }}>
      <span style={{ width: '2rem', height: '2rem', borderRadius: '50%', border: '3px solid rgba(30, 80, 224, 0.2)', borderTopColor: '#1E50E0', animation: 'spin .7s linear infinite' }}/>
    </div>
  );

  if (error) return <p style={{ textAlign: 'center', padding: '2.5rem 0', fontSize: '14px', color: '#ef4444' }}>{error}</p>;

  if (orders.length === 0) return (
    <div className="account-empty">
      <div className="account-empty__icon"><Package size={28} /></div>
      <p className="account-empty__title" style={{ fontSize: '1rem' }}>No orders yet</p>
      <p className="account-empty__desc">Your orders will appear here once you place one.</p>
    </div>
  );

  function isEFTNeedsAction(payStatus) {
    return ['Awaiting EFT Payment', 'Corrected Proof Requested', 'Payment Rejected'].includes(payStatus);
  }

  return (
    <div className="acc-orders">
      {orders.map(order => {
        const payMethod = order.paymentMethod || order.payment?.method || '';
        const payStatus = order.paymentStatus || (order.payment?.status === 'paid' ? 'Paid' : 'Pending');
        const ordStatus = order.orderStatus   || order.status || 'pending';
        const needsAction = isEFTNeedsAction(payStatus);

        return (
          <div key={order.id} onClick={() => setViewing(order)} className={`acc-order-card ${needsAction ? 'acc-order-card--needs-action' : ''}`}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div className={`acc-order-card__icon ${needsAction ? 'acc-order-card__icon--amber' : ''}`}>
                {payMethod === 'EFT' ? (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>
                ) : (
                  <Package size={20} />
                )}
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <span style={{ fontWeight: 700, color: '#0B2545', fontSize: '14px' }}>{order.orderNumber}</span>
                  <StatusBadge status={ordStatus} />
                  <PayStatusBadge payStatus={payStatus} />
                </div>
                <p style={{ fontSize: '12px', color: '#94a3b8', marginTop: '0.125rem', marginBottom: 0 }}>
                  {fmtOrderDate(order.createdAt)} · {order.items?.length} item{order.items?.length !== 1 ? 's' : ''}
                  {payMethod === 'COD' && ' · Cash on Delivery'}
                  {payMethod === 'EFT' && ' · EFT Transfer'}
                </p>
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <p style={{ fontWeight: 800, color: '#0B2545', fontSize: '15px', margin: 0 }}>{money(order.total)}</p>
              <ChevronRight size={16} style={{ color: '#cbd5e1', marginLeft: 'auto', marginTop: '0.25rem' }} />
            </div>
          </div>
        );
      })}
      {viewing && (
        <OrderDetailModal order={viewing} sessionToken={sessionToken} apiBase={apiBase} onClose={() => setViewing(null)} onReorder={onReorder} onCancel={cancelOrder} onProofUploaded={handleProofUploaded} />
      )}
    </div>
  );
}

/* ─── Profile Tab ────────────────────────────────────────────────────────────── */
function ProfileTab({ customer, sessionToken, apiBase, onUpdate }) {
  const [form,    setForm]    = useState({ name: customer?.name || '', phone: customer?.phone || '' });
  const [saving,  setSaving]  = useState(false);
  const [success, setSuccess] = useState(false);
  const [error,   setError]   = useState('');

  useEffect(() => { setForm({ name: customer?.name || '', phone: customer?.phone || '' }); }, [customer?.id]);

  async function saveProfile(e) {
    e.preventDefault();
    setSaving(true); setError(''); setSuccess(false);
    try {
      const res = await fetch(`${apiBase}/api/customer-auth`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${sessionToken}` },
        body: JSON.stringify({ name: form.name.trim(), phone: form.phone.trim() }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Failed to save.'); setSaving(false); return; }
      onUpdate(data.customer);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch { setError('Network error. Please try again.'); }
    setSaving(false);
  }

  return (
    <form onSubmit={saveProfile} className="acc-form">
      <div>
        <label className="acc-field__label">Email address</label>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', height: '2.75rem', borderRadius: '0.75rem', border: '1px solid #e2e8f0', backgroundColor: '#f8fafc', padding: '0 1rem' }}>
          <Mail size={15} style={{ color: '#94a3b8', flexShrink: 0 }} />
          <span style={{ fontSize: '13.5px', color: '#64748b' }}>{customer?.email}</span>
          <span className="acc-badge-pill acc-badge-pill--green" style={{ marginLeft: 'auto', color: '#159A4C', backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0' }}>Verified</span>
        </div>
      </div>
      <div>
        <label className="acc-field__label">Full name</label>
        <input type="text" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Your full name" className="acc-field__input" />
      </div>
      <div>
        <label className="acc-field__label">Phone number</label>
        <input type="tel" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="e.g. 067 101 4345" className="acc-field__input" />
      </div>
      {error   && <p key={error} style={{ fontSize: '12.5px', color: '#ef4444', margin: 0 }}>{error}</p>}
      {success && <p style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '12.5px', color: '#159A4C', fontWeight: 600, margin: 0 }}><Check size={14}/> Changes saved!</p>}
      <button type="submit" disabled={saving} className="acc-btn" style={{ width: 'fit-content' }}>
        {saving ? <Fragment><AccSpinner />Saving…</Fragment> : 'Save changes'}
      </button>
    </form>
  );
}

/* ─── Addresses Tab ──────────────────────────────────────────────────────────── */
function AddressesTab({ customer, sessionToken, apiBase, onUpdate }) {
  const [adding,  setAdding]  = useState(false);
  const [editing, setEditing] = useState(null);
  const [saving,  setSaving]  = useState(false);
  const [error,   setError]   = useState('');
  const blankAddr = { label:'Home', line:'', city:'', province:'', postalCode:'', isDefault:false };
  const [form, setForm] = useState(blankAddr);

  function startAdd()      { setForm(blankAddr); setEditing(null); setAdding(true); setError(''); }
  function startEdit(addr) { setForm({ ...addr }); setEditing(addr.id); setAdding(true); setError(''); }
  function cancelForm()    { setAdding(false); setEditing(null); setError(''); }

  async function submitForm(e) {
    e.preventDefault();
    if (!form.line.trim() || !form.city.trim()) { setError('Street address and city are required.'); return; }
    setSaving(true); setError('');
    try {
      const action = editing ? 'updateAddress' : 'addAddress';
      const body   = editing ? { action, addressId: editing, address: form } : { action, address: form };
      const res    = await fetch(`${apiBase}/api/customer-auth`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${sessionToken}` },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Failed to save address.'); setSaving(false); return; }
      onUpdate(data.customer);
      cancelForm();
    } catch { setError('Network error. Please try again.'); }
    setSaving(false);
  }

  async function deleteAddress(addressId) {
    if (!confirm('Remove this address?')) return;
    try {
      const res  = await fetch(`${apiBase}/api/customer-auth`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${sessionToken}` },
        body: JSON.stringify({ action: 'deleteAddress', addressId }),
      });
      const data = await res.json();
      if (res.ok) onUpdate(data.customer);
    } catch {}
  }

  async function setDefault(addressId) {
    try {
      const res  = await fetch(`${apiBase}/api/customer-auth`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${sessionToken}` },
        body: JSON.stringify({ action: 'setDefaultAddress', addressId }),
      });
      const data = await res.json();
      if (res.ok) onUpdate(data.customer);
    } catch {}
  }

  const addresses = customer?.addresses || [];

  return (
    <div className="acc-addresses">
      {addresses.length === 0 && !adding && (
        <div style={{ textAlign: 'center', padding: '2.5rem 0', border: '2px dashed #e2e8f0', borderRadius: '1rem' }}>
          <MapPin size={28} style={{ margin: '0 auto 0.75rem auto', color: '#cbd5e1' }} />
          <p style={{ fontWeight: 700, color: '#475569', margin: 0 }}>No saved addresses</p>
          <p style={{ fontSize: '14px', color: '#94a3b8', marginTop: '0.25rem', marginBottom: 0 }}>Add your delivery address for faster checkout.</p>
        </div>
      )}

      {addresses.map(addr => (
        <div key={addr.id} className={`acc-address-card ${addr.isDefault ? 'acc-address-card--default' : ''}`}>
          <div className="acc-flex-between">
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
              <div style={{ display: 'grid', height: '2.25rem', width: '2.25rem', placeItems: 'center', borderRadius: '0.75rem', backgroundColor: addr.isDefault ? 'rgba(30, 80, 224, 0.1)' : '#f1f5f9', color: addr.isDefault ? '#1E50E0' : '#94a3b8' }}>
                <MapPin size={16} />
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ fontWeight: 700, fontSize: '13.5px', color: '#0B2545' }}>{addr.label || 'Address'}</span>
                  {addr.isDefault && <span className="acc-badge-pill acc-badge-pill--cobalt">Default</span>}
                </div>
                <p style={{ fontSize: '12.5px', color: '#64748b', marginTop: '0.125rem', lineHeight: 1.6, margin: 0 }}>
                  {addr.line}{addr.city ? `, ${addr.city}` : ''}{addr.province ? `, ${addr.province}` : ''}{addr.postalCode ? ` ${addr.postalCode}` : ''}
                </p>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              {!addr.isDefault && (
                <button onClick={() => setDefault(addr.id)} style={{ fontSize: '11px', color: '#1E50E0', fontWeight: 600, padding: '0.25rem 0.5rem', borderRadius: '0.5rem', background: 'none', border: 'none', cursor: 'pointer' }}>Set default</button>
              )}
              <button onClick={() => startEdit(addr)} className="acc-icon-btn acc-icon-btn--edit"><Pencil size={14}/></button>
              <button onClick={() => deleteAddress(addr.id)} className="acc-icon-btn acc-icon-btn--delete"><Trash size={14}/></button>
            </div>
          </div>
        </div>
      ))}

      {!adding && (
        <button onClick={startAdd} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', height: '2.75rem', padding: '0 1.25rem', borderRadius: '0.75rem', border: '2px dashed rgba(30, 80, 224, 0.4)', color: '#1E50E0', fontWeight: 700, fontSize: '13.5px', background: 'none', cursor: 'pointer', width: '100%' }}>
          <Plus size={18} /> Add address
        </button>
      )}

      {adding && (
        <form onSubmit={submitForm} className="acc-address-form">
          <h4 style={{ fontWeight: 700, fontSize: '14px', color: '#0B2545', margin: 0 }}>{editing ? 'Edit Address' : 'New Address'}</h4>
          <div className="acc-address-form__grid">
            <div className="acc-address-form__col-full">
              <label className="acc-field__label">Label</label>
              <select value={form.label} onChange={e => setForm(f => ({ ...f, label: e.target.value }))} className="acc-address-form__select">
                <option>Home</option><option>Work</option><option>Other</option>
              </select>
            </div>
            <div className="acc-address-form__col-full">
              <label className="acc-field__label">Street address *</label>
              <input type="text" value={form.line} onChange={e => setForm(f => ({ ...f, line: e.target.value }))} placeholder="12 Main Street, Unit 4" required autoFocus className="acc-address-form__input" />
            </div>
            <div>
              <label className="acc-field__label">City *</label>
              <input type="text" value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} placeholder="Johannesburg" required className="acc-address-form__input" />
            </div>
            <div>
              <label className="acc-field__label">Province</label>
              <select value={form.province} onChange={e => setForm(f => ({ ...f, province: e.target.value }))} className="acc-address-form__select">
                <option value="">Select…</option>
                {['Gauteng','Western Cape','KwaZulu-Natal','Eastern Cape','Mpumalanga','Limpopo','North West','Free State','Northern Cape'].map(p=><option key={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label className="acc-field__label">Postal code</label>
              <input type="text" value={form.postalCode} onChange={e => setForm(f => ({ ...f, postalCode: e.target.value }))} placeholder="2000" className="acc-address-form__input" />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', paddingTop: '1.25rem' }}>
              <input type="checkbox" id="isDefault" checked={form.isDefault} onChange={e => setForm(f => ({ ...f, isDefault: e.target.checked }))} className="acc-checkbox" />
              <label htmlFor="isDefault" className="acc-checkbox-label">Set as default</label>
            </div>
          </div>
          {error && <p style={{ fontSize: '12px', color: '#ef4444', margin: 0 }}>{error}</p>}
          <div style={{ display: 'flex', gap: '0.5rem', paddingTop: '0.25rem' }}>
            <button type="button" onClick={cancelForm} className="acc-btn-outline" style={{ flex: 1 }}>Cancel</button>
            <button type="submit" disabled={saving} className="acc-btn-primary" style={{ flex: 1 }}>
              {saving ? <Fragment><AccSpinner />Saving…</Fragment> : (editing ? 'Save changes' : 'Add address')}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

/* ─── Reviews Tab ────────────────────────────────────────────────────────────── */
function ReviewsTab({ customer, sessionToken, apiBase }) {
  const [orders,  setOrders]  = useState(null);
  const [reviews, setReviews] = useState(null);
  const { products } = useProducts();

  useEffect(() => {
    if (!sessionToken) return;
    (async () => {
      try {
        const [ordRes, revRes] = await Promise.all([
          fetch(`${apiBase}/api/orders`,  { headers: { 'Authorization': `Bearer ${sessionToken}` } }),
          fetch(`${apiBase}/api/reviews`, { headers: { 'Authorization': `Bearer ${sessionToken}` } }),
        ]);
        const ordData = ordRes.ok ? await ordRes.json() : [];
        const revData = revRes.ok ? await revRes.json() : [];
        setOrders(Array.isArray(ordData) ? ordData : []);
        setReviews(Array.isArray(revData) ? revData.filter(r => r.customerId === customer?.id || r.email === customer?.email) : []);
      } catch { setOrders([]); setReviews([]); }
    })();
  }, [sessionToken, apiBase, customer?.id]);

  const reviewableProducts = useMemo(() => {
    if (!orders) return [];
    const map = {};
    orders.filter(o => ['processing','shipped','delivered','Processing','Dispatched','Delivered'].includes(o.status || o.orderStatus)).forEach(o => {
      o.items?.forEach(item => { if (!map[item.productId]) map[item.productId] = item; });
    });
    return Object.values(map);
  }, [orders]);

  const myReviewMap = useMemo(() => {
    const m = {};
    (reviews || []).forEach(r => { m[r.productId] = r; });
    return m;
  }, [reviews]);

  const loading = orders === null || reviews === null;

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem 0' }}>
      <AccSpinner />
    </div>
  );

  if (reviewableProducts.length === 0) return (
    <div className="account-empty">
      <Star size={32} style={{ color: '#cbd5e1', marginBottom: '0.75rem' }} />
      <p style={{ fontWeight: 700, color: '#475569', margin: 0 }}>No products to review yet</p>
      <p style={{ fontSize: '14px', color: '#94a3b8', marginTop: '0.25rem', marginBottom: 0 }}>Purchase and receive products to unlock reviews.</p>
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxWidth: '32rem' }}>
      {reviewableProducts.map(item => {
        const product  = (products || []).find(p => p.id === item.productId);
        const myReview = myReviewMap[item.productId];
        return (
          <div key={item.productId} className="acc-review-card">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
              {product && (
                <img src={getPrimaryImg(product)} alt={product?.name || item.name} style={{ width: '3.5rem', height: '3.5rem', borderRadius: '0.75rem', objectFit: 'cover', border: '1px solid #f1f5f9', backgroundColor: '#f8fafc' }} onError={e=>{e.target.onerror=null;e.target.src='/assets/products/placeholder.svg'}} />
              )}
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontWeight: 700, fontSize: '14px', color: '#0B2545', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{product?.name || item.name}</p>
                <p style={{ fontSize: '12px', color: '#94a3b8', margin: 0 }}>{product?.size || ''}</p>
                {myReview && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', marginTop: '0.25rem' }}>
                    <Stars value={myReview.rating} size={12} />
                    <span style={{ fontSize: '11px', fontWeight: 600, color: '#64748b', textTransform: 'capitalize' }}>{myReview.status}</span>
                  </div>
                )}
              </div>
            </div>
            <ProductReviews productId={item.productId} />
          </div>
        );
      })}
    </div>
  );
}

/* ─── Account Page ───────────────────────────────────────────────────────────── */
export default function AccountPage({ onGoHome }) {
  const { customer, sessionToken, logout, updateCustomerData, apiBase, openAuth } = useCustomer();
  const { add, setOpen: openCart } = useCart();
  const { products } = useProducts();
  const [tab, setTab] = useState('profile');

  useEffect(() => {
    const h = (e) => setTab(e.detail || 'profile');
    window.addEventListener('ab:account-tab', h);
    return () => window.removeEventListener('ab:account-tab', h);
  }, []);

  if (!customer) {
    return (
      <div className="account-empty">
        <div className="account-empty__icon">
          <User size={36} />
        </div>
        <h2 className="account-empty__title">Sign in to your account</h2>
        <p className="account-empty__desc">Track your orders, upload proof of payment, manage addresses, and speed up checkout.</p>
        <div className="account-empty__actions">
          <button onClick={openAuth} className="primary">Sign in</button>
          <button onClick={onGoHome} className="secondary">Continue shopping</button>
        </div>
      </div>
    );
  }

  async function handleReorder(order) {
    if (!order.items?.length) return;
    for (const item of order.items) {
      const product = (products || []).find(p => p.id === item.productId);
      if (product) add(product, item.qty);
    }
    openCart(true);
    onGoHome && onGoHome();
  }

  const displayName = customer.name || customer.email.split('@')[0];

  return (
    <div className="account-page">
      <div className="account-header">
        <div className="account-header__inner">
          <button onClick={onGoHome} className="account-header__back">
            <ArrowLeft size={16} /> Back to store
          </button>
          <div className="account-header__main">
            <CustomerAvatar name={displayName} size={52} />
            <div>
              <h1 className="account-header__title">{customer.name || 'My Account'}</h1>
              <p className="account-header__meta">
                <Mail size={12} />{customer.email}
                <span className="account-header__verified">· Verified</span>
              </p>
            </div>
            <button onClick={logout} className="account-header__logout">
              <LogOut size={15} /> Sign out
            </button>
          </div>
        </div>
      </div>

      <div className="account-main">
        <div className="account-tabs">
          {[
            { id:'profile',   icon:<User size={15}/>,    label:'Profile'    },
            { id:'orders',    icon:<Package size={15}/>, label:'My Orders'  },
            { id:'addresses', icon:<MapPin size={15}/>,  label:'Addresses'  },
            { id:'reviews',   icon:<Star size={15}/>,    label:'Reviews'    },
          ].map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} className={`account-tab-btn ${tab === t.id ? 'account-tab-btn--active' : 'account-tab-btn--inactive'}`}>
              {t.icon}{t.label}
            </button>
          ))}
        </div>

        <div key={tab} className="ab-fade-in">
          {tab === 'profile'   && <ProfileTab   customer={customer} sessionToken={sessionToken} apiBase={apiBase} onUpdate={updateCustomerData} />}
          {tab === 'orders'    && <OrdersTab    sessionToken={sessionToken} apiBase={apiBase} onReorder={handleReorder} />}
          {tab === 'addresses' && <AddressesTab customer={customer} sessionToken={sessionToken} apiBase={apiBase} onUpdate={updateCustomerData} />}
          {tab === 'reviews'   && <ReviewsTab   customer={customer} sessionToken={sessionToken} apiBase={apiBase} />}
        </div>
      </div>
    </div>
  );
}
