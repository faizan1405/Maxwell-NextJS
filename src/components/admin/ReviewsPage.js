'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useAdmin } from './AdminProvider';
import * as Icon from '../ui/Icons';
import { 
  Avatar, Btn, Spinner, AdminToast, SearchInput, Empty, Pagination, ConfirmDialog 
} from '../ui/index';
import '../../styles/admin/_reviews.scss';

const REVIEW_PAGE_SIZE = 15;

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
  const {
    reviews = [],
    reviewsPagination = { page: 1, limit: 15, total: 0, totalPages: 1, counts: {} },
    fetchReviewsPaginated,
    updateReview,
    deleteReview,
    fmtDate,
    loadingStates
  } = useAdmin();
  const [tab,      setTab]     = useState('pending');
  const [search,   setSearch]  = useState('');
  const [page,     setPage]    = useState(1);
  const [deleting, setDeleting] = useState(null);
  const [toast,    setToast]   = useState({ visible: false, msg: '', type: 'success' });

  function showToast(msg, type = 'success') {
    setToast({ visible: true, msg, type });
    setTimeout(() => setToast(t => ({ ...t, visible: false })), 3000);
  }

  // Fetch paginated reviews
  useEffect(() => {
    fetchReviewsPaginated({
      page,
      limit: REVIEW_PAGE_SIZE,
      search: search.trim(),
      status: tab === 'all' ? '' : tab
    });
  }, [page, search, tab, fetchReviewsPaginated]);

  // Reset page to 1 on filter changes
  useEffect(() => {
    setPage(1);
  }, [search, tab]);

  const tabCounts = useMemo(() => {
    return {
      pending: reviewsPagination.counts?.pending || 0,
      approved: reviewsPagination.counts?.approved || 0,
      rejected: reviewsPagination.counts?.rejected || 0,
      hidden: reviewsPagination.counts?.hidden || 0,
      all: reviewsPagination.counts?.all || 0
    };
  }, [reviewsPagination.counts]);

  async function handleUpdate(id, patch) {
    await updateReview(id, patch);
    showToast('Review updated');
  }

  async function handleDelete(id) {
    await deleteReview(id);
    showToast('Review deleted');
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

      {loadingStates?.reviews ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '64px', alignItems: 'center', justifyContent: 'center' }}>
          <Spinner size={32} />
          <span style={{ fontSize: '0.85rem', color: '#64748b' }}>Loading reviews…</span>
        </div>
      ) : reviews.length === 0 ? (
        <div className="reviews-page__empty-card">
          <Empty icon="⭐" title={`No ${tab === 'all' ? '' : tab + ' '}reviews`} description="Nothing to moderate here." />
        </div>
      ) : (
        <>
          <div className="reviews-page__list">
            {reviews.map(r => (
              <ReviewCard key={r.id} review={r} onUpdate={handleUpdate} onDelete={id => setDeleting(id)} fmtDate={fmtDate} />
            ))}
          </div>
          <Pagination page={page} total={reviewsPagination.total} pageSize={REVIEW_PAGE_SIZE} onChange={setPage} />
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
