'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from './AdminProvider';
import { AdminToast, Avatar, Badge, Input, Btn, Spinner, ConfirmDialog } from '../ui/index';
import { Eye, Check } from '../ui/Icons';
import '../../styles/admin/_settings.scss';

function PaymentSettingsTab({ token }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState({ visible: false, msg: '', type: 'success' });

  function showToast(msg, type = 'success') {
    setToast({ visible: true, msg, type });
    setTimeout(() => setToast(t => ({ ...t, visible: false })), 3500);
  }

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/settings', { headers: { 'Authorization': `Bearer ${token}` } });
        if (!res.ok) throw new Error('Failed to load');
        const s = await res.json();
        setData(s);
      } catch {
        showToast('Could not load payment settings.', 'error');
      }
      setLoading(false);
    })();
  }, [token]);

  function setFieldValue(section, key, val) {
    setData(d => ({ ...d, [section]: { ...d[section], [key]: val } }));
  }

  async function save(e) {
    e.preventDefault();
    if (!data) return;
    setSaving(true);
    try {
      const res = await fetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ eft: data.eft, cod: data.cod }),
      });
      if (!res.ok) throw new Error('Save failed');
      showToast('Payment settings saved');
    } catch {
      showToast('Failed to save. Please try again.', 'error');
    }
    setSaving(false);
  }

  if (loading) return <div className="settings__loading">Loading payment settings…</div>;
  if (!data) return <div className="settings__error">Could not load payment settings.</div>;

  const eft = data.eft || {};
  const cod = data.cod || {};

  return (
    <form onSubmit={save} className="settings__form">
      <AdminToast message={toast.msg} type={toast.type} visible={toast.visible} />

      {/* EFT Section */}
      <div className="settings__card">
        <div className="settings__payment-header">
          <div>
            <h3 className="settings__card-title">EFT / Bank Transfer</h3>
            <p className="settings__card-subtitle">Bank details shown only after a valid EFT order is placed</p>
          </div>
          <label className="settings__toggle">
            <span className="settings__toggle-label">Enabled</span>
            <div 
              className={`settings__toggle-switch ${eft.enabled ? 'on' : 'off'}`}
              onClick={() => setFieldValue('eft', 'enabled', !eft.enabled)} 
              role="switch" 
              aria-checked={!!eft.enabled} 
              tabIndex={0}
              onKeyDown={e => (e.key === ' ' || e.key === 'Enter') && setFieldValue('eft', 'enabled', !eft.enabled)}
            >
              <span className={`settings__toggle-knob ${eft.enabled ? 'on' : 'off'}`} />
            </div>
          </label>
        </div>

        <div className="settings__payment-grid">
          <div className="settings__payment-field">
            <label>Bank Name</label>
            <input value={eft.bankName || ''} onChange={e => setFieldValue('eft', 'bankName', e.target.value)} placeholder="e.g. First National Bank" />
          </div>
          <div className="settings__payment-field">
            <label>Account Holder Name</label>
            <input value={eft.accountHolder || ''} onChange={e => setFieldValue('eft', 'accountHolder', e.target.value)} placeholder="e.g. Amahle Blue (Pty) Ltd" />
          </div>
          <div className="settings__payment-field">
            <label>Account Number</label>
            <input value={eft.accountNumber || ''} onChange={e => setFieldValue('eft', 'accountNumber', e.target.value)} placeholder="e.g. 62812345678" className="font-mono" />
          </div>
          <div className="settings__payment-field">
            <label>Branch Code</label>
            <input value={eft.branchCode || ''} onChange={e => setFieldValue('eft', 'branchCode', e.target.value)} placeholder="e.g. 250655" className="font-mono" />
          </div>
          <div className="settings__payment-field">
            <label>Account Type</label>
            <select value={eft.accountType || 'Current'} onChange={e => setFieldValue('eft', 'accountType', e.target.value)}>
              {['Current', 'Savings', 'Cheque', 'Transmission'].map(t => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div className="settings__payment-field">
            <label>SWIFT Code (optional)</label>
            <input value={eft.swiftCode || ''} onChange={e => setFieldValue('eft', 'swiftCode', e.target.value)} placeholder="e.g. FIRNZAJJ" className="font-mono" />
          </div>
        </div>

        <div className="settings__payment-field">
          <label>Additional EFT Instructions (optional)</label>
          <textarea 
            value={eft.instructions || ''} 
            onChange={e => setFieldValue('eft', 'instructions', e.target.value)}
            rows={2} 
            placeholder="e.g. Please allow 1–2 business days for payment verification." 
          />
        </div>

        <label className="settings__checkbox-label">
          <input type="checkbox" checked={!!eft.allowProofUpload} onChange={e => setFieldValue('eft', 'allowProofUpload', e.target.checked)} />
          <span>Allow customers to upload proof of payment</span>
        </label>
      </div>

      {/* COD Section */}
      <div className="settings__card">
        <div className="settings__payment-header">
          <div>
            <h3 className="settings__card-title">Cash on Delivery</h3>
            <p className="settings__card-subtitle">Only authorised admins can mark cash as collected</p>
          </div>
          <label className="settings__toggle">
            <span className="settings__toggle-label">Enabled</span>
            <div 
              className={`settings__toggle-switch ${cod.enabled ? 'on' : 'off'}`}
              onClick={() => setFieldValue('cod', 'enabled', !cod.enabled)} 
              role="switch" 
              aria-checked={!!cod.enabled} 
              tabIndex={0}
              onKeyDown={e => (e.key === ' ' || e.key === 'Enter') && setFieldValue('cod', 'enabled', !cod.enabled)}
            >
              <span className={`settings__toggle-knob ${cod.enabled ? 'on' : 'off'}`} />
            </div>
          </label>
        </div>

        <div className="settings__payment-field">
          <label>Customer-facing description</label>
          <input value={cod.description || ''} onChange={e => setFieldValue('cod', 'description', e.target.value)} placeholder="Pay in cash when your order is delivered." />
        </div>

        <div className="settings__payment-grid settings__payment-grid--3cols">
          <div className="settings__payment-field">
            <label>COD Fee (R)</label>
            <input type="number" min="0" step="0.01" value={cod.codFee || 0} onChange={e => setFieldValue('cod', 'codFee', parseFloat(e.target.value) || 0)} />
            <p className="hint">0 = no fee</p>
          </div>
          <div className="settings__payment-field">
            <label>Min Order (R)</label>
            <input type="number" min="0" step="0.01" value={cod.minOrderAmount || 0} onChange={e => setFieldValue('cod', 'minOrderAmount', parseFloat(e.target.value) || 0)} />
            <p className="hint">0 = no minimum</p>
          </div>
          <div className="settings__payment-field">
            <label>Max Order (R)</label>
            <input type="number" min="0" step="0.01" value={cod.maxOrderAmount || 0} onChange={e => setFieldValue('cod', 'maxOrderAmount', parseFloat(e.target.value) || 0)} />
            <p className="hint">0 = no maximum</p>
          </div>
        </div>
      </div>

      {/* Preview */}
      <div className="settings__preview">
        <p className="settings__preview-title">Checkout Preview</p>
        <div className="settings__preview-grid">
          {cod.enabled !== false && (
            <div className="settings__preview-box settings__preview-box--cod">
              <p className="name">Cash on Delivery</p>
              <p className="desc">{cod.description || 'Pay in cash when your order is delivered.'}</p>
            </div>
          )}
          {eft.enabled !== false && (
            <div className="settings__preview-box settings__preview-box--eft">
              <p className="name">EFT / Bank Transfer</p>
              <p className="desc">Pay directly into our bank account. After placing your order, you will receive the bank details and your order reference.</p>
            </div>
          )}
        </div>
      </div>

      <Btn type="submit" disabled={saving}>
        {saving ? <><Spinner size={14}/> Saving…</> : 'Save Payment Settings'}
      </Btn>
    </form>
  );
}

export default function SettingsPage() {
  const { session } = useAuth();
  const [tab, setTab] = useState('account');
  const [toast, setToast] = useState({ visible: false, msg: '', type: 'success' });
  const [pwForm, setPwForm] = useState({ current: '', next: '', confirm: '' });
  const [pwErrors, setPwErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNext, setShowNext] = useState(false);
  const [restoreCandidate, setRestoreCandidate] = useState(null);

  function showToast(msg, type = 'success') {
    setToast({ visible: true, msg, type });
    setTimeout(() => setToast(t => ({ ...t, visible: false })), 3000);
  }

  async function handlePasswordChange(e) {
    e.preventDefault();
    const errs = {};
    if (!pwForm.current) errs.current = 'Current password is required.';
    if (pwForm.next.length < 8) errs.next = 'New password must be at least 8 characters.';
    if (pwForm.next !== pwForm.confirm) errs.confirm = 'Passwords do not match.';
    setPwErrors(errs);
    if (Object.keys(errs).length) return;

    setSaving(true);
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'changePassword', token: session.token, currentPassword: pwForm.current, newPassword: pwForm.next }),
      });
      const data = await res.json();
      if (!res.ok) {
        setPwErrors({ current: data.error || 'Failed to update password.' });
        setSaving(false);
        return;
      }
    } catch {
      setPwErrors({ current: 'Network error — please try again.' });
      setSaving(false);
      return;
    }
    setSaving(false);
    setPwForm({ current: '', next: '', confirm: '' });
    showToast('Password changed successfully');
  }

  function handleResetData() {
    localStorage.removeItem('ab_products');
    showToast('Local cache cleared. Reload to resync from server.');
  }

  function handleRestoreFromCache() {
    let localProducts = null;
    let localOrders = null;

    try {
      const rawProd = localStorage.getItem('ab_products') || localStorage.getItem('ab_admin_products_v2');
      if (rawProd) {
        const parsed = JSON.parse(rawProd);
        if (Array.isArray(parsed) && parsed.length > 0) {
          localProducts = parsed;
        }
      }
    } catch (err) {}

    try {
      const rawOrd = localStorage.getItem('ab_admin_orders_v2');
      if (rawOrd) {
        const parsed = JSON.parse(rawOrd);
        if (Array.isArray(parsed) && parsed.length > 0) {
          localOrders = parsed;
        }
      }
    } catch (err) {}

    if (!localProducts && !localOrders) {
      showToast('No products or orders found in your browser cache.', 'error');
      return;
    }

    setRestoreCandidate({ products: localProducts, orders: localOrders });
  }

  async function runRestore() {
    if (!restoreCandidate) return;
    const { products: localProducts, orders: localOrders } = restoreCandidate;
    setSaving(true);
    try {
      const res = await fetch('/api/settings?resource=restore', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.token}`
        },
        body: JSON.stringify({
          products: localProducts,
          orders: localOrders
        })
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || 'Failed to restore database.', 'error');
      } else {
        showToast('Database successfully restored from cache! Reloading...', 'success');
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      }
    } catch (err) {
      showToast('Error: ' + err.message, 'error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="settings">
      <AdminToast message={toast.msg} type={toast.type} visible={toast.visible} />

      <div className="settings__header">
        <h2>Settings</h2>
        <p>Manage your account and store preferences</p>
      </div>

      <div className="settings__tabs">
        {['account', 'security', 'store', 'payment'].map(t => (
          <button key={t} onClick={() => setTab(t)} className={tab === t ? 'active' : ''}>
            {t}
          </button>
        ))}
      </div>

      {tab === 'account' && (
        <div className="settings__card">
          <h3 className="settings__card-title">Account Information</h3>
          <div className="settings__account-info">
            <Avatar name={session?.user?.name} size={56} />
            <div>
              <p className="settings__account-info-name">{session?.user?.name}</p>
              <p className="settings__account-info-email">{session?.user?.email}</p>
              <Badge label={session?.role} variant={session?.role === 'admin' ? 'active' : 'processing'} />
            </div>
          </div>
          <div className="settings__info-grid">
            <div className="settings__info-box">
              <p className="settings__info-box-label">Username</p>
              <p className="settings__info-box-value">{session?.user?.username}</p>
            </div>
            <div className="settings__info-box">
              <p className="settings__info-box-label">Role</p>
              <p className="settings__info-box-value capitalize">{session?.role}</p>
            </div>
          </div>
        </div>
      )}

      {tab === 'security' && (
        <div className="settings__card">
          <div>
            <h3 className="settings__card-title">Change Password</h3>
            <p className="settings__card-subtitle">Minimum 8 characters recommended</p>
          </div>
          <form onSubmit={handlePasswordChange} className="settings__form">
            <div className="settings__field">
              <label>Current Password</label>
              <div className="settings__input-wrapper">
                <input 
                  type={showCurrent ? 'text' : 'password'} 
                  value={pwForm.current} 
                  onChange={e => setPwForm(f => ({ ...f, current: e.target.value }))}
                  className={pwErrors.current ? 'error' : ''}
                />
                <button type="button" onClick={() => setShowCurrent(!showCurrent)}>
                  <Eye size={18} />
                </button>
              </div>
              {pwErrors.current && <p className="settings__error-text">{pwErrors.current}</p>}
            </div>
            <div className="settings__field">
              <label>New Password</label>
              <div className="settings__input-wrapper">
                <input 
                  type={showNext ? 'text' : 'password'} 
                  value={pwForm.next} 
                  onChange={e => setPwForm(f => ({ ...f, next: e.target.value }))}
                  className={pwErrors.next ? 'error' : ''}
                />
                <button type="button" onClick={() => setShowNext(!showNext)}>
                  <Eye size={18} />
                </button>
              </div>
              {pwErrors.next && <p className="settings__error-text">{pwErrors.next}</p>}
            </div>
            <Input 
              label="Confirm New Password" 
              type="password" 
              value={pwForm.confirm}
              onChange={e => setPwForm(f => ({ ...f, confirm: e.target.value }))} 
              error={pwErrors.confirm} 
            />
            <Btn type="submit" disabled={saving}>
              {saving ? <><Spinner size={14} /> Saving…</> : 'Update Password'}
            </Btn>
          </form>

          <div className="settings__session-info">
            <h4 className="settings__session-info-title">Session</h4>
            <p className="settings__session-info-desc">Your session expires 8 hours after login and clears when you close the browser.</p>
            <div className="settings__alert settings__alert--success">
              <Check size={16} />
              <span className="settings__alert-text">Session active &middot; SHA-256 hashed passwords</span>
            </div>
          </div>
        </div>
      )}

      {tab === 'store' && (
        <div className="settings__form">
          <div className="settings__card">
            <h3 className="settings__card-title">Store Info</h3>
            <div>
              {[
                ['Store Name', 'Amahle Blue'],
                ['Phone', '067 101 4345'],
                ['Email', 'info@amahle-blue.co.za'],
                ['Address', 'Unit H, 13 Main Reef Road, Dunswart, Boksburg, Gauteng']
              ].map(([k, v]) => (
                <div key={k} className="settings__store-row">
                  <span className="settings__store-row-label">{k}</span>
                  <span className="settings__store-row-value">{v}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="settings__card">
            <h3 className="settings__card-title">Data Management</h3>
            <p className="settings__card-subtitle" style={{ marginTop: '0.25rem', marginBottom: '1rem', lineHeight: '1.5' }}>
              Products and orders are stored in Vercel KV. <strong>Clear browser product cache</strong> removes the locally cached product snapshot used to speed up the storefront; the data itself stays in the database. <strong>Restore</strong> uploads any product/order snapshots in your browser cache back to the database — use only if the database was reset.
            </p>
            <div className="settings__actions">
              <Btn variant="danger" size="sm" onClick={handleResetData}>Clear Browser Product Cache</Btn>
              <Btn variant="primary" size="sm" onClick={handleRestoreFromCache}>Restore Database from Browser Cache</Btn>
            </div>
          </div>

          <div className="settings__alert settings__alert--success" style={{ flexDirection: 'column', alignItems: 'flex-start' }}>
            <div className="settings__alert-bold" style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <Check size={16} /> Backend Connected
            </div>
            <p className="settings__alert-text" style={{ margin: 0, lineHeight: '1.5' }}>
              Products, orders and credentials are stored in <strong>Vercel KV</strong> — persistent across devices and browser sessions. Images are hosted on <strong>Vercel Blob</strong>.
            </p>
          </div>
        </div>
      )}

      {tab === 'payment' && (
        <PaymentSettingsTab token={session?.token} />
      )}

      <ConfirmDialog
        open={!!restoreCandidate}
        onClose={() => setRestoreCandidate(null)}
        onConfirm={runRestore}
        title="Restore database from browser cache?"
        message={restoreCandidate
          ? `Found ${restoreCandidate.products ? restoreCandidate.products.length : 0} products and ${restoreCandidate.orders ? restoreCandidate.orders.length : 0} orders in your browser cache. This will overwrite matching records in the database.`
          : ''}
        confirmLabel="Restore"
        variant="primary"
      />
    </div>
  );
}
