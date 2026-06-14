'use client';

import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import * as Icons from './Icons';

/* ── Robust in-view arming for entrance animations ─────────────────────────── */
export function useInView(threshold = 1.0, safety = 1400) {
  const ref = useRef(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof window !== 'undefined' && window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setInView(true);
      return;
    }
    let done = false;
    const arm = () => { if (done) return; done = true; setInView(true); teardown(); };
    const check = () => {
      if (done || !ref.current) return;
      const r = ref.current.getBoundingClientRect();
      const vh = window.innerHeight || document.documentElement.clientHeight;
      if (r.top < vh * threshold && r.bottom > -40) arm();
    };
    const timers = [requestAnimationFrame(check), setTimeout(check, 120), setTimeout(check, 450), setTimeout(arm, safety)];
    function teardown() {
      timers.forEach((t) => { cancelAnimationFrame(t); clearTimeout(t); });
      if (typeof window !== 'undefined') {
        window.removeEventListener("scroll", check);
        window.removeEventListener("resize", check);
      }
    }
    if (typeof window !== 'undefined') {
      window.addEventListener("scroll", check, { passive: true });
      window.addEventListener("resize", check);
    }
    if (typeof document !== 'undefined' && document.fonts && document.fonts.ready) document.fonts.ready.then(check);
    return teardown;
  }, [threshold, safety]);
  return [ref, inView];
}

/* Gentle entrance: ONLY a small vertical rise that settles to 0. */
export const Reveal = ({ children, className = "", delay = 0, y = 22, as = "div" }) => {
  const [ref, vis] = useInView();
  const Tag = as;
  return (
    <Tag
      ref={ref}
      className={className}
      style={{
        transition: "transform .7s cubic-bezier(.16,1,.3,1)",
        transitionDelay: `${delay}ms`,
        transform: vis ? "translateY(0)" : `translateY(${y}px)`,
      }}
    >
      {children}
    </Tag>
  );
};

/* FadeReveal: opacity + rise for non-critical elements */
export const FadeReveal = ({ children, className = "", delay = 0, y = 16, as = "div" }) => {
  const [ref, vis] = useInView();
  const Tag = as;
  return (
    <Tag
      ref={ref}
      className={className}
      style={{
        transition: `opacity .55s cubic-bezier(.16,1,.3,1), transform .7s cubic-bezier(.16,1,.3,1)`,
        transitionDelay: `${delay}ms`,
        opacity: vis ? 1 : 0.001,
        transform: vis ? "translateY(0)" : `translateY(${y}px)`,
      }}
    >
      {children}
    </Tag>
  );
};

/* SkeletonBox: shimmer loading placeholder */
export const SkeletonBox = ({ className = "", rounded = "rounded-xl" }) => (
  <div className={`ab-skeleton ${rounded} ${className}`} aria-hidden="true" />
);

/* PageEnter: wraps page content with entrance animation */
export const PageEnter = ({ children, className = "" }) => (
  <div className={`ab-page-enter ${className}`}>
    {children}
  </div>
);

/* ── Spinner ─────────────────────────────────────────────────────────────────── */
export function Spinner({ size = 20 }) {
  return (
    <div className="animate-spin" style={{ width: size, height: size, border: '2.5px solid rgba(38,76,255,0.2)', borderTopColor: '#264CFF', borderRadius: '50%', flexShrink: 0 }} />
  );
}

/* ── Badge ───────────────────────────────────────────────────────────────────── */
const BADGE_STYLES = {
  active:        { bg: '#dcfce7', color: '#15803d' },
  archived:      { bg: '#f1f5f9', color: '#64748b' },
  draft:         { bg: '#fef3c7', color: '#b45309' },
  pending:       { bg: '#fef3c7', color: '#b45309' },
  processing:    { bg: '#dbeafe', color: '#1d4ed8' },
  shipped:       { bg: '#e0e7ff', color: '#4338ca' },
  delivered:     { bg: '#dcfce7', color: '#15803d' },
  cancelled:     { bg: '#fee2e2', color: '#dc2626' },
  paid:          { bg: '#dcfce7', color: '#15803d' },
  refunded:      { bg: '#f3e8ff', color: '#7e22ce' },
  household:     { bg: '#eff6ff', color: '#1d4ed8' },
  sanitiser:     { bg: '#f0fdf4', color: '#15803d' },
  car:           { bg: '#f1f5f9', color: '#475569' },
  Bestseller:    { bg: 'rgba(38,76,255,0.1)', color: '#264CFF' },
  New:           { bg: 'rgba(54,247,0,0.1)', color: '#36F700' },
  'High Purity': { bg: '#f3e8ff', color: '#7e22ce' },
};
export function Badge({ label, variant }) {
  const style = BADGE_STYLES[variant || label] || { bg: '#f1f5f9', color: '#475569' };
  return (
    <span
      className="ui-badge"
      style={{ background: style.bg, color: style.color }}
    >
      {label}
    </span>
  );
}

/* ── Badge Chip ─────────────────────────────────────────────────────────── */
export function BadgeChip({ badge, className = "" }) {
  if (!badge) return null;
  const variantMap = {
    "Bestseller": "bestseller",
    "New": "new",
    "High Purity": "high-purity",
  };
  const variant = variantMap[badge] || "default";
  return (
    <span className={`badge-chip badge-chip--${variant} ${className}`}>
      {badge}
    </span>
  );
}

/* ── Stars ───────────────────────────────────────────────────────────────────── */
export function Stars({ value, size = 16, className = "" }) {
  return (
    <div className={`ab-stars ${className}`}>
      {[1, 2, 3, 4, 5].map(i => (
        <svg key={i} width={size} height={size} viewBox="0 0 24 24" fill={i <= value ? "#f59e0b" : "none"} stroke={i <= value ? "#f59e0b" : "#cbd5e1"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
        </svg>
      ))}
    </div>
  );
}

/* ── Avatar ──────────────────────────────────────────────────────────────────── */
const AVATAR_COLORS = ['#264CFF', '#111111', '#36F700', '#7C3AED', '#0E7490', '#B45309'];
export function Avatar({ name, size = 32 }) {
  const idx = (name || '?').charCodeAt(0) % AVATAR_COLORS.length;
  const bg = AVATAR_COLORS[idx];
  const txt = (name || '?').split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', background: bg, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: size * 0.38, fontWeight: 700, flexShrink: 0 }}>
      {txt}
    </div>
  );
}

/* ── Btn ─────────────────────────────────────────────────────────────────────── */
export function Btn({ children, variant = 'primary', size = 'md', onClick, disabled, type = 'button', className = '' }) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`btn btn--${size} btn--${variant} ${disabled ? 'btn--disabled' : ''} ${className}`}
    >
      {children}
    </button>
  );
}

/* ── Input ───────────────────────────────────────────────────────────────────── */
export function Input({ label, error, hint, className = '', ...props }) {
  return (
    <div className={`form-field ${className}`}>
      {label && <label className="form-field__label">{label}</label>}
      <input {...props} className={`form-field__input ${error ? 'form-field__input--error' : ''}`} />
      {error && <p className="form-field__error">{error}</p>}
      {hint && <p className="form-field__hint">{hint}</p>}
    </div>
  );
}

/* ── Textarea ────────────────────────────────────────────────────────────────── */
export function Textarea({ label, error, hint, rows = 3, className = '', ...props }) {
  return (
    <div className={`form-field ${className}`}>
      {label && <label className="form-field__label">{label}</label>}
      <textarea rows={rows} {...props} className={`form-field__textarea ${error ? 'form-field__textarea--error' : ''}`} />
      {error && <p className="form-field__error">{error}</p>}
      {hint && <p className="form-field__hint">{hint}</p>}
    </div>
  );
}

/* ── Select ──────────────────────────────────────────────────────────────────── */
export function Select({ label, error, children, className = '', ...props }) {
  return (
    <div className={`form-field ${className}`}>
      {label && <label className="form-field__label">{label}</label>}
      <select {...props} className={`form-field__select ${error ? 'form-field__select--error' : ''}`}>
        {children}
      </select>
      {error && <p className="form-field__error">{error}</p>}
    </div>
  );
}

/* ── Toggle ──────────────────────────────────────────────────────────────────── */
export function Toggle({ checked, onChange, label }) {
  return (
    <label className="toggle">
      <div onClick={() => onChange(!checked)} className={`toggle__track ${checked ? 'toggle__track--on' : ''}`}>
        <div className={`toggle__thumb ${checked ? 'toggle__thumb--on' : ''}`} />
      </div>
      {label && <span className="toggle__label">{label}</span>}
    </label>
  );
}

/* ── Modal ───────────────────────────────────────────────────────────────────── */
export function Modal({ open, onClose, title, children, size = 'md', footer }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
    if (!open) return;
    const esc = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', esc);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', esc);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!mounted || !open) return null;
  const widths = { sm: '28rem', md: '36rem', lg: '42rem', xl: '56rem', full: '64rem' };
  const large = size === 'lg' || size === 'xl' || size === 'full';

  const modal = (
    <div className="modal" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal__backdrop" onClick={onClose} />
      <div
        className="modal__dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="admin-modal-title"
        data-modal-size={size}
        style={{
          gridTemplateRows: footer ? 'auto minmax(0, 1fr) auto' : 'auto minmax(0, 1fr)',
          maxWidth: widths[size] || widths.md,
          height: large ? 'min(90dvh, calc(100dvh - 32px))' : 'auto',
        }}
      >
        <div className="modal__header">
          <h2 id="admin-modal-title" className="modal__title">{title}</h2>
          <button onClick={onClose} className="modal__close" aria-label="Close">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6L6 18M6 6l12 12" /></svg>
          </button>
        </div>
        <div className="modal__body">{children}</div>
        {footer && <div className="modal__footer">{footer}</div>}
      </div>
    </div>
  );
  return createPortal(modal, document.body);
}

/* ── Confirm Dialog ──────────────────────────────────────────────────────────── */
export function ConfirmDialog({ open, onClose, onConfirm, title, message, confirmLabel = 'Delete', variant = 'danger' }) {
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!open) setBusy(false);
  }, [open]);

  async function handleConfirm() {
    setBusy(true);
    try {
      await onConfirm();
    } catch {
      // onConfirm handles its own errors
    } finally {
      setBusy(false);
      onClose();
    }
  }
  return (
    <Modal open={open} onClose={onClose} title={title} size="sm"
      footer={<>
        <Btn variant="secondary" onClick={onClose} disabled={busy}>Cancel</Btn>
        <Btn variant={variant} onClick={handleConfirm} disabled={busy}>
          {busy ? <><Spinner size={14} /> Please wait…</> : confirmLabel}
        </Btn>
      </>}
    >
      <p className="confirm-dialog__message">{message}</p>
    </Modal>
  );
}

/* ── Empty State ─────────────────────────────────────────────────────────────── */
export function Empty({ icon, title, description, action }) {
  return (
    <div className="empty-state">
      {icon && <div className="empty-state__icon">{icon}</div>}
      <p className="empty-state__title">{title}</p>
      {description && <p className="empty-state__description">{description}</p>}
      {action}
    </div>
  );
}

/* ── Stat Card ───────────────────────────────────────────────────────────────── */
export function StatCard({ icon, label, value, sub, color = 'cobalt', trend, onClick, className = '', loading }) {
  if (loading) {
    return (
      <div className={`stat-card ${className}`} style={{ minHeight: '136px' }}>
        <div className="stat-card__header" style={{ marginBottom: '12px' }}>
          <SkeletonBox className="h-8 w-8 rounded-lg" />
        </div>
        <SkeletonBox className="h-8 w-24" style={{ marginBottom: '8px' }} />
        <SkeletonBox className="h-4 w-16" />
      </div>
    );
  }
  return (
    <div className={`stat-card ${onClick ? 'stat-card--clickable' : ''} ${className}`} onClick={onClick}>
      <div className="stat-card__header">
        <div className={`stat-card__icon stat-card__icon--${color}`}>{icon}</div>
        {trend !== undefined && (
          <span className={`stat-card__trend ${trend >= 0 ? 'stat-card__trend--up' : 'stat-card__trend--down'}`}>
            {trend >= 0 ? '↑' : '↓'}{Math.abs(trend)}%
          </span>
        )}
      </div>
      <div className="stat-card__value">{value}</div>
      <div className="stat-card__label">{label}</div>
      {sub && <div className="stat-card__sub">{sub}</div>}
    </div>
  );
}

/* ── Search Input ────────────────────────────────────────────────────────────── */
export function SearchInput({ value, onChange, placeholder = 'Search…' }) {
  return (
    <div className="search-input">
      <svg className="search-input__icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
      </svg>
      <input
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="search-input__field"
      />
    </div>
  );
}

/* ── Pagination ──────────────────────────────────────────────────────────────── */
export function Pagination({ page, total, pageSize, onChange }) {
  const pages = Math.ceil(total / pageSize);
  if (pages <= 1) return null;
  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);
  return (
    <div className="pagination">
      <span className="pagination__info">Showing {start}–{end} of {total}</span>
      <div className="pagination__list">
        <button onClick={() => onChange(page - 1)} disabled={page <= 1} className="pagination__btn">‹ Prev</button>
        {Array.from({ length: pages }, (_, i) => i + 1).filter(p => Math.abs(p - page) <= 2 || p === 1 || p === pages).reduce((acc, p, i, arr) => {
          if (i > 0 && arr[i - 1] !== p - 1) acc.push(<span key={`e${p}`} className="pagination__ellipsis">…</span>);
          acc.push(<button key={p} onClick={() => onChange(p)} className={`pagination__page ${p === page ? 'pagination__page--active' : ''}`}>{p}</button>);
          return acc;
        }, [])}
        <button onClick={() => onChange(page + 1)} disabled={page >= pages} className="pagination__btn">Next ›</button>
      </div>
    </div>
  );
}

/* ── Alert ───────────────────────────────────────────────────────────────────── */
export function Alert({ type = 'info', message, onClose }) {
  return (
    <div className={`alert alert--${type}`}>
      <span className="alert__message">{message}</span>
      {onClose && <button onClick={onClose} className="alert__close" aria-label="Close">✕</button>}
    </div>
  );
}

/* ── Toast (admin) ───────────────────────────────────────────────────────────── */
export function AdminToast({ message, type = 'success', visible }) {
  if (!visible) return null;
  const icon = type === 'success'
    ? <span className="admin-toast__icon admin-toast__icon--success"><Icons.Check /></span>
    : <span className="admin-toast__icon admin-toast__icon--error">!</span>;
  return (
    <div className={`admin-toast admin-toast--${type}`}>
      {icon}
      {message}
    </div>
  );
}
