'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useAuth, useAdmin } from './AdminProvider';
import * as Icon from '../ui/Icons';
import { 
  Badge, Btn, Input, Textarea, Select, Modal, ConfirmDialog, 
  Empty, SearchInput, Pagination, AdminToast, Spinner 
} from '../ui/index';

const BADGES  = [null,'Bestseller','New','High Purity','Sale'];
const STATUSES= ['active','draft','archived'];
const PAGE_SIZE = 8;

const MEDIA_LIMITS   = { maxItems: 12, maxImageBytes: 5*1024*1024, maxVideoBytes: 50*1024*1024 };
const _ALLOWED_IMGS  = new Set(['image/jpeg','image/png','image/webp']);
const _ALLOWED_VIDS  = new Set(['video/mp4','video/webm']);

function getPrimaryImg(p) {
  if (p && p.media && p.media.length > 0) {
    const pri = p.media.find(m => m.isPrimary && m.type === 'image');
    if (pri && pri.url) return pri.url;
    const fi = p.media.find(m => m.type === 'image');
    if (fi && fi.url) return fi.url;
  }
  return (p && p.img) ? p.img : '../assets/products/placeholder.svg';
}

function blankProduct() {
  return { name:'', cat:'household', sub:'', price:'', was:'', size:'', sku:'', scent:'', badge:null, img:'', media:[], desc:'', stock:0, lowStockThreshold:10, status:'active', outOfStock:false, benefits:['','','',''], variants:[], rating:4.8, reviews:0 };
}

function VariantRow({ v, idx, onChange, onRemove }) {
  return (
    <div className="admin-variant-row">
      <input value={v.name} onChange={e=>onChange(idx,'name',e.target.value)} placeholder="Size (e.g. 1L)"
        className="admin-variant-row__input admin-variant-row__input--min"/>
      <input value={v.price} onChange={e=>onChange(idx,'price',e.target.value)} placeholder="Price"
        type="number" min="0" step="0.01"
        className="admin-variant-row__input admin-variant-row__input--w20"/>
      <input value={v.stock} onChange={e=>onChange(idx,'stock',e.target.value)} placeholder="Stock"
        type="number" min="0"
        className="admin-variant-row__input admin-variant-row__input--w16"/>
      <label className="admin-variant-row__label">
        <input type="checkbox" checked={!!v.outOfStock} onChange={e=>onChange(idx,'outOfStock',e.target.checked)}
          className="admin-variant-row__checkbox"/>
      </label>
      <button onClick={()=>onRemove(idx)} className="admin-variant-row__remove"><Icon.Trash/></button>
    </div>
  );
}

function MediaGallerySection({ items, onFilesSelected, onReorder, onSetPrimary, onDelete, disabled }) {
  const fileRef              = useRef();
  const [dropZone, setDropZone] = useState(false);
  const [dragSrc,  setDragSrc]  = useState(null);
  const [dragOver, setDragOver] = useState(null);
  const canAdd = items.length < MEDIA_LIMITS.maxItems;

  function handleZoneDrop(e) {
    e.preventDefault();
    setDropZone(false);
    const files = Array.from(e.dataTransfer.files || []);
    if (files.length) onFilesSelected(files);
  }

  function startDrag(e, idx) {
    setDragSrc(idx);
    e.dataTransfer.effectAllowed = 'move';
  }

  function overItem(e, idx) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (idx !== dragOver) setDragOver(idx);
  }

  function dropItem(e, idx) {
    e.preventDefault();
    e.stopPropagation();
    if (dragSrc !== null && dragSrc !== idx) onReorder(dragSrc, idx);
    setDragSrc(null);
    setDragOver(null);
  }

  return (
    <div className="admin-media">
      <div className="admin-media__header">
        <label className="admin-media__header-label">
          Media Gallery
          <span className="admin-media__header-hint">({items.length}/{MEDIA_LIMITS.maxItems} · drag to reorder)</span>
        </label>
        {canAdd && !disabled && (
          <button type="button" onClick={()=>fileRef.current?.click()}
            className="admin-media__header-add">+ Add files</button>
        )}
      </div>

      {canAdd && (
        <div
          onDragEnter={e=>{e.preventDefault();setDropZone(true);}}
          onDragOver={e=>{e.preventDefault();setDropZone(true);}}
          onDragLeave={()=>setDropZone(false)}
          onDrop={handleZoneDrop}
          onClick={()=>!disabled&&fileRef.current?.click()}
          className={`admin-media__dropzone ${disabled ? 'admin-media__dropzone--disabled' : 'admin-media__dropzone--enabled'} ${dropZone ? 'admin-media__dropzone--active' : 'admin-media__dropzone--inactive'}`}
        >
          <div className="admin-media__dropzone-text">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
            <span>Drop files or click to upload</span>
          </div>
          <span className="admin-media__dropzone-hint">Images: JPG/PNG/WEBP ≤5 MB · Videos: MP4/WEBM ≤50 MB</span>
        </div>
      )}

      {items.length > 0 && (
        <div className="admin-media__grid">
          {items.map((item, idx) => (
            <div
              key={item.id}
              draggable={item.status === 'done'}
              onDragStart={e=>startDrag(e, idx)}
              onDragOver={e=>overItem(e, idx)}
              onDrop={e=>dropItem(e, idx)}
              onDragEnd={()=>{setDragSrc(null);setDragOver(null);}}
              className={`admin-media__item ${item.status==='done' ? 'admin-media__item--done' : 'admin-media__item--default'} ${dragOver===idx && dragSrc!==idx ? 'admin-media__item--drag-over' : ''} ${dragSrc===idx ? 'admin-media__item--drag-src' : ''}`}
            >
              {item.type === 'video' ? (
                <div className="admin-media__item-video">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="white"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                </div>
              ) : (
                <img src={item.previewUrl || item.url} alt={item.altText||''} className="admin-media__item-img" draggable="false"/>
              )}

              {item.status === 'uploading' && (
                <div className="admin-media__item-uploading">
                  <Spinner size={18}/>
                  <span>Uploading…</span>
                </div>
              )}

              {item.status === 'error' && (
                <div className="admin-media__item-error">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                  <span>{item.error||'Failed'}</span>
                  <button type="button" onClick={()=>onDelete(idx)}>Remove</button>
                </div>
              )}

              {item.status === 'done' && (
                <>
                  {item.isPrimary && item.type === 'image' && (
                    <span className="admin-media__item-badge-primary">★</span>
                  )}
                  {item.type === 'video' && (
                    <span className="admin-media__item-badge-vid">VID</span>
                  )}
                </>
              )}

              {item.status === 'done' && (
                <div className="admin-media__item-hover">
                  <button type="button" onClick={e=>{e.stopPropagation();onDelete(idx);}}
                    className="admin-media__item-hover-del">
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                  </button>
                  {item.type === 'image' && !item.isPrimary && (
                    <button type="button" onClick={e=>{e.stopPropagation();onSetPrimary(idx);}}
                      className="admin-media__item-hover-set-main">
                      Set main
                    </button>
                  )}
                </div>
              )}

              <span className="admin-media__item-sort">{idx+1}</span>
            </div>
          ))}
        </div>
      )}

      <input ref={fileRef} type="file" accept=".jpg,.jpeg,.png,.webp,.mp4,.webm" multiple className="hidden" style={{display: 'none'}}
        onChange={e=>{ const f=Array.from(e.target.files||[]); if(f.length) onFilesSelected(f); e.target.value=''; }}/>
    </div>
  );
}

function ProductForm({ open, onClose, initial, onSave }) {
  const { session }                    = useAuth();
  const { categories }                 = useAdmin();
  const [form,       setForm]          = useState(blankProduct);
  const [saving,     setSaving]        = useState(false);
  const [errors,     setErrors]        = useState({});
  const [formError,  setFormError]     = useState('');
  const [mediaItems, setMediaItems]    = useState([]);

  useEffect(() => {
    if (open) {
      setForm(initial
        ? { ...initial, benefits: (initial.benefits||['','','','']).slice(0,4).concat(['','','','']).slice(0,4) }
        : blankProduct()
      );
      setErrors({});
      setFormError('');
      if (initial && Array.isArray(initial.media) && initial.media.length > 0) {
        setMediaItems(initial.media.map(m => ({ ...m, previewUrl: m.url, status: 'done', error: '', _file: null })));
      } else if (initial && initial.img) {
        setMediaItems([{
          id: (initial.id||'legacy') + '-img',
          type: 'image', url: initial.img, previewUrl: initial.img,
          storageKey: null, altText: initial.name||'', sortOrder: 0, isPrimary: true,
          fileName: initial.img.split('/').pop()||'image', mimeType: 'image/jpeg',
          fileSize: 0, createdAt: initial.createdAt||Date.now(),
          status: 'done', error: '', _file: null,
        }]);
      } else {
        setMediaItems([]);
      }
    }
  }, [open, initial]);

  const set         = (field, val) => setForm(f => ({...f, [field]: val}));
  const setBenefit  = (i, val)     => setForm(f => { const b=[...f.benefits]; b[i]=val; return {...f,benefits:b}; });
  const addVariant  = ()           => setForm(f => ({...f, variants:[...f.variants, {name:'',price:'',stock:0,outOfStock:false}]}));
  const removeVariant = i          => setForm(f => ({...f, variants:f.variants.filter((_,idx)=>idx!==i)}));
  const changeVariant = (i,field,val) => setForm(f => { const v=[...f.variants]; v[i]={...v[i],[field]:field==='stock'?parseInt(val)||0:field==='price'?parseFloat(val)||0:field==='outOfStock'?!!val:val}; return {...f,variants:v}; });

  async function handleFilesSelected(files) {
    const token  = session?.token;
    const canAdd = MEDIA_LIMITS.maxItems - mediaItems.length;
    const toAdd  = Array.from(files).slice(0, canAdd);
    if (!toAdd.length) return;

    const newItems = toAdd.map(file => ({
      id:         `new-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      type:       _ALLOWED_VIDS.has(file.type) ? 'video' : 'image',
      url:        '',
      previewUrl: file.type.startsWith('image/') ? URL.createObjectURL(file) : '',
      storageKey: null, altText: '', sortOrder: 0, isPrimary: false,
      fileName: file.name, mimeType: file.type, fileSize: file.size,
      createdAt: Date.now(),
      status: 'uploading', error: '', _file: file,
    }));

    setMediaItems(prev => [...prev, ...newItems]);

    await Promise.all(newItems.map(async item => {
      try {
        const isVid = _ALLOWED_VIDS.has(item.mimeType);
        const isImg = _ALLOWED_IMGS.has(item.mimeType);
        if (!isImg && !isVid) throw new Error('Unsupported file type');
        const maxBytes = isVid ? MEDIA_LIMITS.maxVideoBytes : MEDIA_LIMITS.maxImageBytes;
        if (item.fileSize > maxBytes) throw new Error(`Exceeds ${isVid?'50':'5'} MB limit`);

        const res = await fetch('/api/upload', {
          method:  'POST',
          headers: {
            'Content-Type': item.mimeType,
            'x-filename':   item.fileName,
            ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
          },
          body: item._file,
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Upload failed');

        setMediaItems(prev => prev.map(m => m.id !== item.id ? m : {
          ...m, url: data.url, storageKey: data.storageKey||null,
          type: data.type || m.type,
          status: 'done', error: '', _file: null,
        }));
      } catch (err) {
        setMediaItems(prev => prev.map(m => m.id !== item.id ? m : {
          ...m, status: 'error', error: err.message, _file: null,
        }));
      }
    }));
  }

  function reorderMedia(srcIdx, dstIdx) {
    setMediaItems(prev => {
      const next = [...prev];
      const [item] = next.splice(srcIdx, 1);
      next.splice(dstIdx, 0, item);
      return next.map((m, i) => ({ ...m, sortOrder: i }));
    });
  }

  function setPrimaryMedia(idx) {
    setMediaItems(prev => prev.map((m, i) => ({ ...m, isPrimary: i === idx && m.type === 'image' })));
  }

  function deleteMediaItem(idx) {
    setMediaItems(prev => {
      const removed = prev[idx];
      const next    = prev.filter((_,i) => i !== idx).map((m,i) => ({ ...m, sortOrder: i }));
      if (removed.isPrimary && removed.type === 'image') {
        const fi = next.find(m => m.type === 'image');
        if (fi) fi.isPrimary = true;
      }
      if (removed.previewUrl && removed.previewUrl.startsWith('blob:')) URL.revokeObjectURL(removed.previewUrl);
      return next;
    });
  }

  function validate() {
    const e = {};
    if (!form.name.trim())  e.name  = 'Product name is required.';
    if (!form.price || isNaN(parseFloat(form.price))) e.price = 'Valid price is required.';
    if (!form.sku.trim())   e.sku   = 'SKU is required.';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSave() {
    if (!validate()) return;
    setSaving(true);

    const doneMedia = mediaItems
      .filter(m => m.status === 'done')
      .map(({ _file, previewUrl, status, error, ...rest }) => rest)
      .map((m, i) => ({ ...m, sortOrder: i }));

    if (!doneMedia.some(m => m.isPrimary && m.type === 'image')) {
      const fi = doneMedia.find(m => m.type === 'image');
      if (fi) fi.isPrimary = true;
    }

    const primaryImg = doneMedia.find(m => m.isPrimary && m.type === 'image') || doneMedia.find(m => m.type === 'image');

    const data = {
      ...form,
      price:             parseFloat(form.price)||0,
      was:               form.was ? parseFloat(form.was)||null : null,
      stock:             parseInt(form.stock)||0,
      lowStockThreshold: parseInt(form.lowStockThreshold)||10,
      benefits:          form.benefits.filter(Boolean),
      media:             doneMedia,
      img:               primaryImg ? primaryImg.url : (form.img || ''),
    };
    try {
      await onSave(data);
      setSaving(false);
      onClose();
    } catch (err) {
      setSaving(false);
      setFormError(err.message || 'Failed to save product. Please try again.');
    }
  }

  const uploadingCount = mediaItems.filter(m => m.status === 'uploading').length;
  const isEdit         = !!initial;

  return (
    <Modal open={open} onClose={onClose} size="xl" title={isEdit ? `Edit: ${initial?.name}` : 'Add New Product'}
      footer={<>
        {formError && <span style={{flex: 1, fontSize: '0.75rem', color: '#dc2626', fontWeight: 500, marginRight: '0.5rem'}}>{formError}</span>}
        <Btn variant="secondary" onClick={onClose}>Cancel</Btn>
        <Btn onClick={handleSave} disabled={saving||uploadingCount>0}>
          {saving
            ? <><Spinner size={14}/>Saving…</>
            : uploadingCount > 0
              ? <><Spinner size={14}/>{uploadingCount} uploading…</>
              : isEdit ? 'Save Changes' : 'Add Product'}
        </Btn>
      </>}
    >
      <div className="admin-product-form__space-y">
        <div className="admin-product-form__grid-2">
          <Input label="Product Name *" value={form.name} onChange={e=>set('name',e.target.value)} placeholder="e.g. All Purpose Cleaner" error={errors.name} className="admin-product-form__grid-2-full"/>
          <Input label="Subtitle" value={form.sub} onChange={e=>set('sub',e.target.value)} placeholder="e.g. 5L Concentrated Formula"/>
          <Select label="Category" value={form.cat} onChange={e=>set('cat',e.target.value)}>
            {categories.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
          </Select>
        </div>

        <div className="admin-product-form__grid-4">
          <Input label="Price (R) *" type="number" min="0" step="0.01" value={form.price} onChange={e=>set('price',e.target.value)} placeholder="0.00" error={errors.price}/>
          <Input label="Compare-at Price" type="number" min="0" step="0.01" value={form.was||''} onChange={e=>set('was',e.target.value)} placeholder="0.00"/>
          <Input label="Size / Unit" value={form.size} onChange={e=>set('size',e.target.value)} placeholder="e.g. 5L"/>
          <Input label="SKU *" value={form.sku} onChange={e=>set('sku',e.target.value)} placeholder="ABC-5L-001" error={errors.sku}/>
        </div>

        <div className="admin-product-form__grid-5">
          <Input label="Stock Quantity" type="number" min="0" value={form.stock} onChange={e=>set('stock',e.target.value)}/>
          <Input label="Low Stock Alert" type="number" min="0" value={form.lowStockThreshold} onChange={e=>set('lowStockThreshold',e.target.value)} hint="Alert when below this number"/>
          <Select label="Status" value={form.status} onChange={e=>set('status',e.target.value)}>
            {STATUSES.map(s=><option key={s} value={s} style={{textTransform: 'capitalize'}}>{s.charAt(0).toUpperCase()+s.slice(1)}</option>)}
          </Select>
          <Select label="Badge" value={form.badge||''} onChange={e=>set('badge',e.target.value||null)}>
            <option value="">No badge</option>
            {BADGES.filter(Boolean).map(b=><option key={b} value={b}>{b}</option>)}
          </Select>
          <div className="admin-product-form__oos-check">
            <label className="admin-product-form__oos-check-label">
              <input type="checkbox" checked={!!form.outOfStock} onChange={e=>set('outOfStock',e.target.checked)} className="admin-product-form__oos-check-input"/>
              <span>Out of Stock</span>
            </label>
            <p className="admin-product-form__oos-check-hint">Force unavailable</p>
          </div>
        </div>

        <MediaGallerySection
          items={mediaItems}
          onFilesSelected={handleFilesSelected}
          onReorder={reorderMedia}
          onSetPrimary={setPrimaryMedia}
          onDelete={deleteMediaItem}
          disabled={saving}
        />

        <Input label="Scent / Type" value={form.scent||''} onChange={e=>set('scent',e.target.value)} placeholder="e.g. Fresh Citrus"/>

        <Textarea label="Description" value={form.desc} onChange={e=>set('desc',e.target.value)} rows={3} placeholder="Describe the product…"/>

        <div className="admin-product-form__benefits">
          <label className="admin-product-form__benefits-label">Key Benefits (up to 4)</label>
          <div className="admin-product-form__benefits-grid">
            {form.benefits.map((b,i)=>(
              <input key={i} value={b} onChange={e=>setBenefit(i,e.target.value)} placeholder={`Benefit ${i+1}`}
                className="admin-product-form__benefits-input"/>
            ))}
          </div>
        </div>

        <div className="admin-product-form__variants">
          <div className="admin-product-form__variants-header">
            <label>Product Variants</label>
            <Btn variant="ghost" size="sm" onClick={addVariant}><Icon.Plus/> Add Variant</Btn>
          </div>
          {form.variants.length > 0 ? (
            <div className="admin-product-form__variants-list">
              <div className="admin-product-form__variants-titles">
                <span>Size / Name</span><span>Price (R)</span><span>Stock</span><span className="admin-product-form__variants-center">OOS</span><span></span>
              </div>
              {form.variants.map((v,i)=><VariantRow key={i} v={v} idx={i} onChange={changeVariant} onRemove={removeVariant}/>)}
            </div>
          ) : (
            <p className="admin-product-form__variants-empty">No variants. Click "Add Variant" to create size options.</p>
          )}
        </div>
      </div>
    </Modal>
  );
}

function StockAdjustmentModal({ open, onClose, product, onSave }) {
  const [variation, setVariation] = useState('');
  const [mode, setMode] = useState('increase');
  const [qty, setQty] = useState('');
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open && product) {
      if (product.variants && product.variants.length > 0) {
        setVariation(product.variants[0].name);
      } else {
        setVariation('');
      }
      setMode('increase');
      setQty('');
      setReason('');
      setError('');
    }
  }, [open, product]);

  const currentStock = useMemo(() => {
    if (!product) return 0;
    if (variation) {
      const v = product.variants?.find(x => x.name === variation);
      return v ? v.stock || 0 : 0;
    }
    return product.stock || 0;
  }, [product, variation]);

  async function handleConfirm() {
    const num = parseInt(qty, 10);
    if (isNaN(num) || num <= 0) {
      setError('Please enter a valid quantity greater than 0.');
      return;
    }
    if (mode === 'reduce' && num > currentStock) {
      setError(`Cannot reduce stock by more than available (${currentStock} units).`);
      return;
    }

    setSaving(true);
    setError('');
    try {
      const payload = {
        id: product.id,
        adjustment: {
          variation: variation || null,
          mode,
          qty: num,
          reason: reason.trim()
        }
      };
      
      const session = JSON.parse(localStorage.getItem('ab_admin_session_v2') || '{}');
      const res = await fetch('/api/products', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.token || ''}`
        },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to adjust stock');
      }
      onSave(data);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={`Adjust Stock: ${product?.name}`}
      footer={<>
        {error && <span style={{flex: 1, fontSize: '0.75rem', color: '#dc2626', fontWeight: 500, marginRight: '0.5rem'}}>{error}</span>}
        <Btn variant="secondary" onClick={onClose} disabled={saving}>Cancel</Btn>
        <Btn onClick={handleConfirm} disabled={saving}>
          {saving ? <><Spinner size={14}/>Saving…</> : 'Confirm Adjustment'}
        </Btn>
      </>}
    >
      <div className="admin-stock-adj__space-y">
        {product?.variants && product.variants.length > 0 && (
          <Select label="Select Variant Size" value={variation} onChange={e=>setVariation(e.target.value)}>
            {product.variants.map(v => (
              <option key={v.name} value={v.name}>{v.name} (Current: {v.stock} units)</option>
            ))}
          </Select>
        )}

        <div className="admin-stock-adj__current">
          <span className="admin-stock-adj__current-label">Current Stock:</span>
          <span className="admin-stock-adj__current-value">{currentStock} units</span>
        </div>

        <div className="admin-stock-adj__modes">
          <label className="admin-stock-adj__modes-label">Adjustment Mode</label>
          <div className="admin-stock-adj__modes-grid">
            {[
              { id:'increase', label:'Increase Stock' },
              { id:'reduce',   label:'Reduce Stock' },
              { id:'set',      label:'Set Manually' }
            ].map(m => {
              const isSel = mode === m.id;
              const clz = `admin-stock-adj__modes-btn ${isSel ? `admin-stock-adj__modes-btn--selected admin-stock-adj__modes-btn--${m.id}` : 'admin-stock-adj__modes-btn--unselected'}`;
              return (
                <button key={m.id} type="button" onClick={()=>setMode(m.id)} className={clz}>
                  {m.label}
                </button>
              );
            })}
          </div>
        </div>

        <Input label="Quantity / Value *" type="number" min="1" value={qty} onChange={e=>setQty(e.target.value)} placeholder="Enter amount..." />

        <Input label="Reason for adjustment (optional)" value={reason} onChange={e=>setReason(e.target.value)} placeholder="e.g. Received new shipment, damaged items, correction" />
      </div>
    </Modal>
  );
}

function StockHistoryModal({ open, onClose }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      fetchHistory();
    }
  }, [open]);

  async function fetchHistory() {
    setLoading(true);
    setError('');
    try {
      const session = JSON.parse(localStorage.getItem('ab_admin_session_v2') || '{}');
      const res = await fetch('/api/settings?resource=stock-history', {
        headers: {
          'Authorization': `Bearer ${session?.token || ''}`
        }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to fetch history');
      setHistory(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function fmtDate(ts) {
    return new Date(ts).toLocaleString('en-ZA', { day:'numeric', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' });
  }

  return (
    <Modal open={open} onClose={onClose} size="lg" title="Stock History Log"
      footer={<Btn variant="secondary" onClick={onClose}>Close</Btn>}
    >
      <div className="admin-stock-hist__space-y">
        {loading ? (
          <div className="admin-stock-hist__loading"><Spinner size={24}/></div>
        ) : error ? (
          <div className="admin-stock-hist__error">{error}</div>
        ) : history.length === 0 ? (
          <div className="admin-stock-hist__empty">No stock adjustment history logged yet.</div>
        ) : (
          <div className="admin-stock-hist__table-wrapper">
            <table className="admin-stock-hist__table">
              <thead>
                <tr>
                  <th>Date & Time</th>
                  <th>Product / Variation</th>
                  <th style={{textAlign: 'center'}}>Prev</th>
                  <th style={{textAlign: 'center'}}>New</th>
                  <th>Reason / Details</th>
                </tr>
              </thead>
              <tbody>
                {history.map(item => {
                  const diff = item.updatedStock - item.prevStock;
                  const diffColorClass = diff > 0 ? 'admin-stock-hist__new-diff--pos' : diff < 0 ? 'admin-stock-hist__new-diff--neg' : 'admin-stock-hist__new-diff--zero';
                  const diffSymbol = diff > 0 ? `+${diff}` : `${diff}`;
                  
                  return (
                    <tr key={item.id}>
                      <td className="admin-stock-hist__date">{fmtDate(item.timestamp)}</td>
                      <td className="admin-stock-hist__product">
                        <span className="admin-stock-hist__product-name">{item.productName}</span>
                        {item.variation && <span className="admin-stock-hist__product-var">{item.variation}</span>}
                      </td>
                      <td className="admin-stock-hist__prev">{item.prevStock}</td>
                      <td className="admin-stock-hist__new">
                        {item.updatedStock} <span className={`admin-stock-hist__new-diff ${diffColorClass}`}>({diffSymbol})</span>
                      </td>
                      <td className="admin-stock-hist__reason">
                        <span className="admin-stock-hist__reason-text">{item.reason}</span>
                        {item.orderId && <span className="admin-stock-hist__reason-order">Order #{item.orderId}</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Modal>
  );
}

export default function ProductsPage() {
  const { products, addProduct, updateProduct, deleteProduct, fmtMoney, categories, setProducts } = useAdmin();
  const { isAdmin } = useAuth();

  const [search,    setSearch]    = useState('');
  const [catFilter, setCatFilter] = useState('all');
  const [statusFilter, setStatus] = useState('all');
  const [sort,      setSort]      = useState('name');
  const [page,      setPage]      = useState(1);
  const [formOpen,  setFormOpen]  = useState(false);
  const [editing,   setEditing]   = useState(null);
  const [deleting,  setDeleting]  = useState(null);
  const [archiving, setArchiving] = useState(null);
  const [selected,  setSelected]  = useState(new Set());
  
  const [adjustmentOpen, setAdjustmentOpen] = useState(false);
  const [adjustmentProd, setAdjustmentProd] = useState(null);
  const [historyOpen, setHistoryOpen] = useState(false);

  function handleAdjustmentSave(updatedProduct) {
    setProducts(prev => prev.map(p => p.id === updatedProduct.id ? updatedProduct : p));
    showToast('Stock adjusted successfully');
  }
  const [toast,     setToast]     = useState({ visible:false, msg:'', type:'success' });

  function showToast(msg, type='success') {
    setToast({ visible:true, msg, type });
    setTimeout(() => setToast(t=>({...t,visible:false})), 3000);
  }

  const filtered = useMemo(() => {
    let list = [...products];
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(p => p.name.toLowerCase().includes(q)||p.sku?.toLowerCase().includes(q)||(p.sub||'').toLowerCase().includes(q));
    }
    if (catFilter !== 'all') list = list.filter(p => p.cat === catFilter);
    if (statusFilter !== 'all') list = list.filter(p => p.status === statusFilter);
    list.sort((a,b) => {
      if (sort==='name')       return a.name.localeCompare(b.name);
      if (sort==='price_asc')  return a.price - b.price;
      if (sort==='price_desc') return b.price - a.price;
      if (sort==='stock_asc')  return a.stock - b.stock;
      if (sort==='stock_desc') return b.stock - a.stock;
      if (sort==='newest')     return (b.createdAt||0)-(a.createdAt||0);
      return 0;
    });
    return list;
  }, [products, search, catFilter, statusFilter, sort]);

  const paged = filtered.slice((page-1)*PAGE_SIZE, page*PAGE_SIZE);
  useEffect(() => setPage(1), [search, catFilter, statusFilter, sort]);

  const activeCount   = products.filter(p=>p.status==='active').length;
  const draftCount    = products.filter(p=>p.status==='draft').length;
  const archivedCount = products.filter(p=>p.status==='archived').length;
  const lowCount      = products.filter(p=>p.status==='active'&&p.stock<=p.lowStockThreshold).length;

  function toggleSelect(id) {
    setSelected(s => { const n=new Set(s); n.has(id)?n.delete(id):n.add(id); return n; });
  }
  function toggleAll() {
    if (selected.size===paged.length) setSelected(new Set());
    else setSelected(new Set(paged.map(p=>p.id)));
  }
  function bulkArchive() {
    selected.forEach(id => updateProduct(id, {status:'archived'}));
    showToast(`${selected.size} product(s) archived`);
    setSelected(new Set());
  }

  async function handleSave(data) {
    if (editing) {
      await updateProduct(editing.id, data);
      showToast('Product updated successfully');
    } else {
      await addProduct(data);
      showToast('Product added successfully');
    }
  }

  const catLabel = useMemo(() => {
    const map = {};
    categories.forEach(c => { map[c.id] = c.short || c.name; });
    return map;
  }, [categories]);

  return (
    <div className="admin-products">
      <AdminToast message={toast.msg} type={toast.type} visible={toast.visible}/>

      <div className="admin-products__header">
        <div>
          <h2 className="admin-products__header-title">Products</h2>
          <p className="admin-products__header-subtitle">{products.length} total products</p>
        </div>
        <div className="admin-products__header-actions">
          <Btn variant="secondary" onClick={() => setHistoryOpen(true)}>
            <Icon.List/> Stock History
          </Btn>
          <Btn onClick={() => { setEditing(null); setFormOpen(true); }}>
            <Icon.Plus/> Add Product
          </Btn>
        </div>
      </div>

      <div className="admin-products__stats">
        {[['Active',activeCount,'admin-products__stats-card--active'],['Draft',draftCount,'admin-products__stats-card--draft'],['Archived',archivedCount,'admin-products__stats-card--archived'],['Low Stock',lowCount,'admin-products__stats-card--low-stock']].map(([l,v,c])=>(
          <div key={l} className={`admin-products__stats-card ${c}`}>
            <span className="admin-products__stats-label">{l}</span>
            <span className="admin-products__stats-value">{v}</span>
          </div>
        ))}
      </div>

      <div className="admin-products__filters">
        <div className="admin-products__filters-group">
          <SearchInput value={search} onChange={setSearch} placeholder="Search products…"/>
          <select value={catFilter} onChange={e=>setCatFilter(e.target.value)} className="admin-products__filters-select">
            <option value="all">All Categories</option>
            {categories.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <select value={statusFilter} onChange={e=>setStatus(e.target.value)} className="admin-products__filters-select">
            <option value="all">All Statuses</option>
            <option value="active">Active</option>
            <option value="draft">Draft</option>
            <option value="archived">Archived</option>
          </select>
          <select value={sort} onChange={e=>setSort(e.target.value)} className="admin-products__filters-select">
            <option value="name">Name A–Z</option>
            <option value="price_asc">Price: Low–High</option>
            <option value="price_desc">Price: High–Low</option>
            <option value="stock_asc">Stock: Low–High</option>
            <option value="stock_desc">Stock: High–Low</option>
            <option value="newest">Newest first</option>
          </select>
          {selected.size > 0 && (
            <div className="admin-products__filters-bulk">
              <span className="admin-products__filters-bulk-text">{selected.size} selected</span>
              <Btn variant="secondary" size="sm" onClick={bulkArchive}><Icon.Archive/> Archive</Btn>
            </div>
          )}
        </div>
      </div>

      <div className="admin-products__table-wrapper">
        {filtered.length === 0 ? (
          <Empty icon={<Icon.Box/>} title="No products found" description="Try adjusting your filters or add a new product."
            action={<Btn onClick={()=>{ setEditing(null); setFormOpen(true); }}><Icon.Plus/> Add Product</Btn>}/>
        ) : (
          <>
            <div className="admin-products__table-scroll">
              <table className="admin-products__table">
                <thead className="admin-products__table-head">
                  <tr>
                    <th className="admin-products__th-check">
                      <input type="checkbox" checked={selected.size===paged.length&&paged.length>0} onChange={toggleAll}/>
                    </th>
                    <th>Product</th>
                    <th className="admin-products__th-sku">SKU</th>
                    <th className="admin-products__th-cat">Category</th>
                    <th>Price</th>
                    <th>Stock</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody className="admin-products__table-body">
                  {paged.map(p => {
                    const low = p.status==='active' && p.stock <= p.lowStockThreshold;
                    return (
                      <tr key={p.id} className={selected.has(p.id) ? 'admin-products__row--selected' : ''}>
                        <td className="admin-products__td-check">
                          <input type="checkbox" checked={selected.has(p.id)} onChange={()=>toggleSelect(p.id)}/>
                        </td>
                        <td>
                          <div className="admin-products__table-product">
                            <img src={getPrimaryImg(p)} alt={p.name} onError={e=>e.target.style.opacity='.3'}/>
                            <div className="admin-products__table-product-info">
                              <p className="admin-products__table-product-name">{p.name}</p>
                              <p className="admin-products__table-product-sub">{p.sub}</p>
                            </div>
                            {p.badge && <Badge label={p.badge}/>}
                          </div>
                        </td>
                        <td className="admin-products__td-sku">{p.sku}</td>
                        <td className="admin-products__td-cat"><Badge label={catLabel[p.cat]||p.cat} variant={p.cat}/></td>
                        <td>
                          <div className="admin-products__table-price-current">{fmtMoney(p.price)}</div>
                          {p.was && <div className="admin-products__table-price-was">{fmtMoney(p.was)}</div>}
                        </td>
                        <td>
                          <span className={`admin-products__table-stock-val admin-products__table-stock-val--${p.stock===0?'zero':low?'low':'ok'}`}>{p.stock}</span>
                          {low && <div className="admin-products__table-stock-low-alert">Low stock</div>}
                        </td>
                        <td><Badge label={p.status} variant={p.status}/></td>
                        <td>
                          <div className="admin-products__table-actions">
                            <button onClick={()=>{ setAdjustmentProd(p); setAdjustmentOpen(true); }} title="Adjust Stock"
                              className="admin-products__table-actions-btn admin-products__table-actions-btn--adjust"><Icon.Box/></button>
                            <button onClick={()=>{ setEditing(p); setFormOpen(true); }} title="Edit"
                              className="admin-products__table-actions-btn admin-products__table-actions-btn--edit"><Icon.Edit/></button>
                            {p.status !== 'archived' && (
                              <button onClick={()=>setArchiving(p)} title="Archive"
                                className="admin-products__table-actions-btn admin-products__table-actions-btn--archive"><Icon.Archive/></button>
                            )}
                            {isAdmin && (
                              <button onClick={()=>setDeleting(p)} title="Delete"
                                className="admin-products__table-actions-btn admin-products__table-actions-btn--delete"><Icon.Trash/></button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="admin-products__pagination">
              <Pagination page={page} total={filtered.length} pageSize={PAGE_SIZE} onChange={setPage}/>
            </div>
          </>
        )}
      </div>

      <ProductForm open={formOpen} onClose={()=>setFormOpen(false)} initial={editing} onSave={handleSave}/>
      <StockAdjustmentModal open={adjustmentOpen} onClose={()=>setAdjustmentOpen(false)} product={adjustmentProd} onSave={handleAdjustmentSave}/>
      <StockHistoryModal open={historyOpen} onClose={()=>setHistoryOpen(false)}/>

      <ConfirmDialog open={!!archiving} onClose={()=>setArchiving(null)}
        title="Archive Product" confirmLabel="Archive" variant="secondary"
        message={`Archive "${archiving?.name}"? It will be hidden from the storefront but not deleted.`}
        onConfirm={async () => {
          const id = archiving?.id;
          try {
            await updateProduct(id, {status:'archived'});
            showToast('Product archived');
          } catch(err) {
            showToast(err.message || 'Failed to archive product', 'error');
          } finally {
            setArchiving(null);
          }
        }}
      />

      <ConfirmDialog open={!!deleting} onClose={()=>setDeleting(null)}
        title="Delete Product" confirmLabel="Delete" variant="danger"
        message={`Permanently delete "${deleting?.name}"? This action cannot be undone.`}
        onConfirm={async () => {
          const id = deleting?.id;
          try {
            await deleteProduct(id);
            showToast('Product deleted');
          } catch(err) {
            showToast(err.message || 'Failed to delete product', 'error');
          } finally {
            setDeleting(null);
          }
        }}
      />
    </div>
  );
}
