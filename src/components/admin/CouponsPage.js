'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useAuth, useAdmin } from './AdminProvider';
import * as Icon from '../ui/Icons';
import { 
  Modal, Btn, Spinner, Input, Select, Toggle, AdminToast, 
  SearchInput, Empty, Pagination, ConfirmDialog 
} from '../ui/index';
import '../../styles/admin/_coupons.scss'; // Ensure we import it or rely on a global import?

const COUPON_PAGE_SIZE = 10;

function blankCoupon() {
  return { code:'', type:'percentage', value:'', minOrderValue:'', maxUses:'', expiresAt:'', active:true };
}

function CouponForm({ open, onClose, initial, onSave }) {
  const [form,   setForm]   = useState(blankCoupon());
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (!open) return;
    setErrors({});
    if (initial) {
      setForm({
        ...initial,
        value:         String(initial.value),
        minOrderValue: initial.minOrderValue ? String(initial.minOrderValue) : '',
        maxUses:       initial.maxUses       ? String(initial.maxUses)       : '',
        expiresAt:     initial.expiresAt     ? new Date(initial.expiresAt).toISOString().slice(0, 10) : '',
      });
    } else {
      setForm(blankCoupon());
    }
  }, [open, initial]);

  const set = (f, v) => setForm(p => ({ ...p, [f]: v }));

  function validate() {
    const e = {};
    if (!form.code.trim()) e.code = 'Coupon code is required.';
    const v = parseFloat(form.value);
    if (!form.value || isNaN(v) || v <= 0) e.value = 'Valid discount value is required.';
    if (form.type === 'percentage' && v > 100) e.value = 'Percentage cannot exceed 100.';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSave() {
    if (!validate()) return;
    setSaving(true);
    await onSave({
      ...form,
      code:          form.code.trim().toUpperCase(),
      value:         parseFloat(form.value),
      minOrderValue: form.minOrderValue ? parseFloat(form.minOrderValue) : 0,
      maxUses:       form.maxUses       ? parseInt(form.maxUses, 10)     : null,
      expiresAt:     form.expiresAt     ? new Date(form.expiresAt + 'T23:59:59').getTime() : null,
    });
    setSaving(false);
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} size="md" title={initial ? 'Edit Coupon' : 'New Coupon'}
      footer={<><Btn variant="secondary" onClick={onClose}>Cancel</Btn><Btn onClick={handleSave} disabled={saving}>{saving?<><Spinner size={14}/>Saving…</>:(initial?'Save Changes':'Create Coupon')}</Btn></>}
    >
      <div className="coupon-form">
        <Input label="Coupon Code *" value={form.code} onChange={e=>set('code',e.target.value.toUpperCase())}
          placeholder="e.g. SAVE20" error={errors.code} hint="Auto-uppercased · customers type this at checkout" />
        <div className="coupon-form__grid">
          <Select label="Discount Type" value={form.type} onChange={e=>set('type',e.target.value)}>
            <option value="percentage">Percentage (%)</option>
            <option value="fixed">Fixed Amount (R)</option>
          </Select>
          <Input label={`Value * ${form.type==='percentage'?'(%)':'(R)'}`} type="number" min="0.01" step="0.01"
            value={form.value} onChange={e=>set('value',e.target.value)} error={errors.value}
            placeholder={form.type==='percentage'?'e.g. 20':'e.g. 50'} />
        </div>
        <div className="coupon-form__grid">
          <Input label="Min Order Value (R)" type="number" min="0" step="0.01"
            value={form.minOrderValue} onChange={e=>set('minOrderValue',e.target.value)}
            placeholder="0 = no minimum" />
          <Input label="Max Uses" type="number" min="1" step="1"
            value={form.maxUses} onChange={e=>set('maxUses',e.target.value)}
            placeholder="Blank = unlimited" />
        </div>
        <Input label="Expiry Date" type="date" value={form.expiresAt} onChange={e=>set('expiresAt',e.target.value)}
          hint="Leave blank for no expiry" />
        <Toggle checked={form.active} onChange={v=>set('active',v)} label="Active (customers can redeem this coupon)" />
      </div>
    </Modal>
  );
}

export default function CouponsPage() {
  const { coupons, addCoupon, updateCoupon, deleteCoupon, fmtMoney, fmtDate } = useAdmin();
  const { isAdmin } = useAuth();
  const [search,   setSearch]   = useState('');
  const [page,     setPage]     = useState(1);
  const [formOpen, setFormOpen] = useState(false);
  const [editing,  setEditing]  = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [toast,    setToast]    = useState({ visible:false, msg:'', type:'success' });

  function showToast(msg, type='success') {
    setToast({ visible:true, msg, type });
    setTimeout(() => setToast(t=>({...t,visible:false})), 3000);
  }

  const filtered = useMemo(() => {
    if (!search.trim()) return coupons;
    const q = search.toLowerCase();
    return coupons.filter(c => c.code.toLowerCase().includes(q));
  }, [coupons, search]);

  const paged = filtered.slice((page-1)*COUPON_PAGE_SIZE, page*COUPON_PAGE_SIZE);
  
  useEffect(() => {
    setPage(1);
  }, [search]);

  async function handleSave(payload) {
    if (editing) { await updateCoupon(editing.id, payload); showToast('Coupon updated'); }
    else         { await addCoupon(payload);                showToast('Coupon created'); }
  }

  async function handleToggle(c) {
    await updateCoupon(c.id, { active: !c.active });
    showToast(`Coupon ${c.active?'deactivated':'activated'}`);
  }

  async function handleDelete(c) {
    await deleteCoupon(c.id);
    showToast('Coupon deleted');
    setDeleting(null);
  }

  const now = Date.now();

  return (
    <div className="coupons-page">
      <AdminToast message={toast.msg} type={toast.type} visible={toast.visible}/>

      <div className="coupons-page__header">
        <div>
          <h2 className="coupons-page__title">Coupons</h2>
          <p className="coupons-page__subtitle">{coupons.length} coupon{coupons.length!==1?'s':''} total</p>
        </div>
        {isAdmin && (
          <Btn onClick={() => { setEditing(null); setFormOpen(true); }}><Icon.Plus/> New Coupon</Btn>
        )}
      </div>

      <div className="coupons-page__content">
        <div className="coupons-page__search">
          <SearchInput value={search} onChange={setSearch} placeholder="Search by code…"/>
        </div>

        {filtered.length === 0 ? (
          <Empty icon="🎟️" title="No coupons found"
            description={search?'Try a different search.':'Create your first coupon to get started.'}/>
        ) : (
          <>
            <div className="coupons-page__table-wrapper">
              <table className="coupons-page__table">
                <thead>
                  <tr>
                    <th className="coupons-page__th">Code</th>
                    <th className="coupons-page__th">Discount</th>
                    <th className="coupons-page__th coupons-page__th--hide-sm">Min Order</th>
                    <th className="coupons-page__th coupons-page__th--hide-md">Uses</th>
                    <th className="coupons-page__th coupons-page__th--hide-lg">Expires</th>
                    <th className="coupons-page__th">Status</th>
                    <th className="coupons-page__th"/>
                  </tr>
                </thead>
                <tbody>
                  {paged.map(c => {
                    const expired   = c.expiresAt && c.expiresAt < now;
                    const exhausted = c.maxUses != null && (c.usedCount||0) >= c.maxUses;
                    const label     = !c.active ? 'inactive' : expired ? 'expired' : exhausted ? 'exhausted' : 'active';
                    const labelModifier = label==='active' ? 'active' : label==='inactive' ? 'inactive' : 'error';
                    
                    return (
                      <tr key={c.id} className="coupons-page__tr">
                        <td className="coupons-page__td coupons-page__td--code">{c.code}</td>
                        <td className="coupons-page__td coupons-page__td--discount">
                          {c.type==='percentage' ? `${c.value}% off` : `${fmtMoney(c.value)} off`}
                        </td>
                        <td className="coupons-page__td coupons-page__td--hide-sm">
                          {c.minOrderValue>0 ? fmtMoney(c.minOrderValue) : '—'}
                        </td>
                        <td className="coupons-page__td coupons-page__td--hide-md">
                          {c.usedCount||0}{c.maxUses!=null?` / ${c.maxUses}`:''}
                        </td>
                        <td className="coupons-page__td coupons-page__td--hide-lg">
                          {c.expiresAt ? fmtDate(c.expiresAt) : '—'}
                        </td>
                        <td className="coupons-page__td">
                          <span className={`coupons-page__status coupons-page__status--${labelModifier}`}>{label}</span>
                        </td>
                        <td className="coupons-page__td">
                          <div className="coupons-page__actions">
                            {isAdmin && <Toggle checked={c.active} onChange={() => handleToggle(c)}/>}
                            <button onClick={() => { setEditing(c); setFormOpen(true); }}
                              className="coupons-page__action-btn coupons-page__action-btn--edit">
                              <Icon.Edit/>
                            </button>
                            {isAdmin && (
                              <button onClick={() => setDeleting(c)}
                                className="coupons-page__action-btn coupons-page__action-btn--delete">
                                <Icon.Trash/>
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="coupons-page__pagination">
              <Pagination page={page} total={filtered.length} pageSize={COUPON_PAGE_SIZE} onChange={setPage}/>
            </div>
          </>
        )}
      </div>

      <CouponForm
        open={formOpen}
        onClose={() => { setFormOpen(false); setEditing(null); }}
        initial={editing}
        onSave={handleSave}
      />

      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={() => handleDelete(deleting)}
        title="Delete Coupon"
        message={`Permanently delete coupon "${deleting?.code}"? This cannot be undone.`}
        confirmLabel="Delete"
        variant="danger"
      />
    </div>
  );
}
