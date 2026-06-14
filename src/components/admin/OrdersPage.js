'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth, useAdmin, fmtMoney, fmtDate, fmtDateTime, initials } from './AdminProvider';
import * as Icon from '../ui/Icons';
import { Avatar, Btn, Modal, SearchInput, Empty, Pagination, AdminToast, Spinner } from '../ui/index';
import { formatZar } from '../../utils/currency';
import { printInvoice } from '../../utils/invoice';

const ORDERS_PER_PAGE = 20;

const ORDER_STATUS_OPTIONS = [
  { value:'all',              label:'All Orders' },
  { value:'Awaiting Payment', label:'Awaiting Payment' },
  { value:'Order Placed',     label:'Order Placed' },
  { value:'Confirmed',        label:'Confirmed' },
  { value:'Processing',       label:'Processing' },
  { value:'Dispatched',       label:'Dispatched' },
  { value:'Delivered',        label:'Delivered' },
  { value:'Cancelled',        label:'Cancelled' },
  { value:'Return Requested', label:'Return Requested' },
  { value:'Return Approved',  label:'Return Approved' },
  { value:'Return Rejected',  label:'Return Rejected' },
  { value:'Refunded',         label:'Refunded' },
  { value:'Refund Not Applicable', label:'Refund Not Applicable' },
  { value:'pending',          label:'Pending (legacy)' },
  { value:'confirmed',        label:'Confirmed (legacy)' },
  { value:'processing',       label:'Processing (legacy)' },
  { value:'shipped',          label:'Shipped (legacy)' },
  { value:'delivered',        label:'Delivered (legacy)' },
  { value:'cancelled',        label:'Cancelled (legacy)' },
];

const PAY_STATUS_OPTIONS = [
  { value:'all',                            label:'All Payments' },
  { value:'Cash Payment Pending',           label:'Cash Payment Pending' },
  { value:'Awaiting EFT Payment',           label:'Awaiting EFT Payment' },
  { value:'Proof of Payment Submitted',     label:'Pending Verification' },
  { value:'Paid',                           label:'Approved' },
  { value:'Payment Rejected',               label:'Rejected' },
  { value:'Corrected Proof Requested',      label:'Corrected Proof Requested' },
  { value:'Refunded',                       label:'Refunded' },
  { value:'Cancelled',                      label:'Cancelled' },
  { value:'pending',  label:'Pending (legacy)' },
  { value:'paid',     label:'Paid (legacy)' },
  { value:'refunded', label:'Refunded (legacy)' },
  { value:'failed',   label:'Failed (legacy)' },
];

const PAY_METHOD_OPTIONS = [
  { value:'all',  label:'All Methods' },
  { value:'COD',  label:'Cash on Delivery' },
  { value:'EFT',  label:'EFT' },
];

function orderStatusClass(s) {
  const map = {
    'Order Placed':'admin-badge--blue',
    'Awaiting Payment':'admin-badge--amber',
    'Confirmed':'admin-badge--teal',
    'Processing':'admin-badge--blue',
    'Dispatched':'admin-badge--indigo',
    'Delivered':'admin-badge--green',
    'Cancelled':'admin-badge--red',
    'Return Requested':'admin-badge--orange',
    'Return Approved':'admin-badge--teal',
    'Return Rejected':'admin-badge--red',
    'Refunded':'admin-badge--purple',
    'Refund Not Applicable':'admin-badge--slate',
    pending:'admin-badge--amber',
    confirmed:'admin-badge--teal',
    processing:'admin-badge--blue',
    shipped:'admin-badge--indigo',
    delivered:'admin-badge--green',
    cancelled:'admin-badge--red',
  };
  return map[s] || 'admin-badge--slate';
}

function payStatusClass(s) {
  const map = {
    'Cash Payment Pending':'admin-badge--amber',
    'Awaiting EFT Payment':'admin-badge--amber',
    'Proof of Payment Submitted':'admin-badge--blue',
    'Payment Verification Required':'admin-badge--purple',
    'Paid':'admin-badge--green',
    'Payment Rejected':'admin-badge--red',
    'Corrected Proof Requested':'admin-badge--orange',
    'Refunded':'admin-badge--purple',
    'Cancelled':'admin-badge--slate',
    pending:'admin-badge--amber',
    paid:'admin-badge--green',
    refunded:'admin-badge--purple',
    failed:'admin-badge--red',
  };
  return map[s] || 'admin-badge--slate';
}

function OrderStatusBadge({ status }) {
  if (!status) return null;
  return <span className={`admin-badge ${orderStatusClass(status)}`}>{status}</span>;
}

function PayStatusBadge({ status }) {
  if (!status) return null;
  let label = status;
  if (status === 'Proof of Payment Submitted' || status === 'Payment Verification Required') {
    label = 'Pending Verification';
  } else if (status === 'Paid' || status === 'paid') {
    label = 'Approved';
  } else if (status === 'Payment Rejected') {
    label = 'Rejected';
  }
  return <span className={`admin-badge ${payStatusClass(status)}`}>{label}</span>;
}

function OrderConfirmDialog({ open, title, message, note, noteLabel, noteRequired, confirmLabel, confirmVariant='danger', busy=false, onConfirm, onCancel }) {
  const [val, setVal] = useState('');
  useEffect(() => { if (open) setVal(''); }, [open]);
  if (!open) return null;
  return (
    <Modal
      open={open}
      onClose={busy ? () => {} : onCancel}
      title={title}
      size="sm"
      footer={
        <>
          <Btn variant="ghost" size="sm" onClick={onCancel} disabled={busy}>Cancel</Btn>
          <Btn variant={confirmVariant} size="sm"
            disabled={busy || (note && noteRequired && !val.trim())}
            onClick={() => onConfirm(val.trim())}>
            {busy ? 'Saving…' : (confirmLabel || 'Confirm')}
          </Btn>
        </>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {message && <p style={{ fontSize: '0.875rem', color: '#64748b', margin: 0, lineHeight: 1.6 }}>{message}</p>}
        {note && (
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: '0.25rem' }}>
              {noteLabel || 'Note'}{noteRequired ? ' *' : ' (optional)'}
            </label>
            <textarea
              value={val}
              onChange={e=>setVal(e.target.value)}
              rows={3}
              style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: '0.5rem', border: '1px solid #e2e8f0', fontSize: '0.875rem', outline: 'none', resize: 'none' }}
              onFocus={(e) => { e.target.style.borderColor = '#264CFF'; e.target.style.boxShadow = '0 0 0 2px rgba(38,76,255,0.2)'; }}
              onBlur={(e) => { e.target.style.borderColor = '#e2e8f0'; e.target.style.boxShadow = 'none'; }}
            />
          </div>
        )}
      </div>
    </Modal>
  );
}

function PaymentHistorySection({ history }) {
  if (!Array.isArray(history) || !history.length) return (
    <p className="admin-order-detail__info-box admin-order-detail__info-box--empty">No payment status history.</p>
  );
  return (
    <div className="admin-order-detail__history-list">
      {[...history].reverse().map((h, i) => (
        <div key={i} className="admin-order-detail__history-item">
          <div className="admin-order-detail__history-dot"/>
          <div className="admin-order-detail__history-content">
            <div className="admin-order-detail__history-change">
              <span className="admin-order-detail__history-prev">{h.previousStatus}</span>
              <span className="admin-order-detail__history-arrow">→</span>
              <span className="admin-order-detail__history-next">{h.newStatus}</span>
            </div>
            {h.note && <p className="admin-order-detail__history-note">"{h.note}"</p>}
            <p className="admin-order-detail__history-meta">
              {h.changedBy || 'system'} · {h.createdAt ? new Date(h.createdAt).toLocaleString('en-ZA', {day:'numeric',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'}) : ''}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

function ProofViewer({ order }) {
  const url  = order.proofOfPaymentUrl;
  const meta = order.proofOfPaymentMetadata || {};
  if (!url) return <p className="admin-order-detail__info-box admin-order-detail__info-box--empty">No proof uploaded.</p>;

  const isPdf = meta.mimeType === 'application/pdf' || url.toLowerCase().endsWith('.pdf');

  return (
    <div className="admin-order-detail__proof-item">
      <div className="admin-order-detail__proof-icon">{isPdf ? '📄' : '🖼️'}</div>
      <div className="admin-order-detail__proof-info">
        <p className="admin-order-detail__proof-name">{meta.filename || 'Proof of payment'}</p>
        <p className="admin-order-detail__proof-meta">
          {meta.mimeType || ''}{meta.fileSize ? ` · ${(meta.fileSize / 1024).toFixed(0)} KB` : ''}
          {meta.uploadedAt ? ` · Uploaded ${new Date(meta.uploadedAt).toLocaleDateString('en-ZA',{day:'numeric',month:'short',year:'numeric'})}` : ''}
        </p>
      </div>
      <a href={url} target="_blank" rel="noreferrer" className="admin-order-detail__proof-view">
        View
      </a>
    </div>
  );
}

function EftActions({ order, onAction, disabled = false }) {
  const payStatus = order.paymentStatus || order.payment?.status || '';
  const hasProof  = !!order.proofOfPaymentUrl;

  const canVerify  = hasProof && (payStatus === 'Proof of Payment Submitted' || payStatus === 'Payment Verification Required');
  const canReject  = hasProof && (payStatus === 'Proof of Payment Submitted' || payStatus === 'Payment Verification Required');
  const canCorrect = hasProof && (payStatus === 'Proof of Payment Submitted' || payStatus === 'Payment Verification Required');
  const isAlreadyPaid = payStatus === 'Paid' || order.payment?.status === 'paid';
  const canMoveToConfirmed = (order.orderStatus === 'Awaiting Payment' || order.status === 'pending') && isAlreadyPaid;

  if (isAlreadyPaid && !canMoveToConfirmed) {
    return <p className="admin-order-detail__action-msg admin-order-detail__action-msg--success">✓ Payment verified and paid</p>;
  }

  return (
    <div className="admin-order-detail__actions-wrap">
      {canVerify && (
        <Btn variant="success" size="sm" disabled={disabled} onClick={() => onAction('verify')}>
          ✓ Approve Payment
        </Btn>
      )}
      {canReject && (
        <Btn variant="danger" size="sm" disabled={disabled} onClick={() => onAction('reject')}>
          ✗ Reject Payment
        </Btn>
      )}
      {canCorrect && (
        <Btn variant="secondary" size="sm" disabled={disabled} onClick={() => onAction('correct')}>
          ↩ Request Correction
        </Btn>
      )}
      {canMoveToConfirmed && (
        <Btn variant="primary" size="sm" disabled={disabled} onClick={() => onAction('moveConfirmed')}>
          → Move to Confirmed
        </Btn>
      )}
      {!hasProof && !isAlreadyPaid && (
        <p className="admin-order-detail__action-msg admin-order-detail__action-msg--wait">Awaiting proof of payment upload from customer.</p>
      )}
    </div>
  );
}

function CodActions({ order, onAction, disabled = false }) {
  const os = order.orderStatus || order.status || '';
  const ps = order.paymentStatus || order.payment?.status || '';

  const isCashCollected = ps === 'Paid' || order.payment?.status === 'paid';

  const NEXT_ORDER = {
    'Order Placed':     { next:'Confirmed',  label:'Confirm Order',    variant:'success' },
    'Awaiting Payment': { next:'Confirmed',  label:'Confirm Order',    variant:'success' },
    pending:            { next:'Confirmed',  label:'Confirm Order',    variant:'success' },
    'Confirmed':        { next:'Processing', label:'Mark Processing',   variant:'primary' },
    confirmed:          { next:'Processing', label:'Mark Processing',   variant:'primary' },
    'Processing':       { next:'Dispatched', label:'Mark Dispatched',   variant:'primary' },
    processing:         { next:'Dispatched', label:'Mark Dispatched',   variant:'primary' },
    'Dispatched':       { next:'Delivered',  label:'Mark Delivered',    variant:'primary' },
    shipped:            { next:'Delivered',  label:'Mark Delivered',    variant:'primary' },
    'Delivered':        { next: null,        label:'Delivered',         variant:'success' },
    delivered:          { next: null,        label:'Delivered',         variant:'success' },
  };

  const flow = NEXT_ORDER[os];

  return (
    <div className="admin-order-detail__actions-wrap">
      {flow?.next && (
        <Btn variant={flow.variant} size="sm" disabled={disabled} onClick={() => onAction('orderStatus', flow.next)}>
          {flow.label}
        </Btn>
      )}
      {(os === 'Delivered' || os === 'delivered') && !isCashCollected && (
        <Btn variant="success" size="sm" disabled={disabled} onClick={() => onAction('cashCollected')}>
          💵 Mark Cash Collected
        </Btn>
      )}
      {isCashCollected && (os === 'Delivered' || os === 'delivered') && (
        <p className="admin-order-detail__action-msg admin-order-detail__action-msg--success">✓ Cash collected</p>
      )}
    </div>
  );
}

function OrderDetail({ order, saving, onClose, onOrderStatusChange, onPayStatusChange, onNoteChange, onInternalNoteAdd, onTrackingChange }) {
  const { fmtMoney, fmtDateTime } = useAdmin();
  const { isAdmin, session } = useAuth();

  const [noteEdit,    setNoteEdit]    = useState(false);
  const [note,        setNote]        = useState('');
  const [trackEdit,   setTrackEdit]   = useState(false);
  const [trackNum,    setTrackNum]    = useState('');
  const [carrier,     setCarrier]     = useState('');
  const [trackLink,   setTrackLink]   = useState('');
  const [dispatchDate, setDispatchDate] = useState('');
  const [internalNote, setInternalNote] = useState('');
  const [confirmDlg,  setConfirmDlg]  = useState(null);
  const [activeTab,   setActiveTab]   = useState('details');

  const getSafeISODate = (val) => {
    if (!val) return '';
    try {
      const d = new Date(val);
      return isNaN(d.getTime()) ? '' : d.toISOString().split('T')[0];
    } catch {
      return '';
    }
  };

  const getSafeLocalDate = (val) => {
    if (!val) return '';
    try {
      const d = new Date(val);
      return isNaN(d.getTime()) ? '' : d.toLocaleDateString('en-ZA');
    } catch {
      return '';
    }
  };

  useEffect(() => {
    if (!order) return;
    setNote(order.notes || '');
    setTrackNum(order.trackingNumber || '');
    setCarrier(order.carrier || '');
    setTrackLink(order.trackingLink || '');
    setDispatchDate(getSafeISODate(order.dispatchDate));
  }, [order?.notes, order?.trackingNumber, order?.carrier, order?.trackingLink, order?.dispatchDate]);

  useEffect(() => {
    if (order) {
      setNoteEdit(false);
      setTrackEdit(false);
      setActiveTab('details');
    }
  }, [order?.id]);

  if (!order) return null;

  const payMethod = order.paymentMethod || order.payment?.method || '';
  const isEFT     = payMethod === 'EFT';
  const isCOD     = payMethod === 'COD';
  const orderStatus = order.orderStatus || order.status || '';
  const payStatus   = order.paymentStatus || (order.payment?.status === 'paid' ? 'Paid' : order.payment?.status) || '';
  const isCancelled   = orderStatus === 'Cancelled' || orderStatus === 'cancelled';
  const isDelivered   = orderStatus === 'Delivered' || orderStatus === 'delivered';
  const isCashPaid    = payStatus === 'Paid' || order.payment?.status === 'paid';
  const codFee        = order.codFee || 0;

  async function saveNote() {
    if (saving) return;
    try { await onNoteChange(order.id, note); setNoteEdit(false); } catch {}
  }
  async function saveTracking() {
    if (saving) return;
    try { await onTrackingChange(order.id, trackNum.trim(), carrier.trim(), trackLink.trim(), dispatchDate); setTrackEdit(false); } catch {}
  }

  function handleEftAction(type) {
    const configs = {
      verify:         { title:'Approve Payment?',          message:`Mark payment for ${order.orderNumber} as approved and paid. This will also confirm the order if awaiting payment.`, confirmLabel:'Approve & Mark Paid', confirmVariant:'success', note:true, noteLabel:'Note (optional)', noteRequired:false },
      reject:         { title:'Reject Payment?',          message:'The customer will be notified and asked to re-upload proof.', confirmLabel:'Reject Payment', confirmVariant:'danger', note:true, noteLabel:'Rejection reason', noteRequired:true },
      correct:        { title:'Request Corrected Proof?', message:'The customer will be notified to upload a new proof of payment.', confirmLabel:'Request Correction', confirmVariant:'secondary', note:true, noteLabel:'What to correct', noteRequired:true },
      moveConfirmed:  { title:'Move to Confirmed?',       message:'Move this order from Awaiting Payment to Confirmed.', confirmLabel:'Move to Confirmed', confirmVariant:'primary', note:false },
    };
    setConfirmDlg({ type, ...configs[type] });
  }

  function handleCodAction(type, value) {
    if (type === 'orderStatus') {
      setConfirmDlg({ type, value, title:`Set status to ${value}?`, message:`Change order status to "${value}".`, confirmLabel:'Confirm', confirmVariant:'primary', note:false });
    } else if (type === 'cashCollected') {
      setConfirmDlg({ type, title:'Mark Cash Collected?', message:`Confirm that cash payment of ${fmtMoney(order.total)} was collected for order ${order.orderNumber}.`, confirmLabel:'Mark Collected', confirmVariant:'success', note:false });
    }
  }

  async function handleConfirm(noteVal) {
    if (saving) return;
    const dlg = confirmDlg;
    if (!dlg) return;

    try {
      if (dlg.type === 'verify') {
        await onPayStatusChange(order.id, 'Paid', noteVal || 'Payment verified by admin');
      } else if (dlg.type === 'reject') {
        await onPayStatusChange(order.id, 'Payment Rejected', noteVal);
      } else if (dlg.type === 'correct') {
        await onPayStatusChange(order.id, 'Corrected Proof Requested', noteVal);
      } else if (dlg.type === 'moveConfirmed') {
        await onOrderStatusChange(order.id, 'Confirmed');
      } else if (dlg.type === 'orderStatus') {
        await onOrderStatusChange(order.id, dlg.value);
      } else if (dlg.type === 'cashCollected') {
        await onPayStatusChange(order.id, 'Paid', 'Cash collected on delivery');
      } else if (dlg.type === 'cancel') {
        if (noteVal) {
          await onInternalNoteAdd(order.id, "Cancellation reason: " + noteVal);
        }
        await onOrderStatusChange(order.id, 'Cancelled');
      }
    } finally {
      setConfirmDlg(null);
    }
  }

  const TABS = [
    { key:'details',  label:'Details' },
    { key:'history',  label:'History' },
  ];

  return (
    <>
      <Modal open={!!order} onClose={onClose} size="lg"
        title={`${order.orderNumber}${order.invoiceNumber ? ` · ${order.invoiceNumber}` : ''}`}
        footer={
          <div className="admin-order-detail__footer">
            <div className="admin-order-detail__footer-actions">
              {isAdmin && !isCancelled && !isDelivered && (
                <Btn variant="ghost" size="sm" onClick={() => setConfirmDlg({ type:'cancel', title:'Cancel Order?', message:'This cannot be undone.', confirmLabel:'Cancel Order', confirmVariant:'danger', note:true, noteLabel:'Reason for cancellation', noteRequired:false })}>
                  Cancel Order
                </Btn>
              )}
              <Btn variant="secondary" size="sm" onClick={() => printInvoice(order)}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
                &nbsp;Print Invoice
              </Btn>
            </div>
            <Btn variant="secondary" onClick={onClose}>Close</Btn>
          </div>
        }
      >
        <div className="admin-order-detail__header-row">
          <OrderStatusBadge status={orderStatus}/>
          <PayStatusBadge status={payStatus}/>
          <span className="admin-order-detail__pay-method">{payMethod}</span>
          <span className="admin-order-detail__created-at">{fmtDateTime(order.createdAt)}</span>
        </div>

        <div className="admin-order-detail__tabs">
          {TABS.map(t => (
            <button key={t.key} onClick={() => setActiveTab(t.key)}
              className={`admin-order-detail__tab ${activeTab === t.key ? 'admin-order-detail__tab--active' : ''}`}>
              {t.label}
            </button>
          ))}
        </div>

        {activeTab === 'details' && (
          <div className="admin-order-detail__content">
            <div className="admin-order-detail__section admin-order-detail__section--flex-between">
              <div>
                <p className="admin-order-detail__section-title">Order Status</p>
                <div className="admin-order-detail__status-group">
                  <OrderStatusBadge status={orderStatus}/>
                  {isCancelled && <span className="admin-order-detail__status-cancelled">Cancelled</span>}
                </div>
              </div>
              {!isCancelled && (
                <div className="admin-order-detail__status-update">
                  <span className="admin-order-detail__status-label">Update status:</span>
                  <select
                    value={orderStatus}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === orderStatus) return;
                      if (val === 'Cancelled') {
                        if (!isAdmin) return;
                        setConfirmDlg({ type:'cancel', title:'Cancel Order?', message:'This cannot be undone.', confirmLabel:'Cancel Order', confirmVariant:'danger', note:true, noteLabel:'Reason for cancellation', noteRequired:false });
                      } else {
                        onOrderStatusChange(order.id, val);
                      }
                    }}
                    disabled={saving}
                    className="admin-order-detail__status-select"
                  >
                    {!['Order Placed','Awaiting Payment','Confirmed','Processing','Dispatched','Delivered','Cancelled','Return Requested','Return Approved','Return Rejected','Refunded','Refund Not Applicable'].includes(orderStatus) && orderStatus && (
                      <option value={orderStatus}>{orderStatus}</option>
                    )}
                    {orderStatus === 'Order Placed' && <option value="Order Placed">Order Placed</option>}
                    {orderStatus === 'Awaiting Payment' && <option value="Awaiting Payment">Awaiting Payment</option>}
                    {!isEFT && orderStatus !== 'Order Placed' && <option value="Order Placed">Order Placed</option>}
                    {isEFT && orderStatus !== 'Awaiting Payment' && <option value="Awaiting Payment">Awaiting Payment</option>}
                    <option value="Confirmed">Confirmed</option>
                    <option value="Processing">Processing</option>
                    <option value="Dispatched">Dispatched</option>
                    <option value="Delivered">Delivered</option>
                    <option value="Return Requested">Return Requested</option>
                    <option value="Return Approved">Return Approved</option>
                    <option value="Return Rejected">Return Rejected</option>
                    <option value="Refunded">Refunded</option>
                    <option value="Refund Not Applicable">Refund Not Applicable</option>
                    {isAdmin && <option value="Cancelled">Cancelled</option>}
                  </select>
                </div>
              )}
            </div>

            <div className="admin-order-detail__grid-2">
              <div className="admin-order-detail__section">
                <p className="admin-order-detail__section-title">Customer</p>
                <div className="admin-order-detail__customer-info">
                  <Avatar name={order.customer?.name} size={32}/>
                  <div>
                    <p className="admin-order-detail__customer-name">{order.customer?.name}</p>
                    <p className="admin-order-detail__customer-email">{order.customer?.email}</p>
                  </div>
                </div>
                <p className="admin-order-detail__customer-phone">{order.customer?.phone}</p>
              </div>
              <div className="admin-order-detail__section">
                <p className="admin-order-detail__section-title">Delivery Address</p>
                <p className="admin-order-detail__address-text">{order.address}</p>
              </div>
            </div>

            <div className="admin-order-detail__section admin-order-detail__section--transparent">
              <p className="admin-order-detail__section-title">Items</p>
              <div className="admin-order-detail__items-list">
                {(order.items || []).map((item, i) => (
                  <div key={i} className="admin-order-detail__item">
                    <div>
                      <p className="admin-order-detail__item-name">{item.name}</p>
                      <p className="admin-order-detail__item-meta">
                        Qty: {item.qty} × {fmtMoney(item.price)}
                        {item.variation ? ` · ${item.variation}` : ''}
                      </p>
                    </div>
                    <p className="admin-order-detail__item-total">{fmtMoney((item.qty || 1) * (item.price || 0))}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="admin-order-detail__section admin-order-detail__totals">
              <div className="admin-order-detail__total-row">
                <span className="admin-order-detail__total-row-label">Subtotal</span>
                <span className="admin-order-detail__total-row-val">{fmtMoney(order.subtotal)}</span>
              </div>
              <div className="admin-order-detail__total-row">
                <span className="admin-order-detail__total-row-label">Delivery</span>
                <span className="admin-order-detail__total-row-val">{order.delivery === 0 ? 'Free' : fmtMoney(order.delivery)}</span>
              </div>
              {order.couponDiscount > 0 && (
                <div className="admin-order-detail__total-row admin-order-detail__total-row--coupon">
                  <span className="admin-order-detail__total-row-label">Coupon {order.couponCode ? `(${order.couponCode})` : ''}</span>
                  <span className="admin-order-detail__total-row-val">−{fmtMoney(order.couponDiscount)}</span>
                </div>
              )}
              {codFee > 0 && (
                <div className="admin-order-detail__total-row admin-order-detail__total-row--cod">
                  <span className="admin-order-detail__total-row-label">COD Fee</span>
                  <span className="admin-order-detail__total-row-val">{fmtMoney(codFee)}</span>
                </div>
              )}
              <div className="admin-order-detail__total-row admin-order-detail__total-row--grand">
                <span className="admin-order-detail__total-row-label">Total</span>
                <span className="admin-order-detail__total-row-val">{fmtMoney(order.total)}</span>
              </div>
            </div>

            <div className="admin-order-detail__section admin-order-detail__section--transparent">
              <div className="admin-order-detail__header-action">
                <p className="admin-order-detail__section-title" style={{margin:0}}>Tracking</p>
                {!trackEdit && <button onClick={() => setTrackEdit(true)} className="admin-order-detail__edit-btn">Edit</button>}
              </div>
              {trackEdit ? (
                <div className="admin-order-detail__form-space">
                  <div className="admin-order-detail__grid-4">
                    <div>
                      <label className="admin-order-detail__form-label">Tracking Number</label>
                      <input value={trackNum} onChange={e => setTrackNum(e.target.value)} placeholder="e.g. FADX123456" className="admin-order-detail__input"/>
                    </div>
                    <div>
                      <label className="admin-order-detail__form-label">Carrier</label>
                      <input value={carrier} onChange={e => setCarrier(e.target.value)} placeholder="e.g. Courier Guy" className="admin-order-detail__input"/>
                    </div>
                    <div>
                      <label className="admin-order-detail__form-label">Tracking Link</label>
                      <input value={trackLink} onChange={e => setTrackLink(e.target.value)} placeholder="https://" className="admin-order-detail__input"/>
                    </div>
                    <div>
                      <label className="admin-order-detail__form-label">Dispatch Date</label>
                      <input type="date" value={dispatchDate} onChange={e => setDispatchDate(e.target.value)} className="admin-order-detail__input"/>
                    </div>
                  </div>
                  <div className="admin-order-detail__form-actions">
                    <Btn variant="ghost" size="sm" disabled={saving} onClick={() => { setTrackEdit(false); setTrackNum(order.trackingNumber || ''); setCarrier(order.carrier || ''); setTrackLink(order.trackingLink || ''); setDispatchDate(getSafeISODate(order.dispatchDate)); }}>Cancel</Btn>
                    <Btn size="sm" disabled={saving} onClick={saveTracking}>{saving ? 'Saving…' : 'Save'}</Btn>
                  </div>
                </div>
              ) : (
                <div className="admin-order-detail__info-box">
                  {order.trackingNumber ? (
                    <>
                      <p style={{margin:0}}><span className="admin-order-detail__tracking-carrier">{order.carrier || 'Carrier'}</span> · {order.trackingNumber}</p>
                      {order.trackingLink && <p style={{margin:0}}><a href={order.trackingLink} target="_blank" rel="noreferrer" className="admin-order-detail__tracking-link">Track Package ↗</a></p>}
                      {order.dispatchDate && getSafeLocalDate(order.dispatchDate) && <p className="admin-order-detail__tracking-date">Dispatched: {getSafeLocalDate(order.dispatchDate)}</p>}
                    </>
                  ) : <span className="admin-order-detail__info-box--empty">No tracking info</span>}
                </div>
              )}
            </div>

            <div className="admin-order-detail__section admin-order-detail__section--transparent">
              <div className="admin-order-detail__header-action">
                <p className="admin-order-detail__section-title" style={{margin:0}}>Order Notes</p>
                {!noteEdit && <button onClick={() => setNoteEdit(true)} className="admin-order-detail__edit-btn">Edit</button>}
              </div>
              {noteEdit ? (
                <div className="admin-order-detail__form-space">
                  <textarea value={note} onChange={e => setNote(e.target.value)} rows={2} className="admin-order-detail__input admin-order-detail__input--textarea"/>
                  <div className="admin-order-detail__form-actions">
                    <Btn variant="ghost" size="sm" disabled={saving} onClick={() => { setNoteEdit(false); setNote(order.notes || ''); }}>Cancel</Btn>
                    <Btn size="sm" disabled={saving} onClick={saveNote}>{saving ? 'Saving…' : 'Save'}</Btn>
                  </div>
                </div>
              ) : (
                <div className="admin-order-detail__notes-box">
                  {order.notes || <span className="admin-order-detail__info-box--empty">No notes</span>}
                </div>
              )}
            </div>

            <div className="admin-order-detail__section">
              <p className="admin-order-detail__section-title">Payment Details & Actions</p>

              {isEFT && (
                <div className="admin-order-detail__form-space">
                  <div className="admin-order-detail__payment-row">
                    <span className="admin-order-detail__payment-row-label">Payment Status</span>
                    <PayStatusBadge status={payStatus}/>
                  </div>
                  <div className="admin-order-detail__payment-row">
                    <span className="admin-order-detail__payment-row-label">EFT Reference</span>
                    <span className="admin-order-detail__payment-ref">{order.eftReference || order.orderNumber}</span>
                  </div>

                  {order.proofOfPaymentUrl && (
                    <div className="admin-order-detail__proof-section">
                      <p className="admin-order-detail__section-title">Uploaded Proof</p>
                      <ProofViewer order={order}/>
                    </div>
                  )}

                  <div className="admin-order-detail__actions-section">
                    <EftActions order={order} onAction={handleEftAction} disabled={saving}/>
                  </div>
                </div>
              )}

              {isCOD && (
                <div className="admin-order-detail__form-space">
                  <div className="admin-order-detail__payment-row">
                    <span className="admin-order-detail__payment-row-label">Payment Status</span>
                    <PayStatusBadge status={payStatus}/>
                  </div>

                  {isCashPaid ? (
                    <div className="admin-order-detail__cod-box admin-order-detail__cod-box--paid">
                      <p className="admin-order-detail__cod-amount">Amount collected: <span className="admin-order-detail__cod-grand">{fmtMoney(order.total)}</span></p>
                      <p className="admin-order-detail__cod-paid-note">Cash collected · Amount due: {fmtMoney(0)}</p>
                    </div>
                  ) : (
                    <div className="admin-order-detail__cod-box">
                      <p className="admin-order-detail__cod-amount">Amount due on delivery: <span className="admin-order-detail__cod-grand">{fmtMoney(order.total)}</span></p>
                      {codFee > 0 && <p className="admin-order-detail__cod-fee">Includes COD fee: {fmtMoney(codFee)}</p>}
                    </div>
                  )}

                  <div className="admin-order-detail__actions-section">
                    <CodActions order={order} onAction={handleCodAction} disabled={saving}/>
                  </div>
                </div>
              )}
            </div>

            <div className="admin-order-detail__section admin-order-detail__section--transparent">
              <p className="admin-order-detail__section-title">Internal Notes</p>
              <div className="admin-order-detail__form-space">
                {Array.isArray(order.internalNotes) && order.internalNotes.length > 0 && (
                  <div className="admin-order-detail__internal-notes-list">
                    {order.internalNotes.map((n, i) => (
                      <div key={i} className="admin-order-detail__internal-note">
                        <p className="admin-order-detail__internal-note-text">{n.note}</p>
                        <p className="admin-order-detail__internal-note-meta">{n.addedBy || 'admin'} · {n.createdAt ? new Date(n.createdAt).toLocaleString('en-ZA',{day:'numeric',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'}) : ''}</p>
                      </div>
                    ))}
                  </div>
                )}
                <textarea value={internalNote} onChange={e => setInternalNote(e.target.value)} rows={2}
                  placeholder="Add internal note (not visible to customer)…"
                  className="admin-order-detail__input admin-order-detail__input--textarea"/>
                <div className="admin-order-detail__form-actions">
                  <Btn size="sm" disabled={saving || !internalNote.trim()}
                    onClick={async () => {
                      if (saving) return;
                      const txt = internalNote.trim();
                      try { await onInternalNoteAdd(order.id, txt); setInternalNote(''); } catch {}
                    }}>
                    {saving ? 'Saving…' : 'Add Note'}
                  </Btn>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'history' && (
          <div className="admin-order-detail__content">
            <div className="admin-order-detail__section admin-order-detail__section--transparent">
              <p className="admin-order-detail__section-title">Payment Status History</p>
              <PaymentHistorySection history={order.paymentStatusHistory}/>
            </div>
          </div>
        )}
      </Modal>

      <OrderConfirmDialog
        open={!!confirmDlg}
        title={confirmDlg?.title}
        message={confirmDlg?.message}
        note={confirmDlg?.note}
        noteLabel={confirmDlg?.noteLabel}
        noteRequired={confirmDlg?.noteRequired}
        confirmLabel={confirmDlg?.confirmLabel}
        confirmVariant={confirmDlg?.confirmVariant}
        busy={saving}
        onConfirm={handleConfirm}
        onCancel={() => { if (!saving) setConfirmDlg(null); }}
      />
    </>
  );
}

export default function OrdersPage({ initialFilters, clearInitialFilters }) {
  const {
    orders = [],
    ordersPagination = { page: 1, limit: 20, total: 0, totalPages: 1 },
    fetchOrdersPaginated,
    stats,
    updateOrderNote,
    updatePaymentStatus,
    updateTracking,
    replaceOrder,
    fmtMoney,
    fmtDate,
    loadingStates
  } = useAdmin();
  const { isAdmin, session } = useAuth();

  const [orderStatusFilter, setOrderStatusFilter] = useState(() => initialFilters?.status || 'all');
  const [payStatusFilter,   setPayStatusFilter]   = useState(() => initialFilters?.payStatus || 'all');
  const [payMethodFilter,   setPayMethodFilter]   = useState(() => initialFilters?.payMethod || 'all');
  const [dateRangeFilter,   setDateRangeFilter]   = useState('all');
  const [customStart,       setCustomStart]       = useState('');
  const [customEnd,         setCustomEnd]         = useState('');
  const [search,            setSearch]            = useState('');
  const [sort,              setSort]              = useState('newest');
  const [page,              setPage]              = useState(1);
  const [viewing,           setViewing]           = useState(null);
  const [toast,             setToast]             = useState({ visible:false, msg:'', type:'success' });
  const [saving,            setSaving]            = useState(false);
  const [isExporting,       setIsExporting]       = useState(false);

  useEffect(() => {
    if (initialFilters) {
      setOrderStatusFilter(initialFilters.status || 'all');
      setPayStatusFilter(initialFilters.payStatus || 'all');
      setPayMethodFilter(initialFilters.payMethod || 'all');
      setPage(1);
      if (clearInitialFilters) clearInitialFilters();
    }
  }, [initialFilters, clearInitialFilters]);

  function showToast(msg, type='success') {
    setToast({ visible:true, msg, type });
    setTimeout(() => setToast(t => ({ ...t, visible:false })), 3500);
  }

  function effectiveOrderStatus(o) {
    return o.orderStatus || o.status || '';
  }
  function effectivePayStatus(o) {
    return o.paymentStatus || (o.payment?.status === 'paid' ? 'Paid' : o.payment?.status) || '';
  }
  function effectivePayMethod(o) {
    return o.paymentMethod || o.payment?.method || '';
  }

  // Fetch paginated data from API
  useEffect(() => {
    fetchOrdersPaginated({
      page,
      limit: ORDERS_PER_PAGE,
      status: orderStatusFilter,
      payStatus: payStatusFilter,
      payMethod: payMethodFilter,
      dateRange: dateRangeFilter,
      customStart,
      customEnd,
      search: search.trim(),
      sort
    });
  }, [page, orderStatusFilter, payStatusFilter, payMethodFilter, dateRangeFilter, customStart, customEnd, search, sort, fetchOrdersPaginated]);

  // Reset page to 1 on filter changes
  useEffect(() => {
    setPage(1);
  }, [orderStatusFilter, payStatusFilter, payMethodFilter, dateRangeFilter, customStart, customEnd, search, sort]);

  function needsAttention(o) {
    const ps = effectivePayStatus(o);
    return ps === 'Proof of Payment Submitted' || ps === 'Payment Verification Required';
  }

  async function handleOrderStatusChange(id, newStatus) {
    if (saving) return;
    const simpleMap = {
      'Order Placed':'pending','Awaiting Payment':'pending','Confirmed':'confirmed',
      'Processing':'processing','Dispatched':'shipped','Delivered':'delivered','Cancelled':'cancelled',
    };
    const simpleStatus = simpleMap[newStatus] || newStatus;
    setSaving(true);
    try {
      const res = await fetch('/api/orders', {
        method: 'PATCH',
        headers: { 'Content-Type':'application/json' },
        body: JSON.stringify({ id, orderStatus: newStatus, status: simpleStatus }),
      });
      if (res.ok) {
        const data = await res.json();
        const updated = (data && data.id) ? data : { orderStatus: newStatus, status: simpleStatus };
        setViewing(v => v ? { ...v, ...updated } : null);
        if (data?.id) replaceOrder(data);
        showToast(`Order status → ${newStatus}`);
      } else {
        const data = await res.json().catch(() => ({}));
        showToast(data.error || 'Failed to update order status', 'error');
      }
    } catch {
      showToast('Network error', 'error');
    } finally {
      setSaving(false);
    }
  }

  async function handlePayStatusChange(id, newPayStatus, note) {
    if (saving) return;
    setSaving(true);
    try {
      const res = await fetch('/api/orders', {
        method: 'PATCH',
        headers: { 'Content-Type':'application/json' },
        body: JSON.stringify({ id, paymentStatus: newPayStatus, statusNote: note }),
      });
      if (res.ok) {
        const data = await res.json();
        const updated = (data && data.id) ? data : { paymentStatus: newPayStatus };
        setViewing(v => v ? { ...v, ...updated } : null);
        if (data?.id) {
          replaceOrder(data);
        } else {
          const simpleStatus = ['Paid', 'paid'].includes(newPayStatus) ? 'paid' : ['Failed', 'failed'].includes(newPayStatus) ? 'failed' : ['Refunded', 'refunded'].includes(newPayStatus) ? 'refunded' : 'pending';
          updatePaymentStatus(id, simpleStatus, newPayStatus);
        }
        showToast(`Payment status → ${newPayStatus}`);
      } else {
        const data = await res.json().catch(() => ({}));
        showToast(data.error || 'Failed to update payment status', 'error');
      }
    } catch {
      showToast('Network error', 'error');
    } finally {
      setSaving(false);
    }
  }

  async function handleInternalNoteAdd(id, note) {
    if (saving) return;
    setSaving(true);
    try {
      const res = await fetch('/api/orders', {
        method: 'PATCH',
        headers: { 'Content-Type':'application/json' },
        body: JSON.stringify({ id, internalNotes: note }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data && data.id) setViewing(v => v ? { ...v, ...data } : null);
        showToast('Internal note saved');
      } else {
        const d = await res.json().catch(() => ({}));
        showToast(d.error || 'Failed to save note', 'error');
        throw new Error(d.error || 'failed');
      }
    } catch (e) {
      if (e?.message !== 'failed') showToast('Failed to save note', 'error');
      throw e;
    } finally {
      setSaving(false);
    }
  }

  async function handleNoteChange(id, notes) {
    if (saving) return;
    setSaving(true);
    try {
      await updateOrderNote(id, notes);
      setViewing(v => v ? { ...v, notes } : null);
      showToast('Order notes saved');
    } catch (e) {
      showToast(e?.message || 'Failed to save notes', 'error');
      throw e;
    } finally {
      setSaving(false);
    }
  }

  async function handleTrackingChange(id, trackingNumber, carrier, trackingLink, dispatchDate) {
    if (saving) return;
    setSaving(true);
    try {
      await updateTracking(id, trackingNumber, carrier, trackingLink, dispatchDate);
      setViewing(v => v ? { ...v, trackingNumber, carrier, trackingLink, dispatchDate } : null);
      showToast('Tracking info saved');
    } catch (e) {
      showToast(e?.message || 'Failed to save tracking', 'error');
      throw e;
    } finally {
      setSaving(false);
    }
  }

  const attentionCount = stats?.attentionCount || 0;

  async function fetchAllMatchingOrdersForExport() {
    const q = new URLSearchParams();
    q.set('limit', '10000');
    if (orderStatusFilter && orderStatusFilter !== 'all') q.set('status', orderStatusFilter);
    if (payStatusFilter && payStatusFilter !== 'all') q.set('payStatus', payStatusFilter);
    if (payMethodFilter && payMethodFilter !== 'all') q.set('payMethod', payMethodFilter);
    if (search.trim()) q.set('search', search.trim());
    if (sort) q.set('sort', sort);
    if (dateRangeFilter && dateRangeFilter !== 'all') {
      q.set('dateRange', dateRangeFilter);
      if (dateRangeFilter === 'custom') {
        if (customStart) q.set('customStart', customStart);
        if (customEnd) q.set('customEnd', customEnd);
      }
    }
    const res = await fetch(`/api/orders?${q.toString()}`);
    if (!res.ok) throw new Error('Failed to fetch orders for export');
    const result = await res.json();
    return result.data || [];
  }

  async function handleExportCSV() {
    if (!isAdmin) return showToast('Unauthorized', 'error');
    setIsExporting(true);
    try {
      const allMatching = await fetchAllMatchingOrdersForExport();
      const headers = ['Order ID', 'Order Date', 'Customer Name', 'Phone', 'Email', 'Delivery Address', 'Products', 'Quantities', 'Variations', 'Subtotal', 'Discount', 'Delivery', 'Total', 'Payment Method', 'Payment Status', 'Order Status'];
      const escapeCell = (cell) => {
        if (cell == null) return '""';
        const str = String(cell);
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      };
      
      const csvContent = [
        headers.map(escapeCell).join(','),
        ...allMatching.map(o => {
          const items = o.items || [];
          const itemNames = items.map(i => i.name).join('\n');
          const itemQtys = items.map(i => i.qty).join('\n');
          const itemVars = items.map(i => i.variation || '—').join('\n');
          return [
            o.orderNumber,
            new Date(o.createdAt).toLocaleString('en-ZA'),
            o.customer?.name || '—',
            o.customer?.phone || '—',
            o.customer?.email || '—',
            o.address || '—',
            itemNames,
            itemQtys,
            itemVars,
            o.subtotal || 0,
            o.couponDiscount || 0,
            o.delivery || 0,
            o.total || 0,
            effectivePayMethod(o),
            effectivePayStatus(o),
            effectiveOrderStatus(o)
          ].map(escapeCell).join(',');
        })
      ].join('\n');
      
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      const dateStr = new Date().toISOString().split('T')[0];
      link.setAttribute("href", url);
      link.setAttribute("download", `orders-export-${dateStr}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      showToast('CSV Export successful');
    } catch (e) {
      console.error(e);
      showToast('Export failed', 'error');
    } finally {
      setIsExporting(false);
    }
  }

  async function handleExportPDF() {
    if (!isAdmin) return showToast('Unauthorized', 'error');
    if (isExporting) return;
    setIsExporting(true);
    try {
      const allMatching = await fetchAllMatchingOrdersForExport();
      const [{ jsPDF }, { default: autoTable }] = await Promise.all([
        import('jspdf'),
        import('jspdf-autotable'),
      ]);
      const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });

      const safe = (v) => (v == null ? '—' : String(v).replace(/[ -  ]/g, ' '));

      const headers = [['Order #', 'Date', 'Customer', 'Phone', 'Email', 'Status', 'Pay Method', 'Pay Status', 'Total']];
      const data = allMatching.map(o => [
        safe(o.orderNumber),
        safe(new Date(o.createdAt).toLocaleString('en-ZA')),
        safe(o.customer?.name),
        safe(o.customer?.phone),
        safe(o.customer?.email),
        safe(effectiveOrderStatus(o)),
        safe(effectivePayMethod(o)),
        safe(effectivePayStatus(o)),
        safe(fmtMoney(o.total)),
      ]);

      doc.setFontSize(14);
      doc.text('Orders Export', 40, 30);
      doc.setFontSize(9);
      doc.text(`${allMatching.length} orders · Generated ${new Date().toLocaleString('en-ZA')}`, 40, 46);

      autoTable(doc, {
        startY: 60,
        head: headers,
        body: data,
        styles: { fontSize: 8, cellPadding: 4, overflow: 'linebreak' },
        headStyles: { fillColor: [30, 80, 224], textColor: 255 },
        columnStyles: { 8: { halign: 'right' } },
        margin: { left: 40, right: 40 },
      });

      const dateStr = new Date().toISOString().split('T')[0];
      doc.save(`orders-export-${dateStr}.pdf`);
      showToast(`PDF exported (${allMatching.length} orders)`);
    } catch (e) {
      console.error('PDF export failed', e);
      showToast(`Export failed: ${e?.message || 'unknown error'}`, 'error');
    } finally {
      setIsExporting(false);
    }
  }

  return (
    <div className="admin-orders">
      <AdminToast message={toast.msg} type={toast.type} visible={toast.visible}/>

      <div className="admin-orders__header">
        <div>
          <h2 className="admin-orders__title">Orders</h2>
          <p className="admin-orders__subtitle">{ordersPagination.total} total</p>
        </div>
        <div className="admin-orders__actions">
          {attentionCount > 0 && (
            <div className="admin-orders__attention"
              onClick={() => { setPayStatusFilter('Proof of Payment Submitted'); setPayMethodFilter('EFT'); }}>
              <span className="admin-orders__attention-text">⚠ {attentionCount} proof{attentionCount !== 1 ? 's' : ''} need review</span>
            </div>
          )}
          <Btn variant="secondary" size="sm" disabled={isExporting || ordersPagination.total === 0} onClick={handleExportCSV}>
            {isExporting ? <span className="admin-orders__export-spin">⭘</span> : null}
            Export CSV
          </Btn>
          <Btn variant="secondary" size="sm" disabled={isExporting || ordersPagination.total === 0} onClick={handleExportPDF}>
            {isExporting ? <span className="admin-orders__export-spin">⭘</span> : null}
            Export PDF
          </Btn>
        </div>
      </div>

      <div className="admin-orders__filters">
        <SearchInput value={search} onChange={setSearch} placeholder="Order #, name, phone…"/>
        <select value={dateRangeFilter} onChange={e => setDateRangeFilter(e.target.value)}
          className="admin-orders__filter-select">
          <option value="all">All Time</option>
          <option value="today">Today</option>
          <option value="7d">Last 7 Days</option>
          <option value="30d">Last 30 Days</option>
          <option value="custom">Custom Range</option>
        </select>
        {dateRangeFilter === 'custom' && (
          <div className="admin-orders__custom-date">
            <input type="date" value={customStart} onChange={e=>setCustomStart(e.target.value)} className="admin-orders__custom-date-input"/>
            <span className="admin-orders__custom-date-sep">to</span>
            <input type="date" value={customEnd} onChange={e=>setCustomEnd(e.target.value)} className="admin-orders__custom-date-input"/>
          </div>
        )}
        <select value={payMethodFilter} onChange={e => setPayMethodFilter(e.target.value)}
          className="admin-orders__filter-select">
          {PAY_METHOD_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <select value={orderStatusFilter} onChange={e => setOrderStatusFilter(e.target.value)}
          className="admin-orders__filter-select">
          {ORDER_STATUS_OPTIONS
            .filter(o => isAdmin || !['Cancelled', 'cancelled'].includes(o.value))
            .map(o => (
            <option key={o.value} value={o.value}>{o.label}{o.value !== 'all' && stats?.byStatus?.[o.value] ? ` (${stats.byStatus[o.value]})` : ''}</option>
          ))}
        </select>
        <select value={payStatusFilter} onChange={e => setPayStatusFilter(e.target.value)}
          className="admin-orders__filter-select">
          {PAY_STATUS_OPTIONS.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        <select value={sort} onChange={e => setSort(e.target.value)}
          className="admin-orders__filter-select">
          <option value="newest">Newest first</option>
          <option value="oldest">Oldest first</option>
        </select>
        {(orderStatusFilter !== 'all' || payStatusFilter !== 'all' || payMethodFilter !== 'all' || search) && (
          <button onClick={() => { setOrderStatusFilter('all'); setPayStatusFilter('all'); setPayMethodFilter('all'); setSearch(''); }}
            className="admin-orders__clear-filters">Clear filters</button>
        )}
      </div>

      <div className="admin-orders__table-container">
        {loadingStates?.orders ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '64px', alignItems: 'center', justifyContent: 'center' }}>
            <Spinner size={32} />
            <span style={{ fontSize: '0.85rem', color: '#64748b' }}>Loading orders…</span>
          </div>
        ) : orders.length === 0 ? (
          <Empty icon="📦" title="No orders found" description="Try adjusting your search or filters."/>
        ) : (
          <>
            <div className="admin-orders__table-scroll">
              <table className="admin-orders__table">
                <thead>
                  <tr>
                    <th>Order</th>
                    <th>Customer</th>
                    <th className="hidden-sm">Items</th>
                    <th>Total</th>
                    <th className="hidden-md">Method</th>
                    <th>Payment</th>
                    <th className="hidden-lg">Order Status</th>
                    <th className="hidden-xl">Date</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map(o => {
                    const os = effectiveOrderStatus(o);
                    const ps = effectivePayStatus(o);
                    const pm = effectivePayMethod(o);
                    const attention = needsAttention(o);
                    return (
                      <tr key={o.id} className={attention ? 'admin-orders__tr--attention' : ''}>
                        <td>
                          <span className="admin-orders__order-num">{o.orderNumber}</span>
                          {attention && <span className="admin-orders__review-tag">Review</span>}
                        </td>
                        <td>
                          <div className="admin-orders__customer">
                            <Avatar name={o.customer?.name} size={28}/>
                            <div className="admin-orders__customer-info">
                              <p className="admin-orders__customer-name">{o.customer?.name}</p>
                              <p className="admin-orders__customer-email">{o.customer?.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="hidden-sm">
                          <span className="admin-orders__items">{(o.items || []).length} item{(o.items || []).length !== 1 ? 's' : ''}</span>
                        </td>
                        <td><span className="admin-orders__total">{fmtMoney(o.total)}</span></td>
                        <td className="hidden-md">
                          <span className="admin-orders__method">{pm}</span>
                        </td>
                        <td><PayStatusBadge status={ps}/></td>
                        <td className="hidden-lg"><OrderStatusBadge status={os}/></td>
                        <td className="hidden-xl">
                          <span className="admin-orders__date">{fmtDate(o.createdAt)}</span>
                        </td>
                        <td>
                          <button onClick={() => setViewing(o)} title="View details" className="admin-orders__action-btn">
                            <Icon.Eye/>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="admin-orders__pagination-wrap">
              <Pagination page={page} total={ordersPagination.total} pageSize={ORDERS_PER_PAGE} onChange={setPage}/>
            </div>
          </>
        )}
      </div>

      <OrderDetail
        order={viewing}
        saving={saving}
        onClose={() => setViewing(null)}
        onOrderStatusChange={handleOrderStatusChange}
        onPayStatusChange={handlePayStatusChange}
        onNoteChange={handleNoteChange}
        onInternalNoteAdd={handleInternalNoteAdd}
        onTrackingChange={handleTrackingChange}
      />
    </div>
  );
}
