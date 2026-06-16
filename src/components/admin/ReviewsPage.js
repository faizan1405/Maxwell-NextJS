'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useAdmin } from './AdminProvider';
import * as Icon from '../ui/Icons';
import {
  Avatar, Btn, Spinner, AdminToast, SearchInput, Empty, Pagination, ConfirmDialog,
  Modal, Input, Textarea, Select, Toggle
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

function blankReview() {
  return {
    customerName: '',
    location: '',
    rating: 5,
    text: '',
    productId: '',
    productName: '',
    email: '',
    customerInitials: '',
    customerPhoto: '',
    source: 'manual',
    isVerified: false,
    showOnHomepage: false,
    status: 'approved',
  };
}

function ReviewForm({ initial, products, onCancel, onSubmit }) {
  const [form, setForm] = useState(() => ({ ...blankReview(), ...(initial || {}) }));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  function setField(key, value) {
    setForm(f => ({ ...f, [key]: value }));
  }

  function handleProduct(id) {
    if (!id) {
      setField('productId', '');
      setField('productName', '');
      return;
    }
    const p = products.find(p => p.id === id);
    setField('productId', id);
    if (p) setField('productName', p.name);
  }

  async function submit(e) {
    e.preventDefault();
    setError('');
    if (!form.customerName.trim()) { setError('Customer name is required.'); return; }
    if (!form.rating || form.rating < 1 || form.rating > 5) { setError('Rating must be between 1 and 5.'); return; }
    setSaving(true);
    try {
      await onSubmit(form);
    } catch (e) {
      setError(e?.message || 'Failed to save review.');
      setSaving(false);
      return;
    }
    setSaving(false);
  }

  return (
    <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <Input label="Customer name *" value={form.customerName} onChange={e => setField('customerName', e.target.value)} />
        <Input label="City / Location" value={form.location} onChange={e => setField('location', e.target.value)} placeholder="e.g. Boksburg" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <Select label="Rating *" value={form.rating} onChange={e => setField('rating', Number(e.target.value))}>
          {[5, 4, 3, 2, 1].map(n => <option key={n} value={n}>{n} ★</option>)}
        </Select>
        <Select label="Source" value={form.source} onChange={e => setField('source', e.target.value)}>
          <option value="manual">Manual</option>
          <option value="website">Website</option>
          <option value="whatsapp">WhatsApp</option>
          <option value="email">Email</option>
          <option value="">— None —</option>
        </Select>
      </div>

      <Textarea label="Review text" rows={4} value={form.text} onChange={e => setField('text', e.target.value)} placeholder="What the customer said…" />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <Select label="Linked product (optional)" value={form.productId || ''} onChange={e => handleProduct(e.target.value)}>
          <option value="">— Not linked —</option>
          {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </Select>
        <Select label="Status" value={form.status} onChange={e => setField('status', e.target.value)}>
          <option value="approved">Approved</option>
          <option value="pending">Pending</option>
          <option value="rejected">Rejected</option>
          <option value="hidden">Hidden</option>
        </Select>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <Input label="Initials (optional)" value={form.customerInitials} onChange={e => setField('customerInitials', e.target.value.toUpperCase().slice(0, 4))} placeholder="auto from name" />
        <Input label="Email (optional)" value={form.email} onChange={e => setField('email', e.target.value)} placeholder="for internal records only" />
      </div>

      <Input label="Customer photo URL (optional)" value={form.customerPhoto} onChange={e => setField('customerPhoto', e.target.value)} placeholder="https://…" />

      <div style={{ display: 'flex', gap: 16, padding: '8px 0' }}>
        <Toggle label="Verified customer" checked={form.isVerified} onChange={v => setField('isVerified', v)} />
        <Toggle label="Show on homepage" checked={form.showOnHomepage} onChange={v => setField('showOnHomepage', v)} />
      </div>

      {error && <div style={{ color: '#ef4444', fontSize: 13 }}>{error}</div>}

      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', paddingTop: 8, borderTop: '1px solid #e2e8f0' }}>
        <Btn variant="ghost" onClick={onCancel} disabled={saving}>Cancel</Btn>
        <Btn type="submit" variant="primary" disabled={saving}>
          {saving ? <Spinner size={14} /> : (initial ? 'Save changes' : 'Add review')}
        </Btn>
      </div>
    </form>
  );
}

function ReviewCard({ review, onUpdate, onDelete, onEdit, onToggleVerified, onToggleHomepage, fmtDate }) {
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
            {review.location && <span className="review-card__email">· {review.location}</span>}
            {review.email && <span className="review-card__email">{review.email}</span>}
            <span className={`review-card__status review-card__status--${statusModifier}`}>
              {review.status}
            </span>
            {review.isVerified && (
              <span className="review-card__status" style={{ background: '#dcfce7', color: '#166534' }}>Verified</span>
            )}
            {review.showOnHomepage && (
              <span className="review-card__status" style={{ background: '#fef3c7', color: '#92400e' }}>Homepage</span>
            )}
          </div>
          <div className="review-card__rating">
            <StarsMini value={review.rating} />
            <span className="review-card__score">{(review.rating || 0).toFixed(1)}</span>
            {review.productName && <><span className="review-card__dot">·</span><span className="review-card__product">{review.productName}</span></>}
            {!review.productName && review.productId && <><span className="review-card__dot">·</span><span className="review-card__product">{review.productId}</span></>}
            {review.source && <><span className="review-card__dot">·</span><span className="review-card__product">{review.source}</span></>}
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
        <Btn size="sm" variant="ghost" onClick={() => onToggleVerified(review)} disabled={saving}>
          {review.isVerified ? 'Unverify' : 'Verify'}
        </Btn>
        <Btn size="sm" variant="ghost" onClick={() => onToggleHomepage(review)} disabled={saving}>
          {review.showOnHomepage ? 'Remove from homepage' : 'Show on homepage'}
        </Btn>
        <Btn size="sm" variant="ghost" onClick={() => onEdit(review)} disabled={saving}>Edit</Btn>
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
    createReview,
    updateReview,
    deleteReview,
    products = [],
    fmtDate,
    loadingStates,
  } = useAdmin();
  const [tab, setTab] = useState('pending');
  const [search, setSearch] = useState('');
  const [ratingFilter, setRatingFilter] = useState('');
  const [verifiedFilter, setVerifiedFilter] = useState('');
  const [productFilter, setProductFilter] = useState('');
  const [page, setPage] = useState(1);
  const [deleting, setDeleting] = useState(null);
  const [editing, setEditing] = useState(null);
  const [adding, setAdding] = useState(false);
  const [toast, setToast] = useState({ visible: false, msg: '', type: 'success' });

  function showToast(msg, type = 'success') {
    setToast({ visible: true, msg, type });
    setTimeout(() => setToast(t => ({ ...t, visible: false })), 3000);
  }

  useEffect(() => {
    fetchReviewsPaginated({
      page,
      limit: REVIEW_PAGE_SIZE,
      search: search.trim(),
      status: tab === 'all' ? '' : tab,
      rating: ratingFilter,
      verified: verifiedFilter,
      productId: productFilter,
    });
  }, [page, search, tab, ratingFilter, verifiedFilter, productFilter, fetchReviewsPaginated]);

  useEffect(() => {
    setPage(1);
  }, [search, tab, ratingFilter, verifiedFilter, productFilter]);

  const tabCounts = useMemo(() => ({
    pending: reviewsPagination.counts?.pending || 0,
    approved: reviewsPagination.counts?.approved || 0,
    rejected: reviewsPagination.counts?.rejected || 0,
    hidden: reviewsPagination.counts?.hidden || 0,
    all: reviewsPagination.counts?.all || 0,
  }), [reviewsPagination.counts]);

  async function handleUpdate(id, patch) {
    try {
      await updateReview(id, patch);
      showToast('Review updated');
    } catch (e) {
      showToast(e.message || 'Update failed', 'error');
    }
  }

  async function handleToggleVerified(r) {
    await handleUpdate(r.id, { isVerified: !r.isVerified });
  }

  async function handleToggleHomepage(r) {
    await handleUpdate(r.id, { showOnHomepage: !r.showOnHomepage });
  }

  async function handleDelete(id) {
    try {
      await deleteReview(id);
      showToast('Review deleted');
    } catch (e) {
      showToast(e.message || 'Delete failed', 'error');
    }
    setDeleting(null);
  }

  async function handleCreate(payload) {
    const created = await createReview(payload);
    showToast('Review added');
    setAdding(false);
    // Jump to the tab that matches the new review's status so the admin sees it
    const newTab = (created?.status && ['pending', 'approved', 'rejected', 'hidden'].includes(created.status))
      ? created.status
      : tab;
    if (newTab !== tab) {
      setTab(newTab);
    } else {
      fetchReviewsPaginated({ page, limit: REVIEW_PAGE_SIZE, search: search.trim(), status: tab === 'all' ? '' : tab, rating: ratingFilter, verified: verifiedFilter, productId: productFilter });
    }
  }

  async function handleEditSave(payload) {
    await updateReview(editing.id, payload);
    showToast('Review updated');
    setEditing(null);
    fetchReviewsPaginated({ page, limit: REVIEW_PAGE_SIZE, search: search.trim(), status: tab === 'all' ? '' : tab, rating: ratingFilter, verified: verifiedFilter, productId: productFilter });
  }

  const tabs = [
    { id: 'pending', label: 'Pending' },
    { id: 'approved', label: 'Approved' },
    { id: 'rejected', label: 'Rejected' },
    { id: 'hidden', label: 'Hidden' },
    { id: 'all', label: 'All' },
  ];

  return (
    <div className="reviews-page">
      <AdminToast message={toast.msg} type={toast.type} visible={toast.visible} />

      <div className="reviews-page__header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
        <div>
          <h2 className="reviews-page__title">Reviews</h2>
          <p className="reviews-page__subtitle">Moderate, add and verify customer reviews</p>
        </div>
        <Btn variant="primary" onClick={() => setAdding(true)}>+ Add Review</Btn>
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

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: 8, marginBottom: 12 }}>
        <SearchInput value={search} onChange={setSearch} placeholder="Search by name, email, product, location…" />
        <Select value={ratingFilter} onChange={e => setRatingFilter(e.target.value)}>
          <option value="">All ratings</option>
          {[5, 4, 3, 2, 1].map(n => <option key={n} value={n}>{n} ★</option>)}
        </Select>
        <Select value={verifiedFilter} onChange={e => setVerifiedFilter(e.target.value)}>
          <option value="">Verified: any</option>
          <option value="true">Verified only</option>
          <option value="false">Unverified only</option>
        </Select>
        <Select value={productFilter} onChange={e => setProductFilter(e.target.value)}>
          <option value="">All products</option>
          {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </Select>
      </div>

      {loadingStates?.reviews ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '64px', alignItems: 'center', justifyContent: 'center' }}>
          <Spinner size={32} />
          <span style={{ fontSize: '0.85rem', color: '#64748b' }}>Loading reviews…</span>
        </div>
      ) : reviews.length === 0 ? (
        <div className="reviews-page__empty-card">
          <Empty icon="⭐" title={`No ${tab === 'all' ? '' : tab + ' '}reviews`} description="Nothing to show here." />
        </div>
      ) : (
        <>
          <div className="reviews-page__list">
            {reviews.map(r => (
              <ReviewCard
                key={r.id}
                review={r}
                onUpdate={handleUpdate}
                onDelete={id => setDeleting(id)}
                onEdit={r => setEditing(r)}
                onToggleVerified={handleToggleVerified}
                onToggleHomepage={handleToggleHomepage}
                fmtDate={fmtDate}
              />
            ))}
          </div>
          <Pagination page={page} total={reviewsPagination.total} pageSize={REVIEW_PAGE_SIZE} onChange={setPage} />
        </>
      )}

      <Modal open={adding} onClose={() => setAdding(false)} title="Add review" size="lg">
        <ReviewForm products={products} onCancel={() => setAdding(false)} onSubmit={handleCreate} />
      </Modal>

      <Modal open={!!editing} onClose={() => setEditing(null)} title="Edit review" size="lg">
        {editing && <ReviewForm initial={editing} products={products} onCancel={() => setEditing(null)} onSubmit={handleEditSave} />}
      </Modal>

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
