'use client';

import React, { useEffect, useState } from 'react';
import { ProductsProvider, CustomerProvider, CartProvider, useProducts } from '../../lib/storeContext';
import { Header } from './Header';
import { Footer, WhatsappFab } from './Footer';
import { AuthModal } from './AuthModal';
import { QuickView, ProductCard } from './ShopPage';
import { IndustrialBanner } from './HeroSection';
import { Reveal, ProductGridSkeleton } from '../ui/index';

function CategoryContent({ category }) {
  const { products, productsLoaded } = useProducts();
  const categoryProducts = products.filter(p => p.cat === category.id);
  const [imgError, setImgError] = useState(false);

  // Since we are outside the main SPA (src/app/page.js), any navigation triggered 
  // by the Header or Footer via `ab:go-page` needs to be manually routed via a hard load.
  useEffect(() => {
    const handleUrlChange = () => {
      window.location.reload();
    };
    const handleGoPage = (e) => {
      const detail = typeof e.detail === 'string' ? { page: e.detail } : (e.detail || {});
      const url = detail.url || (detail.page === 'home' ? '/' : `/${detail.page}`);
      window.location.href = url;
    };
    window.addEventListener('ab:url-change', handleUrlChange);
    window.addEventListener('ab:go-page', handleGoPage);
    return () => {
      window.removeEventListener('ab:url-change', handleUrlChange);
      window.removeEventListener('ab:go-page', handleGoPage);
    };
  }, []);

  return (
    <div className="category-landing-wrapper" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Header />
      
      <main className="category-landing ab-page-enter" style={{ flex: 1, backgroundColor: '#ffffff' }}>
        {/* Hero Banner Section */}
        <div 
          className="category-landing__hero" 
          style={{
            background: `linear-gradient(135deg, ${category.accent || '#111'} 0%, #111 100%)`,
            padding: '8rem 2rem 5rem',
            color: 'white',
            textAlign: 'center',
            borderBottomLeftRadius: '32px',
            borderBottomRightRadius: '32px',
            marginBottom: '4rem',
            boxShadow: '0 10px 40px rgba(0,0,0,0.08)',
            position: 'relative',
            overflow: 'hidden'
          }}
        >
          {category.bannerImage && !imgError && (
            <>
              <img 
                src={category.bannerImage} 
                alt={`${category.name} banner`} 
                style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover', zIndex: 0 }}
                onError={() => setImgError(true)}
              />
              <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', background: 'linear-gradient(rgba(0,0,0,0.4), rgba(0,0,0,0.7))', zIndex: 1 }} />
            </>
          )}
          
          <div style={{ position: 'relative', zIndex: 2 }}>
            <Reveal>
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: '0.45rem',
                background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.3)',
                color: 'white', padding: '0.35rem 0.9rem', borderRadius: '100px',
                fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase',
                letterSpacing: '0.08em', marginBottom: '1.25rem'
              }}>
                Bulk supply &amp; quote-based orders
              </span>
            </Reveal>
            <Reveal>
              <h1 style={{ fontSize: '3.5rem', fontWeight: '800', marginBottom: '1.25rem', letterSpacing: '-0.02em' }}>
                {category.name}
              </h1>
            </Reveal>
            <Reveal delay={100}>
              <p style={{ fontSize: '1.15rem', maxWidth: '680px', margin: '0 auto', opacity: 0.95, lineHeight: 1.6, marginBottom: '2rem' }}>
                {category.description || category.blurb || `${category.name} for commercial, industrial and business use.`}
                {' '}Available for bulk supply and quote-based orders across South Africa.
              </p>
            </Reveal>
            <Reveal delay={150}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', justifyContent: 'center' }}>
                <a
                  href={`https://wa.me/27671014345?text=${encodeURIComponent(`Hello Amahle Blue Sales Team, I would like to request a quote for your ${category.name}. Please share bulk pricing and availability.`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
                    background: 'white', color: category.accent || '#111',
                    padding: '0.8rem 1.6rem', borderRadius: '100px',
                    fontWeight: 700, fontSize: '1rem', textDecoration: 'none',
                    boxShadow: '0 4px 15px rgba(0,0,0,0.15)'
                  }}
                >
                  Request a Quote
                </a>
                <a
                  href="/shop"
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
                    background: 'transparent', color: 'white',
                    padding: '0.8rem 1.6rem', borderRadius: '100px',
                    fontWeight: 700, fontSize: '1rem', textDecoration: 'none',
                    border: '1px solid rgba(255,255,255,0.5)'
                  }}
                >
                  View Product Range
                </a>
              </div>
            </Reveal>
          </div>
        </div>

        {/* Product Grid */}
        <div className="shop-page__container" style={{ paddingBottom: '6rem' }}>
          {!productsLoaded ? (
            <ProductGridSkeleton count={8} variant="grid" />
          ) : categoryProducts.length === 0 ? (
            <div className="shop-page__empty" style={{ textAlign: 'center', padding: '5rem 0' }}>
              <p className="shop-page__empty-title" style={{ fontSize: '1.5rem', fontWeight: 600, color: '#111' }}>No products found</p>
              <p className="shop-page__empty-sub" style={{ color: '#666', marginTop: '0.5rem' }}>Check back later for new arrivals in {category.name}.</p>
            </div>
          ) : (
            <div className="shop-page__grid">
              {categoryProducts.map((p, i) => (
                <Reveal key={p.id} delay={(i % 4) * 60}>
                  <ProductCard p={p} />
                </Reveal>
              ))}
            </div>
          )}
        </div>

        <IndustrialBanner
          eyebrow="Reliable Supply for Businesses"
          title={`Bulk ${category.name} for your business`}
          desc={`Speak to our sales team for wholesale pricing on ${category.name.toLowerCase()}. Quote-based supply for offices, schools, factories, hospitality and cleaning contractors across South Africa.`}
          quoteText={`Hello Amahle Blue Sales Team, I'd like bulk pricing for your ${category.name}.`}
        />
      </main>

      <Footer />
    </div>
  );
}

export default function CategoryLanding({ category }) {
  return (
    <ProductsProvider>
      <CustomerProvider>
        <CartProvider>
          <CategoryContent category={category} />
          <AuthModal />
          <QuickView />
          <WhatsappFab />
        </CartProvider>
      </CustomerProvider>
    </ProductsProvider>
  );
}
