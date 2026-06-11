'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useCart, useProducts, BRAND, DEFAULT_CATEGORIES, money, getPrimaryImg, getSecondImg, catOf } from '../../lib/storeContext';
import { 
  Heart, Eye, Sparkles, Plus, Check, Whatsapp, ArrowRight, X, ChevronDown, Search, ChevronLeft, Cart, Minus, Tag
} from '../ui/Icons';
import { Reveal } from '../ui/index';

/* ── Global QuickView Event Emitter ── */
export const openQuickView = (product) => {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent("ab:quickview", { detail: product }));
  }
};

const BadgeChip = ({ badge }) => {
  if (!badge) return null;
  const map = {
    "Bestseller": "badge-chip--bestseller",
    "New": "badge-chip--new",
    "High Purity": "badge-chip--high-purity",
  };
  return <span className={`badge-chip ${map[badge] || "badge-chip--default"}`}>{badge}</span>;
};

function Stars({ value, size = 16 }) {
  return (
    <div className="product-card__rating-stars" style={{ display: 'flex', gap: '2px' }}>
      {[1,2,3,4,5].map(i => (
        <svg key={i} width={size} height={size} viewBox="0 0 24 24" fill={i <= value ? "#f59e0b" : "none"} stroke={i <= value ? "#f59e0b" : "#cbd5e1"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
        </svg>
      ))}
    </div>
  );
}

export const ProductCard = ({ p }) => {
  const { add } = useCart();
  const c = catOf(p.cat) || DEFAULT_CATEGORIES[0];
  
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
  const contactForPrice = !displayPrice || displayPrice <= 0;

  const primaryImgUrl = getPrimaryImg(p);
  const secondImgUrl  = getSecondImg(p);

  const [wished,    setWished]    = useState(false);
  const [heartAnim, setHeartAnim] = useState(false);
  const [added,     setAdded]     = useState(false);

  function handleWish(e) {
    e.stopPropagation();
    setWished(v => !v);
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
          {p.was && !outOfStock && <span className="product-card__save-badge">Save {money(p.was - p.price)}</span>}
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
        <div className="product-card__rating">
          <Stars value={p.rating} size={13} />
          <span className="product-card__rating-val">{p.rating}</span>
          <span className="product-card__rating-count">({p.reviews})</span>
        </div>
        <div className="product-card__price-row">
          <div className="product-card__price-wrap">
            {contactForPrice
              ? <span className="product-card__price product-card__price--contact">Contact for price</span>
              : <><span className="product-card__price">{hasMultiplePrices ? 'From ' : ''}{money(displayPrice)}</span>
                  {p.was && <span className="product-card__price-was">{money(p.was)}</span>}</>
            }
          </div>
          {lowStock && <span className="product-card__stock-low">Only {displayStock} left</span>}
        </div>
        {contactForPrice ? (
          <a href={`${BRAND.wa}?text=${encodeURIComponent(`Hi Amahle Blue, I would like to get a quote for the ${p.name}.`)}`} target="_blank" rel="noopener noreferrer"
            className="product-card__btn product-card__btn--quote">
            <Whatsapp size={16} /> Get a quote
          </a>
        ) : (
          <button onClick={handleAdd} disabled={outOfStock}
            className={`product-card__btn ${
              outOfStock ? 'product-card__btn--oos' :
              added      ? 'product-card__btn--added' :
                           'product-card__btn--add'
            }`}>
            {outOfStock ? 'Out of Stock' : added ? <><Check size={16} /> Added!</> : <><Plus size={16} /> Add to Cart</>}
          </button>
        )}
      </div>
    </div>
  );
};

export const Featured = () => {
  const { products } = useProducts();
  const bestIds = ["all-purpose-cleaner", "hand-surface-sanitiser", "carpet-upholstery-shampoo", "tyre-dash-shine"];
  
  let best = products.filter((p) => p.badge === "Bestseller" || bestIds.includes(p.id));
  if (best.length < 4) {
    const remaining = products.filter((p) => !best.includes(p) && (typeof p.stock !== 'number' || p.stock > 0));
    best = [...best, ...remaining];
  }
  best = best.slice(0, 4);

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
          <Reveal><span className="featured__label"><Sparkles size={14} /> Customer favourites</span></Reveal>
          <Reveal delay={60}><h2 className="featured__title">Bestsellers</h2></Reveal>
        </div>
        <div className="featured__grid">
          {best.map((p, i) => <Reveal key={p.id} delay={(i % 4) * 70}><ProductCard p={p} /></Reveal>)}
        </div>
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
              <span className="bulk-promo__label"><Tag size={14} /> For businesses</span>
              <h2 className="bulk-promo__title">Buying in bulk? Unlock wholesale pricing.</h2>
              <p className="bulk-promo__desc">Carwashes, laundromats, contract cleaners and resellers — get trade rates on 5L and bulk drum volumes, supplied reliably across South Africa.</p>
            </div>
            <div className="bulk-promo__actions">
              <a href={BRAND.wa} target="_blank" rel="noopener noreferrer" className="bulk-promo__btn-primary">
                <Whatsapp size={18} /> Request a bulk quote
              </a>
              <a href="#contact" className="bulk-promo__btn-secondary">
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

export const Shop = ({ activeCat, setActiveCat, query, setQuery }) => {
  const { products, categories = DEFAULT_CATEGORIES } = useProducts();
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
          <Reveal><span className="shop-page__label">The full range</span></Reveal>
          <Reveal delay={60}><h2 className="shop-page__title">Shop all products</h2></Reveal>
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

        {list.length === 0 ? (
          <div className="shop-page__empty">
            <span className="shop-page__empty-icon"><Search size={28} /></span>
            <p className="shop-page__empty-title">No products found</p>
            <p className="shop-page__empty-sub">Try a different category or clear your search.</p>
            <button onClick={() => { setActiveCat("all"); setQuery(""); }} className="shop-page__empty-reset">Reset filters</button>
          </div>
        ) : (
          <div className="shop-page__grid">
            {list.slice(0, visibleCount).map((p, i) => <Reveal key={p.id} delay={(i % 4) * 60}><ProductCard p={p} /></Reveal>)}
          </div>
        )}
        {list.length > visibleCount && (
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

                <div className="absolute left-3 top-3 flex gap-1.5 pointer-events-none">
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

                <div className="absolute bottom-2 right-2 flex items-center gap-1.5 z-10">
                  {media.length > 1 && (
                    <span className="rounded-full bg-black/60 px-2 py-0.5 text-[11px] text-white font-bold sm:hidden">
                      {mediaIdx + 1}/{media.length}
                    </span>
                  )}
                  {currentMedia && currentMedia.type === 'image' && (
                    <button
                      onClick={() => setIsFullscreen(true)}
                      className="hidden sm:grid h-7 w-7 place-items-center rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
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
                        border: i === mediaIdx ? '2px solid #1E50E0' : '2px solid transparent',
                        opacity: i === mediaIdx ? 1 : 0.6,
                      }}
                    >
                      {m.type === 'video' ? (
                        <div className="w-full h-full bg-slate-800 flex items-center justify-center">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="white"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                        </div>
                      ) : (
                        <img
                          src={m.url}
                          alt={`${product.name} ${i + 1}`}
                          loading="lazy"
                          onError={e => { e.target.onerror = null; e.target.src = '/assets/products/placeholder.svg'; }}
                        />
                      )}
                      {m.type === 'video' && (
                        <span className="absolute bottom-0.5 left-0.5 bg-slate-700/80 text-white text-[7px] font-bold px-1 py-0.5 rounded">▶</span>
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
              <div className="mt-2 flex items-center gap-2">
                <Stars value={product.rating} size={15} />
                <span className="text-[13px] font-semibold text-slate-500">{product.rating}</span>
                <span className="text-[13px] text-slate-300">· {product.reviews} reviews</span>
              </div>
              <p className="quickview-desc">{product.desc}</p>
              <ul className="quickview-benefits">
                {(product.benefits || []).slice(0, 4).map((b) => (
                  <li key={b}>
                    <Check size={16} /> {b}
                  </li>
                ))}
              </ul>

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
                const contactForPrice = !activePrice || activePrice <= 0;

                return (
                  <React.Fragment>
                    <div className="quickview-price-section">
                      <div className="quickview-price-wrap">
                        {contactForPrice
                          ? <span className="quickview-price text-slate-500 text-[20px]">Contact for price</span>
                          : <><span className="quickview-price">{money(activePrice)}</span>
                              {activeWas && <span className="quickview-price-was">{money(activeWas)}</span>}</>
                        }
                      </div>
                      <div className="quickview-stock-info">
                        <span className="quickview-stock-status">
                          Available: {activeOutOfStock ? <span className="text-red-500 font-bold">Out of stock</span> : <span className="text-grass font-bold">{activeStock} units</span>}
                        </span>
                        {activeLowStock && <p className="text-[11.5px] font-bold text-amber-600 mt-0.5">Only {activeStock} left — order soon!</p>}
                      </div>
                    </div>

                    {contactForPrice ? (
                      <a href={`${BRAND.wa}?text=${encodeURIComponent(`Hi Amahle Blue, I would like to get a quote for the ${product.name}${activeSize ? ` (${activeSize})` : ''}.`)}`} target="_blank" rel="noopener noreferrer"
                        className="quickview-add-btn bg-grass hover:bg-emerald-600">
                        <Whatsapp size={18} /> Get a quote on WhatsApp
                      </a>
                    ) : (
                      <div className="quickview-add-section">
                        {!activeOutOfStock && (
                          <div className="quickview-qty-control">
                            <button onClick={() => setQty((q) => Math.max(1, q - 1))} className="quickview-qty-btn"><Minus size={16} /></button>
                            <span className="quickview-qty-val">{qty}</span>
                            <button onClick={() => setQty((q) => Math.min(activeMaxQty, q + 1))} className="quickview-qty-btn"><Plus size={16} /></button>
                          </div>
                        )}
                        <button
                          disabled={activeOutOfStock}
                          onClick={() => { if (!activeOutOfStock) { add(product, qty, selectedVarName); setProduct(null); setTimeout(() => setOpen(true), 150); } }}
                          className={`quickview-add-btn ${activeOutOfStock ? 'quickview-add-btn--oos' : 'quickview-add-btn--active'}`}
                        >
                          {activeOutOfStock ? 'Out of Stock' : <><Cart size={18} /> Add to Cart</>}
                        </button>
                      </div>
                    )}
                  </React.Fragment>
                );
              })()}
            </div>
          </div>
        )}
      </div>

      {isFullscreen && product && currentMedia && (
        <div className="fixed inset-0 z-[80] flex flex-col items-center justify-center bg-black/95" onClick={() => setIsFullscreen(false)}>
          <button onClick={() => setIsFullscreen(false)} className="absolute top-4 right-4 grid h-10 w-10 place-items-center rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors z-10" aria-label="Close fullscreen">
            <X size={20} />
          </button>
          {media.length > 1 && (
            <>
              <button onClick={e => { e.stopPropagation(); goPrev(); }} className="absolute left-4 top-1/2 -translate-y-1/2 grid h-10 w-10 place-items-center rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors z-10" aria-label="Previous">
                <ChevronLeft size={20} />
              </button>
              <button onClick={e => { e.stopPropagation(); goNext(); }} className="absolute right-4 top-1/2 -translate-y-1/2 grid h-10 w-10 place-items-center rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors z-10" aria-label="Next">
                <ChevronRight size={20} />
              </button>
            </>
          )}
          <div className="relative max-w-[90vw] max-h-[80vh]" onClick={e => e.stopPropagation()}>
            <img src={currentMedia.url} alt={product.name} className="max-w-full max-h-[80vh] object-contain" onError={e => { e.target.onerror = null; e.target.src = '/assets/products/placeholder.svg'; }} />
          </div>
          <p className="mt-3 text-white/40 text-xs">{mediaIdx + 1} / {media.length}</p>
        </div>
      )}
    </div>
  );
};
