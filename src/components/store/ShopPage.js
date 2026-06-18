'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useCart, useProducts, BRAND, DEFAULT_CATEGORIES, money, getPrimaryImg, getSecondImg, catOf } from '../../lib/storeContext';
import { formatZar } from '../../utils/currency';
import { buildWaUrl, showCart, showWhatsApp, productPurchaseMode } from '../../utils/whatsapp';
import {
  Heart, Eye, Sparkles, Plus, Check, Whatsapp, ArrowRight, X, ChevronDown, Search, ChevronLeft, ChevronRight, Cart, Minus, Tag
} from '../ui/Icons';
import { Reveal, Stars, BadgeChip, ProductGridSkeleton, ProductCardSkeleton } from '../ui/index';
import { ProductReviews } from './ProductReviews';
import { SwipeCarousel } from './SwipeCarousel';

/* ── B2B defaults for product detail (used when a product has no explicit data) ── */
const DEFAULT_SUITABLE_FOR = [
  "Offices", "Schools", "Cleaning Contractors", "Hospitality",
  "Industrial Facilities", "Retail Stores", "Warehouses",
];

/* ── Global QuickView Event Emitter ── */
export const openQuickView = (product) => {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent("ab:quickview", { detail: product }));
  }
};



export const ProductCard = ({ p }) => {
  const { add } = useCart();
  const { settings } = useProducts();
  const c = catOf(p.cat) || DEFAULT_CATEGORIES[0];

  const mode = productPurchaseMode(p);
  const cartEnabled = showCart(p);
  const waEnabled   = showWhatsApp(p);

  const hasVariants = p.variants && p.variants.length > 0;
  const outOfStock = p.outOfStock || (hasVariants ? p.variants.every(v => v.outOfStock || v.stock === 0) : p.stock === 0);
  const lowStock = !outOfStock && (hasVariants ? p.variants.some(v => v.stock > 0 && v.stock <= (p.lowStockThreshold || 10)) : p.stock > 0 && p.stock <= (p.lowStockThreshold || 10));

  const prices = hasVariants ? p.variants.map(v => v.price) : [p.price];
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const hasMultiplePrices = hasVariants && p.variants.length > 1 && minPrice !== maxPrice;
  const displayPrice = minPrice;
  const displaySize = hasVariants ? p.variants[0].name : p.size;
  const displayStock = hasVariants ? p.variants.reduce((acc, v) => acc + (v.stock || 0), 0) : p.stock;
  const contactForPrice = !cartEnabled || !displayPrice || displayPrice <= 0;

  const primaryImgUrl = getPrimaryImg(p);
  const secondImgUrl  = getSecondImg(p);

  const pid       = p.id;
  const legacyPid = p._id ? String(p._id) : null;

  const [wished,    setWished]    = useState(() => {
    try {
      const list = JSON.parse(localStorage.getItem('ab_wishlist') || '[]');
      return list.includes(pid) || (legacyPid && list.includes(legacyPid));
    } catch { return false; }
  });
  const [heartAnim, setHeartAnim] = useState(false);
  const [added,     setAdded]     = useState(false);

  function handleWish(e) {
    e.stopPropagation();
    setWished(v => {
      const next = !v;
      try {
        const list = JSON.parse(localStorage.getItem('ab_wishlist') || '[]');
        const cleaned = list.filter(id => id !== pid && id !== legacyPid);
        const updated = next ? [...cleaned, pid] : cleaned;
        localStorage.setItem('ab_wishlist', JSON.stringify(updated));
      } catch {}
      return next;
    });
    setHeartAnim(true);
    setTimeout(() => setHeartAnim(false), 600);
  }

  function handleAdd() {
    if (outOfStock || added) return;
    if (p.variants && p.variants.length > 1) {
      openQuickView(p);
    } else {
      const variant = p.variants && p.variants.length === 1 ? p.variants[0] : null;
      add(p, 1, variant ? variant.name : null);
      setAdded(true);
      setTimeout(() => setAdded(false), 1500);
    }
  }

  return (
    <div className="product-card group">
      <div className={`product-card__media ${outOfStock ? 'product-card__media--oos' : ''}`}>
        <button onClick={() => openQuickView(p)} className="product-card__link" aria-label={`Quick view ${p.name}`}>
          <img
            src={primaryImgUrl}
            alt={p.name}
            className="product-card__img-primary"
            loading="lazy"
            onError={e => { e.target.onerror = null; e.target.src = '/assets/products/placeholder.svg'; }}
          />
          {secondImgUrl && (
            <img
              src={secondImgUrl}
              alt=""
              aria-hidden="true"
              className="product-card__img-secondary"
              loading="lazy"
            />
          )}
        </button>
        {outOfStock && (
          <div className="product-card__oos-overlay">
            <span className="product-card__oos-badge">Out of Stock</span>
          </div>
        )}
        <div className="product-card__badges">
          {!outOfStock && <BadgeChip badge={p.badge} />}
          {!outOfStock && mode === 'quote' && <span className="product-card__quote-badge">Quote Only</span>}
        </div>
        <div className="product-card__actions">
          <button onClick={handleWish}
            className={`product-card__action-btn product-card__action-btn--wish ${wished ? 'active' : ''}`}
            aria-label={wished ? 'Remove from wishlist' : 'Add to wishlist'}>
            <Heart size={17} fill={wished ? 'currentColor' : 'none'}
              style={{ animation: heartAnim ? 'abheart .45s ease' : 'none' }} />
          </button>
          <button onClick={() => openQuickView(p)}
            className="product-card__action-btn product-card__action-btn--view"
            aria-label="Quick view">
            <Eye size={17} />
          </button>
        </div>
        <span className="product-card__size-badge">{hasVariants && p.variants.length > 1 ? `${p.variants.length} Sizes` : displaySize}</span>
      </div>

      <div className="product-card__body">
        <span className="product-card__cat" style={{ color: c.accent }}>{c.short}</span>
        <h3 className="product-card__title">
          <button onClick={() => openQuickView(p)}>{p.name}</button>
        </h3>
        <p className="product-card__sub">{p.sub}</p>
        {hasVariants && p.variants.length > 0 && (
          <p className="product-card__sizes">
            <Tag size={12} /> Pack sizes: {p.variants.map(v => v.name).join(' · ')}
          </p>
        )}
        <div className="product-card__rating">
          <Stars value={p.rating} size={13} />
          <span className="product-card__rating-val">{p.rating}</span>
          <span className="product-card__rating-count">({p.reviews})</span>
        </div>
        <div className="product-card__price-row">
          <div className="product-card__price-wrap">
            {contactForPrice ? (
              <span className="product-card__price product-card__price--contact">Quote on request</span>
            ) : hasMultiplePrices ? (
              <span className="product-card__price">{formatZar(minPrice)} – {formatZar(maxPrice)}</span>
            ) : (
              <>
                <span className="product-card__price">{formatZar(displayPrice)}</span>
                {p.was && p.was > displayPrice && (
                  <span className="product-card__price-was">{formatZar(p.was)}</span>
                )}
              </>
            )}
          </div>
          {lowStock && <span className="product-card__stock-low">{hasVariants && p.variants.length > 1 ? 'Limited stock' : `Only ${displayStock} left`}</span>}
        </div>
        <div className="product-card__btn-row" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {(waEnabled || contactForPrice) && (
            <a
              href={buildWaUrl(p, { settings })}
              target="_blank"
              rel="noopener noreferrer"
              className="product-card__btn product-card__btn--quote"
            >
              <Whatsapp size={16} /> Request a Quote
            </a>
          )}
          {cartEnabled && !contactForPrice && (
            <>
              <button onClick={handleAdd} disabled={outOfStock}
                className={`product-card__btn ${
                  outOfStock ? 'product-card__btn--oos' :
                  added      ? 'product-card__btn--added' :
                               'product-card__btn--add'
                }`}>
                {outOfStock ? 'Out of Stock' : added ? <><Check size={16} /> Added!</> : <><Plus size={16} /> Add to Order</>}
              </button>
              <a
                href={buildWaUrl(p, { settings })}
                target="_blank"
                rel="noopener noreferrer"
                className="product-card__btn product-card__btn--quote-ghost"
              >
                <Whatsapp size={15} /> Get bulk pricing
              </a>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export const Featured = () => {
  const { products, productsLoaded } = useProducts();

  const isShoppable = (p) => {
    if (!p) return false;
    if (p.status && p.status !== 'active') return false;
    if (p.outOfStock) return false;
    const variants = Array.isArray(p.variants) ? p.variants : [];
    const variantStock = variants.reduce((s, v) => s + (Number(v?.stock) || 0), 0);
    if (variants.length > 0) {
      const allVariantsOut = variants.every(v => v?.outOfStock || (Number(v?.stock) || 0) <= 0);
      if (allVariantsOut) return false;
      return true;
    }
    const stock = Number(p.stock);
    if (Number.isFinite(stock) && stock <= 0) return false;
    return true;
  };

  const reviewWeight = (p) => (Number(p?.reviews) || 0) * 10 + (Number(p?.rating) || 0);
  const isBestsellerBadge = (b) => typeof b === 'string' && b.trim().toLowerCase() === 'bestseller';

  const shoppable = (Array.isArray(products) ? products : []).filter(isShoppable);
  const bestseller = shoppable.filter((p) => isBestsellerBadge(p.badge));
  const byRating = shoppable
    .filter((p) => !bestseller.includes(p))
    .sort((a, b) => reviewWeight(b) - reviewWeight(a));

  const ordered = [...bestseller, ...byRating];
  const fallback = shoppable.filter((p) => !ordered.includes(p));
  let best = [...ordered, ...fallback].slice(0, 4);

  // Hide section only after fetch finished with no products. While loading,
  // keep the section visible and show skeleton cards instead of a blank gap.
  if (productsLoaded && best.length === 0) return null;

  const goShop = (e) => {
    e.preventDefault(); 
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('ab:go-page', { detail: 'shop' }));
      window.scrollTo(0, 0); 
    }
  };
  
  return (
    <section className="featured">
      <div className="featured__container">
        <div className="featured__header">
          <Reveal><span className="featured__label"><Sparkles size={14} /> Popular with businesses</span></Reveal>
          <Reveal delay={60}><h2 className="featured__title">Top-selling supplies</h2></Reveal>
        </div>
        {!productsLoaded ? (
          <ProductGridSkeleton count={4} variant="carousel" />
        ) : (
          <SwipeCarousel
            className="featured__carousel swipe-carousel--products"
            label="Best seller products"
            previousLabel="Previous products"
            nextLabel="Next products"
            hint="Swipe to explore more"
          >
            {best.map((p, i) => <Reveal key={p.id} delay={(i % 4) * 70}><ProductCard p={p} /></Reveal>)}
          </SwipeCarousel>
        )}
        <div className="featured__footer">
          <button onClick={goShop} className="featured__btn-all">View All Products</button>
        </div>
      </div>
    </section>
  );
};

export const BulkPromo = () => {
  return (
    <section className="bulk-promo">
      <Reveal>
        <div className="bulk-promo__card">
          <div className="bulk-promo__glow" />
          <div className="bulk-promo__pattern" />
          <div className="bulk-promo__content">
            <div>
              <span className="bulk-promo__label"><Tag size={14} /> Wholesale &amp; bulk supply</span>
              <h2 className="bulk-promo__title">Ordering for a business?</h2>
              <p className="bulk-promo__desc">Get wholesale pricing on bulk cleaning supplies for offices, schools, factories, hospitality, facilities and cleaning contractors. Submit a business enquiry and our sales team will send a quote.</p>
            </div>
            <div className="bulk-promo__actions">
              <a href={`${BRAND.wa}?text=${encodeURIComponent("Hello Amahle Blue Sales Team, I would like to request bulk/wholesale pricing for my business. Please send a quote.")}`} target="_blank" rel="noopener noreferrer" className="bulk-promo__btn-primary">
                <Whatsapp size={18} /> Request a Quote
              </a>
              <a href="/#contact" onClick={(e) => {
                e.preventDefault();
                if (typeof window === 'undefined') return;
                window.dispatchEvent(new CustomEvent('ab:go-page', { detail: { page: 'home', url: '/#contact' } }));
                let attempts = 0;
                const tryScroll = () => {
                  const el = document.getElementById('contact');
                  if (el) {
                    window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 110, behavior: 'smooth' });
                    return;
                  }
                  attempts += 1;
                  if (attempts < 10) setTimeout(tryScroll, 80);
                };
                setTimeout(tryScroll, 50);
              }} className="bulk-promo__btn-secondary">
                Contact sales <ArrowRight size={17} />
              </a>
            </div>
          </div>
        </div>
      </Reveal>
    </section>
  );
};

const SORTS = [
  { id: "featured", label: "Featured" },
  { id: "price-asc", label: "Price: Low to High" },
  { id: "price-desc", label: "Price: High to Low" },
  { id: "rating", label: "Top Rated" },
];

export const Shop = ({ activeCat, setActiveCat, query, setQuery, carousel = false }) => {
  const { products, productsLoaded, categories = DEFAULT_CATEGORIES } = useProducts();
  const [sort, setSort] = useState("featured");
  const [visibleCount, setVisibleCount] = useState(8);
  const tabs = [{ id: "all", short: "All Products" }, ...categories];

  useEffect(() => {
    setVisibleCount(8);
  }, [activeCat, query, sort]);

  let list = products.filter((p) => (activeCat === "all" || !activeCat ? true : p.cat === activeCat));
  if (query && query.trim()) {
    const q = query.toLowerCase();
    list = list.filter((p) => (p.name + " " + p.sub + " " + p.desc + " " + (catOf(p.cat)?.name || "")).toLowerCase().includes(q));
  }
  list = [...list];
  if (sort === "price-asc") list.sort((a, b) => a.price - b.price);
  else if (sort === "price-desc") list.sort((a, b) => b.price - a.price);
  else if (sort === "rating") list.sort((a, b) => b.rating - a.rating);

  return (
    <section id="shop" className="shop-page">
      <div className="shop-page__container">
        <div className="shop-page__header">
          <Reveal><span className="shop-page__label">Product catalogue</span></Reveal>
          <Reveal delay={60}><h2 className="shop-page__title">Browse our full product range</h2></Reveal>
        </div>

        <div className="shop-page__controls">
          <div className="shop-page__tabs">
            {tabs.map((t) => (
              <button key={t.id} onClick={() => setActiveCat(t.id)} className={`shop-page__tab-btn ${
                (activeCat || "all") === t.id ? "shop-page__tab-btn--active" : "shop-page__tab-btn--inactive"
              }`}>
                {t.short}
              </button>
            ))}
          </div>
          <div className="shop-page__filters">
            {query && query.trim() && (
              <span className="shop-page__query-tag">
                "{query}" <button onClick={() => setQuery("")}><X size={14} /></button>
              </span>
            )}
            <div className="shop-page__sort-wrap">
              <select value={sort} onChange={(e) => setSort(e.target.value)} className="shop-page__sort-select">
                {SORTS.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
              </select>
              <ChevronDown size={16} className="shop-page__sort-icon" />
            </div>
          </div>
        </div>

        {!productsLoaded ? (
          <ProductGridSkeleton count={carousel ? 4 : 8} variant={carousel ? "carousel" : "grid"} />
        ) : list.length === 0 ? (
          <div className="shop-page__empty">
            <span className="shop-page__empty-icon"><Search size={28} /></span>
            <p className="shop-page__empty-title">No products found</p>
            <p className="shop-page__empty-sub">Try a different category or clear your search.</p>
            <button onClick={() => { setActiveCat("all"); setQuery(""); }} className="shop-page__empty-reset">Reset filters</button>
          </div>
        ) : carousel ? (
          <SwipeCarousel
            className="shop-page__carousel swipe-carousel--products"
            label="Shop all products"
            previousLabel="Previous products"
            nextLabel="Next products"
            hint="Swipe to explore more"
          >
            {list.map((p, i) => <Reveal key={p.id} delay={(i % 4) * 60}><ProductCard p={p} /></Reveal>)}
          </SwipeCarousel>
        ) : (
          <div className="shop-page__grid">
            {list.slice(0, visibleCount).map((p, i) => <Reveal key={p.id} delay={(i % 4) * 60}><ProductCard p={p} /></Reveal>)}
          </div>
        )}
        {carousel ? (
          list.length > 0 && (
            <div className="shop-page__load-more-wrap">
              <button
                onClick={() => {
                  if (typeof window !== 'undefined') {
                    window.dispatchEvent(new CustomEvent('ab:go-page', { detail: 'shop' }));
                    window.scrollTo(0, 0);
                  }
                }}
                className="shop-page__load-more-btn shop-page__view-all-btn"
              >
                View All Products
              </button>
            </div>
          )
        ) : list.length > visibleCount && (
          <div className="shop-page__load-more-wrap">
            <button onClick={() => setVisibleCount(v => v + 8)} className="shop-page__load-more-btn">
              Load More
            </button>
          </div>
        )}
      </div>
    </section>
  );
};

export const QuickView = () => {
  const { add, setOpen } = useCart();
  const { settings } = useProducts();
  const [product,      setProduct]      = useState(null);
  const [selectedVarName, setSelectedVarName] = useState(null);
  const [mediaIdx,     setMediaIdx]     = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isZoomed,     setIsZoomed]     = useState(false);
  const [zoomPos,      setZoomPos]      = useState({ x: 50, y: 50 });
  const [qty,          setQty]          = useState(1);
  const touchStartX = useRef(null);
  const videoRef    = useRef(null);

  const media = useMemo(() => {
    if (!product) return [];
    if (product.media && product.media.length > 0) return product.media;
    if (product.img) return [{ id: 'single', type: 'image', url: product.img, isPrimary: true, altText: product.name }];
    return [];
  }, [product]);

  const currentMedia = media[mediaIdx] || null;

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const h = (e) => {
      const p = e.detail;
      setProduct(p);
      setQty(1);
      setIsFullscreen(false);
      setIsZoomed(false);
      
      if (p && p.variants && p.variants.length > 0) {
        setSelectedVarName(p.variants[0].name);
      } else {
        setSelectedVarName(null);
      }

      if (p && p.media && p.media.length > 0) {
        const pi = p.media.findIndex(m => m.isPrimary);
        setMediaIdx(Math.max(0, pi));
      } else {
        setMediaIdx(0);
      }
    };
    window.addEventListener("ab:quickview", h);
    return () => window.removeEventListener("ab:quickview", h);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    document.body.style.overflow = product ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [product]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const k = (e) => {
      if (!product) return;
      if (e.key === "Escape") { if (isFullscreen) setIsFullscreen(false); else setProduct(null); }
      if (e.key === "ArrowLeft")  goPrev();
      if (e.key === "ArrowRight") goNext();
    };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [product, isFullscreen, mediaIdx, media.length]);

  function goTo(idx) {
    if (videoRef.current) videoRef.current.pause();
    setMediaIdx(Math.max(0, Math.min(media.length - 1, idx)));
    setIsZoomed(false);
  }
  function goPrev() { goTo(mediaIdx > 0 ? mediaIdx - 1 : media.length - 1); }
  function goNext() { goTo(mediaIdx < media.length - 1 ? mediaIdx + 1 : 0); }

  const handleTouchStart = (e) => { touchStartX.current = e.touches[0].clientX; };
  const handleTouchEnd   = (e) => {
    if (touchStartX.current === null) return;
    const diff = touchStartX.current - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 40) diff > 0 ? goNext() : goPrev();
    touchStartX.current = null;
  };

  function handleMouseMove(e) {
    const rect = e.currentTarget.getBoundingClientRect();
    setZoomPos({
      x: Math.round(((e.clientX - rect.left) / rect.width)  * 100),
      y: Math.round(((e.clientY - rect.top)  / rect.height) * 100),
    });
  }

  const c = product ? catOf(product.cat) : null;

  return (
    <div className={`quickview-overlay ${product ? '' : 'quickview-overlay--hidden'}`}>
      <div
        onClick={() => setProduct(null)}
        className="quickview-backdrop"
        style={{ opacity: product ? 1 : 0 }}
      />

      <div
        className="quickview-modal"
        style={{ opacity: product ? 1 : 0, transform: product ? "scale(1) translateY(0)" : "scale(.95) translateY(14px)" }}
      >
        {product && (
          <div className="quickview-grid">
            <button onClick={() => setProduct(null)} className="quickview-close" aria-label="Close">
              <X size={20} />
            </button>

            {/* LEFT: Gallery viewer */}
            <div className="quickview-gallery">
              <div
                className="quickview-viewer"
                onTouchStart={handleTouchStart}
                onTouchEnd={handleTouchEnd}
              >
                {currentMedia && currentMedia.type === 'video' ? (
                  <video
                    ref={videoRef}
                    src={currentMedia.url}
                    controls
                    playsInline
                    preload="metadata"
                    className="quickview-img"
                    aria-label={`Video: ${product.name}`}
                  />
                ) : (
                  <div
                    className="quickview-img-wrap"
                    style={{ cursor: isZoomed ? 'zoom-out' : 'zoom-in' }}
                    onMouseMove={handleMouseMove}
                    onMouseLeave={() => setIsZoomed(false)}
                    onClick={() => setIsZoomed(z => !z)}
                    role="button"
                    aria-label={isZoomed ? 'Click to zoom out' : 'Click to zoom in'}
                    tabIndex={0}
                    onKeyDown={e => e.key === 'Enter' && setIsZoomed(z => !z)}
                  >
                    <img
                      src={currentMedia ? currentMedia.url : '/assets/products/placeholder.svg'}
                      alt={currentMedia?.altText || product.name}
                      className="quickview-img"
                      style={{
                        transform:       isZoomed ? 'scale(2.2)' : 'scale(1)',
                        transformOrigin: `${zoomPos.x}% ${zoomPos.y}%`,
                      }}
                      onError={e => { e.target.onerror = null; e.target.src = '/assets/products/placeholder.svg'; }}
                    />
                  </div>
                )}

                <div className="quickview-badge-overlay">
                  <BadgeChip badge={product.badge} />
                </div>

                {media.length > 1 && (
                  <>
                    <button onClick={goPrev} className="quickview-nav-btn quickview-nav-btn--prev" aria-label="Previous media">
                      <ChevronLeft size={16} />
                    </button>
                    <button onClick={goNext} className="quickview-nav-btn quickview-nav-btn--next" aria-label="Next media">
                      <ChevronRight size={16} />
                    </button>
                  </>
                )}

                <div className="quickview-media-controls">
                  {media.length > 1 && (
                    <span className="quickview-media-counter">{mediaIdx + 1}/{media.length}</span>
                  )}
                  {currentMedia && currentMedia.type === 'image' && (
                    <button
                      onClick={() => setIsFullscreen(true)}
                      className="quickview-fullscreen-btn"
                      title="Fullscreen"
                      aria-label="View fullscreen"
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/></svg>
                    </button>
                  )}
                </div>
              </div>

              {media.length > 1 && (
                <div className="quickview-thumbs" role="list" aria-label="Media thumbnails">
                  {media.map((m, i) => (
                    <button
                      key={m.id || i}
                      onClick={() => goTo(i)}
                      role="listitem"
                      aria-label={`${m.type === 'video' ? 'Video' : 'Image'} ${i + 1}`}
                      aria-pressed={i === mediaIdx}
                      className="quickview-thumb-btn"
                      style={{
                        border: i === mediaIdx ? '2px solid #264CFF' : '2px solid transparent',
                        opacity: i === mediaIdx ? 1 : 0.6,
                      }}
                    >
                      {m.type === 'video' ? (
                        <div className="quickview-video-thumb">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="white"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                          <span className="quickview-video-thumb__marker">▶</span>
                        </div>
                      ) : (
                        <img
                          src={m.url}
                          alt={`${product.name} ${i + 1}`}
                          loading="lazy"
                          onError={e => { e.target.onerror = null; e.target.src = '/assets/products/placeholder.svg'; }}
                        />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* RIGHT: Product details */}
            <div className="quickview-details">
              <span className="quickview-cat" style={{ color: c?.accent }}>{c?.name}</span>
              <h3 className="quickview-title">{product.name}</h3>
              <div className="quickview-rating-row">
                <Stars value={product.rating} size={15} />
                <span className="quickview-rating-row__val">{product.rating}</span>
                <span className="quickview-rating-row__count">· {product.reviews} reviews</span>
              </div>
              <p className="quickview-desc">{product.desc}</p>
              <ul className="quickview-benefits">
                {(product.benefits || []).slice(0, 4).map((b) => (
                  <li key={b}>
                    <Check size={16} /> {b}
                  </li>
                ))}
              </ul>

              {/* B2B: Suitable for usage areas */}
              <div className="quickview-suitable">
                <span className="quickview-suitable__label"><Tag size={14} /> Suitable for</span>
                <div className="quickview-suitable__tags">
                  {((product.suitableFor && product.suitableFor.length) ? product.suitableFor : DEFAULT_SUITABLE_FOR).map((t) => (
                    <span key={t} className="quickview-suitable__tag">{t}</span>
                  ))}
                </div>
              </div>

              {/* B2B: Bulk supply banner */}
              <div className="quickview-bulk">
                <div className="quickview-bulk__text">
                  <strong>Bulk supply available</strong>
                  <span>5L, 20L &amp; wholesale volumes — request quote-based pricing for your business.</span>
                </div>
                <a
                  href={buildWaUrl(product, { settings })}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="quickview-bulk__btn"
                >
                  <Whatsapp size={16} /> Request a Quote
                </a>
              </div>

              {product.variants && product.variants.length > 0 && (
                <div className="quickview-variants">
                  <span className="quickview-variants-label">Select Size</span>
                  <div className="quickview-variants-grid">
                    {product.variants.map((v) => {
                      const isSelected = selectedVarName === v.name;
                      const isOOS = !!product.outOfStock || !!v.outOfStock || v.stock === 0;
                      return (
                        <button
                          key={v.name}
                          onClick={() => { setSelectedVarName(v.name); setQty(1); }}
                          className={`quickview-var-btn ${
                            isSelected ? 'quickview-var-btn--active' : 
                            isOOS ? 'quickview-var-btn--oos' : 
                            'quickview-var-btn--inactive'
                          }`}
                        >
                          {v.name} {isOOS && '(OOS)'}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {(() => {
                const selectedVariant = product.variants?.find((v) => v.name === selectedVarName) || null;
                const activePrice = selectedVariant ? selectedVariant.price : (product.price || 0);
                const activeWas = selectedVariant ? null : (product.was || null);
                const activeSize = selectedVariant ? selectedVariant.name : (product.size || '');
                const activeStock = selectedVariant ? selectedVariant.stock : (product.stock || 0);
                const activeOutOfStock = !!product.outOfStock || (selectedVariant ? !!selectedVariant.outOfStock || selectedVariant.stock === 0 : product.stock === 0);
                const activeLowStock = !activeOutOfStock && activeStock > 0 && activeStock <= (product.lowStockThreshold || 10);
                const activeMaxQty = activeStock;
                const cartEnabled = showCart(product);
                const waEnabled   = showWhatsApp(product);
                const contactForPrice = !cartEnabled || !activePrice || activePrice <= 0;

                return (
                  <React.Fragment>
                    <div className="quickview-price-section">
                      <div className="quickview-price-wrap">
                        {contactForPrice ? (
                          <span className="quickview-price quickview-price--contact">Quote on request</span>
                        ) : (
                          <>
                            <span className="quickview-price">{formatZar(activePrice)}</span>
                            {activeWas && activeWas > activePrice && (
                              <span className="quickview-price-was">{formatZar(activeWas)}</span>
                            )}
                          </>
                        )}
                      </div>
                      <div className="quickview-stock-info">
                        <span className="quickview-stock-status">
                          Available: {activeOutOfStock ? <span className="quickview-stock-status__oos">Out of stock</span> : <span className="quickview-stock-status__ok">{activeStock} units</span>}
                        </span>
                        {activeLowStock && <p className="quickview-low-stock-note">Only {activeStock} left — order soon!</p>}
                      </div>
                    </div>

                    <div className="quickview-add-section" style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                      {cartEnabled && !contactForPrice && !activeOutOfStock && (
                        <div className="quickview-qty-control">
                          <button onClick={() => setQty((q) => Math.max(1, q - 1))} className="quickview-qty-btn"><Minus size={16} /></button>
                          <span className="quickview-qty-val">{qty}</span>
                          <button onClick={() => setQty((q) => Math.min(activeMaxQty, q + 1))} className="quickview-qty-btn"><Plus size={16} /></button>
                        </div>
                      )}
                      {cartEnabled && !contactForPrice && (
                        <button
                          disabled={activeOutOfStock}
                          onClick={() => { if (!activeOutOfStock) { add(product, qty, selectedVarName); setProduct(null); setTimeout(() => setOpen(true), 150); } }}
                          className={`quickview-add-btn ${activeOutOfStock ? 'quickview-add-btn--oos' : 'quickview-add-btn--active'}`}
                        >
                          {activeOutOfStock ? 'Out of Stock' : <><Cart size={18} /> Add to Order</>}
                        </button>
                      )}
                      {waEnabled && (
                        <a
                          href={buildWaUrl(product, { variant: selectedVariant, settings })}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="quickview-add-btn quickview-add-btn--quote"
                        >
                          <Whatsapp size={18} /> Request a Quote on WhatsApp
                        </a>
                      )}
                    </div>
                  </React.Fragment>
                );
              })()}

              <ProductReviews productId={product.id} />
            </div>
          </div>
        )}
      </div>

      {isFullscreen && product && currentMedia && (
        <div className="quickview-fullscreen" onClick={() => setIsFullscreen(false)}>
          <button
            onClick={() => setIsFullscreen(false)}
            className="quickview-fullscreen__btn quickview-fullscreen__btn--close"
            aria-label="Close fullscreen"
          >
            <X size={20} />
          </button>
          {media.length > 1 && (
            <>
              <button
                onClick={e => { e.stopPropagation(); goPrev(); }}
                className="quickview-fullscreen__btn quickview-fullscreen__btn--prev"
                aria-label="Previous"
              >
                <ChevronLeft size={20} />
              </button>
              <button
                onClick={e => { e.stopPropagation(); goNext(); }}
                className="quickview-fullscreen__btn quickview-fullscreen__btn--next"
                aria-label="Next"
              >
                <ChevronRight size={20} />
              </button>
            </>
          )}
          <div className="quickview-fullscreen__stage" onClick={e => e.stopPropagation()}>
            <img
              src={currentMedia.url}
              alt={product.name}
              onError={e => { e.target.onerror = null; e.target.src = '/assets/products/placeholder.svg'; }}
            />
          </div>
          <p className="quickview-fullscreen__counter">{mediaIdx + 1} / {media.length}</p>
        </div>
      )}
    </div>
  );
};
