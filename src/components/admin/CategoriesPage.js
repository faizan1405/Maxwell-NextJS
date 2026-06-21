'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useAdmin } from './AdminProvider';
import * as Icon from '../ui/Icons';
import { Badge, Btn, Input, Modal, AdminToast, ConfirmDialog, Spinner } from '../ui/index';

export default function CategoriesPage({ setUnsavedChanges }) {
  const { categories, products, addCategory, updateCategory, deleteCategory, updateProduct } = useAdmin();
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  const [modalMode, setModalMode] = useState(null); // 'add' | 'edit' | 'delete'
  const [activeItem, setActiveItem] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingBanner, setIsUploadingBanner] = useState(false);
  const [bannerUploadError, setBannerUploadError] = useState('');
  const bannerFileRef = useRef(null);
  const [toast, setToast] = useState({ visible: false, msg: '', type: 'success' });
  
  // Reassignment for deletion
  const [reassignTo, setReassignTo] = useState('');

  function showToast(msg, type = 'success') {
    setToast({ visible: true, msg, type });
    setTimeout(() => setToast(t => ({ ...t, visible: false })), 3500);
  }

  const filtered = useMemo(() => {
    return (categories || []).filter(c => {
      if (filterStatus !== 'all' && c.status !== filterStatus) return false;
      if (search) {
        const q = search.toLowerCase();
        return (c.name || '').toLowerCase().includes(q) || (c.id || '').toLowerCase().includes(q);
      }
      return true;
    });
  }, [categories, search, filterStatus]);

  const [originalItemSnapshot, setOriginalItemSnapshot] = useState(null);
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);

  const isDirty = useMemo(() => {
    if (!activeItem || !originalItemSnapshot || modalMode === 'delete') return false;
    return JSON.stringify(activeItem) !== JSON.stringify(originalItemSnapshot);
  }, [activeItem, originalItemSnapshot, modalMode]);

  useEffect(() => {
    if (setUnsavedChanges) {
      setUnsavedChanges(isDirty);
    }
    return () => {
      if (setUnsavedChanges) setUnsavedChanges(false);
    };
  }, [isDirty, setUnsavedChanges]);

  function handleAdd() {
    const item = { name: '', id: '', short: '', icon: 'Box', image: '', bannerImage: '', mobileBannerImage: '', blurb: '', description: '', seoTitle: '', seoDescription: '', accent: '#111111', status: 'active', displayOrder: 99 };
    setActiveItem(item);
    setOriginalItemSnapshot(item);
    setBannerUploadError('');
    setModalMode('add');
  }

  function handleEdit(c) {
    setActiveItem({ ...c });
    setOriginalItemSnapshot({ ...c });
    setBannerUploadError('');
    setModalMode('edit');
  }

  async function handleBannerUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    
    e.target.value = ''; // reset

    const isImg = file.type === 'image/jpeg' || file.type === 'image/png' || file.type === 'image/webp' || file.type === 'image/avif';
    if (!isImg) {
      setBannerUploadError('Unsupported file type. Please use JPG, PNG, or WEBP.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setBannerUploadError('Image is too large. Please upload a compressed banner image.');
      return;
    }

    setIsUploadingBanner(true);
    setBannerUploadError('');

    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/admin/upload-category-banner', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Upload failed');

      setActiveItem(prev => ({ ...prev, bannerImage: data.url }));
    } catch (err) {
      setBannerUploadError(err.message || 'Upload failed');
    } finally {
      setIsUploadingBanner(false);
    }
  }

  function handleDeleteReq(c) {
    setActiveItem({ ...c });
    setReassignTo('');
    setModalMode('delete');
  }

  function handleCloseCategoryModal() {
    if (isDirty) {
      setShowDiscardConfirm(true);
    } else {
      executeDiscardCategory();
    }
  }

  function executeDiscardCategory() {
    setModalMode(null);
    setActiveItem(null);
    setOriginalItemSnapshot(null);
    setShowDiscardConfirm(false);
  }

  async function handleToggleStatus(c) {
    const newStatus = c.status === 'active' ? 'inactive' : 'active';
    try {
      await updateCategory(c.id, { status: newStatus });
      showToast(`Category marked as ${newStatus}`);
    } catch (err) {
      showToast(err.message, 'error');
    }
  }

  async function onSave(e) {
    e.preventDefault();
    setIsSaving(true);
    try {
      if (modalMode === 'add') {
        const id = activeItem.id || activeItem.name;
        await addCategory({ ...activeItem, id });
        showToast('Category created');
      } else {
        await updateCategory(activeItem.id, activeItem);
        showToast('Category updated');
      }
      setOriginalItemSnapshot(null);
      setActiveItem(null);
      setModalMode(null);
    } catch (err) {
      showToast(err.message, 'error');
    }
    setIsSaving(false);
  }

  async function onDeleteConf() {
    setIsSaving(true);
    try {
      const linkedProducts = products.filter(p => p.cat === activeItem.id);
      
      if (linkedProducts.length > 0) {
        if (!reassignTo) {
          showToast('Please select a category to reassign products to.', 'error');
          setIsSaving(false);
          return;
        }
        await Promise.all(linkedProducts.map(p => updateProduct(p.id, { cat: reassignTo })));
      }

      await deleteCategory(activeItem.id, reassignTo);
      showToast('Category deleted');
      setModalMode(null);
    } catch (err) {
      showToast(err.message, 'error');
    }
    setIsSaving(false);
  }

  const getProductCount = (catId) => products.filter(p => p.cat === catId).length;

  return (
    <div className="admin-categories">
      <AdminToast message={toast.msg} type={toast.type} visible={toast.visible} />

      <div className="admin-categories__header">
        <div>
          <h2 className="admin-categories__header-title">Categories</h2>
          <p className="admin-categories__header-subtitle">{categories?.length || 0} categories total</p>
        </div>
        <Btn onClick={handleAdd}><Icon.Plus /> Add Category</Btn>
      </div>

      <div className="admin-categories__filters">
        <div className="admin-categories__filters-search">
          <Icon.Search className="admin-categories__filters-search-icon" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search categories..."
            className="admin-categories__filters-search-input" />
        </div>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
          className="admin-categories__filters-select">
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>

      <div className="admin-categories__table-wrapper">
        <div className="admin-categories__table-scroll">
          <table className="admin-categories__table">
            <thead className="admin-categories__table-head">
              <tr>
                <th className="admin-categories__table-head-img">Image</th>
                <th>Name & Slug</th>
                <th className="admin-categories__table-head-order">Order</th>
                <th className="admin-categories__table-head-prods">Products</th>
                <th className="admin-categories__table-head-status">Status</th>
                <th className="admin-categories__table-head-actions">Actions</th>
              </tr>
            </thead>
            <tbody className="admin-categories__table-body">
              {filtered.map(c => {
                const count = getProductCount(c.id);
                const IconComponent = Icon[c.icon];
                return (
                  <tr key={c.id}>
                    <td>
                      {c.image ? (
                        <img src={c.image} alt={c.name} className="admin-categories__table-img" />
                      ) : (
                        <div className="admin-categories__table-icon" style={{ color: c.accent || '#94a3b8' }}>
                          {IconComponent ? <IconComponent /> : <Icon.Box />}
                        </div>
                      )}
                    </td>
                    <td>
                      <div className="admin-categories__table-name">{c.name}</div>
                      <div className="admin-categories__table-slug">{c.id}</div>
                    </td>
                    <td className="admin-categories__table-order">
                      <span>{c.displayOrder}</span>
                    </td>
                    <td className="admin-categories__table-prods">
                      <span className={count > 0 ? 'admin-categories__table-prods-span--has' : 'admin-categories__table-prods-span--none'}>
                        {count}
                      </span>
                    </td>
                    <td>
                      <Badge label={c.status === 'active' ? 'Active' : 'Inactive'} variant={c.status === 'active' ? 'active' : 'draft'} />
                    </td>
                    <td>
                      <div className="admin-categories__table-actions">
                        <button onClick={() => handleToggleStatus(c)} className="admin-categories__table-actions-archive" title={c.status === 'active' ? 'Archive (Set Inactive)' : 'Unarchive (Set Active)'}>
                          <Icon.Archive size={16} />
                        </button>
                        <button onClick={() => handleEdit(c)} className="admin-categories__table-actions-edit" title="Edit">
                          <Icon.Edit size={16} />
                        </button>
                        <button onClick={() => handleDeleteReq(c)} className="admin-categories__table-actions-delete" title="Delete">
                          <Icon.Trash size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan="6" className="admin-categories__table-body-empty">
                    No categories found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal open={modalMode === 'add' || modalMode === 'edit'} onClose={handleCloseCategoryModal} title={modalMode === 'add' ? 'New Category' : 'Edit Category'} size="lg">
        {activeItem && (
          <form onSubmit={onSave} className="admin-cat-form__space-y">
            <div className="admin-cat-form__grid-2">
              <Input label="Category Name" value={activeItem.name} onChange={e => setActiveItem({ ...activeItem, name: e.target.value })} required />
              <Input label="Slug (ID)" value={activeItem.id} onChange={e => setActiveItem({ ...activeItem, id: e.target.value.toLowerCase().replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') })} placeholder="auto-generated if empty" disabled={modalMode === 'edit'} />
            </div>

            <div className="admin-cat-form__grid-2">
              <Input label="Short Name" value={activeItem.short} onChange={e => setActiveItem({ ...activeItem, short: e.target.value })} placeholder="e.g. Household" />
              <Input label="Vector Icon" value={activeItem.icon} onChange={e => setActiveItem({ ...activeItem, icon: e.target.value })} placeholder="e.g. Home, Spray, Car" />
            </div>

            <div>
              <label className="admin-cat-form__field-label">Image URL (Optional override)</label>
              <input value={activeItem.image || ''} onChange={e => setActiveItem({ ...activeItem, image: e.target.value })} placeholder="https://..." className="admin-cat-form__field-input" />
            </div>

            <div className="admin-cat-form__grid-2">
              <Input label="Accent Color" type="color" value={activeItem.accent} onChange={e => setActiveItem({ ...activeItem, accent: e.target.value })} />
              <Input label="Display Order" type="number" value={activeItem.displayOrder} onChange={e => setActiveItem({ ...activeItem, displayOrder: parseInt(e.target.value) || 0 })} />
            </div>

            <div style={{ padding: '1rem', border: '1px solid #e2e8f0', borderRadius: '8px', background: '#f8fafc' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <label className="admin-cat-form__field-label" style={{ margin: 0 }}>Banner Image URL</label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  {activeItem.bannerImage && (
                    <Btn variant="ghost" size="sm" onClick={() => setActiveItem({ ...activeItem, bannerImage: '' })} disabled={isUploadingBanner}>
                      Clear
                    </Btn>
                  )}
                  <Btn type="button" size="sm" onClick={() => bannerFileRef.current?.click()} disabled={isUploadingBanner}>
                    {isUploadingBanner ? <><Spinner size={14}/> Uploading...</> : 'Upload Banner Image'}
                  </Btn>
                  <input ref={bannerFileRef} type="file" accept=".jpg,.jpeg,.png,.webp,.avif" style={{ display: 'none' }} onChange={handleBannerUpload} />
                </div>
              </div>
              <p style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.75rem' }}>
                Use a direct image URL or upload a banner image. Webpage links will not display as images. Recommended size: 1920 × 600 px. Best format: WebP.
              </p>
              <input value={activeItem.bannerImage || ''} onChange={e => setActiveItem({ ...activeItem, bannerImage: e.target.value })} placeholder="https://..." className="admin-cat-form__field-input" disabled={isUploadingBanner} />
              {bannerUploadError && <p style={{ color: '#dc2626', fontSize: '0.75rem', marginTop: '0.5rem' }}>{bannerUploadError}</p>}
              {activeItem.bannerImage && (
                <div style={{ marginTop: '0.75rem', borderRadius: '6px', overflow: 'hidden', height: '80px', background: '#e2e8f0', position: 'relative' }}>
                  <img src={activeItem.bannerImage} alt="Banner Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }} />
                  <div style={{ display: 'none', position: 'absolute', inset: 0, alignItems: 'center', justifyContent: 'center', color: '#64748b', fontSize: '0.875rem' }}>
                    Invalid Image / Webpage URL
                  </div>
                </div>
              )}
            </div>

            <div style={{ padding: '1rem', border: '1px solid #e2e8f0', borderRadius: '8px', background: '#f8fafc', marginTop: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <label className="admin-cat-form__field-label" style={{ margin: 0 }}>Mobile Banner Image URL</label>
              </div>
              <p style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.75rem' }}>
                Optional. Override the banner image on mobile devices.
              </p>
              <input value={activeItem.mobileBannerImage || ''} onChange={e => setActiveItem({ ...activeItem, mobileBannerImage: e.target.value })} placeholder="/assets/household-mobile-banner.jpg" className="admin-cat-form__field-input" disabled={isUploadingBanner} />
              {activeItem.mobileBannerImage && (
                <div style={{ marginTop: '0.75rem', borderRadius: '6px', overflow: 'hidden', height: '80px', background: '#e2e8f0', position: 'relative', width: '60px' }}>
                  <img src={activeItem.mobileBannerImage} alt="Mobile Banner Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={(e) => { e.target.style.display = 'none'; }} />
                </div>
              )}
            </div>

            <div>
              <label className="admin-cat-form__field-label">Short Description / Blurb</label>
              <textarea value={activeItem.blurb || ''} onChange={e => setActiveItem({ ...activeItem, blurb: e.target.value })} rows={2} className="admin-cat-form__field-textarea" />
            </div>

            <div>
              <label className="admin-cat-form__field-label">Full Page Description</label>
              <textarea value={activeItem.description || ''} onChange={e => setActiveItem({ ...activeItem, description: e.target.value })} rows={4} className="admin-cat-form__field-textarea" />
            </div>

            <div className="admin-cat-form__grid-2">
              <Input label="SEO Title" value={activeItem.seoTitle || ''} onChange={e => setActiveItem({ ...activeItem, seoTitle: e.target.value })} placeholder="Optional override" />
              <Input label="SEO Description" value={activeItem.seoDescription || ''} onChange={e => setActiveItem({ ...activeItem, seoDescription: e.target.value })} placeholder="Optional override" />
            </div>

            <div className="admin-cat-form__active">
              <label className="admin-cat-form__active-label">
                <input type="checkbox" checked={activeItem.status === 'active'} onChange={e => setActiveItem({ ...activeItem, status: e.target.checked ? 'active' : 'inactive' })} className="admin-cat-form__active-input" />
                <span className="admin-cat-form__active-text">Active (Visible in store)</span>
              </label>
            </div>

            <div className="admin-cat-form__footer">
              <Btn type="button" variant="secondary" onClick={handleCloseCategoryModal} disabled={isSaving || isUploadingBanner}>Cancel</Btn>
              <Btn type="submit" disabled={isSaving || isUploadingBanner}>{isSaving ? 'Saving...' : 'Save Category'}</Btn>
            </div>
          </form>
        )}
      </Modal>

      <Modal open={modalMode === 'delete'} onClose={() => !isSaving && setModalMode(null)} title="Delete Category" size="sm">
        {activeItem && (
          <div className="admin-cat-del__space-y">
            <p className="admin-cat-del__text">
              Are you sure you want to delete the category <strong>{activeItem.name}</strong>?
            </p>

            {(() => {
              const count = getProductCount(activeItem.id);
              if (count > 0) {
                return (
                  <div className="admin-cat-del__warn">
                    <div className="admin-cat-del__warn-title">
                      <Icon.Warning />
                      <p>This category has {count} linked product{count !== 1 ? 's' : ''}.</p>
                    </div>
                    <p className="admin-cat-del__warn-desc">You must reassign these products to another category before deleting.</p>
                    <select value={reassignTo} onChange={e => setReassignTo(e.target.value)} className="admin-cat-del__warn-select">
                      <option value="">Select new category...</option>
                      {categories.filter(c => c.id !== activeItem.id).map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                );
              }
              return null;
            })()}

            <div className="admin-cat-del__footer">
              <Btn type="button" variant="secondary" onClick={() => setModalMode(null)} disabled={isSaving}>Cancel</Btn>
              <Btn type="button" variant="danger" onClick={onDeleteConf} disabled={isSaving || (getProductCount(activeItem.id) > 0 && !reassignTo)}>
                {isSaving ? 'Deleting...' : 'Confirm Delete'}
              </Btn>
            </div>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={showDiscardConfirm}
        onClose={() => setShowDiscardConfirm(false)}
        onConfirm={executeDiscardCategory}
        title="Discard Unsaved Changes"
        message="You have unsaved changes. Are you sure you want to discard them and close?"
        confirmLabel="Discard"
        variant="danger"
      />
    </div>
  );
}
