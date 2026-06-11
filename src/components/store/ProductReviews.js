'use client';

import React, { useState, useEffect } from 'react';
import { useCustomer } from '../../lib/storeContext';
import { Star, CheckCircle, Pencil, User } from '../ui/Icons';
import { Stars } from '../ui/index';

function StarPicker({ value, onChange, size = 28 }) {
  const [hover, setHover] = useState(0);
  return (
    <div style={{ display: 'flex', gap: 4 }}>
      {[1, 2, 3, 4, 5].map(n => (
        <button key={n} type="button"
          onClick={() => onChange(n)}
          onMouseEnter={() => setHover(n)}
          onMouseLeave={() => setHover(0)}
          style={{ transition: 'transform 0.1s', lineHeight: 1 }}
          aria-label={`${n} star${n !== 1 ? 's' : ''}`}>
          <Star size={size} fill={(hover || value) >= n ? '#f59e0b' : 'none'} strokeWidth={1.5}
            style={{ color: (hover || value) >= n ? '#f59e0b' : '#cbd5e1' }} />
        </button>
      ))}
    </div>
  );
}

function ReviewCard({ review }) {
  const initials = (review.customerName || '?').split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
  const COLORS   = ['#1E50E0', '#0B2545', '#159A4C', '#7C3AED', '#0E7490'];
  const bg       = COLORS[(review.customerName || '?').charCodeAt(0) % COLORS.length];
  const date     = review.createdAt ? new Date(review.createdAt).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' }) : '';

  return (
    <div className="review-item">
      <div className="review-item__avatar" style={{ background: bg }}>
        {initials}
      </div>
      <div className="review-item__content">
        <div className="review-item__header">
          <span className="review-item__name">{review.customerName || 'Verified Buyer'}</span>
          <span className="review-item__verified">Verified Purchase</span>
          <span className="review-item__date">{date}</span>
        </div>
        <div className="review-item__rating">
          <Stars value={review.rating} size={13} />
          <span className="val">{review.rating.toFixed(1)}</span>
        </div>
        {review.text && (
          <p className="review-item__text">{review.text}</p>
        )}
      </div>
    </div>
  );
}

function AccSpinner2() {
  return <span style={{ width: 14, height: 14, border: '2px solid rgba(255,255,255,.3)', borderTopColor: '#fff', borderRadius: '50%', flexShrink: 0, display: 'inline-block', animation: 'spin .7s linear infinite' }} />;
}

function ReviewForm({ productId, sessionToken, existingReview, onSubmitted, apiBase }) {
  const [rating,   setRating]   = useState(existingReview?.rating || 0);
  const [text,     setText]     = useState(existingReview?.text   || '');
  const [saving,   setSaving]   = useState(false);
  const [error,    setError]    = useState('');
  const [success,  setSuccess]  = useState(false);

  async function submit(e) {
    e.preventDefault();
    if (!rating) { setError('Please select a star rating.'); return; }
    setSaving(true); setError('');
    try {
      const res  = await fetch(`${apiBase}/api/reviews`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${sessionToken}` },
        body:    JSON.stringify({ productId, rating, text: text.trim() }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Failed to submit review.'); setSaving(false); return; }
      setSuccess(true);
      onSubmitted?.(data);
    } catch { setError('Network error. Please try again.'); }
    setSaving(false);
  }

  if (success) {
    return (
      <div className="review-form__success">
        <CheckCircle size={16} />
        <p>Review submitted — it'll appear once approved. Thank you!</p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="review-form">
      <h4 className="review-form__title">
        {existingReview ? 'Update your review' : 'Write a review'}
      </h4>
      <div>
        <p className="review-form__label">Your rating *</p>
        <StarPicker value={rating} onChange={setRating} />
      </div>
      <div>
        <label className="review-form__label">Your review (optional)</label>
        <textarea value={text} onChange={e => setText(e.target.value)} rows={3}
          placeholder="Share your experience with this product…"
          className="review-form__input" />
      </div>
      {error && <p style={{ fontSize: 12, color: '#ef4444', margin: '0 0 4px' }}>{error}</p>}
      <button type="submit" disabled={saving || !rating} className="review-form__btn">
        {saving ? <><AccSpinner2 /> Submitting…</> : (existingReview ? 'Update review' : 'Submit review')}
      </button>
    </form>
  );
}

export function ProductReviews({ productId }) {
  const { customer, sessionToken, isLoggedIn, openAuth, apiBase } = useCustomer();
  const [reviews,       setReviews]       = useState(null);
  const [showForm,      setShowForm]      = useState(false);
  const [purchaseCheck, setPurchaseCheck] = useState(null); // null=unchecked, true, false

  /* Load approved reviews for this product */
  useEffect(() => {
    if (!productId) return;
    (async () => {
      try {
        const res  = await fetch(`${apiBase}/api/reviews?productId=${encodeURIComponent(productId)}`);
        const data = await res.json();
        setReviews(Array.isArray(data) ? data.sort((a, b) => b.createdAt - a.createdAt) : []);
      } catch { setReviews([]); }
    })();
  }, [productId, apiBase]);

  /* Check if logged-in customer has purchased this product */
  useEffect(() => {
    if (!isLoggedIn || !sessionToken || !productId) { setPurchaseCheck(false); return; }
    (async () => {
      try {
        const res  = await fetch(`${apiBase}/api/orders`, {
          headers: { 'Authorization': `Bearer ${sessionToken}` },
        });
        if (!res.ok) { setPurchaseCheck(false); return; }
        const orders = await res.json();
        const ELIGIBLE = ['processing','shipped','delivered','Processing','Dispatched','Delivered'];
        const bought = orders.some(o =>
          ELIGIBLE.includes(o.status) &&
          o.items?.some(i => i.productId === productId)
        );
        setPurchaseCheck(bought);
      } catch { setPurchaseCheck(false); }
    })();
  }, [isLoggedIn, sessionToken, productId, apiBase]);

  const existingReview = reviews?.find(r => r.customerId === customer?.id || r.email === customer?.email);
  const avgRating = reviews?.length ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0;

  if (!productId) return null;

  return (
    <div className="product-reviews">
      {/* Summary */}
      {reviews?.length > 0 && (
        <div className="product-reviews__summary">
          <div className="product-reviews__score-wrap">
            <div className="product-reviews__score">{avgRating.toFixed(1)}</div>
            <Stars value={avgRating} size={14} style={{ marginTop: 4 }} />
            <p className="product-reviews__count">{reviews.length} review{reviews.length !== 1 ? 's' : ''}</p>
          </div>
          <div className="product-reviews__bars">
            {[5, 4, 3, 2, 1].map(n => {
              const count = reviews.filter(r => r.rating === n).length;
              const pct   = reviews.length ? (count / reviews.length) * 100 : 0;
              return (
                <div key={n} className="product-reviews__bar-row">
                  <span className="product-reviews__bar-label">{n}</span>
                  <Star size={10} fill="#f59e0b" style={{ color: '#f59e0b', flexShrink: 0 }} />
                  <div className="product-reviews__bar-track">
                    <div className="product-reviews__bar-fill" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="product-reviews__bar-count">{count}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Write review CTA */}
      {!showForm && (
        <div>
          {isLoggedIn && purchaseCheck && !existingReview && (
            <button onClick={() => setShowForm(true)} className="product-reviews__btn product-reviews__btn--primary">
              <Star size={15} /> Write a review
            </button>
          )}
          {isLoggedIn && purchaseCheck && existingReview && (
            <button onClick={() => setShowForm(true)} className="product-reviews__btn product-reviews__btn--secondary">
              <Pencil size={14} /> Update your review
            </button>
          )}
          {isLoggedIn && purchaseCheck === false && (
            <p className="product-reviews__note">Purchase this product to leave a review.</p>
          )}
          {!isLoggedIn && (
            <button onClick={openAuth} className="product-reviews__btn product-reviews__btn--guest">
              <User size={15} /> Sign in to write a review
            </button>
          )}
        </div>
      )}

      {showForm && (
        <ReviewForm
          productId={productId}
          sessionToken={sessionToken}
          existingReview={existingReview}
          apiBase={apiBase}
          onSubmitted={(rev) => {
            if (existingReview) {
              setReviews(prev => prev.map(r => r.id === rev.id ? rev : r));
            }
            setShowForm(false);
          }}
        />
      )}

      {/* Review list */}
      {reviews === null && (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '24px 0' }}>
          <span style={{ width: 24, height: 24, borderRadius: '50%', border: '2px solid rgba(30,80,224,.2)', borderTopColor: '#1E50E0', animation: 'spin .7s linear infinite', display: 'inline-block' }} />
        </div>
      )}

      {reviews?.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {reviews.map(r => <ReviewCard key={r.id} review={r} />)}
        </div>
      ) : reviews !== null && (
        <div className="product-reviews__empty">
          <Star size={28} style={{ display: 'block', margin: '0 auto 8px', color: '#cbd5e1' }} />
          <p className="product-reviews__empty-title">No reviews yet</p>
          <p className="product-reviews__empty-desc">Be the first to review this product.</p>
        </div>
      )}
    </div>
  );
}

export { StarPicker };
