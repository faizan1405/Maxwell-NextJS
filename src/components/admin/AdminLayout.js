'use client';

import React, { useState, useMemo } from 'react';
import { useAuth, useAdmin } from './AdminProvider';
import { Avatar } from '../ui';
import { Icon } from '../ui/Icons';

const NAV = [
  { id: 'dashboard',  label: 'Dashboard',  icon: 'Dashboard',    badge: null },
  { id: 'reports',    label: 'Reports',    icon: 'Chart',        badge: null },
  { id: 'products',   label: 'Products',   icon: 'Box',          badge: null },
  { id: 'orders',     label: 'Orders',     icon: 'ShoppingBag',  badge: 'orders' },
  { id: 'customers',  label: 'Customers',  icon: 'Users',        badge: null },
];

const NAV_ADMIN = [
  { id: 'categories', label: 'Categories',     icon: 'List',        badge: null },
  { id: 'coupons',    label: 'Coupons',        icon: 'Tag',         badge: null },
  { id: 'shipping',   label: 'Shipping',       icon: 'Truck',       badge: null },
  { id: 'reviews',    label: 'Reviews',        icon: 'Star',        badge: 'reviews' },
  { id: 'faqs',       label: 'FAQs',           icon: 'Help',        badge: null },
  { id: 'abandoned',  label: 'Abandoned Carts', icon: 'Cart',        badge: null },
  { id: 'settings',   label: 'Settings',       icon: 'Settings',    badge: null },
];

function Sidebar({ page, setPage, open, onClose, stats }) {
  const { session, logout, isAdmin } = useAuth();
  const { reviews } = useAdmin();
  
  const pendingReviews = useMemo(() => 
    (reviews || []).filter(r => r.status === 'pending').length, 
    [reviews]
  );

  function renderNavItem(item) {
    const active = page === item.id;
    let badgeCount = 0;
    
    if (item.badge === 'orders') {
      badgeCount = (stats?.byStatus?.pending || 0) + (stats?.byStatus?.processing || 0);
    } else if (item.badge === 'reviews') {
      badgeCount = pendingReviews;
    }

    return (
      <button
        key={item.id}
        onClick={() => {
          setPage(item.id);
          onClose?.();
        }}
        className={`admin-sidebar-nav-item ${active ? 'active' : ''}`}
      >
        <span className="admin-sidebar-nav-item-icon">
          {Icon[item.icon]?.()}
        </span>
        <span className="admin-sidebar-nav-item-label">{item.label}</span>
        {badgeCount > 0 && (
          <span className="admin-sidebar-nav-item-badge">{badgeCount}</span>
        )}
      </button>
    );
  }

  return (
    <>
      {open && <div className="admin-sidebar-overlay" onClick={onClose} />}

      <aside className={`admin-sidebar ${open ? 'open' : ''}`}>
        {/* Logo */}
        <div className="admin-sidebar-logo-container">
          <div className="admin-sidebar-logo-wrapper">
            <img
              src="/assets/amahle-blue-logo.jpg"
              alt="Amahle Blue"
              className="admin-sidebar-logo"
            />
            <div className="admin-sidebar-logo-tag">Admin Panel</div>
          </div>
          <button onClick={onClose} className="admin-sidebar-close-btn">
            <Icon.Close />
          </button>
        </div>

        {/* Nav */}
        <nav className="admin-sidebar-nav">
          <p className="admin-sidebar-section-title">Menu</p>
          {NAV.map(renderNavItem)}

          {isAdmin && (
            <>
              <p className="admin-sidebar-section-title admin-sidebar-section-title-admin">Admin</p>
              {NAV_ADMIN.map(renderNavItem)}
            </>
          )}
        </nav>

        {/* User */}
        <div className="admin-sidebar-footer">
          <div className="admin-sidebar-user-info">
            <Avatar name={session?.user?.name} size={32} />
            <div className="admin-sidebar-user-details">
              <div className="admin-sidebar-user-name">{session?.user?.name}</div>
              <div className="admin-sidebar-user-role">{session?.role}</div>
            </div>
            <button onClick={logout} title="Sign out" className="admin-sidebar-signout-btn">
              <Icon.Logout />
            </button>
          </div>
          <a
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            className="admin-sidebar-storefront-link"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
              <polyline points="15 3 21 3 21 9" />
              <line x1="10" y1="14" x2="21" y2="3" />
            </svg>
            View Storefront
          </a>
        </div>
      </aside>
    </>
  );
}

function TopBar({ page, onMenuClick, stats, setPage }) {
  const { session, logout } = useAuth();
  const [userOpen, setUserOpen] = useState(false);
  const alertCount = (stats?.byStatus?.pending || 0) + (stats?.byStatus?.processing || 0);

  const labels = {
    dashboard: 'Dashboard',
    reports: 'Reports',
    products: 'Products',
    orders: 'Orders',
    customers: 'Customers',
    settings: 'Settings',
    categories: 'Categories',
    coupons: 'Coupons',
    reviews: 'Reviews',
    faqs: 'FAQs',
    abandoned: 'Abandoned Carts',
    shipping: 'Shipping'
  };
  const label = labels[page] || page;

  return (
    <header className="admin-topbar">
      <button onClick={onMenuClick} className="admin-topbar-menu-btn">
        <Icon.Menu />
      </button>

      <div className="admin-topbar-breadcrumb">
        <h1 className="admin-topbar-title">{label}</h1>
      </div>

      <div className="admin-topbar-actions">
        {stats?.lowStockCount > 0 && (
          <button
            onClick={() => setPage('products')}
            title={`${stats.lowStockCount} product${stats.lowStockCount !== 1 ? 's' : ''} low on stock`}
            className="admin-topbar-alert-btn"
          >
            <Icon.Warning />
            <span>{stats.lowStockCount} low stock</span>
          </button>
        )}

        <div className="admin-topbar-bell-wrapper">
          <button onClick={() => setPage('orders')} className="admin-topbar-bell-btn">
            <Icon.Bell />
            {alertCount > 0 && (
              <span className="admin-topbar-bell-badge">{alertCount}</span>
            )}
          </button>
        </div>

        <div className="admin-topbar-user-menu">
          <button onClick={() => setUserOpen(!userOpen)} className="admin-topbar-user-trigger">
            <Avatar name={session?.user?.name} size={28} />
            <span className="admin-topbar-user-name">{session?.user?.name}</span>
            <Icon.ChevronDown />
          </button>
          
          {userOpen && (
            <>
              <div className="admin-topbar-dropdown-backdrop" onClick={() => setUserOpen(false)} />
              <div className="admin-topbar-dropdown">
                <div className="admin-topbar-dropdown-header">
                  <p className="user-name">{session?.user?.name}</p>
                  <p className="user-email">{session?.user?.email}</p>
                </div>
                <button
                  onClick={() => {
                    logout();
                    setUserOpen(false);
                  }}
                  className="admin-topbar-dropdown-item logout-item"
                >
                  <Icon.Logout /> Sign out
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

export default function AdminLayout({ children, page, setPage, stats }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  return (
    <div className="admin-layout">
      <Sidebar
        page={page}
        setPage={setPage}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        stats={stats}
      />
      <div className="admin-main-container">
        <TopBar
          page={page}
          onMenuClick={() => setSidebarOpen(true)}
          stats={stats}
          setPage={setPage}
        />
        <main className="admin-main-content">
          {children}
        </main>
      </div>
    </div>
  );
}
