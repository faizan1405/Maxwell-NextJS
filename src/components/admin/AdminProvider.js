'use client';

import React, { useState, useEffect, useContext, useCallback, useMemo, createContext } from 'react';
import { calculateOrderStats } from '../../utils/accounting';

const SESSION_KEY = 'ab_admin_session_v2';

export const AuthContext = createContext(null);
export const DataContext = createContext(null);

export const useAuth = () => useContext(AuthContext);
export const useAdmin = () => useContext(DataContext);

export function fmtMoney(n) {
  return 'R' + (n || 0).toFixed(2);
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

const API_BASE = (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'))
  ? 'https://maxwell-chi.vercel.app'
  : '';

function apiHeaders(token, extra) {
  return {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
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
  const [categories, setCategories] = useState([]);
  const [shippingRates, setShippingRates] = useState([]);

  // ── Data fetchers ─────────────────────────────────────────────────────────
  const fetchRegisteredCustomers = useCallback(async (token) => {
    try {
      const res = await fetch(`${API_BASE}/api/customers`, { headers: apiHeaders(token) });
      if (!res.ok) return;
      const data = await res.json();
      if (Array.isArray(data)) setRegisteredCustomers(data);
    } catch (e) {}
  }, []);

  const fetchProducts = useCallback(async (token) => {
    try {
      const res = await fetch(`${API_BASE}/api/products?all=1`, { headers: apiHeaders(token) });
      if (!res.ok) return;
      const data = await res.json();
      setProducts(data);
      try {
        if (typeof window !== 'undefined') {
          localStorage.setItem('ab_products', JSON.stringify(data.filter(p => p.status === 'active')));
        }
      } catch (e) {}
    } catch (err) {
      try {
        if (typeof window !== 'undefined') {
          const raw = localStorage.getItem('ab_admin_products_v2');
          if (raw) {
            const p = JSON.parse(raw);
            if (Array.isArray(p)) setProducts(p);
          }
        }
      } catch (e) {}
    }
  }, []);

  const fetchOrders = useCallback(async (token) => {
    try {
      const res = await fetch(`${API_BASE}/api/orders`, { headers: apiHeaders(token) });
      if (!res.ok) return;
      const data = await res.json();
      setOrders(data);
    } catch (err) {
      try {
        if (typeof window !== 'undefined') {
          const raw = localStorage.getItem('ab_admin_orders_v2');
          if (raw) {
            const o = JSON.parse(raw);
            if (Array.isArray(o)) setOrders(o);
          }
        }
      } catch (e) {}
    }
  }, []);

  const fetchCoupons = useCallback(async (token) => {
    try {
      const res = await fetch(`${API_BASE}/api/coupons`, { headers: apiHeaders(token) });
      if (!res.ok) return;
      const data = await res.json();
      if (Array.isArray(data)) setCoupons(data);
    } catch (e) {}
  }, []);

  const fetchReviews = useCallback(async (token) => {
    try {
      const res = await fetch(`${API_BASE}/api/reviews?all=1`, { headers: apiHeaders(token) });
      if (!res.ok) return;
      const data = await res.json();
      if (Array.isArray(data)) setReviews(data);
    } catch (e) {}
  }, []);

  const fetchFaqs = useCallback(async (token) => {
    try {
      const res = await fetch(`${API_BASE}/api/faqs`, { headers: apiHeaders(token) });
      if (!res.ok) return;
      const data = await res.json();
      if (Array.isArray(data)) setFaqs(data);
    } catch (e) {}
  }, []);

  const fetchAbandonedCarts = useCallback(async (token) => {
    try {
      const res = await fetch(`${API_BASE}/api/carts`, { headers: apiHeaders(token) });
      if (!res.ok) return;
      const data = await res.json();
      if (Array.isArray(data)) setAbandonedCarts(data);
    } catch (e) {}
  }, []);

  const fetchCategories = useCallback(async (token) => {
    try {
      const res = await fetch(`${API_BASE}/api/categories?all=1`, { headers: apiHeaders(token) });
      if (!res.ok) return;
      const data = await res.json();
      if (Array.isArray(data)) setCategories(data);
    } catch (e) {}
  }, []);

  const fetchSettings = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/settings`);
      if (!res.ok) return;
      const s = await res.json();
      if (typeof window !== 'undefined') {
        window.__settings = s;
      }
    } catch (e) {}
  }, []);

  const fetchShippingRates = useCallback(async (token) => {
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
    } catch (e) {}
  }, []);

  // Init — restore session from sessionStorage, then fetch data
  useEffect(() => {
    (async () => {
      let sess = null;
      try {
        if (typeof window !== 'undefined') {
          const s = JSON.parse(sessionStorage.getItem(SESSION_KEY) || 'null');
          if (s && s.expiresAt > Date.now()) {
            sess = s;
            setSession(s);
          }
        }
      } catch (e) {}

      if (sess) {
        await Promise.all([
          fetchProducts(sess.token),
          fetchOrders(sess.token),
          fetchRegisteredCustomers(sess.token),
          fetchCoupons(sess.token),
          fetchReviews(sess.token),
          fetchAbandonedCarts(sess.token),
          fetchFaqs(sess.token),
          fetchCategories(sess.token),
          fetchShippingRates(sess.token),
          fetchSettings(),
        ]);
      }
      setReady(true);
    })();
  }, [fetchProducts, fetchOrders, fetchRegisteredCustomers, fetchCoupons, fetchReviews, fetchAbandonedCarts, fetchFaqs, fetchCategories, fetchShippingRates, fetchSettings]);

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

      const { token, session: s } = data;
      setSession(s);
      if (typeof window !== 'undefined') {
        sessionStorage.setItem(SESSION_KEY, JSON.stringify(s));
      }

      await Promise.all([
        fetchProducts(token),
        fetchOrders(token),
        fetchRegisteredCustomers(token),
        fetchCoupons(token),
        fetchReviews(token),
        fetchAbandonedCarts(token),
        fetchFaqs(token),
        fetchCategories(token),
        fetchShippingRates(token),
        fetchSettings(),
      ]);
      return { ok: true };
    } catch (err) {
      return { ok: false, error: 'Network error — please try again.' };
    }
  }, [fetchProducts, fetchOrders, fetchRegisteredCustomers, fetchCoupons, fetchReviews, fetchAbandonedCarts, fetchFaqs, fetchCategories, fetchShippingRates, fetchSettings]);

  const logout = useCallback(async () => {
    if (session?.token) {
      try {
        await fetch(`${API_BASE}/api/auth`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'logout', token: session.token })
        });
      } catch (e) {}
    }
    setSession(null);
    setProducts([]);
    setOrders([]);
    setRegisteredCustomers([]);
    setCoupons([]);
    setReviews([]);
    setAbandonedCarts([]);
    setFaqs([]);
    setCategories([]);
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem(SESSION_KEY);
    }
  }, [session]);

  // ── Product CRUD ──────────────────────────────────────────────────────────
  const addProduct = useCallback(async (p) => {
    const res = await fetch(`${API_BASE}/api/products`, {
      method: 'POST',
      headers: apiHeaders(session?.token),
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
        headers: apiHeaders(session?.token),
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
      fetchProducts(session?.token);
      throw new Error(errMsg);
    }
  }, [session, fetchProducts]);

  const deleteProduct = useCallback(async (id) => {
    setProducts(prev => prev.filter(p => p.id !== id));
    let errMsg = null;
    try {
      const res = await fetch(`${API_BASE}/api/products`, {
        method: 'DELETE',
        headers: apiHeaders(session?.token),
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
      fetchProducts(session?.token);
      throw new Error(errMsg);
    }
  }, [session, fetchProducts]);

  // ── Order CRUD ────────────────────────────────────────────────────────────
  const updateOrderStatus = useCallback(async (id, status) => {
    setOrders(prev => prev.map(o => o.id === id ? { ...o, status, updatedAt: Date.now() } : o));
    try {
      await fetch(`${API_BASE}/api/orders`, {
        method: 'PATCH',
        headers: apiHeaders(session?.token),
        body: JSON.stringify({ id, status }),
      });
    } catch (e) {
      fetchOrders(session?.token);
    }
  }, [session, fetchOrders]);

  const updateOrderNote = useCallback(async (id, notes) => {
    setOrders(prev => prev.map(o => o.id === id ? { ...o, notes, updatedAt: Date.now() } : o));
    try {
      await fetch(`${API_BASE}/api/orders`, {
        method: 'PATCH',
        headers: apiHeaders(session?.token),
        body: JSON.stringify({ id, notes }),
      });
    } catch (e) {
      fetchOrders(session?.token);
    }
  }, [session, fetchOrders]);

  const updatePaymentStatus = useCallback((id, simpleStatus, descriptiveStatus) => {
    setOrders(prev => prev.map(o => {
      if (o.id !== id) return o;
      const desc = descriptiveStatus || (simpleStatus === 'paid' ? 'Paid' : o.paymentStatus);
      return { ...o, payment: { ...o.payment, status: simpleStatus }, paymentStatus: desc, updatedAt: Date.now() };
    }));
  }, []);

  const updateTracking = useCallback(async (id, trackingNumber, carrier, trackingLink, dispatchDate) => {
    setOrders(prev => prev.map(o => o.id === id ? { ...o, trackingNumber, carrier, trackingLink, dispatchDate, updatedAt: Date.now() } : o));
    try {
      await fetch(`${API_BASE}/api/orders`, {
        method: 'PATCH',
        headers: apiHeaders(session?.token),
        body: JSON.stringify({ id, trackingNumber, carrier, trackingLink, dispatchDate }),
      });
    } catch (e) {
      fetchOrders(session?.token);
    }
  }, [session, fetchOrders]);

  // ── Coupon CRUD ───────────────────────────────────────────────────────────
  const addCoupon = useCallback(async (payload) => {
    const res = await fetch(`${API_BASE}/api/coupons`, {
      method: 'POST',
      headers: apiHeaders(session?.token),
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (res.ok) setCoupons(prev => [...prev, data]);
    return data;
  }, [session]);

  const updateCoupon = useCallback(async (id, patch) => {
    setCoupons(prev => prev.map(c => c.id === id ? { ...c, ...patch, updatedAt: Date.now() } : c));
    try {
      await fetch(`${API_BASE}/api/coupons`, {
        method: 'PATCH',
        headers: apiHeaders(session?.token),
        body: JSON.stringify({ id, ...patch }),
      });
    } catch (e) {
      fetchCoupons(session?.token);
    }
  }, [session, fetchCoupons]);

  const deleteCoupon = useCallback(async (id) => {
    setCoupons(prev => prev.filter(c => c.id !== id));
    try {
      await fetch(`${API_BASE}/api/coupons`, {
        method: 'DELETE',
        headers: apiHeaders(session?.token),
        body: JSON.stringify({ id }),
      });
    } catch (e) {
      fetchCoupons(session?.token);
    }
  }, [session, fetchCoupons]);

  // ── FAQ CRUD ──────────────────────────────────────────────────────────────
  const addFaq = useCallback(async (payload) => {
    const res = await fetch(`${API_BASE}/api/faqs`, {
      method: 'POST',
      headers: apiHeaders(session?.token),
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (res.ok) setFaqs(prev => [...prev, data].sort((a, b) => (a.order || 0) - (b.order || 0)));
    return data;
  }, [session]);

  const updateFaq = useCallback(async (id, patch) => {
    setFaqs(prev => prev.map(f => f.id === id ? { ...f, ...patch, updatedAt: Date.now() } : f));
    try {
      await fetch(`${API_BASE}/api/faqs`, {
        method: 'PATCH',
        headers: apiHeaders(session?.token),
        body: JSON.stringify({ id, ...patch }),
      });
    } catch (e) {
      fetchFaqs(session?.token);
    }
  }, [session, fetchFaqs]);

  const deleteFaq = useCallback(async (id) => {
    setFaqs(prev => prev.filter(f => f.id !== id));
    try {
      await fetch(`${API_BASE}/api/faqs`, {
        method: 'DELETE',
        headers: apiHeaders(session?.token),
        body: JSON.stringify({ id }),
      });
    } catch (e) {
      fetchFaqs(session?.token);
    }
  }, [session, fetchFaqs]);

  // ── Shipping Rates ──
  const addShippingRate = useCallback(async (rate) => {
    try {
      const res = await fetch(`${API_BASE}/api/shipping`, {
        method: 'POST',
        headers: apiHeaders(session?.token),
        body: JSON.stringify(rate)
      });
      if (!res.ok) return false;
      const data = await res.json();
      setShippingRates(prev => [...prev.filter(r => !data.isDefault || !r.isDefault), data]);
      return true;
    } catch (e) {
      return false;
    }
  }, [session]);

  const updateShippingRate = useCallback(async (rate) => {
    try {
      const res = await fetch(`${API_BASE}/api/shipping`, {
        method: 'PATCH',
        headers: apiHeaders(session?.token),
        body: JSON.stringify(rate)
      });
      if (!res.ok) return false;
      const data = await res.json();
      setShippingRates(prev => prev.map(r => r.id === data.id ? data : (data.isDefault ? { ...r, isDefault: false } : r)));
      return true;
    } catch (e) {
      return false;
    }
  }, [session]);

  const deleteShippingRate = useCallback(async (id) => {
    try {
      const res = await fetch(`${API_BASE}/api/shipping`, {
        method: 'DELETE',
        headers: apiHeaders(session?.token),
        body: JSON.stringify({ id })
      });
      if (res.ok) setShippingRates(prev => prev.filter(r => r.id !== id));
      return res.ok;
    } catch (e) {
      return false;
    }
  }, [session]);

  // ── Categories CRUD ────────────────────────────────────────────────────────
  const addCategory = useCallback(async (payload) => {
    const res = await fetch(`${API_BASE}/api/categories`, {
      method: 'POST',
      headers: apiHeaders(session?.token),
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
        headers: apiHeaders(session?.token),
        body: JSON.stringify({ id, patch }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || 'Server error');
      }
    } catch (e) {
      fetchCategories(session?.token);
      throw e;
    }
  }, [session, fetchCategories]);

  const deleteCategory = useCallback(async (id) => {
    setCategories(prev => prev.filter(c => c.id !== id));
    try {
      const res = await fetch(`${API_BASE}/api/categories?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: apiHeaders(session?.token)
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || 'Server error');
      }
    } catch (e) {
      fetchCategories(session?.token);
      throw e;
    }
  }, [session, fetchCategories]);

  // ── Review moderation ─────────────────────────────────────────────────────
  const updateReview = useCallback(async (id, patch) => {
    setReviews(prev => prev.map(r => r.id === id ? { ...r, ...patch, updatedAt: Date.now() } : r));
    try {
      await fetch(`${API_BASE}/api/reviews`, {
        method: 'PATCH',
        headers: apiHeaders(session?.token),
        body: JSON.stringify({ id, ...patch }),
      });
    } catch (e) {
      fetchReviews(session?.token);
    }
  }, [session, fetchReviews]);

  const deleteReview = useCallback(async (id) => {
    setReviews(prev => prev.filter(r => r.id !== id));
    try {
      await fetch(`${API_BASE}/api/reviews`, {
        method: 'DELETE',
        headers: apiHeaders(session?.token),
        body: JSON.stringify({ id }),
      });
    } catch (e) {
      fetchReviews(session?.token);
    }
  }, [session, fetchReviews]);

  // ── Derived ───────────────────────────────────────────────────────────────
  const customers = useMemo(() => {
    const map = {};
    orders.forEach(o => {
      const c = o.customer;
      if (!c) return;
      const key = (c.email || c.id || '').toLowerCase();
      if (!key) return;
      if (!map[key]) map[key] = { ...c, orders: [], totalSpent: 0, orderCount: 0, lastOrderAt: 0 };
      map[key].orders.push(o);
      map[key].orderCount++;
      const isPaid = o.payment?.status === 'paid' || o.paymentStatus === 'Paid';
      if (isPaid) map[key].totalSpent += o.total;
      if (o.createdAt > map[key].lastOrderAt) map[key].lastOrderAt = o.createdAt;
    });

    registeredCustomers.forEach(rc => {
      if (!rc.email) return;
      const key = rc.email.toLowerCase();
      if (map[key]) {
        map[key].hasAccount = true;
        map[key].accountId = rc.id;
        map[key].accountSince = rc.createdAt;
        map[key].savedAddresses = rc.addresses || [];
        if (rc.name && !map[key].name) map[key].name = rc.name;
        if (rc.phone && !map[key].phone) map[key].phone = rc.phone;
      } else {
        map[key] = {
          id: rc.id,
          name: rc.name || '(no name)',
          email: rc.email,
          phone: rc.phone || '',
          orders: [],
          totalSpent: 0,
          orderCount: 0,
          lastOrderAt: rc.createdAt,
          hasAccount: true,
          accountId: rc.id,
          accountSince: rc.createdAt,
          savedAddresses: rc.addresses || [],
        };
      }
    });

    return Object.values(map).sort((a, b) => b.totalSpent - a.totalSpent);
  }, [orders, registeredCustomers]);

  const stats = useMemo(() => {
    const acc = calculateOrderStats(orders);
    const active = products.filter(p => p.status === 'active');
    const lowStock = products.filter(p => {
      if (p.status !== 'active') return false;
      const threshold = p.lowStockThreshold || 0;
      if (p.variants && p.variants.length > 0) {
        return p.variants.some(v => v.stock <= threshold);
      }
      return p.stock <= threshold;
    });
    const recentOrders = [...orders].sort((a, b) => b.createdAt - a.createdAt).slice(0, 5);
    const byStatus = orders.reduce((a, o) => {
      a[o.status] = (a[o.status] || 0) + 1;
      return a;
    }, {});
    return {
      accounting: acc,
      revenue: acc.collectedRevenue, // Backwards compatible with existing code
      totalOrders: acc.totalValidOrders,
      activeProducts: active.length,
      totalCustomers: customers.length,
      lowStockProducts: lowStock,
      lowStockCount: lowStock.length,
      recentOrders,
      byStatus
    };
  }, [orders, products, customers]);

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
    fmtMoney,
    fmtDate,
    fmtDateTime,
    initials,
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
    updateTracking,
    coupons,
    fetchCoupons,
    addCoupon,
    updateCoupon,
    deleteCoupon,
    reviews,
    fetchReviews,
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
