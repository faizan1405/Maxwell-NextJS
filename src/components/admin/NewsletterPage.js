'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from './AdminProvider';
import * as Icon from '../ui/Icons';
import { 
  Btn, Spinner, AdminToast, SearchInput, Empty, Pagination, ConfirmDialog, Modal
} from '../ui/index';

const PAGE_SIZE = 20;

export default function NewsletterPage() {
  const { isAdmin } = useAuth();
  
  // State
  const [subscribers, setSubscribers] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: PAGE_SIZE, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  
  // Actions states
  const [editingSub, setEditingSub] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [isExporting, setIsExporting] = useState(false);
  const [toast, setToast] = useState({ visible: false, msg: '', type: 'success' });

  // Toast Helper
  const showToast = useCallback((msg, type = 'success') => {
    setToast({ visible: true, msg, type });
    setTimeout(() => setToast(t => ({ ...t, visible: false })), 3000);
  }, []);

  // Fetch Subscribers
  const loadSubscribers = useCallback(async () => {
    setLoading(true);
    try {
      const q = new URLSearchParams();
      q.set('page', String(page));
      q.set('limit', String(PAGE_SIZE));
      if (search.trim()) q.set('search', search.trim());
      if (statusFilter !== 'all') q.set('status', statusFilter);

      const res = await fetch(`/api/newsletter?${q.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch subscribers');
      const result = await res.json();
      
      setSubscribers(result.data || []);
      setPagination(result.pagination || { page, limit: PAGE_SIZE, total: 0, totalPages: 1 });
    } catch (err) {
      console.error(err);
      showToast('Error loading subscribers', 'error');
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter, showToast]);

  useEffect(() => {
    loadSubscribers();
  }, [loadSubscribers]);

  // Reset page on filter changes
  useEffect(() => {
    setPage(1);
  }, [search, statusFilter]);

  // Toggle status (subscribed / unsubscribed)
  async function handleToggleStatus(sub) {
    const nextStatus = sub.status === 'subscribed' ? 'unsubscribed' : 'subscribed';
    try {
      const res = await fetch('/api/newsletter', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: sub.id, status: nextStatus }),
      });
      if (!res.ok) throw new Error('Status update failed');
      showToast(`Subscriber ${nextStatus === 'subscribed' ? 'subscribed' : 'unsubscribed'} successfully`);
      loadSubscribers();
    } catch (err) {
      console.error(err);
      showToast('Failed to update status', 'error');
    }
  }

  // Save admin notes & status in modal
  async function handleSaveEdit(notes, status) {
    if (!editingSub) return;
    try {
      const res = await fetch('/api/newsletter', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: editingSub.id, notes, status }),
      });
      if (!res.ok) throw new Error('Failed to update subscriber');
      showToast('Subscriber updated successfully');
      setEditingSub(null);
      loadSubscribers();
    } catch (err) {
      console.error(err);
      showToast('Failed to save changes', 'error');
    }
  }

  // Delete subscriber
  async function handleDeleteConfirm() {
    if (!deletingId) return;
    try {
      const res = await fetch(`/api/newsletter?id=${encodeURIComponent(deletingId)}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Failed to delete subscriber');
      showToast('Subscriber deleted successfully');
      setDeletingId(null);
      loadSubscribers();
    } catch (err) {
      console.error(err);
      showToast('Failed to delete subscriber', 'error');
    }
  }

  // Client-side CSV export
  async function handleExportCSV() {
    if (!isAdmin) return showToast('Unauthorized', 'error');
    setIsExporting(true);
    try {
      const q = new URLSearchParams();
      q.set('limit', '10000');
      if (search.trim()) q.set('search', search.trim());
      if (statusFilter !== 'all') q.set('status', statusFilter);

      const res = await fetch(`/api/newsletter?${q.toString()}`);
      if (!res.ok) throw new Error('Export query failed');
      const result = await res.json();
      const allMatching = result.data || [];

      const headers = ['Email', 'Name', 'Phone', 'Source', 'Status', 'Subscription Date', 'Unsubscription Date', 'Notes'];
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
        ...allMatching.map(s => [
          s.email || '—',
          s.name || '—',
          s.phone || '—',
          s.source || '—',
          s.status || '—',
          s.subscribedAt ? new Date(s.subscribedAt).toLocaleString('en-ZA') : '—',
          s.unsubscribedAt ? new Date(s.unsubscribedAt).toLocaleString('en-ZA') : '—',
          s.notes || ''
        ].map(escapeCell).join(','))
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      const dateStr = new Date().toISOString().split('T')[0];
      link.setAttribute("href", url);
      link.setAttribute("download", `newsletter-subscribers-${dateStr}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      showToast('CSV Export successful');
    } catch (err) {
      console.error(err);
      showToast('Export failed', 'error');
    } finally {
      setIsExporting(false);
    }
  }

  const formatZADate = (timestamp) => {
    if (!timestamp) return '—';
    return new Date(timestamp).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  return (
    <div className="admin-customers" style={{ padding: '1rem' }}>
      <AdminToast message={toast.msg} type={toast.type} visible={toast.visible} />

      <div className="admin-customers__header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 className="admin-customers__title" style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800 }}>Subscribers</h2>
          <p className="admin-customers__subtitle" style={{ margin: '0.25rem 0 0 0', color: '#64748b', fontSize: '0.875rem' }}>
            {pagination.total} newsletter subscriber{pagination.total !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="admin-customers__actions">
          <Btn variant="secondary" size="sm" disabled={isExporting || pagination.total === 0} onClick={handleExportCSV}>
            {isExporting ? <span style={{ display: 'inline-block', marginRight: '0.5rem', animation: 'spin 1s linear infinite' }}>⭘</span> : null}
            Export CSV
          </Btn>
        </div>
      </div>

      <div className="admin-customers__filters" style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ flex: 1, minWidth: '240px' }}>
          <SearchInput value={search} onChange={setSearch} placeholder="Search by email, name, phone or source…" />
        </div>
        <div className="admin-customers__filters-tabs" style={{ display: 'flex', background: '#f1f5f9', padding: '3px', borderRadius: '8px' }}>
          {[['all', 'All'], ['subscribed', 'Subscribed'], ['unsubscribed', 'Unsubscribed']].map(([v, l]) => (
            <button
              key={v}
              onClick={() => setStatusFilter(v)}
              className="admin-customers__tab"
              style={{
                border: 'none',
                background: statusFilter === v ? '#fff' : 'transparent',
                color: statusFilter === v ? '#264CFF' : '#64748b',
                padding: '6px 16px',
                borderRadius: '6px',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
                boxShadow: statusFilter === v ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                transition: 'all 0.15s ease'
              }}
            >
              {l}
            </button>
          ))}
        </div>
      </div>

      <div className="admin-customers__table-container" style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '64px', alignItems: 'center', justifyContent: 'center' }}>
            <Spinner size={32} />
            <span style={{ fontSize: '0.85rem', color: '#64748b' }}>Loading subscribers…</span>
          </div>
        ) : subscribers.length === 0 ? (
          <Empty icon="✉️" title="No subscribers found" description="No newsletter subscribers match your query." />
        ) : (
          <>
            <div className="admin-customers__table-scroll" style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px', textAlign: 'left' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', fontWeight: 600 }}>
                    <th style={{ padding: '12px 16px' }}>Email</th>
                    <th style={{ padding: '12px 16px' }}>Name</th>
                    <th style={{ padding: '12px 16px' }}>Phone</th>
                    <th style={{ padding: '12px 16px' }}>Source</th>
                    <th style={{ padding: '12px 16px' }}>Date Subscribed</th>
                    <th style={{ padding: '12px 16px' }}>Status</th>
                    <th style={{ padding: '12px 16px', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {subscribers.map((sub) => {
                    const isSub = sub.status === 'subscribed';
                    return (
                      <tr key={sub.id} style={{ borderBottom: '1px solid #f1f5f9', color: '#111111' }}>
                        <td style={{ padding: '14px 16px', fontWeight: 600 }}>{sub.email}</td>
                        <td style={{ padding: '14px 16px' }}>{sub.name || '—'}</td>
                        <td style={{ padding: '14px 16px' }}>{sub.phone || '—'}</td>
                        <td style={{ padding: '14px 16px' }}>
                          <span style={{ textTransform: 'capitalize', fontSize: '12px', background: '#f1f5f9', padding: '2px 8px', borderRadius: '4px', color: '#475569', fontWeight: 500 }}>
                            {sub.source || 'footer'}
                          </span>
                        </td>
                        <td style={{ padding: '14px 16px' }}>{formatZADate(sub.subscribedAt)}</td>
                        <td style={{ padding: '14px 16px' }}>
                          <span 
                            onClick={() => handleToggleStatus(sub)}
                            className={`admin-badge admin-badge--${isSub ? 'green' : 'slate'}`}
                            style={{ cursor: 'pointer', display: 'inline-block', userSelect: 'none' }}
                            title="Click to toggle status"
                          >
                            {isSub ? 'Subscribed' : 'Unsubscribed'}
                          </span>
                        </td>
                        <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                          <div style={{ display: 'inline-flex', gap: '0.25rem', alignItems: 'center' }}>
                            <button
                              onClick={() => setEditingSub(sub)}
                              title="Edit Subscriber notes"
                              style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '30px', height: '30px', border: 'none', background: 'none', borderRadius: '6px', color: '#475569', cursor: 'pointer', hover: { background: '#f1f5f9' } }}
                            >
                              <Icon.Edit size={16} />
                            </button>
                            <button
                              onClick={() => setDeletingId(sub.id)}
                              title="Delete Subscriber"
                              style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '30px', height: '30px', border: 'none', background: 'none', borderRadius: '6px', color: '#ef4444', cursor: 'pointer' }}
                            >
                              <Icon.Trash size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div style={{ padding: '1rem', borderTop: '1px solid #e2e8f0' }}>
              <Pagination page={page} total={pagination.total} pageSize={PAGE_SIZE} onChange={setPage} />
            </div>
          </>
        )}
      </div>

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={!!deletingId}
        onClose={() => setDeletingId(null)}
        onConfirm={handleDeleteConfirm}
        title="Delete Subscriber"
        message="Are you sure you want to permanently delete this subscriber? This will erase their history and cannot be undone."
        confirmLabel="Delete"
        variant="danger"
      />

      {/* Edit Notes Modal */}
      {editingSub && (
        <EditSubscriberModal
          sub={editingSub}
          onClose={() => setEditingSub(null)}
          onSave={handleSaveEdit}
        />
      )}
    </div>
  );
}

// Internal Edit Notes Modal Component
function EditSubscriberModal({ sub, onClose, onSave }) {
  const [notes, setNotes] = useState(sub.notes || '');
  const [status, setStatus] = useState(sub.status || 'subscribed');
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);

  const isDirty = notes !== (sub.notes || '') || status !== (sub.status || 'subscribed');

  function handleSubmit(e) {
    e.preventDefault();
    onSave(notes, status);
  }

  function handleCancel() {
    if (isDirty) {
      setShowDiscardConfirm(true);
    } else {
      onClose();
    }
  }

  return (
    <>
      <Modal
        open={true}
        onClose={handleCancel}
        title="Edit Subscriber"
        size="sm"
        footer={
          <>
            <Btn variant="ghost" size="sm" onClick={handleCancel}>Cancel</Btn>
            <Btn variant="primary" size="sm" onClick={handleSubmit}>Save Changes</Btn>
          </>
        }
      >
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '0.375rem' }}>Email</label>
            <input
              type="text"
              disabled
              value={sub.email}
              style={{ width: '100%', padding: '0.625rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#f8fafc', fontSize: '14px', outline: 'none', color: '#64748b' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '0.375rem' }}>Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              style={{ width: '100%', padding: '0.625rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', outline: 'none', cursor: 'pointer' }}
            >
              <option value="subscribed">Subscribed</option>
              <option value="unsubscribed">Unsubscribed</option>
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '0.375rem' }}>Admin Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
              placeholder="Add administrative notes regarding this subscriber..."
              style={{ width: '100%', padding: '0.625rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', outline: 'none', resize: 'none' }}
            />
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={showDiscardConfirm}
        onClose={() => setShowDiscardConfirm(false)}
        onConfirm={onClose}
        title="Discard Unsaved Changes"
        message="You have unsaved changes. Are you sure you want to discard them and close?"
        confirmLabel="Discard"
        variant="danger"
      />
    </>
  );
}
