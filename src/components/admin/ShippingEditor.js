'use client';

import React, { useState } from 'react';
import { useAdmin } from './AdminProvider';
import { Plus, Pencil, Trash, Close } from '../ui/Icons';
import { AdminToast, Btn, ConfirmDialog } from '../ui/index';
import '../../styles/admin/_shipping.scss';

export default function ShippingEditor() {
  const { shippingRates, addShippingRate, updateShippingRate, deleteShippingRate, fmtMoney } = useAdmin();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState({ visible: false, msg: '', type: 'success' });
  const [deleting, setDeleting] = useState(null);

  function showToast(msg, type = 'success') {
    setToast({ visible: true, msg, type });
    setTimeout(() => setToast(t => ({ ...t, visible: false })), 3500);
  }

  // Form State
  const [name, setName] = useState('');
  const [country, setCountry] = useState('South Africa');
  const [region, setRegion] = useState('');
  const [charge, setCharge] = useState(0);
  const [minOrderAmount, setMinOrderAmount] = useState(0);
  const [freeThreshold, setFreeThreshold] = useState(0);
  const [estimatedTime, setEstimatedTime] = useState('');
  const [status, setStatus] = useState('active');
  const [isDefault, setIsDefault] = useState(false);
  const [displayPriority, setDisplayPriority] = useState(0);

  function openNew() {
    setEditingId(null);
    setName('');
    setCountry('South Africa');
    setRegion('');
    setCharge(0);
    setMinOrderAmount(0);
    setFreeThreshold(0);
    setEstimatedTime('');
    setStatus('active');
    setIsDefault(false);
    setDisplayPriority(0);
    setModalOpen(true);
  }

  function openEdit(rate) {
    setEditingId(rate.id);
    setName(rate.name);
    setCountry(rate.country);
    setRegion(rate.region || '');
    setCharge(rate.charge);
    setMinOrderAmount(rate.minOrderAmount || 0);
    setFreeThreshold(rate.freeThreshold || 0);
    setEstimatedTime(rate.estimatedTime || '');
    setStatus(rate.status);
    setIsDefault(rate.isDefault || false);
    setDisplayPriority(rate.displayPriority || 0);
    setModalOpen(true);
  }

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    const payload = { id: editingId, name, country, region, charge, minOrderAmount, freeThreshold, estimatedTime, status, isDefault, displayPriority };
    const ok = editingId ? await updateShippingRate(payload) : await addShippingRate(payload);
    setSaving(false);
    if (ok) {
      setModalOpen(false);
      showToast(editingId ? 'Shipping rate updated' : 'Shipping rate added');
    } else {
      showToast('Failed to save shipping rate.', 'error');
    }
  }

  async function handleConfirmDelete() {
    if (!deleting) return;
    const ok = await deleteShippingRate(deleting.id);
    if (ok) showToast('Shipping rate deleted');
    else showToast('Failed to delete shipping rate.', 'error');
  }

  const sortedRates = [...(shippingRates || [])].sort((a,b) => b.displayPriority - a.displayPriority || a.name.localeCompare(b.name));

  return (
    <div className="shipping">
      <AdminToast message={toast.msg} type={toast.type} visible={toast.visible} />

      <div className="shipping__header">
        <div>
          <h1 className="shipping__header-title">Shipping Rates</h1>
          <p className="shipping__header-subtitle">Manage delivery charges, regions, and free shipping thresholds.</p>
        </div>
        <Btn onClick={openNew}>
          <Plus /> Add Rate
        </Btn>
      </div>

      <div className="shipping__card">
        <div className="shipping__table-wrapper">
          <table className="shipping__table">
            <thead>
              <tr>
                <th>Rate Name</th>
                <th>Region</th>
                <th>Charge</th>
                <th>Free Threshold</th>
                <th>Status</th>
                <th>Default</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {sortedRates.length === 0 && (
                <tr>
                  <td colSpan="7" className="text-center">No shipping rates found. Add one to get started.</td>
                </tr>
              )}
              {sortedRates.map(r => (
                <tr key={r.id}>
                  <td className="font-500">{r.name}</td>
                  <td>{r.region || 'Any'}</td>
                  <td className="font-600">{fmtMoney ? fmtMoney(r.charge) : r.charge}</td>
                  <td className="text-slate-500">{r.freeThreshold > 0 ? (fmtMoney ? fmtMoney(r.freeThreshold) : r.freeThreshold) : '—'}</td>
                  <td>
                    <span className={`shipping__badge shipping__badge--${r.status}`}>
                      {r.status}
                    </span>
                  </td>
                  <td>
                    {r.isDefault && <span className="shipping__badge shipping__badge--default">Default</span>}
                  </td>
                  <td className="text-right">
                    <button onClick={() => openEdit(r)} className="shipping__action-btn shipping__action-btn--edit">
                      <Pencil size={18} />
                    </button>
                    <button onClick={() => setDeleting(r)} className="shipping__action-btn shipping__action-btn--delete">
                      <Trash size={18} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {modalOpen && (
        <div className="shipping__modal-overlay">
          <div className="shipping__modal-backdrop" onClick={() => setModalOpen(false)} />
          <div className="shipping__modal-content">
            <div className="shipping__modal-header">
              <h3>{editingId ? 'Edit Shipping Rate' : 'New Shipping Rate'}</h3>
              <button onClick={() => setModalOpen(false)}>
                <Close size={20} />
              </button>
            </div>
            
            <form onSubmit={handleSave} className="shipping__form">
              <div className="shipping__field">
                <label>Rate Name</label>
                <input required value={name} onChange={e=>setName(e.target.value)} placeholder="e.g. Standard Local" />
              </div>

              <div className="shipping__grid">
                <div className="shipping__field">
                  <label>Country</label>
                  <input required value={country} onChange={e=>setCountry(e.target.value)} />
                </div>
                <div className="shipping__field">
                  <label>Region / Province</label>
                  <input value={region} onChange={e=>setRegion(e.target.value)} placeholder="e.g. Gauteng" />
                  <p>Leave blank to match any</p>
                </div>
              </div>

              <div className="shipping__grid">
                <div className="shipping__field">
                  <label>Delivery Charge (R)</label>
                  <input type="number" step="0.01" min="0" required value={charge} onChange={e=>setCharge(Number(e.target.value))} />
                </div>
                <div className="shipping__field">
                  <label>Estimated Time</label>
                  <input value={estimatedTime} onChange={e=>setEstimatedTime(e.target.value)} placeholder="e.g. 1-2 Days" />
                </div>
              </div>

              <div className="shipping__grid">
                <div className="shipping__field">
                  <label>Min Order Amount</label>
                  <input type="number" step="0.01" min="0" value={minOrderAmount} onChange={e=>setMinOrderAmount(Number(e.target.value))} />
                </div>
                <div className="shipping__field">
                  <label>Free Delivery Above</label>
                  <input type="number" step="0.01" min="0" value={freeThreshold} onChange={e=>setFreeThreshold(Number(e.target.value))} placeholder="0 for no free delivery" />
                </div>
              </div>

              <div className="shipping__grid">
                <div className="shipping__field">
                  <label>Status</label>
                  <select value={status} onChange={e=>setStatus(e.target.value)}>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
                <div className="shipping__field">
                  <label>Display Priority</label>
                  <input type="number" value={displayPriority} onChange={e=>setDisplayPriority(Number(e.target.value))} />
                </div>
              </div>

              <label className="shipping__checkbox-field">
                <input type="checkbox" checked={isDefault} onChange={e=>setIsDefault(e.target.checked)} />
                <div className="info">
                  <div className="title">Fallback / Default Rate</div>
                  <div className="desc">Apply this rate when no other regional rules match.</div>
                </div>
              </label>

            </form>

            <div className="shipping__modal-footer">
              <button type="button" onClick={() => setModalOpen(false)} className="cancel">Cancel</button>
              <button onClick={handleSave} disabled={saving} className="save">
                {saving ? 'Saving...' : 'Save Rate'}
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={handleConfirmDelete}
        title="Delete Shipping Rate"
        message={deleting ? `Delete "${deleting.name}"? This cannot be undone.` : ''}
        confirmLabel="Delete"
        variant="danger"
      />
    </div>
  );
}
