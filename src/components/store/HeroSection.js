'use client';

import React from 'react';
import { useCart, useProducts, DEFAULT_CATEGORIES, FREE_SHIP, money, getPrimaryImg } from '../../lib/storeContext';
import { 
  Sparkles, ArrowRight, Car, Shield, Plus, Leaf, Truck, Award, Tag 
} from '../ui/Icons';
import { Reveal, Stars, SkeletonLine } from '../ui/index';
import * as Icons from '../ui/Icons';



function CatIcon({ name, size }) {
  const Icon = Icons[name] || Icons.Tag;
  return <Icon size={size} />;
}

export const Hero = ({ onShopCat }) => {
  const { add } = useCart();
  const { products, productsLoaded } = useProducts();

  const apc = products.find((p) => p.id === "all-purpose-cleaner") || products.find((p) => p.cat === "household") || products[0];
  const san = products.find((p) => p.id === "hand-surface-sanitiser") || products.find((p) => p.cat === "sanitiser") || products[1] || products[0];
  const showShowcase = productsLoaded && apc && san;
  const showShowcaseSkeleton = !productsLoaded;

  return (
    <section className="hero">
      <div className="hero__blob-blue" />
      <div className="hero__blob-green" />
      <div className="hero__grid-pattern" />

      <div className="hero__container">
        <div className="hero__content">
          <Reveal>
            <span className="hero__badge">
              <Sparkles size={14} style={{ color: '#0ea5e9' }} /> Proudly made in South Africa
            </span>
          </Reveal>
          <Reveal delay={70}>
            <h1 className="hero__title">
              Cleaning Products for<br />
              <span className="hero__title-accent">Businesses, Facilities</span><br />
              &amp; Everyday Use
            </h1>
          </Reveal>
          <Reveal delay={140}>
            <p className="hero__desc">
              Amahle Blue supplies laundry, household, car care, sanitiser, and industrial cleaning products for homes, businesses, car washes, laundries, offices, and professional cleaning teams across South Africa.
            </p>
          </Reveal>
          <Reveal delay={210}>
            <div className="hero__actions">
              <a href="#shop" className="hero__btn-primary" onClick={(e) => {
                if (onShopCat) {
                  e.preventDefault();
                  onShopCat("all");
                }
              }}>
                Shop Products <ArrowRight size={18} className="hero__btn-arrow" />
              </a>
              <a href="https://wa.me/27671014345" target="_blank" rel="noopener noreferrer" className="hero__btn-secondary" style={{ textDecoration: 'none' }}>
                <Icons.Whatsapp size={18} /> Request Bulk Quote
              </a>
            </div>
          </Reveal>
          <Reveal delay={280}>
            <div className="hero__stats">
              <div className="hero__rating">
                <Stars value={4.8} size={16} />
                <span className="hero__rating-val">4.8/5</span>
                <span className="hero__rating-count">· 900+ reviews</span>
              </div>
              <div className="hero__trust-badge">
                <Shield size={16} /> Kills 99.9% of germs
              </div>
            </div>
          </Reveal>
        </div>

        {/* Product showcase */}
        {showShowcaseSkeleton && (
          <div className="relative" aria-hidden="true">
            <div className="ab-skel-hero-showcase">
              <div className="ab-skeleton ab-skel-hero-showcase__card" />
              <div className="ab-skeleton ab-skel-hero-showcase__card" />
            </div>
          </div>
        )}
        {showShowcase && (
          <Reveal delay={120} className="relative">
            <div className="hero-showcase">
              <div className="hero-showcase__bg-blur" />
              <div className="hero-showcase__bg-ring" />

              <div className="hero-showcase__card-left">
                <img src={getPrimaryImg(san)} alt={san.name} />
              </div>
              <div className="hero-showcase__card-right">
                <img src={getPrimaryImg(apc)} alt={apc.name} />
                <button onClick={() => add(apc)} className="hero-showcase__quick-add">
                  <Plus size={14} /> Quick add
                </button>
              </div>

              {/* Floating chips */}
              <div className="hero-showcase__float-left">
                <span className="hero-showcase__float-icon"><Leaf size={18} /></span>
                <div className="hero-showcase__float-text">
                  <p className="hero-showcase__float-title">Eco-conscious</p>
                  <p className="hero-showcase__float-sub">Responsibly made</p>
                </div>
              </div>
              <div className="hero-showcase__float-right">
                <span className="hero-showcase__float-icon"><Truck size={18} /></span>
                <div className="hero-showcase__float-text">
                  <p className="hero-showcase__float-title">Fast delivery</p>
                  <p className="hero-showcase__float-sub">Across South Africa</p>
                </div>
              </div>
            </div>
          </Reveal>
        )}
      </div>
    </section>
  );
};

const TRUST = [
  { icon: Award, title: "Locally Manufactured", sub: "Made in Gauteng, SA" },
  { icon: Tag, title: "Bulk & Business Supply", sub: "Wholesale volumes welcome" },
  { icon: Icons.Whatsapp, title: "Quote Support", sub: "Quick help on WhatsApp" },
  { icon: Shield, title: "Professional-Grade", sub: "Tested & trusted solutions" },
];

export const TrustStrip = () => (
  <section className="trust-strip">
    <div className="trust-strip__container">
      {TRUST.map((t, i) => (
        <Reveal key={t.title} delay={i * 60} className="trust-strip__item">
          <span className="trust-strip__icon"><t.icon size={21} /></span>
          <div className="trust-strip__text">
            <p className="trust-strip__title">{t.title}</p>
            <p className="trust-strip__sub">{t.sub}</p>
          </div>
        </Reveal>
      ))}
    </div>
  </section>
);

export const CategoryShowcase = ({ onShopCat }) => {
  const { products, productsLoaded, categories = DEFAULT_CATEGORIES } = useProducts();

  return (
    <section className="category-showcase">
      <div className="category-showcase__header">
        <Reveal><span className="category-showcase__label">Shop by category</span></Reveal>
        <Reveal delay={60}><h2 className="category-showcase__title">Find your clean</h2></Reveal>
        <Reveal delay={110}><p className="category-showcase__desc">Professional-grade solutions — built for homes, vehicles, facilities, and businesses across South Africa.</p></Reveal>
      </div>

      <div className="category-showcase__grid">
        {categories.map((c, i) => {
          const n = products.filter((p) => p.cat === c.id).length;
          return (
            <Reveal key={c.id} delay={i * 80}>
              <a href={`/category/${c.id}`} className="category-showcase__card group" style={{ textDecoration: 'none', display: 'block' }}>
                <div className="category-showcase__card-blob" style={{ background: c.accent }} />
                <span className="category-showcase__card-icon" style={{ background: `linear-gradient(135deg, ${c.accent}, ${c.accent}cc)` }}>
                  <CatIcon name={c.icon} size={26} />
                </span>
                <h3 className="category-showcase__card-title">{c.name}</h3>
                <p className="category-showcase__card-desc">{c.blurb}</p>
                <span className="category-showcase__card-link">
                  {productsLoaded ? (
                    <>Shop {n} products <ArrowRight size={17} /></>
                  ) : (
                    <>
                      <SkeletonLine width={90} height={12} style={{ display: 'inline-block', verticalAlign: 'middle' }} />
                      <ArrowRight size={17} />
                    </>
                  )}
                </span>
              </a>
            </Reveal>
          );
        })}
      </div>
    </section>
  );
};
