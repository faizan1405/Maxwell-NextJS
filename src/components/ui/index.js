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

export const Counter = ({ to, duration = 1700, prefix = "", suffix = "" }) => {
  const [ref, vis] = useInView();
  const [val, setVal] = useState(0);
  const started = useRef(false);
  useEffect(() => {
    if (!vis || started.current) return;
    started.current = true;
    const start = performance.now();
    const tick = (now) => {
      const p = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setVal(Math.round(eased * to));
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
    const safe = setTimeout(() => setVal(to), duration + 250);
    return () => clearTimeout(safe);
  }, [vis, to, duration]);
  return <span ref={ref}>{prefix}{val}{suffix}</span>;
};

/* Placeholder zone for studio photography */
export const Placeholder = ({ label, className = "", dark = true, rounded = "rounded-2xl" }) => (
  <div
    className={`relative overflow-hidden ${rounded} ${className}`}
    style={{ background: dark ? "linear-gradient(135deg,#0F2C50 0%,#0A1929 100%)" : "linear-gradient(135deg,#dde7f1 0%,#c4d3e2 100%)" }}
  >
    <div
      className="absolute inset-0"
      style={{ backgroundImage: `repeating-linear-gradient(45deg, ${dark ? "rgba(255,255,255,0.045)" : "rgba(13,36,64,0.06)"} 0 12px, transparent 12px 24px)` }}
    />
    {dark && (
      <div className="absolute inset-0" style={{ background: "radial-gradient(120% 90% at 70% 0%, rgba(30,144,255,0.18), transparent 60%)" }} />
    )}
    <div className="absolute inset-0 flex items-center justify-center p-4">
      <span
        className="font-mono text-[10px] sm:text-[11px] tracking-[0.28em] uppercase px-3 py-1.5 rounded-full backdrop-blur-sm text-center"
        style={dark
          ? { color: "rgba(186,210,236,0.85)", background: "rgba(10,25,41,0.45)", border: "1px solid rgba(255,255,255,0.12)" }
          : { color: "rgba(31,52,77,0.7)", background: "rgba(255,255,255,0.55)", border: "1px solid rgba(13,36,64,0.12)" }}
      >
        {label}
      </span>
    </div>
  </div>
);

export const Pill = ({ children, className = "" }) => (
  <span className={`inline-flex items-center gap-2 whitespace-nowrap rounded-full border border-white/12 bg-white/5 px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-electric ${className}`}>
    {children}
  </span>
);

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

/* ProductCardSkeleton: matches ProductCard dimensions */
export const ProductCardSkeleton = () => (
  <div className="flex flex-col overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-[0_2px_10px_rgba(11,46,107,0.04)]">
    <SkeletonBox className="aspect-[3/4] w-full" rounded="rounded-none" />
    <div className="flex flex-col p-4 gap-3">
      <SkeletonBox className="h-3 w-16" />
      <SkeletonBox className="h-5 w-4/5" />
      <SkeletonBox className="h-3 w-full" />
      <SkeletonBox className="h-3 w-3/5" />
      <div className="mt-2 flex items-end justify-between">
        <SkeletonBox className="h-7 w-20" />
        <SkeletonBox className="h-5 w-14" />
      </div>
      <SkeletonBox className="h-10 w-full rounded-full" />
    </div>
  </div>
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
    <div className="animate-spin" style={{ width: size, height: size, border: '2.5px solid rgba(30,80,224,0.2)', borderTopColor: '#1E50E0', borderRadius: '50%', flexShrink: 0 }} />
  );
}

/* ── Badge ───────────────────────────────────────────────────────────────────── */
const BADGE_STYLES = {
  active:     'bg-green-100 text-green-700',
  archived:   'bg-slate-100 text-slate-500',
  draft:      'bg-amber-100 text-amber-700',
  pending:    'bg-amber-100 text-amber-700',
  processing: 'bg-blue-100 text-blue-700',
  shipped:    'bg-indigo-100 text-indigo-700',
  delivered:  'bg-green-100 text-green-700',
  cancelled:  'bg-red-100 text-red-600',
  paid:       'bg-green-100 text-green-700',
  refunded:   'bg-purple-100 text-purple-700',
  household:  'bg-blue-50 text-blue-700',
  sanitiser:  'bg-green-50 text-green-700',
  car:        'bg-slate-100 text-slate-600',
  Bestseller: 'bg-cobalt/10 text-cobalt',
  New:        'bg-grass/10 text-grass',
  'High Purity':'bg-purple-100 text-purple-700',
};
export function Badge({ label, variant }) {
  const cls = BADGE_STYLES[variant || label] || 'bg-slate-100 text-slate-600';
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-[600] capitalize ${cls}`}>{label}</span>;
}

/* ── Avatar ──────────────────────────────────────────────────────────────────── */
const AVATAR_COLORS = ['#1E50E0', '#0B2545', '#159A4C', '#7C3AED', '#0E7490', '#B45309'];
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
  const base = 'inline-flex items-center gap-1.5 rounded-lg font-[600] transition-all cursor-pointer border-0 outline-none';
  const sizes = { sm: 'px-3 py-1.5 text-sm', md: 'px-4 py-2 text-sm', lg: 'px-5 py-2.5 text-base' };
  const variants = {
    primary:   'bg-cobalt text-white hover:bg-cobalt-d active:scale-95 shadow-sm',
    secondary: 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 active:scale-95 shadow-sm',
    danger:    'bg-red-500 text-white hover:bg-red-600 active:scale-95 shadow-sm',
    ghost:     'bg-transparent text-slate-700 hover:bg-slate-100 active:scale-95',
    success:   'bg-green-500 text-white hover:bg-green-600 active:scale-95 shadow-sm',
  };
  return (
    <button type={type} onClick={onClick} disabled={disabled} className={`${base} ${sizes[size]} ${variants[variant]} ${disabled ? 'opacity-50 pointer-events-none' : ''} ${className}`}>
      {children}
    </button>
  );
}

/* ── Input ───────────────────────────────────────────────────────────────────── */
export function Input({ label, error, hint, className = '', ...props }) {
  return (
    <div className={className}>
      {label && <label className="block text-sm font-[600] text-slate-700 mb-1">{label}</label>}
      <input {...props} className={`w-full px-3 py-2 rounded-lg border text-sm transition-colors outline-none ${error ? 'border-red-400 focus:ring-2 focus:ring-red-200' : 'border-slate-200 focus:border-cobalt focus:ring-2 focus:ring-cobalt/20'} bg-white`} />
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
      {hint && <p className="text-xs text-slate-400 mt-1">{hint}</p>}
    </div>
  );
}

/* ── Textarea ────────────────────────────────────────────────────────────────── */
export function Textarea({ label, error, hint, rows = 3, className = '', ...props }) {
  return (
    <div className={className}>
      {label && <label className="block text-sm font-[600] text-slate-700 mb-1">{label}</label>}
      <textarea rows={rows} {...props} className={`w-full px-3 py-2 rounded-lg border text-sm transition-colors outline-none resize-y ${error ? 'border-red-400 focus:ring-2 focus:ring-red-200' : 'border-slate-200 focus:border-cobalt focus:ring-2 focus:ring-cobalt/20'} bg-white`} />
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
      {hint && <p className="text-xs text-slate-400 mt-1">{hint}</p>}
    </div>
  );
}

/* ── Select ──────────────────────────────────────────────────────────────────── */
export function Select({ label, error, children, className = '', ...props }) {
  return (
    <div className={className}>
      {label && <label className="block text-sm font-[600] text-slate-700 mb-1">{label}</label>}
      <select {...props} className={`w-full px-3 py-2 rounded-lg border text-sm transition-colors outline-none bg-white ${error ? 'border-red-400' : 'border-slate-200 focus:border-cobalt focus:ring-2 focus:ring-cobalt/20'}`}>
        {children}
      </select>
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  );
}

/* ── Toggle ──────────────────────────────────────────────────────────────────── */
export function Toggle({ checked, onChange, label }) {
  return (
    <label className="flex items-center gap-2 cursor-pointer">
      <div onClick={() => onChange(!checked)} className={`relative w-10 h-6 rounded-full transition-colors ${checked ? 'bg-cobalt' : 'bg-slate-300'}`}>
        <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all ${checked ? 'left-5' : 'left-1'}`} />
      </div>
      {label && <span className="text-sm text-slate-700">{label}</span>}
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
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" style={{ position: 'absolute', inset: 0 }} onClick={onClose} />
      <div
        className="relative bg-white rounded-2xl shadow-2xl w-full ab-modal-enter animate-fadein"
        role="dialog"
        aria-modal="true"
        aria-labelledby="admin-modal-title"
        data-modal-size={size}
        style={{
          position: 'relative',
          display: 'grid',
          gridTemplateRows: footer ? 'auto minmax(0, 1fr) auto' : 'auto minmax(0, 1fr)',
          width: '100%',
          maxWidth: widths[size] || widths.md,
          height: large ? 'min(90dvh, calc(100dvh - 32px))' : 'auto',
          maxHeight: 'calc(100dvh - 32px)',
          overflow: 'hidden',
        }}
      >
        <div style={{ flexShrink: 0 }} className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 id="admin-modal-title" className="text-base font-[700] text-slate-800">{title}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6L6 18M6 6l12 12" /></svg>
          </button>
        </div>
        <div style={{ overflowY: 'auto', minHeight: 0, WebkitOverflowScrolling: 'touch' }} className="px-6 py-5">{children}</div>
        {footer && <div style={{ flexShrink: 0 }} className="px-6 py-4 border-t border-slate-100 flex justify-end gap-2">{footer}</div>}
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
      <p className="text-sm text-slate-600">{message}</p>
    </Modal>
  );
}

/* ── Empty State ─────────────────────────────────────────────────────────────── */
export function Empty({ icon, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      {icon && <div className="text-4xl mb-3 text-slate-300">{icon}</div>}
      <p className="text-sm font-[600] text-slate-600 mb-1">{title}</p>
      {description && <p className="text-xs text-slate-400 mb-4">{description}</p>}
      {action}
    </div>
  );
}

/* ── Stat Card ───────────────────────────────────────────────────────────────── */
export function StatCard({ icon, label, value, sub, color = 'cobalt', trend, onClick, className = '' }) {
  const colors = {
    cobalt: 'bg-cobalt/10 text-cobalt',
    green:  'bg-green-100 text-green-600',
    amber:  'bg-amber-100 text-amber-600',
    purple: 'bg-purple-100 text-purple-600',
  };
  return (
    <div className={`bg-white rounded-2xl p-5 shadow-sm border border-slate-100 transition-all duration-200 ${onClick ? 'cursor-pointer hover:border-cobalt/30 hover:shadow-md hover:-translate-y-0.5 active:translate-y-0' : ''} ${className}`} onClick={onClick}>
      <div className="flex items-start justify-between mb-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg ${colors[color]}`}>{icon}</div>
        {trend !== undefined && (
          <span className={`text-xs font-[600] px-2 py-1 rounded-full ${trend >= 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
            {trend >= 0 ? '↑' : '↓'}{Math.abs(trend)}%
          </span>
        )}
      </div>
      <div className="text-2xl font-[800] text-slate-800 mb-0.5">{value}</div>
      <div className="text-xs font-[600] text-slate-500 uppercase tracking-wide">{label}</div>
      {sub && <div className="text-xs text-slate-400 mt-1">{sub}</div>}
    </div>
  );
}

/* ── Search Input ────────────────────────────────────────────────────────────── */
export function SearchInput({ value, onChange, placeholder = 'Search…' }) {
  return (
    <div className="relative">
      <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
      </svg>
      <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        className="pl-9 pr-3 py-2 rounded-lg border border-slate-200 text-sm w-full outline-none focus:border-cobalt focus:ring-2 focus:ring-cobalt/20 bg-white" />
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
    <div className="flex items-center justify-between mt-4">
      <span className="text-xs text-slate-500">Showing {start}–{end} of {total}</span>
      <div className="flex gap-1">
        <button onClick={() => onChange(page - 1)} disabled={page <= 1} className="px-3 py-1.5 text-xs rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-default transition-colors">‹ Prev</button>
        {Array.from({ length: pages }, (_, i) => i + 1).filter(p => Math.abs(p - page) <= 2 || p === 1 || p === pages).reduce((acc, p, i, arr) => {
          if (i > 0 && arr[i - 1] !== p - 1) acc.push(<span key={`e${p}`} className="px-2 text-slate-400 text-xs self-center">…</span>);
          acc.push(<button key={p} onClick={() => onChange(p)} className={`w-8 h-8 text-xs rounded-lg border transition-colors ${p === page ? 'bg-cobalt text-white border-cobalt' : 'border-slate-200 hover:bg-slate-50'}`}>{p}</button>);
          return acc;
        }, [])}
        <button onClick={() => onChange(page + 1)} disabled={page >= pages} className="px-3 py-1.5 text-xs rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-default transition-colors">Next ›</button>
      </div>
    </div>
  );
}

/* ── Alert ───────────────────────────────────────────────────────────────────── */
export function Alert({ type = 'info', message, onClose }) {
  const styles = {
    info:    'bg-blue-50 text-blue-700 border-blue-200',
    success: 'bg-green-50 text-green-700 border-green-200',
    warning: 'bg-amber-50 text-amber-700 border-amber-200',
    error:   'bg-red-50 text-red-700 border-red-200',
  };
  return (
    <div className={`flex items-start gap-3 px-4 py-3 rounded-xl border text-sm ab-fade-in ${styles[type]}`}>
      <span className="flex-1">{message}</span>
      {onClose && <button onClick={onClose} className="opacity-60 hover:opacity-100 transition-opacity shrink-0 mt-0.5">✕</button>}
    </div>
  );
}

/* ── Toast (admin) ───────────────────────────────────────────────────────────── */
export function AdminToast({ message, type = 'success', visible }) {
  if (!visible) return null;
  const colors = { success: 'bg-slate-800 text-white', error: 'bg-red-600 text-white' };
  const icon = type === 'success'
    ? <span className="grid h-5 w-5 place-items-center rounded-full bg-green-500 text-white shrink-0 ab-succ-enter"><Icons.Check /></span>
    : <span className="grid h-5 w-5 place-items-center rounded-full bg-red-400 text-white shrink-0">!</span>;
  return (
    <div className={`fixed bottom-6 right-6 z-[100] flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-lg text-sm font-[500] ab-fade-in ${colors[type]}`}
      style={{ animation: 'abmodal .3s cubic-bezier(.16,1,.3,1)' }}>
      {icon}
      {message}
    </div>
  );
}
