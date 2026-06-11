'use client';

import React, { useState, useEffect, useReducer } from 'react';
import { ProductsProvider, CustomerProvider, CartProvider, useCustomer, useCart } from '../lib/storeContext';
import { Header } from '../components/store/Header';
import { Hero, TrustStrip, CategoryShowcase } from '../components/store/HeroSection';
import { Featured, BulkPromo, Shop, QuickView } from '../components/store/ShopPage';
import { CartPage, CheckoutPage, OrderConfirmedPage } from '../components/store/CartComponents';
import { AuthModal } from '../components/store/AuthModal';
import { WhyUs, Reviews, Newsletter } from '../components/store/ContentSections';
import { FaqPage, HomepageFaqSection } from '../components/store/FaqPage';
import { Footer, WhatsappFab } from '../components/store/Footer';
import AccountPage from '../components/store/AccountPage';



/* ── Toast ────────────────────────────────────────────────────────────────── */
function Toast() {
  const { toast } = useCart();
  if (!toast) return null;
  return (
    <div className="ab-fade-in" style={{
      position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
      zIndex: 100, background: '#0B2545', color: 'white', padding: '12px 24px',
      borderRadius: 12, fontSize: 14, fontWeight: 600, boxShadow: '0 8px 30px rgba(11,37,69,0.3)',
    }}>
      {toast}
    </div>
  );
}

/* ── Store Router ─────────────────────────────────────────────────────────── */
function StoreRouter() {
  const { page, setPage } = useCustomer();
  const [activeCat, setActiveCat] = useState("all");
  const [query, setQuery] = useState("");
  const [confirmedOrder, setConfirmedOrder] = useState(null);
  const [, forceUpdate] = useReducer(n => n + 1, 0);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const h = () => forceUpdate();
    window.addEventListener("ab:products-loaded", h);
    window.addEventListener("ab:categories-loaded", h);
    return () => {
      window.removeEventListener("ab:products-loaded", h);
      window.removeEventListener("ab:categories-loaded", h);
    };
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const h = (e) => { setPage(e.detail); window.scrollTo(0, 0); };
    window.addEventListener("ab:go-page", h);
    return () => window.removeEventListener("ab:go-page", h);
  }, [setPage]);

  const onNavCat = (cat, q) => {
    setPage("shop");
    if (cat) setActiveCat(cat);
    if (typeof q === "string") { setQuery(q); setActiveCat("all"); }
    if (typeof window !== 'undefined') window.scrollTo(0, 0);
  };
  const onShopCat = (cat, q) => { onNavCat(cat || "all", q); };

  const goHome = () => { setPage("home"); if (typeof window !== 'undefined') window.scrollTo(0, 0); };
  const goOrders = () => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent("ab:account-tab", { detail: "orders" }));
    }
    setPage("account");
    if (typeof window !== 'undefined') window.scrollTo(0, 0);
  };

  // Page-level rendering
  if (page === "cart") {
    return (
      <>
        <Header onNavCat={onNavCat} />
        <main className="ab-page-enter">
          <CartPage onGoHome={goHome} onCheckout={() => setPage('checkout')} />
        </main>
        <Toast />
      </>
    );
  }

  if (page === "checkout") {
    return (
      <>
        <Header onNavCat={onNavCat} />
        <main className="ab-page-enter">
          <CheckoutPage onBack={() => setPage('cart')} onSuccess={(o) => { setConfirmedOrder(o); setPage('order-confirmed'); }} />
        </main>
        <Toast />
      </>
    );
  }

  if (page === "order-confirmed") {
    return (
      <>
        <Header onNavCat={onNavCat} />
        <main className="ab-page-enter">
          <OrderConfirmedPage order={confirmedOrder} onGoHome={goHome} onGoOrders={goOrders} />
        </main>
        <Toast />
      </>
    );
  }

  if (page === "account") {
    return (
      <>
        <Header onNavCat={onNavCat} />
        <AccountPage onGoHome={goHome} />
        <Toast />
      </>
    );
  }

  if (page === "faq") {
    return (
      <>
        <Header onNavCat={onNavCat} />
        <FaqPage onGoHome={goHome} />
        <Toast />
      </>
    );
  }

  if (page === "shop") {
    return (
      <>
        <Header onNavCat={onNavCat} />
        <main className="ab-page-enter bg-white" style={{ paddingBottom: '5rem' }}>
          <Shop activeCat={activeCat} setActiveCat={setActiveCat} query={query} setQuery={setQuery} />
        </main>
        <Footer onShopCat={onShopCat} />
        <Toast />
        <QuickView />
        <WhatsappFab />
      </>
    );
  }

  // Default: Home
  return (
    <>
      <Header onNavCat={onNavCat} />
      <main className="ab-page-enter">
        <Hero onShopCat={onShopCat} />
        <TrustStrip />
        <CategoryShowcase onShopCat={onShopCat} />
        <Featured />
        <BulkPromo />
        <WhyUs />
        <Shop activeCat={activeCat} setActiveCat={setActiveCat} query={query} setQuery={setQuery} />
        <Reviews />
        <Newsletter />
        <HomepageFaqSection />
      </main>
      <Footer onShopCat={onShopCat} />
      <Toast />
      <QuickView />
      <WhatsappFab />
    </>
  );
}

/* ── Root Store App ───────────────────────────────────────────────────────── */
export default function StorePage() {
  return (
    <ProductsProvider>
      <CustomerProvider>
        <CartProvider>
          <StoreRouter />
          <AuthModal />
        </CartProvider>
      </CustomerProvider>
    </ProductsProvider>
  );
}
