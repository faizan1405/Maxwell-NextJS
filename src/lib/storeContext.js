'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef, createContext, useContext } from 'react';
import { formatZar } from '../utils/currency';

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
  { id: "household", name: "Household", short: "Household", icon: "Home", blurb: "Everyday surfaces, floors, fabrics & fresh-smelling rooms.", accent: "#1D4ED8" },
  { id: "industrial", name: "Industrial", short: "Industrial", icon: "Spray", blurb: "Heavy-duty degreasers, cleaners and specialty solutions for industrial use.", accent: "#B45309" },
  { id: "car", name: "Car Care", short: "Car Care", icon: "Car", blurb: "Showroom shine for tyres, dashboards & trim.", accent: "#0B2E6B" },
  { id: "car-exterior", name: "Car Exterior", short: "Car Exterior", icon: "Car", blurb: "Tar removers, bumper black, chassis coatings & exterior detailing.", accent: "#1E3A5F" },
  { id: "sanitiser", name: "Sanitisers", short: "Sanitisers", icon: "Shield", blurb: "High-purity protection that kills 99.9% of germs.", accent: "#36F700" },
  { id: "laundry", name: "Laundry Products", short: "Laundry", icon: "Sparkles", blurb: "Washing powders and laundry solutions for homes and businesses.", accent: "#0891B2" },
];

export const FREE_SHIP = 750;
const STORE_PAGES = ['home', 'shop', 'cart', 'checkout', 'account', 'order-confirmed', 'faq', 'delivery-policy', 'returns-refunds', 'privacy-policy', 'terms-conditions'];

function pageFromPath(pathname) {
  const path = (pathname || '/').replace(/^\/+/, '').split('/')[0];
  if (!path) return 'home';
  return STORE_PAGES.includes(path) ? path : 'home';
}

function pathForPage(page) {
  return page === 'home' ? '/' : `/${page}`;
}

const API_BASE = (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'))
  ? '' : '';

/* ── Money formatter — South African Rand: R1,250.00 ─────────────────────── */
export const money = formatZar;

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

const FALLBACK_PRODUCTS = [
  { id: "all-purpose-cleaner", name: "All Purpose Cleaner", cat: "household", size: "500ml", desc: "Versatile Multi-Surface Cleaning Solution", price: 45, was: 65, badge: "Bestseller", img: "/assets/products/all-purpose-cleaner.jpg", media: [], stock: 100, rating: 4.8, reviews: 120 },
  { id: "carpet-upholstery-shampoo", name: "Carpet & Upholstery Shampoo", cat: "household", size: "5L", desc: "Deep Cleaning Fabric & Carpet Care", price: 180, was: 200, badge: "Bestseller", img: "/assets/products/carpet-upholstery-shampoo.png", media: [], stock: 50, rating: 4.9, reviews: 85 },
  { id: "hand-surface-sanitiser", name: "Hand & Surface Sanitiser", cat: "sanitiser", size: "5L", desc: "Isopropyl Alcohol 85% — Kills 99.9% of germs", price: 250, was: 300, badge: "Bestseller", img: "/assets/products/hand-surface-sanitiser.jpg", media: [], stock: 200, rating: 4.9, reviews: 340 },
  { id: "tyre-dash-shine", name: "Tyre & Dash Shine", cat: "car", size: "5L", desc: "Interior & Exterior Dressing Combo", price: 220, img: "/assets/products/tyre-shine.jpg", media: [], stock: 150, rating: 4.7, reviews: 95 }
];

export function ProductsProvider({ children }) {
  const [products, setProducts] = useState(FALLBACK_PRODUCTS);
  const [categories, setCategories] = useState(DEFAULT_CATEGORIES);
  const [settings, setSettings] = useState(null);

  useEffect(() => {
    // Fetch products from API
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/api/products`);
        if (!res.ok) return;
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          setProducts(data);
          try { localStorage.setItem("ab_products", JSON.stringify(data)); } catch {}
        } else {
          setProducts(FALLBACK_PRODUCTS);
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

    // Fetch shipping rates for cart/checkout delivery estimates
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/api/shipping`);
        if (!res.ok) return;
        const data = await res.json();
        if (Array.isArray(data) && typeof window !== 'undefined') {
          window.SHIPPING_RATES = data;
          window.dispatchEvent(new Event('ab:shipping-loaded'));
        }
      } catch {}
    })();
  }, []);

  const value = useMemo(() => ({ products, categories, settings }), [products, categories, settings]);
  return <ProductsContext.Provider value={value}>{children}</ProductsContext.Provider>;
}

/* ── Customer context ──────────────────────────────────────────────────────── */
const CUST_SESSION_KEY = 'ab_customer_session_v2'; // kept only for cleanup on first load

const CustomerContext = createContext(null);
export const useCustomer = () => useContext(CustomerContext);

export function CustomerProvider({ children }) {
  const [customer, setCustomer] = useState(null);
  const [authOpen, setAuthOpen] = useState(false);
  const [page, setPageState] = useState(() => {
    if (typeof window === 'undefined') return 'home';
    return pageFromPath(window.location.pathname);
  });

  const setPage = useCallback((p, options = {}) => {
    if (!STORE_PAGES.includes(p)) p = 'home';
    setPageState(p);
    if (typeof window !== 'undefined') {
      const url = options.url || pathForPage(p);
      const current = `${window.location.pathname}${window.location.search}${window.location.hash}`;
      if (current !== url) {
        const method = options.replace ? 'replaceState' : 'pushState';
        window.history[method]({ page: p }, '', url);
      }
      window.dispatchEvent(new CustomEvent('ab:url-change', { detail: { page: p } }));
    }
  }, []);

  // Init page from URL
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const pageFromUrl = pageFromPath(window.location.pathname);
    setPageState(pageFromUrl);
    window.history.replaceState({ page: pageFromUrl }, '', `${window.location.pathname}${window.location.search}${window.location.hash}`);

    const handlePopState = (e) => {
      let p = e.state?.page || pageFromPath(window.location.pathname);
      if (!STORE_PAGES.includes(p)) p = 'home';
      setPageState(p);
      window.dispatchEvent(new CustomEvent('ab:url-change', { detail: { page: p } }));
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Restore session from server cookie via /api/auth/me
  useEffect(() => {
    if (typeof window === 'undefined') return;
    // Clean up old JWT-based session key from localStorage
    try { localStorage.removeItem(CUST_SESSION_KEY); } catch {}
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/api/auth/me`, { credentials: 'include' });
        if (!res.ok) return;
        const data = await res.json();
        if (data.customer) setCustomer(data.customer);
      } catch {}
    })();
  }, []);

  const login = useCallback((cust) => {
    setCustomer(cust);
    setAuthOpen(false);

    // Merge guest cart into customer cart (cookie is already set by verify endpoint)
    const guestId = getGuestId();
    if (guestId) {
      fetch(`${API_BASE}/api/carts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
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
      await fetch(`${API_BASE}/api/auth/logout`, {
        method: 'POST',
        credentials: 'include',
      });
    } catch {}
    setCustomer(null);
    setPage('home');
  }, [setPage]);

  const updateCustomerData = useCallback((updated) => {
    setCustomer(updated);
  }, []);

  const value = useMemo(() => ({
    customer,
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
  }), [customer, authOpen, page, login, logout, updateCustomerData, setPage]);

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
      if (!items.length) return;
      const guestId = getGuestId();
      fetch(`${API_BASE}/api/carts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ guestId, items, email: null }),
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
    fetch(`${API_BASE}/api/carts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
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
    const lowStock = maxStock > 0 && maxStock <= (product.lowStockThreshold || 10);
    return { ...i, product, size, price, maxStock, outOfStock, lowStock };
  }).filter(Boolean);

  const count = items.reduce((s, i) => s + i.qty, 0);
  const subtotal = detailed.reduce((s, i) => s + i.price * i.qty, 0);

  const value = useMemo(() => ({
    items, detailed, count, subtotal, add, setQty, remove, clear, open, setOpen, toast, coupon, setCoupon
  }), [items, detailed, count, subtotal, open, toast, coupon, products]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}
