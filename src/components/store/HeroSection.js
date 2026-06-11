'use client';

import React from 'react';
import { useCart, useProducts, DEFAULT_CATEGORIES, getPrimaryImg } from '../../lib/storeContext';
import { 
  Sparkles, ArrowRight, Car, Shield, Plus, Leaf, Truck, Award, Tag 
} from '../ui/Icons';
import { Reveal } from '../ui/index';
import * as Icons from '../ui/Icons';

function Stars({ value, size = 16 }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1,2,3,4,5].map(i => (
        <Icons.Star key={i} size={size} className={i <= value ? "text-amber-500" : "text-slate-200"} fill={i <= value ? "currentColor" : "none"} />
      ))}
    </div>
  );
}

function CatIcon({ name, size }) {
  const Icon = Icons[name] || Icons.Tag;
  return <Icon size={size} />;
}

export const Hero = ({ onShopCat }) => {
  const { add } = useCart();
  const { products } = useProducts();
  
  const apc = products.find((p) => p.id === "all-purpose-cleaner") || products.find((p) => p.cat === "household") || products[0];
  const san = products.find((p) => p.id === "hand-surface-sanitiser") || products.find((p) => p.cat === "sanitiser") || products[1] || products[0];

  return (
    <section className="hero">
      <div className="hero__blob-blue" />
      <div className="hero__blob-green" />
      <div className="hero__grid-pattern" />

      <div className="hero__container">
        <div className="hero__content">
          <Reveal>
            <span className="hero__badge">
              <Sparkles size={14} className="text-sky-500" /> Proudly made in South Africa
            </span>
          </Reveal>
          <Reveal delay={70}>
            <h1 className="hero__title">
              A cleaner home,<br />
              <span className="hero__title-accent">car &amp; everything</span><br />
              in between.
            </h1>
          </Reveal>
          <Reveal delay={140}>
            <p className="hero__desc">
              Premium cleaning, car-care &amp; sanitising solutions — formulated and bottled in Gauteng. Powerful results, fresh finish, delivered to your door.
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
                Shop the range <ArrowRight size={18} className="hero__btn-arrow" />
              </a>
              <button onClick={() => onShopCat && onShopCat("car")} className="hero__btn-secondary">
                <Car size={18} /> Explore car care
              </button>
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
        {apc && san && (
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
  { icon: Truck, title: "Free Delivery over R750", sub: "Fast nationwide shipping" },
  { icon: Shield, title: "Kills 99.9% of Germs", sub: "High-purity sanitisers" },
  { icon: Tag, title: "Bulk & Trade Pricing", sub: "Wholesale volumes welcome" },
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
  const { products, categories = DEFAULT_CATEGORIES } = useProducts();

  return (
    <section className="category-showcase">
      <div className="category-showcase__header">
        <Reveal><span className="category-showcase__label">Shop by category</span></Reveal>
        <Reveal delay={60}><h2 className="category-showcase__title">Find your clean</h2></Reveal>
        <Reveal delay={110}><p className="category-showcase__desc">Three ranges, one standard of quality — built for homes, vehicles and busy hands.</p></Reveal>
      </div>

      <div className="category-showcase__grid">
        {categories.map((c, i) => {
          const n = products.filter((p) => p.cat === c.id).length;
          return (
            <Reveal key={c.id} delay={i * 80}>
              <button onClick={() => onShopCat && onShopCat(c.id)} className="category-showcase__card group">
                <div className="category-showcase__card-blob" style={{ background: c.accent }} />
                <span className="category-showcase__card-icon" style={{ background: `linear-gradient(135deg, ${c.accent}, ${c.accent}cc)` }}>
                  <CatIcon name={c.icon} size={26} />
                </span>
                <h3 className="category-showcase__card-title">{c.name}</h3>
                <p className="category-showcase__card-desc">{c.blurb}</p>
                <span className="category-showcase__card-link">
                  Shop {n} products <ArrowRight size={17} />
                </span>
              </button>
            </Reveal>
          );
        })}
      </div>
    </section>
  );
};
