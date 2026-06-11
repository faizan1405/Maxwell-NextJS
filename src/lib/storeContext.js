'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef, createContext, useContext } from 'react';

/* ── Brand constants ─────────────────────────────────────────────────────────── */
export const BRAND = {
  name: "Amahle Blue",
  tagline: "Cleaning Solutions",
  phone: "067 101 4345",
  phoneRaw: "+27671014345",
  email: "info@amahle-blue.co.za",
  address: "Unit H, 13 Main Reef Road, Dunswart, Boksburg, Gauteng, South Africa",
  wa: "https://wa.me/27671014345",
  facebook: "https://www.facebook.com/share/17sDJXMKSz/",
  instagram: "https://www.instagram.com/amahle_blue/",
};

export const DEFAULT_CATEGORIES = [
  { id: "household", name: "Household Cleaning", short: "Household", icon: "Home", blurb: "Everyday surfaces, floors, fabrics & fresh-smelling rooms.", accent: "#1D4ED8" },
  { id: "industrial", name: "Industrial Products", short: "Industrial", icon: "Spray", blurb: "Heavy-duty degreasers, cleaners and specialty solutions for industrial use.", accent: "#B45309" },
  { id: "car", name: "Car Care", short: "Car Care", icon: "Car", blurb: "Showroom shine for tyres, dashboards & trim.", accent: "#0B2E6B" },
  { id: "car-exterior", name: "Car Exterior", short: "Car Exterior", icon: "Car", blurb: "Tar removers, bumper black, chassis coatings & exterior detailing.", accent: "#1E3A5F" },
  { id: "sanitiser", name: "Sanitisers & Disinfectants", short: "Sanitisers", icon: "Shield", blurb: "High-purity protection that kills 99.9% of germs.", accent: "#159A4C" },
];

export const FREE_SHIP = 750;

const API_BASE = (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'))
  ? '' : '';

/* ── Money formatter — South African Rand: R 1,250.00 ─────────────────────── */
export const money = (n) => {
  const abs = Math.abs(n || 0).toFixed(2);
  const [int, dec] = abs.split('.');
  return 'R ' + int.replace(/\B(?=(\d{3})+(?!\d))/g, ',') + '.' + dec;
};

export const catOf = (id, categories) => (categories || DEFAULT_CATEGORIES).find((c) => c.id === id);

/* ── Guest ID ──────────────────────────────────────────────────────────────── */
function getGuestId() {
  if (typeof window === 'undefined') return null;
  try {
    let id = localStorage.getItem('ab_guest_id');
    if (!id) { id = `guest_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`; localStorage.setItem('ab_guest_id', id); }
    return id;
  } catch { return null; }
}

/* ── Product media helpers ─────────────────────────────────────────────────── */
export function getPrimaryImg(p) {
  if (p && p.media && p.media.length > 0) {
    const primary = p.media.find(m => m.isPrimary && m.type === 'image');
    if (primary && primary.url) return primary.url;
    const firstImg = p.media.find(m => m.type === 'image');
    if (firstImg && firstImg.url) return firstImg.url;
  }
  return (p && p.img) ? p.img : '/assets/products/placeholder.svg';
}

export function getSecondImg(p) {
  if (!p || !p.media || p.media.length < 2) return null;
  const images = p.media.filter(m => m.type === 'image' && m.url);
  if (images.length < 2) return null;
  const secondary = images.find(m => !m.isPrimary);
  return secondary ? secondary.url : null;
}

/* ── Products store ────────────────────────────────────────────────────────── */
const ProductsContext = createContext({ products: [], categories: DEFAULT_CATEGORIES, settings: null });
export const useProducts = () => useContext(ProductsContext);

export function ProductsProvider({ children }) {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState(DEFAULT_CATEGORIES);
  const [settings, setSettings] = useState(null);

  useEffect(() => {
    // Fetch products from API
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/api/products`);
        if (!res.ok) return;
        const data = await res.json();
        if (Array.isArray(data) && data.length) {
          setProducts(data);
          try { localStorage.setItem("ab_products", JSON.stringify(data)); } catch {}
        }
      } catch {
        // Fallback to localStorage
        try {
          const raw = localStorage.getItem("ab_products");
          if (raw) { const p = JSON.parse(raw); if (Array.isArray(p) && p.length) setProducts(p); }
        } catch {}
      }
    })();

    // Fetch categories from API
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/api/categories`);
        if (!res.ok) return;
        const data = await res.json();
        if (Array.isArray(data) && data.length) setCategories(data);
      } catch {}
    })();

    // Fetch settings
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/api/settings`);
        if (!res.ok) return;
        const s = await res.json();
        setSettings(s);
        if (typeof window !== 'undefined') window.__settings = s;
      } catch {}
    })();
  }, []);

  const value = useMemo(() => ({ products, categories, settings }), [products, categories, settings]);
  return <ProductsContext.Provider value={value}>{children}</ProductsContext.Provider>;
}

/* ── Customer context ──────────────────────────────────────────────────────── */
const CUST_SESSION_KEY = 'ab_customer_session_v2';

const CustomerContext = createContext(null);
export const useCustomer = () => useContext(CustomerContext);

export function CustomerProvider({ children }) {
  const [customer, setCustomer] = useState(null);
  const [sessionToken, setSessionToken] = useState(null);
  const [authOpen, setAuthOpen] = useState(false);
  const [page, setPageState] = useState('home');

  const setPage = useCallback((p) => {
    const valid = ['home', 'shop', 'cart', 'checkout', 'account', 'order-confirmed', 'faq'];
    if (!valid.includes(p)) p = 'home';
    setPageState(old => {
      if (old !== p && typeof window !== 'undefined') {
        window.history.pushState({ page: p }, '', p === 'home' ? '/' : `/${p}`);
      }
      return p;
    });
  }, []);

  // Init page from URL
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const path = window.location.pathname.substring(1).split('?')[0];
    if (path) setPageState(path);
    window.history.replaceState({ page: path || 'home' }, '', path ? `/${path}` : '/');

    const handlePopState = (e) => {
      let p = 'home';
      if (e.state && e.state.page) p = e.state.page;
      else {
        const pp = window.location.pathname.substring(1).split('?')[0];
        if (pp) p = pp;
      }
      setPageState(p);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Restore session
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const raw = localStorage.getItem(CUST_SESSION_KEY);
      if (!raw) return;
      const s = JSON.parse(raw);
      if (s && s.expiresAt > Date.now()) {
        setCustomer(s.customer);
        setSessionToken(s.sessionToken);
      } else {
        localStorage.removeItem(CUST_SESSION_KEY);
      }
    } catch {}
  }, []);

  const login = useCallback((cust, token, expiresAt) => {
    setCustomer(cust);
    setSessionToken(token);
    if (typeof window !== 'undefined') {
      localStorage.setItem(CUST_SESSION_KEY, JSON.stringify({ customer: cust, sessionToken: token, expiresAt }));
    }
    setAuthOpen(false);

    // Merge guest cart
    const guestId = getGuestId();
    if (guestId) {
      fetch(`${API_BASE}/api/carts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ action: 'merge', guestId }),
      }).then(r => r.ok ? r.json() : null).then(data => {
        if (data?.items?.length) {
          try { localStorage.setItem('ab_cart', JSON.stringify(data.items)); } catch {}
          window.dispatchEvent(new Event('ab:cart-merged'));
        }
      }).catch(() => {});
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await fetch(`${API_BASE}/api/customer-auth`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'logout' }),
      });
    } catch {}
    setCustomer(null);
    setSessionToken(null);
    setPage('home');
    if (typeof window !== 'undefined') localStorage.removeItem(CUST_SESSION_KEY);
  }, [setPage]);

  const updateCustomerData = useCallback((updated) => {
    setCustomer(updated);
    try {
      const raw = localStorage.getItem(CUST_SESSION_KEY);
      if (raw) {
        const s = JSON.parse(raw);
        s.customer = updated;
        localStorage.setItem(CUST_SESSION_KEY, JSON.stringify(s));
      }
    } catch {}
  }, []);

  const value = useMemo(() => ({
    customer,
    sessionToken,
    isLoggedIn: !!customer,
    login,
    logout,
    authOpen,
    openAuth: () => setAuthOpen(true),
    closeAuth: () => setAuthOpen(false),
    page,
    setPage,
    updateCustomerData,
    apiBase: API_BASE,
  }), [customer, sessionToken, authOpen, page, login, logout, updateCustomerData, setPage]);

  return (
    <CustomerContext.Provider value={value}>
      {children}
    </CustomerContext.Provider>
  );
}

/* ── Cart context ──────────────────────────────────────────────────────────── */
const CartContext = createContext(null);
export const useCart = () => useContext(CartContext);

export function CartProvider({ children }) {
  const { products } = useProducts();
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false);
  const [toast, setToast] = useState(null);
  const [coupon, setCoupon] = useState(null);
  const toastTimer = useRef(null);
  const syncTimer = useRef(null);
  const initialized = useRef(false);

  // Load from localStorage once
  useEffect(() => {
    if (typeof window === 'undefined' || initialized.current) return;
    initialized.current = true;
    try { const raw = localStorage.getItem("ab_cart"); if (raw) setItems(JSON.parse(raw)); } catch {}
    try { const s = localStorage.getItem("ab_coupon"); if (s) setCoupon(JSON.parse(s)); } catch {}
  }, []);

  // Persist cart
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try { localStorage.setItem("ab_cart", JSON.stringify(items)); } catch {}
  }, [items]);

  // Persist coupon
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      if (coupon) localStorage.setItem("ab_coupon", JSON.stringify(coupon));
      else localStorage.removeItem("ab_coupon");
    } catch {}
  }, [coupon]);

  // Listen for cart merge events
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const h = () => {
      try {
        const raw = localStorage.getItem("ab_cart");
        if (raw) setItems(JSON.parse(raw));
      } catch {}
    };
    window.addEventListener("ab:cart-merged", h);
    return () => window.removeEventListener("ab:cart-merged", h);
  }, []);

  // Debounced server sync for abandoned cart tracking
  useEffect(() => {
    if (typeof window === 'undefined') return;
    clearTimeout(syncTimer.current);
    syncTimer.current = setTimeout(() => {
      const guestId = getGuestId();
      const session = (() => { try { const s = JSON.parse(localStorage.getItem('ab_customer_session_v2') || 'null'); return s?.expiresAt > Date.now() ? s : null; } catch { return null; } })();
      if (!items.length && !session) return;
      const headers = { 'Content-Type': 'application/json' };
      if (session?.sessionToken) headers['Authorization'] = `Bearer ${session.sessionToken}`;
      fetch(`${API_BASE}/api/carts`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ guestId, items, email: session?.customer?.email || null }),
      }).catch(() => {});
    }, 3000);
    return () => clearTimeout(syncTimer.current);
  }, [items]);

  const showToast = (msg) => {
    setToast(msg);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2600);
  };

  const add = (product, qty = 1, variation = null) => {
    const variant = product.variants?.find((v) => v.name === variation);
    const price = variant ? variant.price : (product.price || 0);
    const maxStock = variant ? variant.stock : (product.stock || 0);
    const outOfStock = !!product.outOfStock || (variant ? !!variant.outOfStock : false);

    if (outOfStock || maxStock <= 0) {
      showToast(`${product.name}${variation ? ` (${variation})` : ''} is out of stock`);
      return;
    }

    setItems((prev) => {
      const found = prev.find((i) => i.id === product.id && i.variation === variation);
      const currentQty = found ? found.qty : 0;
      const newQty = Math.min(currentQty + qty, maxStock);
      if (newQty <= currentQty) {
        showToast(`Only ${maxStock} unit${maxStock === 1 ? '' : 's'} available`);
        return prev;
      }
      if (found) {
        return prev.map((i) => (i.id === product.id && i.variation === variation) ? { ...i, qty: newQty } : i);
      }
      return [...prev, { id: product.id, variation, qty: newQty }];
    });
    showToast(`${product.name}${variation ? ` (${variation})` : ''} added to cart`);
  };

  const setQty = (id, qty, variation = null) => setItems((prev) => {
    const product = products.find((p) => p.id === id);
    if (!product) return prev;
    const variant = product.variants?.find((v) => v.name === variation);
    const maxStock = variant ? variant.stock : (product.stock || 0);
    const clamped = Math.min(qty, maxStock);
    return clamped <= 0
      ? prev.filter((i) => !(i.id === id && i.variation === variation))
      : prev.map((i) => (i.id === id && i.variation === variation) ? { ...i, qty: clamped } : i);
  });

  const remove = (id, variation = null) => {
    setItems((prev) => prev.filter((i) => !(i.id === id && i.variation === variation)));
  };

  const clear = () => {
    setItems([]);
    setCoupon(null);
    const guestId = getGuestId();
    const session = (() => { try { const s = JSON.parse(localStorage.getItem('ab_customer_session_v2') || 'null'); return s?.expiresAt > Date.now() ? s : null; } catch { return null; } })();
    const headers = { 'Content-Type': 'application/json' };
    if (session?.sessionToken) headers['Authorization'] = `Bearer ${session.sessionToken}`;
    fetch(`${API_BASE}/api/carts`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ guestId, action: 'convert' }),
    }).catch(() => {});
  };

  const detailed = items.map((i) => {
    const product = products.find((p) => p.id === i.id);
    if (!product) return null;
    const variant = product.variants?.find((v) => v.name === i.variation);
    const size = variant ? variant.name : (product.size || '');
    const price = variant ? variant.price : (product.price || 0);
    const maxStock = variant ? variant.stock : (product.stock || 0);
    const outOfStock = !!product.outOfStock || (variant ? !!variant.outOfStock : false);
    const lowStock = maxStock <= (product.lowStockThreshold || 0);
    return { ...i, product, size, price, maxStock, outOfStock, lowStock };
  }).filter(Boolean);

  const count = items.reduce((s, i) => s + i.qty, 0);
  const subtotal = detailed.reduce((s, i) => s + i.price * i.qty, 0);

  const value = useMemo(() => ({
    items, detailed, count, subtotal, add, setQty, remove, clear, open, setOpen, toast, coupon, setCoupon
  }), [items, detailed, count, subtotal, open, toast, coupon, products]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}
