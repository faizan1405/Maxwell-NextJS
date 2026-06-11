'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useAdmin } from './AdminProvider';
import * as Icon from '../ui/Icons';
import { 
  Avatar, Btn, Spinner, AdminToast, SearchInput, Empty, Pagination, ConfirmDialog 
} from '../ui/index';
import '../../styles/admin/_reviews.scss';

const REVIEW_PAGE_SIZE = 15;
const REVIEW_STATUSES = ['pending', 'approved', 'rejected', 'hidden'];

function StarsMini({ value }) {
  return (
    <span className="review-card__stars">
      {[1, 2, 3, 4, 5].map(n => (
        <svg key={n} width="12" height="12" viewBox="0 0 24 24"
          fill={n <= value ? '#f59e0b' : 'none'} stroke={n <= value ? '#f59e0b' : '#cbd5e1'} strokeWidth="1.5">
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
        </svg>
      ))}
    </span>
  );
}

function ReviewCard({ review, onUpdate, onDelete, fmtDate }) {
  const [saving, setSaving] = useState(false);

  async function setStatus(status) {
    setSaving(true);
    await onUpdate(review.id, { status });
    setSaving(false);
  }

  const validStatuses = ['pending', 'approved', 'rejected', 'hidden'];
  const statusModifier = validStatuses.includes(review.status) ? review.status : 'pending';

  return (
    <div className="review-card">
      <div className="review-card__header">
        <Avatar name={review.customerName || '?'} size={36} />
        <div className="review-card__content">
          <div className="review-card__meta">
            <span className="review-card__customer">{review.customerName || 'Unknown'}</span>
            {review.email && <span className="review-card__email">{review.email}</span>}
            <span className={`review-card__status review-card__status--${statusModifier}`}>
              {review.status}
            </span>
          </div>
          <div className="review-card__rating">
            <StarsMini value={review.rating} />
            <span className="review-card__score">{(review.rating || 0).toFixed(1)}</span>
            <span className="review-card__dot">·</span>
            <span className="review-card__product">{review.productId}</span>
            <span className="review-card__date">{fmtDate(review.createdAt)}</span>
          </div>
          {review.text && (
            <p className="review-card__text">{review.text}</p>
          )}
        </div>
      </div>

      <div className="review-card__actions">
        {review.status !== 'approved' && (
          <Btn size="sm" variant="success" onClick={() => setStatus('approved')} disabled={saving}>Approve</Btn>
        )}
        {review.status !== 'rejected' && (
          <Btn size="sm" variant="ghost" onClick={() => setStatus('rejected')} disabled={saving}>Reject</Btn>
        )}
        {review.status !== 'hidden' && (
          <Btn size="sm" variant="ghost" onClick={() => setStatus('hidden')} disabled={saving}>Hide</Btn>
        )}
        {saving && <Spinner size={14} />}
        <button onClick={() => onDelete(review.id)} className="review-card__delete">
          <Icon.Trash />
        </button>
      </div>
    </div>
  );
}

export default function ReviewsPage() {
  const { reviews, updateReview, deleteReview, fmtDate } = useAdmin();
  const [tab,      setTab]     = useState('pending');
  const [search,   setSearch]  = useState('');
  const [page,     setPage]    = useState(1);
  const [deleting, setDeleting] = useState(null);
  const [toast,    setToast]   = useState({ visible: false, msg: '', type: 'success' });

  function showToast(msg, type = 'success') {
    setToast({ visible: true, msg, type });
    setTimeout(() => setToast(t => ({ ...t, visible: false })), 3000);
  }

  const allReviews = reviews || [];

  const tabCounts = useMemo(() => {
    const c = { all: allReviews.length };
    REVIEW_STATUSES.forEach(s => { c[s] = allReviews.filter(r => r.status === s).length; });
    return c;
  }, [allReviews]);

  const filtered = useMemo(() => {
    let list = tab === 'all' ? allReviews : allReviews.filter(r => r.status === tab);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(r =>
        (r.customerName || '').toLowerCase().includes(q) ||
        (r.email || '').toLowerCase().includes(q) ||
        (r.text || '').toLowerCase().includes(q) ||
        (r.productId || '').toLowerCase().includes(q)
      );
    }
    return [...list].sort((a, b) => b.createdAt - a.createdAt);
  }, [allReviews, tab, search]);

  const paged = filtered.slice((page - 1) * REVIEW_PAGE_SIZE, page * REVIEW_PAGE_SIZE);
  
  useEffect(() => {
    setPage(1);
  }, [tab, search]);

  async function handleUpdate(id, patch) {
    await updateReview(id, patch);
    showToast('Review updated');
  }

  async function handleDelete(id) {
    await deleteReview(id);
    showToast('Review deleted', 'error');
    setDeleting(null);
  }

  const tabs = [
    { id: 'pending', label: 'Pending' }, 
    { id: 'approved', label: 'Approved' }, 
    { id: 'rejected', label: 'Rejected' }, 
    { id: 'hidden', label: 'Hidden' }, 
    { id: 'all', label: 'All' }
  ];

  return (
    <div className="reviews-page">
      <AdminToast message={toast.msg} type={toast.type} visible={toast.visible} />

      <div className="reviews-page__header">
        <h2 className="reviews-page__title">Reviews</h2>
        <p className="reviews-page__subtitle">Moderate customer product reviews</p>
      </div>

      <div className="reviews-page__tabs">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`reviews-page__tab ${tab === t.id ? 'reviews-page__tab--active' : ''}`}>
            {t.label}
            {tabCounts[t.id] > 0 && (
              <span className={`reviews-page__tab-badge ${tab === t.id ? 'reviews-page__tab-badge--active' : 'reviews-page__tab-badge--inactive'}`}>
                {tabCounts[t.id]}
              </span>
            )}
          </button>
        ))}
      </div>

      <SearchInput value={search} onChange={setSearch} placeholder="Search by name, email, product or text…" />

      {filtered.length === 0 ? (
        <div className="reviews-page__empty-card">
          <Empty icon="⭐" title={`No ${tab === 'all' ? '' : tab + ' '}reviews`} description="Nothing to moderate here." />
        </div>
      ) : (
        <>
          <div className="reviews-page__list">
            {paged.map(r => (
              <ReviewCard key={r.id} review={r} onUpdate={handleUpdate} onDelete={id => setDeleting(id)} fmtDate={fmtDate} />
            ))}
          </div>
          <Pagination page={page} total={filtered.length} pageSize={REVIEW_PAGE_SIZE} onChange={setPage} />
        </>
      )}

      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={() => handleDelete(deleting)}
        title="Delete Review"
        message="Permanently delete this review? This cannot be undone."
        confirmLabel="Delete"
        variant="danger"
      />
    </div>
  );
}
