'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useCart, useCustomer, BRAND, FREE_SHIP, money } from '../../lib/storeContext';
import { 
  Truck, Award, Tag, Phone, Menu, Search, User, 
  ChevronDown, Package, LogOut, Cart, X, ChevronRight 
} from '../ui/Icons';

export const Wordmark = ({ className = "", light = false, compact = false, onClick }) => {
  const { setPage } = useCustomer() || {};

  const handleClick = (e) => {
    if (onClick) {
      onClick(e);
    } else {
      e.preventDefault();
      if (setPage) setPage('home');
      if (typeof window !== 'undefined') {
        window.scrollTo(0, 0);
        window.dispatchEvent(new CustomEvent('ab:go-page', { detail: 'home' }));
      }
    }
  };

  return (
    <a href="#home" onClick={handleClick} className={`wordmark ${className}`} aria-label="Amahle Blue home">
      <img
        src="/assets/amahle-blue-logo.jpg"
        alt="Amahle Blue"
        style={{
          height: compact ? 36 : 48,
          width: 'auto',
          objectFit: 'contain',
          ...(light && { background: 'rgba(255,255,255,0.92)', borderRadius: 8, padding: '4px 10px' }),
        }}
      />
    </a>
  );
};

const ANNOUNCEMENTS = [
  { icon: Truck, text: `Free delivery in Gauteng on orders over ${money(FREE_SHIP)}` },
  { icon: Award, text: "Proudly manufactured in South Africa 🇿🇦" },
  { icon: Tag, text: "Bulk & trade pricing available — ask about wholesale" },
];

export const AnnouncementBar = () => {
  const [i, setI] = useState(0);
  const { setPage } = useCustomer() || {};

  useEffect(() => {
    const t = setInterval(() => setI((v) => (v + 1) % ANNOUNCEMENTS.length), 4000);
    return () => clearInterval(t);
  }, []);

  const A = ANNOUNCEMENTS[i];

  const goOrders = () => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('ab:account-tab', { detail: 'orders' }));
      if (setPage) setPage('account');
      window.scrollTo(0, 0);
    }
  };

  return (
    <div className="announcement-bar">
      <div className="announcement-bar__container">
        <div className="announcement-bar__left">
          <Phone size={13} />
          <a href={`tel:${BRAND.phoneRaw}`} className="announcement-bar__phone-link">{BRAND.phone}</a>
        </div>
        <div className="announcement-bar__center">
          <A.icon size={14} className="announcement-bar__center-icon" />
          <span key={i} className="announcement-bar__center-text">{A.text}</span>
        </div>
        <div className="announcement-bar__right">
          <button onClick={goOrders} className="announcement-bar__link">My Orders</button>
          <span className="announcement-bar__divider">|</span>
          <a href="/#contact" className="announcement-bar__link">Help</a>
        </div>
      </div>
    </div>
  );
};

export function AccountMenu({ customer, onAccount, onOrders, onLogout }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function handler(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const displayName = customer?.name || customer?.email?.split('@')[0] || 'Account';

  return (
    <div className="account-menu" ref={ref}>
      <button onClick={() => setOpen(v => !v)} className="account-menu__trigger">
        <User size={16} className="account-menu__trigger-icon" />
        <span className="account-menu__trigger-text">{displayName}</span>
        <ChevronDown size={14} className={`account-menu__trigger-arrow ${open ? 'account-menu__trigger-arrow--open' : ''}`} />
      </button>
      {open && (
        <div className="account-menu__dropdown">
          <div className="account-menu__header">
            <p className="account-menu__email">{customer?.email}</p>
          </div>
          <button onClick={() => { setOpen(false); onAccount(); }} className="account-menu__item">
            <User size={15} className="account-menu__item-icon" /> My Profile
          </button>
          <button onClick={() => { setOpen(false); onOrders(); }} className="account-menu__item">
            <Package size={15} className="account-menu__item-icon" /> My Orders
          </button>
          <div className="account-menu__divider-line">
            <button onClick={() => { setOpen(false); onLogout(); }} className="account-menu__item account-menu__item--danger">
              <LogOut size={15} /> Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

const NAV = [
  { label: "Home", href: "/", page: "home" },
  { label: "Shop", href: "/shop", page: "shop" },
  { label: "Household", href: "/shop?category=household", cat: "household", page: "shop" },
  { label: "Car Care", href: "/shop?category=car", cat: "car", page: "shop" },
  { label: "Sanitisers", href: "/shop?category=sanitiser", cat: "sanitiser", page: "shop" },
  { label: "About", href: "/#about", page: "home", section: "about" },
  { label: "Contact", href: "/#contact", page: "home", section: "contact" },
];

export const Header = ({ onNavCat, activeCat = "all" }) => {
  const { count, setOpen } = useCart();
  const { customer, isLoggedIn, openAuth, authOpen, logout, page, setPage } = useCustomer();
  const [scrolled, setScrolled] = useState(false);
  const [menu, setMenu] = useState(false);
  const [q, setQ] = useState("");
  const [activeSection, setActiveSection] = useState("");

  useEffect(() => {
    const f = () => setScrolled(window.scrollY > 8);
    f();
    window.addEventListener("scroll", f, { passive: true });
    return () => window.removeEventListener("scroll", f);
  }, []);

  useEffect(() => {
    document.body.style.overflow = menu ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [menu]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const update = () => setActiveSection(window.location.hash.replace('#', ''));
    update();
    window.addEventListener('hashchange', update);
    window.addEventListener('popstate', update);
    window.addEventListener('ab:url-change', update);
    return () => {
      window.removeEventListener('hashchange', update);
      window.removeEventListener('popstate', update);
      window.removeEventListener('ab:url-change', update);
    };
  }, []);

  const scrollToSection = (section) => {
    setTimeout(() => {
      const el = document.getElementById(section);
      if (el) {
        window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 110, behavior: "smooth" });
      } else {
        window.scrollTo(0, 0);
      }
    }, 50);
  };

  const go = (e, item) => {
    e.preventDefault();
    setMenu(false);

    if (item.cat && onNavCat) {
      onNavCat(item.cat);
    } else if (item.section) {
      setActiveSection(item.section);
      setPage('home', { url: `/#${item.section}` });
      scrollToSection(item.section);
    } else if (item.page === 'shop' && onNavCat) {
      onNavCat("all");
    } else {
      setActiveSection("");
      setPage(item.page || 'home', { url: item.href || '/' });
      window.scrollTo(0, 0);
    }
  };

  const goAccount = () => { setPage('account'); setMenu(false); setActiveSection(""); window.scrollTo(0, 0); };
  const goOrders = () => {
    window.dispatchEvent(new CustomEvent('ab:account-tab', { detail: 'orders' }));
    setPage('account');
    setMenu(false);
    setActiveSection("");
    window.scrollTo(0, 0);
  };

  const goHome = (e) => {
    e.preventDefault();
    setMenu(false);
    setActiveSection("");
    setPage('home', { url: '/' });
    window.scrollTo(0, 0);
  };

  const goContact = (e) => {
    e.preventDefault();
    setActiveSection("contact");
    setPage('home', { url: '/#contact' });
    scrollToSection("contact");
  };

  const isNavActive = (n) => {
    if (n.cat) return page === 'shop' && activeCat === n.cat;
    if (n.section) return page === 'home' && activeSection === n.section;
    if (n.page === 'shop') return page === 'shop' && (activeCat === 'all' || !activeCat);
    return n.page === page && !activeSection;
  };

  return (
    <div id="top" className="header-wrapper">
      <AnnouncementBar />
      <header className={`header ${scrolled ? 'header--scrolled' : ''}`}>
        <div className={`header__main ${scrolled ? 'header__main--scrolled' : ''}`}>
          <button onClick={() => setMenu(true)} className="header__mobile-toggle" aria-label="Open menu">
            <Menu size={22} />
          </button>
          
          <Wordmark onClick={goHome} className="header__logo" />

          {/* search */}
          <form onSubmit={(e) => { e.preventDefault(); if (onNavCat) onNavCat(null, q); }} className="header__search-form">
            <Search size={18} className="header__search-icon" />
            <input 
              value={q} 
              onChange={(e) => setQ(e.target.value)} 
              placeholder="Search cleaning products, car care, sanitisers…"
              className="header__search-input" 
            />
          </form>

          <div className="header__actions">
            {isLoggedIn ? (
              <AccountMenu customer={customer} onAccount={goAccount} onOrders={goOrders} onLogout={logout} />
            ) : (
              <button onClick={openAuth} className={`header__signin-btn ${authOpen ? 'header__signin-btn--active' : ''}`}>
                <User size={16} className="header__signin-icon" /> Sign in
              </button>
            )}
            
            <button onClick={() => { setActiveSection(""); setPage('cart'); }} className={`header__cart-btn ${page === 'cart' ? 'header__cart-btn--active' : ''}`} aria-label="Open cart" aria-current={page === 'cart' ? 'page' : undefined}>
              <Cart size={20} />
              {count > 0 && (
                <span key={count} className="header__cart-count">
                  {count}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* category nav */}
        <nav className="header__nav">
          {NAV.map((n) => {
            const isActive = isNavActive(n);
            return (
              <a key={n.label} href={n.href} onClick={(e) => go(e, n)} aria-current={isActive ? 'page' : undefined} className={`header__nav-link ${isActive ? 'header__nav-link--active' : ''}`}>
                {n.label}
                <span className={`header__nav-underline ${isActive ? 'header__nav-underline--active' : ''}`} />
              </a>
            );
          })}
          <span className="header__nav-info">
            <Truck size={16} /> Fast nationwide delivery
          </span>
        </nav>
      </header>

      {/* Mobile menu */}
      <div className={`mobile-menu-wrapper ${menu ? 'mobile-menu-wrapper--open' : ''}`}>
        <div onClick={() => setMenu(false)} className="mobile-menu-backdrop" />
        <div className="mobile-menu-panel">
          <div className="mobile-menu-header">
            <Wordmark onClick={goHome} />
            <button onClick={() => setMenu(false)} className="mobile-menu-close">
              <X size={22} />
            </button>
          </div>
          <div className="mobile-menu-body">
            <form onSubmit={(e) => { e.preventDefault(); setMenu(false); if (onNavCat) onNavCat(null, q); }} className="mobile-menu-search-form">
              <Search size={18} className="mobile-menu-search-icon" />
              <input 
                value={q} 
                onChange={(e) => setQ(e.target.value)} 
                placeholder="Search products…"
                className="mobile-menu-search-input" 
              />
            </form>
            <nav className="mobile-menu-nav">
              {NAV.map((n) => {
                const isActive = isNavActive(n);
                return (
                  <a key={n.label} href={n.href} onClick={(e) => go(e, n)} aria-current={isActive ? 'page' : undefined} className={`mobile-menu-nav-link ${isActive ? 'mobile-menu-nav-link--active' : ''}`}>
                    {n.label} 
                    <ChevronRight size={18} className="mobile-menu-nav-arrow" />
                  </a>
                );
              })}
              <div className="mobile-menu-auth">
                {isLoggedIn ? (
                  <div className="mobile-menu-auth-items">
                    <button onClick={goAccount} className="mobile-menu-auth-btn">
                      <User size={16} /> My Account
                    </button>
                    <button onClick={goOrders} className="mobile-menu-auth-btn">
                      <Package size={16} /> My Orders
                    </button>
                    <button onClick={() => { logout(); setMenu(false); }} className="mobile-menu-auth-btn mobile-menu-auth-btn--danger">
                      <LogOut size={16} /> Sign out
                    </button>
                  </div>
                ) : (
                  <button onClick={() => { setMenu(false); openAuth(); }} className={`mobile-menu-auth-btn ${authOpen ? 'mobile-menu-auth-btn--active' : ''}`}>
                    <User size={16} /> Sign in / Create account
                  </button>
                )}
              </div>
            </nav>
            <a href={`tel:${BRAND.phoneRaw}`} className="mobile-menu-phone">
              <Phone size={16} /> {BRAND.phone}
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Header;
