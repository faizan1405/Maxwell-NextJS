'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useAdmin } from './AdminProvider';
import * as Icon from '../ui/Icons';
import { 
  Modal, Btn, Spinner, Input, Textarea, Select, Toggle, AdminToast, 
  SearchInput, Empty, Pagination, ConfirmDialog 
} from '../ui/index';
import '../../styles/admin/_faqs.scss';

const FAQ_CAT_OPTIONS = [
  { value: 'products',      label: 'Products' },
  { value: 'carcare',       label: 'Car Care' },
  { value: 'cleaning',      label: 'Cleaning & Sanitising' },
  { value: 'account',       label: 'Account & Ordering' },
  { value: 'delivery',      label: 'Delivery' },
  { value: 'payments',      label: 'Payments' },
  { value: 'cancellations', label: 'Cancellations & Support' },
];

const FAQ_PAGE_SIZE = 12;

function blankFaq() {
  return { question: '', answer: '', category: 'ordering', order: 1, enabled: true, showOnHomepage: false };
}

function FaqForm({ open, onClose, initial, onSave }) {
  const [form,   setForm]   = useState(blankFaq());
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (!open) return;
    setErrors({});
    setForm(initial
      ? { ...initial, order: String(initial.order || 1) }
      : { ...blankFaq(), order: '1' }
    );
  }, [open, initial]);

  const set = (f, v) => setForm(p => ({ ...p, [f]: v }));

  function validate() {
    const e = {};
    if (!form.question.trim()) e.question = 'Question is required.';
    if (!form.answer.trim())   e.answer   = 'Answer is required.';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSave() {
    if (!validate()) return;
    setSaving(true);
    await onSave({ ...form, order: parseInt(form.order, 10) || 1 });
    setSaving(false);
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} size="lg" title={initial ? 'Edit FAQ' : 'New FAQ'}
      footer={
        <>
          <Btn variant="secondary" onClick={onClose}>Cancel</Btn>
          <Btn onClick={handleSave} disabled={saving}>
            {saving ? <><Spinner size={14} />Saving…</> : (initial ? 'Save Changes' : 'Create FAQ')}
          </Btn>
        </>
      }
    >
      <div className="faq-form">
        <Textarea
          label="Question *"
          rows={2}
          value={form.question}
          onChange={e => set('question', e.target.value)}
          placeholder="e.g. How can I place an order?"
          error={errors.question}
        />
        <Textarea
          label="Answer *"
          rows={5}
          value={form.answer}
          onChange={e => set('answer', e.target.value)}
          placeholder="Write a clear, concise answer…"
          error={errors.answer}
        />
        <div className="faq-form__row">
          <Select
            label="Category"
            value={form.category}
            onChange={e => set('category', e.target.value)}
          >
            {FAQ_CAT_OPTIONS.map(c => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </Select>
          <Input
            label="Display Order"
            type="number"
            min="1"
            step="1"
            value={form.order}
            onChange={e => set('order', e.target.value)}
            hint="Lower = appears first"
          />
        </div>
        <div className="faq-form__toggles">
          <Toggle
            checked={form.enabled}
            onChange={v => set('enabled', v)}
            label="Enabled (visible to customers)"
          />
          <Toggle
            checked={form.showOnHomepage}
            onChange={v => set('showOnHomepage', v)}
            label="Show on homepage (up to 8 shown)"
          />
        </div>
      </div>
    </Modal>
  );
}

export default function FaqsPage() {
  const { faqs, addFaq, updateFaq, deleteFaq } = useAdmin();
  const [search,   setSearch]    = useState('');
  const [catFilter,setCatFilter] = useState('all');
  const [page,     setPage]      = useState(1);
  const [formOpen, setFormOpen]  = useState(false);
  const [editing,  setEditing]   = useState(null);
  const [deleting, setDeleting]  = useState(null);
  const [toast,    setToast]     = useState({ visible: false, msg: '', type: 'success' });

  function showToast(msg, type = 'success') {
    setToast({ visible: true, msg, type });
    setTimeout(() => setToast(t => ({ ...t, visible: false })), 3000);
  }

  const filtered = useMemo(() => {
    let items = [...(faqs || [])].sort((a, b) => (a.order || 0) - (b.order || 0));
    if (catFilter !== 'all') items = items.filter(f => f.category === catFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      items = items.filter(f =>
        f.question.toLowerCase().includes(q) ||
        f.answer.toLowerCase().includes(q)
      );
    }
    return items;
  }, [faqs, search, catFilter]);

  const paged = filtered.slice((page - 1) * FAQ_PAGE_SIZE, page * FAQ_PAGE_SIZE);
  
  useEffect(() => {
    setPage(1);
  }, [search, catFilter]);

  async function handleSave(payload) {
    if (editing) { await updateFaq(editing.id, payload); showToast('FAQ updated'); }
    else         { await addFaq(payload);                showToast('FAQ created'); }
  }

  async function handleToggleEnabled(f) {
    await updateFaq(f.id, { enabled: !f.enabled });
    showToast(`FAQ ${f.enabled ? 'disabled' : 'enabled'}`);
  }

  async function handleDelete() {
    await deleteFaq(deleting.id);
    showToast('FAQ deleted', 'error');
  }

  const homepageCount = (faqs || []).filter(f => f.showOnHomepage && f.enabled !== false).length;

  const catLabel = id => FAQ_CAT_OPTIONS.find(c => c.value === id)?.label || id;

  return (
    <div className="faqs-page">
      <AdminToast message={toast.msg} type={toast.type} visible={toast.visible} />

      <div className="faqs-page__header">
        <div className="faqs-page__title-group">
          <h2 className="faqs-page__title">FAQs</h2>
          <p className="faqs-page__subtitle">
            {(faqs || []).length} total · {(faqs || []).filter(f => f.enabled !== false).length} enabled · {homepageCount}/8 on homepage
          </p>
        </div>
        <Btn onClick={() => { setEditing(null); setFormOpen(true); }}>
          <Icon.Plus /> New FAQ
        </Btn>
      </div>

      <div className="faqs-page__filters">
        <SearchInput value={search} onChange={setSearch} placeholder="Search questions or answers…" />
        <select
          value={catFilter}
          onChange={e => setCatFilter(e.target.value)}
          className="faqs-page__filter-select"
        >
          <option value="all">All categories</option>
          {FAQ_CAT_OPTIONS.map(c => (
            <option key={c.value} value={c.value}>{c.label}</option>
          ))}
        </select>
      </div>

      {(faqs || []).length === 0 && (
        <Empty
          icon="❓"
          title="No FAQs yet"
          description="Add your first FAQ to help customers find answers quickly."
          action={<Btn onClick={() => { setEditing(null); setFormOpen(true); }}><Icon.Plus /> Add First FAQ</Btn>}
        />
      )}

      {paged.length > 0 && (
        <div className="faqs-page__list">
          {paged.map(f => (
            <div key={f.id} className="faq-card">
              <span className="faq-card__order">
                {f.order}
              </span>

              <div className="faq-card__content">
                <p className="faq-card__question">{f.question}</p>
                <p className="faq-card__answer">{f.answer}</p>
                <div className="faq-card__tags">
                  <span className="faq-card__tag faq-card__tag--category">
                    {catLabel(f.category)}
                  </span>
                  <span className={`faq-card__tag ${f.enabled !== false ? 'faq-card__tag--enabled' : 'faq-card__tag--disabled'}`}>
                    {f.enabled !== false ? 'Enabled' : 'Disabled'}
                  </span>
                  {f.showOnHomepage && (
                    <span className="faq-card__tag faq-card__tag--homepage">
                      Homepage
                    </span>
                  )}
                </div>
              </div>

              <div className="faq-card__actions">
                <button
                  onClick={() => handleToggleEnabled(f)}
                  title={f.enabled !== false ? 'Disable' : 'Enable'}
                  className={`faq-card__action faq-card__action--toggle ${f.enabled === false ? 'is-disabled' : ''}`}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    {f.enabled !== false
                      ? <><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></>
                      : <><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></>
                    }
                  </svg>
                </button>
                <button
                  onClick={() => { setEditing(f); setFormOpen(true); }}
                  title="Edit"
                  className="faq-card__action faq-card__action--edit"
                >
                  <Icon.Edit />
                </button>
                <button
                  onClick={() => setDeleting(f)}
                  title="Delete"
                  className="faq-card__action faq-card__action--delete"
                >
                  <Icon.Trash />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {filtered.length === 0 && (faqs || []).length > 0 && (
        <Empty icon="🔍" title="No FAQs match" description="Try adjusting your search or filter." />
      )}

      <Pagination page={page} total={filtered.length} pageSize={FAQ_PAGE_SIZE} onChange={setPage} />

      <FaqForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        initial={editing}
        onSave={handleSave}
      />

      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={handleDelete}
        title="Delete FAQ"
        message={`Delete "${deleting?.question}"? This cannot be undone.`}
        confirmLabel="Delete FAQ"
        variant="danger"
      />
    </div>
  );
}
