'use client';

import React, { useState, useEffect, useRef, useContext, useCallback, useMemo, createContext } from 'react';
import { calculateOrderStats } from '../../utils/accounting';
import { formatZar } from '../../utils/currency';

const DEFAULT_CATEGORIES = [
  { id: "household", name: "Household", short: "Household", icon: "Home", blurb: "Everyday surfaces, floors, fabrics & fresh-smelling rooms.", accent: "#1D4ED8", status: 'active', displayOrder: 1 },
  { id: "industrial", name: "Industrial", short: "Industrial", icon: "Spray", blurb: "Heavy-duty degreasers, cleaners and specialty solutions for industrial use.", accent: "#B45309", status: 'active', displayOrder: 2 },
  { id: "car", name: "Car Care", short: "Car Care", icon: "Car", blurb: "Showroom shine for tyres, dashboards & trim.", accent: "#0B2E6B", status: 'active', displayOrder: 3 },
  { id: "car-exterior", name: "Car Exterior", short: "Car Exterior", icon: "Car", blurb: "Tar removers, bumper black, chassis coatings & exterior detailing.", accent: "#1E3A5F", status: 'active', displayOrder: 4 },
  { id: "sanitiser", name: "Sanitisers", short: "Sanitisers", icon: "Shield", blurb: "High-purity protection that kills 99.9% of germs.", accent: "#36F700", status: 'active', displayOrder: 5 },
];

export const AuthContext = createContext(null);
export const DataContext = createContext(null);

export const useAuth = () => useContext(AuthContext);
export const useAdmin = () => useContext(DataContext);

export function fmtMoney(n) {
  return formatZar(n);
}

export function fmtDate(ts) {
  if (!ts) return '—';
  const d = new Date(ts);
  return d.toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function fmtDateTime(ts) {
  if (!ts) return '—';
  const d = new Date(ts);
  return d.toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' }) + ' · ' + d.toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' });
}

export function initials(name) {
  return (name || '?').split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
}

const API_BASE = '';

function apiHeaders(_token, extra) {
  return {
    'Content-Type': 'application/json',
    ...extra
  };
}

export function AdminProvider({ children }) {
  const [ready, setReady] = useState(false);
  const [session, setSession] = useState(null);
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [registeredCustomers, setRegisteredCustomers] = useState([]);
  const [coupons, setCoupons] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [abandonedCarts, setAbandonedCarts] = useState([]);
  const [faqs, setFaqs] = useState([]);
  const [categories, setCategories] = useState(DEFAULT_CATEGORIES);
  const [shippingRates, setShippingRates] = useState([]);

  // Pagination metadata states
  const [ordersPagination, setOrdersPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 1 });
  const [productsPagination, setProductsPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 1, counts: {} });
  const [customersPagination, setCustomersPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1, summary: {} });
  const [reviewsPagination, setReviewsPagination] = useState({ page: 1, limit: 15, total: 0, totalPages: 1, counts: {} });
  const [abandonedCartsPagination, setAbandonedCartsPagination] = useState({ page: 1, limit: 15, total: 0, totalPages: 1, summary: {} });
  
  // Dashboard & Reports states
  const [dashboardStats, setDashboardStats] = useState(null);
  const [reportsOrders, setReportsOrders] = useState([]);

  // Parameters cache for refetches on CRUD failures.
  // Stored as refs (not state) so the fetcher callbacks stay referentially stable
  // and don't retrigger the effects that depend on them — which would loop.
  const activeOrdersParamsRef = useRef({});
  const activeProductsParamsRef = useRef({});

  // Session ref mirrors session state for use inside stable callbacks.
  const sessionRef = useRef(null);

  const [loadingStates, setLoadingStates] = useState({
    products: false,
    orders: false,
    customers: false,
    coupons: true,
    reviews: false,
    carts: false,
    faqs: true,
    categories: true,
    shipping: true,
    settings: true,
    dashboard: true,
    reports: false,
  });

  // ── Data fetchers ─────────────────────────────────────────────────────────
  // ── Data fetchers ─────────────────────────────────────────────────────────
  const fetchDashboardStats = useCallback(async (token) => {
    setLoadingStates(prev => ({ ...prev, dashboard: true }));
    try {
      const t = token || sessionRef.current?.token;
      const res = await fetch(`${API_BASE}/api/orders?stats=1`, { headers: apiHeaders(t) });
      if (!res.ok) return;
      const data = await res.json();
      setDashboardStats(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingStates(prev => ({ ...prev, dashboard: false }));
    }
  }, []);

  const fetchOrdersPaginated = useCallback(async (params = {}) => {
    setLoadingStates(prev => ({ ...prev, orders: true }));
    try {
      const nextParams = { ...activeOrdersParamsRef.current, ...params };
      activeOrdersParamsRef.current = nextParams;

      const q = new URLSearchParams();
      Object.entries(nextParams).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== '') {
          q.set(k, v);
        }
      });
      const res = await fetch(`${API_BASE}/api/orders?${q.toString()}`, { headers: apiHeaders() });
      if (!res.ok) return;
      const result = await res.json();
      setOrders(result.data || []);
      setOrdersPagination(result.pagination || { page: 1, limit: 20, total: 0, totalPages: 1 });
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingStates(prev => ({ ...prev, orders: false }));
    }
  }, []);

  const fetchProductsPaginated = useCallback(async (params = {}) => {
    setLoadingStates(prev => ({ ...prev, products: true }));
    try {
      const nextParams = { ...activeProductsParamsRef.current, ...params };
      activeProductsParamsRef.current = nextParams;

      const q = new URLSearchParams();
      q.set('all', '1');
      Object.entries(nextParams).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== '') {
          q.set(k, v);
        }
      });
      const res = await fetch(`${API_BASE}/api/products?${q.toString()}`, { headers: apiHeaders() });
      if (!res.ok) return;
      const result = await res.json();
      setProducts(result.data || []);
      setProductsPagination({
        ...(result.pagination || { page: 1, limit: 20, total: 0, totalPages: 1 }),
        counts: result.counts || {}
      });
      try {
        if (typeof window !== 'undefined' && nextParams.status === 'active') {
          localStorage.setItem('ab_products', JSON.stringify((result.data || []).filter(p => p.status === 'active')));
        }
      } catch (e) {}
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingStates(prev => ({ ...prev, products: false }));
    }
  }, []);

  const fetchCustomersPaginated = useCallback(async (params = {}) => {
    setLoadingStates(prev => ({ ...prev, customers: true }));
    try {
      const q = new URLSearchParams();
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== '') {
          q.set(k, v);
        }
      });
      const res = await fetch(`${API_BASE}/api/customers?${q.toString()}`, { headers: apiHeaders() });
      if (!res.ok) return;
      const result = await res.json();
      setRegisteredCustomers(result.data || []);
      setCustomersPagination({
        ...(result.pagination || { page: 1, limit: 10, total: 0, totalPages: 1 }),
        summary: result.summary || {}
      });
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingStates(prev => ({ ...prev, customers: false }));
    }
  }, []);

  const fetchReviewsPaginated = useCallback(async (params = {}) => {
    setLoadingStates(prev => ({ ...prev, reviews: true }));
    try {
      const q = new URLSearchParams();
      q.set('all', '1');
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== '') {
          q.set(k, v);
        }
      });
      const res = await fetch(`${API_BASE}/api/reviews?${q.toString()}`, { headers: apiHeaders() });
      if (!res.ok) return;
      const result = await res.json();
      setReviews(result.data || []);
      setReviewsPagination({
        ...(result.pagination || { page: 1, limit: 15, total: 0, totalPages: 1 }),
        counts: result.counts || {}
      });
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingStates(prev => ({ ...prev, reviews: false }));
    }
  }, []);

  const fetchCartsPaginated = useCallback(async (params = {}) => {
    setLoadingStates(prev => ({ ...prev, carts: true }));
    try {
      const q = new URLSearchParams();
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== '') {
          q.set(k, v);
        }
      });
      const res = await fetch(`${API_BASE}/api/carts?${q.toString()}`, { headers: apiHeaders() });
      if (!res.ok) return;
      const result = await res.json();
      setAbandonedCarts(result.data || []);
      setAbandonedCartsPagination({
        ...(result.pagination || { page: 1, limit: 15, total: 0, totalPages: 1 }),
        summary: result.summary || {}
      });
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingStates(prev => ({ ...prev, carts: false }));
    }
  }, []);

  const fetchReportsOrders = useCallback(async (params = {}) => {
    setLoadingStates(prev => ({ ...prev, reports: true }));
    try {
      const q = new URLSearchParams();
      q.set('limit', '10000');
      if (params.range && params.range !== 'all') {
        q.set('dateRange', params.range);
      }
      if (params.customStart) q.set('customStart', params.customStart);
      if (params.customEnd) q.set('customEnd', params.customEnd);
      const res = await fetch(`${API_BASE}/api/orders?${q.toString()}`, { headers: apiHeaders() });
      if (!res.ok) return;
      const result = await res.json();
      setReportsOrders(result.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingStates(prev => ({ ...prev, reports: false }));
    }
  }, []);

  // Backwards compatible fetch hooks mapping to active params
  const fetchProducts = useCallback(async (params = {}) => {
    return fetchProductsPaginated(params);
  }, [fetchProductsPaginated]);

  const fetchOrders = useCallback(async (params = {}) => {
    return fetchOrdersPaginated(params);
  }, [fetchOrdersPaginated]);

  const fetchRegisteredCustomers = useCallback(async (params = {}) => {
    return fetchCustomersPaginated(params);
  }, [fetchCustomersPaginated]);

  const fetchReviews = useCallback(async (params = {}) => {
    return fetchReviewsPaginated(params);
  }, [fetchReviewsPaginated]);

  const fetchAbandonedCarts = useCallback(async (params = {}) => {
    return fetchCartsPaginated(params);
  }, [fetchCartsPaginated]);

  const fetchCoupons = useCallback(async (token) => {
    setLoadingStates(prev => ({ ...prev, coupons: true }));
    try {
      const res = await fetch(`${API_BASE}/api/coupons`, { headers: apiHeaders(token) });
      if (!res.ok) return;
      const data = await res.json();
      if (Array.isArray(data)) setCoupons(data);
    } catch (e) {
    } finally {
      setLoadingStates(prev => ({ ...prev, coupons: false }));
    }
  }, []);

  const fetchFaqs = useCallback(async (token) => {
    setLoadingStates(prev => ({ ...prev, faqs: true }));
    try {
      const res = await fetch(`${API_BASE}/api/faqs`, { headers: apiHeaders(token) });
      if (!res.ok) return;
      const data = await res.json();
      if (Array.isArray(data)) setFaqs(data);
    } catch (e) {
    } finally {
      setLoadingStates(prev => ({ ...prev, faqs: false }));
    }
  }, []);

  const fetchCategories = useCallback(async (token) => {
    setLoadingStates(prev => ({ ...prev, categories: true }));
    try {
      const res = await fetch(`${API_BASE}/api/categories?all=1`, { headers: apiHeaders(token) });
      if (!res.ok) return;
      const data = await res.json();
      if (Array.isArray(data)) {
        setCategories(data.sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0)));
      }
    } catch (e) {
    } finally {
      setLoadingStates(prev => ({ ...prev, categories: false }));
    }
  }, []);

  const fetchSettings = useCallback(async () => {
    setLoadingStates(prev => ({ ...prev, settings: true }));
    try {
      const res = await fetch(`${API_BASE}/api/settings`);
      if (!res.ok) return;
      const s = await res.json();
      if (typeof window !== 'undefined') {
        window.__settings = s;
      }
    } catch (e) {
    } finally {
      setLoadingStates(prev => ({ ...prev, settings: false }));
    }
  }, []);

  const fetchShippingRates = useCallback(async (token) => {
    setLoadingStates(prev => ({ ...prev, shipping: true }));
    try {
      const res = await fetch(`${API_BASE}/api/shipping`, { headers: apiHeaders(token) });
      if (!res.ok) return;
      const data = await res.json();
      if (Array.isArray(data)) {
        setShippingRates(data);
        if (typeof window !== 'undefined') {
          window.SHIPPING_RATES = data;
        }
      }
    } catch (e) {
    } finally {
      setLoadingStates(prev => ({ ...prev, shipping: false }));
    }
  }, []);

  // Keep sessionRef in sync so stable callbacks can read latest token without re-binding.
  useEffect(() => {
    sessionRef.current = session;
  }, [session]);

  // Init: restore session from the HTTP-only admin cookie, then fetch data.
  // Runs ONCE on mount. The fetch callbacks are now stable, so we can safely
  // use an empty dep array — adding them as deps caused an infinite re-init loop.
  useEffect(() => {
    (async () => {
      let sess = null;
      try {
        const res = await fetch(`${API_BASE}/api/auth`);
        if (res.ok) {
          const data = await res.json();
          if (data.session && data.session.expiresAt > Date.now()) {
            sess = data.session;
            setSession(sess);
          }
        }
      } catch (e) {}

      if (sess) {
        fetchDashboardStats(sess.token);
        fetchCoupons(sess.token);
        fetchFaqs(sess.token);
        fetchCategories(sess.token);
        fetchShippingRates(sess.token);
        fetchSettings();
      } else {
        setLoadingStates({
          products: false,
          orders: false,
          customers: false,
          coupons: false,
          reviews: false,
          carts: false,
          faqs: false,
          categories: false,
          shipping: false,
          settings: false,
          dashboard: false,
          reports: false
        });
      }
      setReady(true);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Auth ──────────────────────────────────────────────────────────────────
  const login = useCallback(async (username, password) => {
    try {
      const res = await fetch(`${API_BASE}/api/auth`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'login', username, password }),
      });
      const data = await res.json();
      if (!res.ok) return { ok: false, error: data.error || 'Login failed' };

      const { session: s } = data;
      setSession(s);

      await Promise.all([
        fetchDashboardStats(s.token),
        fetchCoupons(s.token),
        fetchFaqs(s.token),
        fetchCategories(s.token),
        fetchShippingRates(s.token),
        fetchSettings(),
      ]);
      return { ok: true };
    } catch (err) {
      return { ok: false, error: 'Network error — please try again.' };
    }
  }, [fetchDashboardStats, fetchCoupons, fetchFaqs, fetchCategories, fetchShippingRates, fetchSettings]);

  const logout = useCallback(async () => {
    try {
      await fetch(`${API_BASE}/api/auth`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'logout' })
      });
    } catch (e) {}
    setSession(null);
    setProducts([]);
    setOrders([]);
    setRegisteredCustomers([]);
    setCoupons([]);
    setReviews([]);
    setAbandonedCarts([]);
    setFaqs([]);
    setCategories([]);
    setDashboardStats(null);
    setReportsOrders([]);
  }, []);

  // ── Product CRUD ──────────────────────────────────────────────────────────
  const addProduct = useCallback(async (p) => {
    const res = await fetch(`${API_BASE}/api/products`, {
      method: 'POST',
      headers: apiHeaders(),
      body: JSON.stringify(p),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || `Server error ${res.status}`);
    setProducts(prev => [...prev, data]);
    return data;
  }, [session]);

  const updateProduct = useCallback(async (id, patch) => {
    setProducts(prev => prev.map(p => p.id === id ? { ...p, ...patch, updatedAt: Date.now() } : p));
    let errMsg = null;
    try {
      const res = await fetch(`${API_BASE}/api/products`, {
        method: 'PATCH',
        headers: apiHeaders(),
        body: JSON.stringify({ id, ...patch }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        errMsg = d.error || `Server error ${res.status}`;
      }
    } catch (e) {
      errMsg = 'Network error — please try again.';
    }
    if (errMsg) {
      fetchProducts();
      throw new Error(errMsg);
    }
  }, [session, fetchProducts]);

  const deleteProduct = useCallback(async (id) => {
    setProducts(prev => prev.filter(p => p.id !== id));
    let errMsg = null;
    try {
      const res = await fetch(`${API_BASE}/api/products`, {
        method: 'DELETE',
        headers: apiHeaders(),
        body: JSON.stringify({ id }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        errMsg = d.error || `Server error ${res.status}`;
      }
    } catch (e) {
      errMsg = 'Network error — please try again.';
    }
    if (errMsg) {
      fetchProducts();
      throw new Error(errMsg);
    }
  }, [session, fetchProducts]);

  // ── Order CRUD ────────────────────────────────────────────────────────────
  // Pattern note: provider mutations apply an optimistic state update first,
  // then call the API. On failure they refetch (to undo the optimistic state)
  // and throw — callers are expected to catch and surface a toast.
  const updateOrderStatus = useCallback(async (id, status) => {
    setOrders(prev => prev.map(o => o.id === id ? { ...o, status, updatedAt: Date.now() } : o));
    let errMsg = null;
    try {
      const res = await fetch(`${API_BASE}/api/orders`, {
        method: 'PATCH',
        headers: apiHeaders(),
        body: JSON.stringify({ id, status }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        errMsg = d.error || `Server error ${res.status}`;
      }
    } catch (e) {
      errMsg = 'Network error — please try again.';
    }
    if (errMsg) {
      fetchOrders();
      throw new Error(errMsg);
    }
  }, [session, fetchOrders]);

  const updateOrderNote = useCallback(async (id, notes) => {
    setOrders(prev => prev.map(o => o.id === id ? { ...o, notes, updatedAt: Date.now() } : o));
    let errMsg = null;
    try {
      const res = await fetch(`${API_BASE}/api/orders`, {
        method: 'PATCH',
        headers: apiHeaders(),
        body: JSON.stringify({ id, notes }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        errMsg = d.error || `Server error ${res.status}`;
      }
    } catch (e) {
      errMsg = 'Network error — please try again.';
    }
    if (errMsg) {
      fetchOrders();
      throw new Error(errMsg);
    }
  }, [session, fetchOrders]);

  const updatePaymentStatus = useCallback((id, simpleStatus, descriptiveStatus) => {
    setOrders(prev => prev.map(o => {
      if (o.id !== id) return o;
      const desc = descriptiveStatus || (simpleStatus === 'paid' ? 'Paid' : o.paymentStatus);
      return { ...o, payment: { ...o.payment, status: simpleStatus }, paymentStatus: desc, updatedAt: Date.now() };
    }));
  }, []);

  const replaceOrder = useCallback((updatedOrder) => {
    if (!updatedOrder?.id) return;
    setOrders(prev => prev.map(o => o.id === updatedOrder.id ? { ...o, ...updatedOrder } : o));
  }, []);

  const updateTracking = useCallback(async (id, trackingNumber, carrier, trackingLink, dispatchDate) => {
    setOrders(prev => prev.map(o => o.id === id ? { ...o, trackingNumber, carrier, trackingLink, dispatchDate, updatedAt: Date.now() } : o));
    let errMsg = null;
    try {
      const res = await fetch(`${API_BASE}/api/orders`, {
        method: 'PATCH',
        headers: apiHeaders(),
        body: JSON.stringify({ id, trackingNumber, carrier, trackingLink, dispatchDate }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        errMsg = d.error || `Server error ${res.status}`;
      }
    } catch (e) {
      errMsg = 'Network error — please try again.';
    }
    if (errMsg) {
      fetchOrders();
      throw new Error(errMsg);
    }
  }, [session, fetchOrders]);

  // ── Coupon CRUD ───────────────────────────────────────────────────────────
  const addCoupon = useCallback(async (payload) => {
    const res = await fetch(`${API_BASE}/api/coupons`, {
      method: 'POST',
      headers: apiHeaders(),
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `Server error ${res.status}`);
    setCoupons(prev => [...prev, data]);
    return data;
  }, [session]);

  const updateCoupon = useCallback(async (id, patch) => {
    setCoupons(prev => prev.map(c => c.id === id ? { ...c, ...patch, updatedAt: Date.now() } : c));
    let errMsg = null;
    try {
      const res = await fetch(`${API_BASE}/api/coupons`, {
        method: 'PATCH',
        headers: apiHeaders(),
        body: JSON.stringify({ id, ...patch }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        errMsg = d.error || `Server error ${res.status}`;
      }
    } catch (e) {
      errMsg = 'Network error — please try again.';
    }
    if (errMsg) {
      fetchCoupons();
      throw new Error(errMsg);
    }
  }, [session, fetchCoupons]);

  const deleteCoupon = useCallback(async (id) => {
    setCoupons(prev => prev.filter(c => c.id !== id));
    let errMsg = null;
    try {
      const res = await fetch(`${API_BASE}/api/coupons`, {
        method: 'DELETE',
        headers: apiHeaders(),
        body: JSON.stringify({ id }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        errMsg = d.error || `Server error ${res.status}`;
      }
    } catch (e) {
      errMsg = 'Network error — please try again.';
    }
    if (errMsg) {
      fetchCoupons();
      throw new Error(errMsg);
    }
  }, [session, fetchCoupons]);

  // ── FAQ CRUD ──────────────────────────────────────────────────────────────
  const addFaq = useCallback(async (payload) => {
    const res = await fetch(`${API_BASE}/api/faqs`, {
      method: 'POST',
      headers: apiHeaders(),
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `Server error ${res.status}`);
    setFaqs(prev => [...prev, data].sort((a, b) => (a.order || 0) - (b.order || 0)));
    return data;
  }, [session]);

  const updateFaq = useCallback(async (id, patch) => {
    setFaqs(prev => prev.map(f => f.id === id ? { ...f, ...patch, updatedAt: Date.now() } : f));
    let errMsg = null;
    try {
      const res = await fetch(`${API_BASE}/api/faqs`, {
        method: 'PATCH',
        headers: apiHeaders(),
        body: JSON.stringify({ id, ...patch }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        errMsg = d.error || `Server error ${res.status}`;
      }
    } catch (e) {
      errMsg = 'Network error — please try again.';
    }
    if (errMsg) {
      fetchFaqs();
      throw new Error(errMsg);
    }
  }, [session, fetchFaqs]);

  const deleteFaq = useCallback(async (id) => {
    setFaqs(prev => prev.filter(f => f.id !== id));
    let errMsg = null;
    try {
      const res = await fetch(`${API_BASE}/api/faqs`, {
        method: 'DELETE',
        headers: apiHeaders(),
        body: JSON.stringify({ id }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        errMsg = d.error || `Server error ${res.status}`;
      }
    } catch (e) {
      errMsg = 'Network error — please try again.';
    }
    if (errMsg) {
      fetchFaqs();
      throw new Error(errMsg);
    }
  }, [session, fetchFaqs]);

  // ── Shipping Rates ──
  // Shipping CRUD returns a structured result { ok, error } rather than
  // throwing, because the existing ShippingEditor caller branches on the
  // boolean. The error string lets the caller surface a useful toast.
  const addShippingRate = useCallback(async (rate) => {
    try {
      const res = await fetch(`${API_BASE}/api/shipping`, {
        method: 'POST',
        headers: apiHeaders(),
        body: JSON.stringify(rate)
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return { ok: false, error: data.error || `Server error ${res.status}` };
      setShippingRates(prev => [...prev.filter(r => !data.isDefault || !r.isDefault), data]);
      return { ok: true, data };
    } catch (e) {
      return { ok: false, error: 'Network error — please try again.' };
    }
  }, [session]);

  const updateShippingRate = useCallback(async (rate) => {
    try {
      const res = await fetch(`${API_BASE}/api/shipping`, {
        method: 'PATCH',
        headers: apiHeaders(),
        body: JSON.stringify(rate)
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return { ok: false, error: data.error || `Server error ${res.status}` };
      setShippingRates(prev => prev.map(r => r.id === data.id ? data : (data.isDefault ? { ...r, isDefault: false } : r)));
      return { ok: true, data };
    } catch (e) {
      return { ok: false, error: 'Network error — please try again.' };
    }
  }, [session]);

  const deleteShippingRate = useCallback(async (id) => {
    try {
      const res = await fetch(`${API_BASE}/api/shipping`, {
        method: 'DELETE',
        headers: apiHeaders(),
        body: JSON.stringify({ id })
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        return { ok: false, error: d.error || `Server error ${res.status}` };
      }
      setShippingRates(prev => prev.filter(r => r.id !== id));
      return { ok: true };
    } catch (e) {
      return { ok: false, error: 'Network error — please try again.' };
    }
  }, [session]);

  // ── Categories CRUD ────────────────────────────────────────────────────────
  const addCategory = useCallback(async (payload) => {
    const res = await fetch(`${API_BASE}/api/categories`, {
      method: 'POST',
      headers: apiHeaders(),
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Server error');
    setCategories(prev => [...prev, data].sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0)));
    return data;
  }, [session]);

  const updateCategory = useCallback(async (id, patch) => {
    setCategories(prev => prev.map(c => c.id === id ? { ...c, ...patch, updatedAt: Date.now() } : c).sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0)));
    try {
      const res = await fetch(`${API_BASE}/api/categories`, {
        method: 'PATCH',
        headers: apiHeaders(),
        body: JSON.stringify({ id, patch }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || 'Server error');
      }
    } catch (e) {
      fetchCategories();
      throw e;
    }
  }, [session, fetchCategories]);

  const deleteCategory = useCallback(async (id, reassignTo = '') => {
    setCategories(prev => prev.filter(c => c.id !== id));
    try {
      const qs = new URLSearchParams({ id });
      if (reassignTo) qs.set('reassignTo', reassignTo);
      const res = await fetch(`${API_BASE}/api/categories?${qs.toString()}`, {
        method: 'DELETE',
        headers: apiHeaders()
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || 'Server error');
      }
    } catch (e) {
      fetchCategories();
      throw e;
    }
  }, [session, fetchCategories]);

  // ── Review moderation ─────────────────────────────────────────────────────
  const createReview = useCallback(async (payload) => {
    try {
      const res = await fetch(`${API_BASE}/api/reviews`, {
        method: 'POST',
        headers: apiHeaders(),
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || `Server error ${res.status}`);
      }
      const created = await res.json();
      setReviews(prev => [created, ...prev]);
      return created;
    } catch (e) {
      throw e instanceof Error ? e : new Error('Failed to create review.');
    }
  }, [session]);

  const updateReview = useCallback(async (id, patch) => {
    setReviews(prev => prev.map(r => r.id === id ? { ...r, ...patch, updatedAt: Date.now() } : r));
    let errMsg = null;
    try {
      const res = await fetch(`${API_BASE}/api/reviews`, {
        method: 'PATCH',
        headers: apiHeaders(),
        body: JSON.stringify({ id, ...patch }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        errMsg = d.error || `Server error ${res.status}`;
      }
    } catch (e) {
      errMsg = 'Network error — please try again.';
    }
    if (errMsg) {
      fetchReviews();
      throw new Error(errMsg);
    }
  }, [session, fetchReviews]);

  const deleteReview = useCallback(async (id) => {
    setReviews(prev => prev.filter(r => r.id !== id));
    let errMsg = null;
    try {
      const res = await fetch(`${API_BASE}/api/reviews`, {
        method: 'DELETE',
        headers: apiHeaders(),
        body: JSON.stringify({ id }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        errMsg = d.error || `Server error ${res.status}`;
      }
    } catch (e) {
      errMsg = 'Network error — please try again.';
    }
    if (errMsg) {
      fetchReviews();
      throw new Error(errMsg);
    }
  }, [session, fetchReviews]);

  // ── Derived ───────────────────────────────────────────────────────────────
  const customers = registeredCustomers;

  const stats = useMemo(() => {
    if (dashboardStats) return dashboardStats;
    return {
      accounting: {},
      revenue: 0,
      totalOrders: 0,
      activeProducts: 0,
      totalCustomers: 0,
      lowStockProducts: [],
      lowStockCount: 0,
      recentOrders: [],
      byStatus: {}
    };
  }, [dashboardStats]);

  const authValue = useMemo(() => ({
    session,
    login,
    logout,
    isAdmin: session?.role === 'admin'
  }), [session, login, logout]);

  const dataValue = useMemo(() => ({
    products,
    setProducts,
    fetchProducts,
    addProduct,
    updateProduct,
    deleteProduct,
    orders,
    setOrders,
    fetchOrders,
    customers,
    registeredCustomers,
    fetchRegisteredCustomers,
    stats,
    updateOrderStatus,
    updateOrderNote,
    updatePaymentStatus,
    replaceOrder,
    updateTracking,
    coupons,
    setCoupons,
    fetchCoupons,
    addCoupon,
    updateCoupon,
    deleteCoupon,
    reviews,
    setReviews,
    fetchReviews,
    createReview,
    updateReview,
    deleteReview,
    abandonedCarts,
    setAbandonedCarts,
    fetchAbandonedCarts,
    faqs,
    setFaqs,
    fetchFaqs,
    addFaq,
    updateFaq,
    deleteFaq,
    categories,
    setCategories,
    fetchCategories,
    addCategory,
    updateCategory,
    deleteCategory,
    shippingRates,
    setShippingRates,
    fetchShippingRates,
    addShippingRate,
    updateShippingRate,
    deleteShippingRate,
    loadingStates,
    fmtMoney,
    fmtDate,
    fmtDateTime,
    initials,
    
    // Pagination fields & methods
    ordersPagination,
    fetchOrdersPaginated,
    productsPagination,
    fetchProductsPaginated,
    customersPagination,
    fetchCustomersPaginated,
    reviewsPagination,
    fetchReviewsPaginated,
    abandonedCartsPagination,
    fetchCartsPaginated,
    dashboardStats,
    fetchDashboardStats,
    reportsOrders,
    fetchReportsOrders
  }), [
    products,
    fetchProducts,
    addProduct,
    updateProduct,
    deleteProduct,
    orders,
    fetchOrders,
    customers,
    registeredCustomers,
    fetchRegisteredCustomers,
    stats,
    updateOrderStatus,
    updateOrderNote,
    updatePaymentStatus,
    replaceOrder,
    updateTracking,
    coupons,
    fetchCoupons,
    addCoupon,
    updateCoupon,
    deleteCoupon,
    reviews,
    fetchReviews,
    createReview,
    updateReview,
    deleteReview,
    abandonedCarts,
    fetchAbandonedCarts,
    faqs,
    fetchFaqs,
    addFaq,
    updateFaq,
    deleteFaq,
    categories,
    fetchCategories,
    addCategory,
    updateCategory,
    deleteCategory,
    shippingRates,
    fetchShippingRates,
    addShippingRate,
    updateShippingRate,
    deleteShippingRate,
    loadingStates,
    
    ordersPagination,
    fetchOrdersPaginated,
    productsPagination,
    fetchProductsPaginated,
    customersPagination,
    fetchCustomersPaginated,
    reviewsPagination,
    fetchReviewsPaginated,
    abandonedCartsPagination,
    fetchCartsPaginated,
    dashboardStats,
    fetchDashboardStats,
    reportsOrders,
    fetchReportsOrders
  ]);

  if (!ready) {
    return (
      <div className="admin-loading-screen">
        <div className="admin-loading-container">
          <div className="admin-loading-spinner" />
          <div className="admin-loading-text">Loading admin panel…</div>
        </div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={authValue}>
      <DataContext.Provider value={dataValue}>
        {children}
      </DataContext.Provider>
    </AuthContext.Provider>
  );
}
