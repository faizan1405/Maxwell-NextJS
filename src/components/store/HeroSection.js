'use client';

import React from 'react';
import { useCart, useProducts, BRAND, DEFAULT_CATEGORIES, FREE_SHIP, money, getPrimaryImg } from '../../lib/storeContext';
import {
  Sparkles, ArrowRight, Car, Shield, Plus, Leaf, Truck, Award, Tag, CheckCircle
} from '../ui/Icons';
import { Reveal, Stars, SkeletonLine } from '../ui/index';
import * as Icons from '../ui/Icons';

const QUOTE_WA = `${BRAND.wa}?text=${encodeURIComponent("Hello Amahle Blue Sales Team, I would like to request a quote for bulk cleaning products. Please share pricing and availability.")}`;
const SALES_WA = `${BRAND.wa}?text=${encodeURIComponent("Hello Amahle Blue Sales Team, I have a business enquiry about your cleaning product range.")}`;



function CatIcon({ name, size }) {
  const Icon = Icons[name] || Icons.Tag;
  return <Icon size={size} />;
}

export const Hero = ({ onShopCat }) => {
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
              <Shield size={14} style={{ color: '#0ea5e9' }} /> South African B2B Cleaning Supplier
            </span>
          </Reveal>
          <Reveal delay={70}>
            <h1 className="hero__title">
              Bulk Cleaning Products for<br />
              <span className="hero__title-accent">South African</span><br />
              Businesses
            </h1>
          </Reveal>
          <Reveal delay={140}>
            <p className="hero__desc">
              Amahle Blue supplies commercial &amp; industrial cleaning products in bulk to
              offices, schools, factories, hospitality venues and cleaning contractors —
              delivered across South Africa on quote-based and wholesale terms.
            </p>
          </Reveal>
          <Reveal delay={210}>
            <div className="hero__actions">
              <a href={QUOTE_WA} target="_blank" rel="noopener noreferrer" className="hero__btn-primary" style={{ textDecoration: 'none' }}>
                Request a Quote <ArrowRight size={18} className="hero__btn-arrow" />
              </a>
              <a href="#shop" className="hero__btn-secondary" onClick={(e) => {
                if (onShopCat) {
                  e.preventDefault();
                  onShopCat("all");
                }
              }}>
                View Product Range
              </a>
              <a href={SALES_WA} target="_blank" rel="noopener noreferrer" className="hero__btn-ghost" style={{ textDecoration: 'none' }}>
                <Icons.Whatsapp size={18} /> WhatsApp Sales Team
              </a>
            </div>
          </Reveal>
          <Reveal delay={280}>
            <div className="hero__stats">
              <div className="hero__trust-badge">
                <CheckCircle size={16} /> Bulk &amp; wholesale pricing
              </div>
              <div className="hero__trust-badge">
                <Truck size={16} /> Nationwide delivery
              </div>
              <div className="hero__trust-badge">
                <Award size={16} /> Trusted supplier since 2019
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
              </div>

              {/* Floating chips */}
              <div className="hero-showcase__float-left">
                <span className="hero-showcase__float-icon"><Tag size={18} /></span>
                <div className="hero-showcase__float-text">
                  <p className="hero-showcase__float-title">Bulk supply</p>
                  <p className="hero-showcase__float-sub">5L &amp; 20L drums</p>
                </div>
              </div>
              <div className="hero-showcase__float-right">
                <span className="hero-showcase__float-icon"><Truck size={18} /></span>
                <div className="hero-showcase__float-text">
                  <p className="hero-showcase__float-title">Nationwide delivery</p>
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
  { icon: Tag, title: "Bulk Supply Available", sub: "5L, 20L & wholesale orders" },
  { icon: Truck, title: "Nationwide Delivery", sub: "Reliable supply countrywide" },
  { icon: Icons.Whatsapp, title: "WhatsApp Sales Support", sub: "Fast quotes & enquiries" },
  { icon: Award, title: "South African Supplier", sub: "Locally manufactured, est. 2019" },
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

/* ── Industrial Banner — reusable B2B call-to-action strip ─────────────────── */
export const IndustrialBanner = ({
  eyebrow = "Commercial & Industrial Cleaning Supplies",
  title = "Bulk Orders Welcome — Speak to Our Sales Team",
  desc = "Wholesale cleaning products and reliable supply for businesses across South Africa. Get quote-based pricing on the sizes and volumes your operation needs.",
  quoteText = "Hello Amahle Blue Sales Team, I'd like to discuss bulk supply and pricing for my business.",
}) => (
  <section className="industrial-banner">
    <div className="industrial-banner__inner">
      <div className="industrial-banner__pattern" />
      <div className="industrial-banner__content">
        <span className="industrial-banner__eyebrow"><Shield size={14} /> {eyebrow}</span>
        <h2 className="industrial-banner__title">{title}</h2>
        <p className="industrial-banner__desc">{desc}</p>
      </div>
      <div className="industrial-banner__actions">
        <a
          href={`${BRAND.wa}?text=${encodeURIComponent(quoteText)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="industrial-banner__btn-primary"
        >
          <Icons.Whatsapp size={18} /> Request a Quote
        </a>
        <a href={`tel:${BRAND.phoneRaw}`} className="industrial-banner__btn-secondary">
          Contact Sales · {BRAND.phone}
        </a>
      </div>
    </div>
  </section>
);

export const CategoryShowcase = ({ onShopCat }) => {
  const { products, productsLoaded, categories = DEFAULT_CATEGORIES } = useProducts();

  return (
    <section className="category-showcase">
      <div className="category-showcase__header">
        <Reveal><span className="category-showcase__label">Product catalogue</span></Reveal>
        <Reveal delay={60}><h2 className="category-showcase__title">Our cleaning product range</h2></Reveal>
        <Reveal delay={110}><p className="category-showcase__desc">Commercial-grade cleaning supplies available for bulk supply and quote-based orders — built for businesses, schools, offices, factories and cleaning contractors.</p></Reveal>
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
                    <>View {n} products <ArrowRight size={17} /></>
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
