'use client';

import React, { useState } from 'react';
import { Award, Sparkles, Shield, Leaf, CheckCircle, Mail, ArrowRight, MapPin, Phone, Whatsapp } from '../ui/Icons';
import { Star } from '../ui/Icons';
import { FadeReveal, Reveal, Stars } from '../ui/index';
import { SwipeCarousel } from './SwipeCarousel';
import { BRAND } from '../../lib/storeContext';

const WHY = [
  { icon: Award, title: "Locally manufactured", body: "Formulated and bottled in Boksburg, Gauteng since 2019 — proudly South African.", color: "#1D4ED8" },
  { icon: Sparkles, title: "Powerful, fresh results", body: "High-active formulations that cut grease, lift stains and leave a clean, fresh finish.", color: "#0EA5E9" },
  { icon: Shield, title: "Tested & trusted", body: "Every batch is quality-checked for consistent performance you can rely on.", color: "#36F700" },
  { icon: Leaf, title: "Eco-conscious", body: "Responsible raw materials and biodegradable options — strong on dirt, kinder to the planet.", color: "#0B2E6B" },
];



export const WhyUs = () => (
  <section id="about" className="content-section why-us">
    <div>
      <Reveal><span className="why-us__subtitle">Why Amahle Blue</span></Reveal>
      <Reveal delay={60}><h2 className="why-us__title">Premium clean, made right here at home.</h2></Reveal>
      <Reveal delay={120}><p className="why-us__desc">Amahle Blue was founded to give South African homes and businesses cleaning products they can genuinely trust — powerful, consistent and fairly priced. From everyday surfaces to showroom car care, every bottle is held to the same standard.</p></Reveal>
      <div className="why-us__grid">
        {WHY.map((w, i) => (
          <Reveal key={w.title} delay={i * 70}>
            <div className="why-card">
              <span className="why-card__icon" style={{ background: `linear-gradient(135deg, ${w.color}, ${w.color}cc)` }}><w.icon size={20} /></span>
              <h3 className="why-card__title">{w.title}</h3>
              <p className="why-card__body">{w.body}</p>
            </div>
          </Reveal>
        ))}
      </div>
    </div>

    <Reveal delay={120} className="why-images">
      <div className="why-images__grid">
        <div className="why-images__item">
          <img src="/assets/products/all-purpose-cleaner.jpg" alt="All Purpose Cleaner" />
        </div>
        <div className="why-images__item why-images__item--down">
          <img src="/assets/products/tyre-shine.jpg" alt="Tyre Shine" />
        </div>
        <div className="why-images__item why-images__item--up">
          <img src="/assets/products/carpet-upholstery-shampoo.png" alt="Carpet Shampoo" />
        </div>
        <div className="why-images__item why-images__item--down">
          <img src="/assets/products/hand-surface-sanitiser.jpg" alt="Sanitiser" />
        </div>
      </div>
      <div className="why-images__badge">
        <span className="why-images__badge-icon"><Award size={22} /></span>
        <div className="why-images__badge-text">
          <strong>Made in South Africa</strong>
          <span>Est. 2019 · Gauteng</span>
        </div>
      </div>
    </Reveal>
  </section>
);

const REVIEWS = [
  { name: "Thandi M.", role: "Verified buyer · Pretoria", initials: "TM", rating: 5, product: "All Purpose Cleaner", text: "Cuts through kitchen grease like nothing else I've tried, and the fresh smell lingers for hours. Repurchasing for sure." },
  { name: "Riaan D.", role: "Verified buyer · Boksburg", initials: "RD", rating: 5, product: "Tyre & Dash Shine", text: "My car looks like it just left the dealership. Deep gloss on the tyres, non-greasy dash. Brilliant value at 5L." },
  { name: "Naledi K.", role: "Carwash owner · Johannesburg", initials: "NK", rating: 5, product: "Bulk supply", text: "We switched our whole wash bay to Amahle Blue. Consistent quality, great bulk pricing and delivery is always on time." },
  { name: "Sarah P.", role: "Verified buyer · Centurion", initials: "SP", rating: 4, product: "Carpet & Upholstery Shampoo", text: "Lifted years-old stains off my couch. Low foam so it dries quickly too. Would love a bigger range of scents." },
];

export const Reviews = () => (
  <section className="content-reviews">
    <div className="content-reviews__inner">
      <div className="content-reviews__header">
        <Reveal><span className="content-reviews__subtitle">Loved by customers</span></Reveal>
        <Reveal delay={60}><h2 className="content-reviews__title">Real reviews, real results</h2></Reveal>
        <Reveal delay={110}>
          <div className="content-reviews__rating">
            <Stars value={4.8} size={20} />
            <span className="score">4.8 out of 5</span>
            <span className="count">· 900+ verified reviews</span>
          </div>
        </Reveal>
      </div>
      <SwipeCarousel
        className="content-reviews__carousel swipe-carousel--reviews"
        label="Customer reviews"
        previousLabel="Previous reviews"
        nextLabel="Next reviews"
        hint="Swipe to read more"
      >
        {REVIEWS.map((r, i) => (
          <Reveal key={r.name} delay={i * 70}>
            <figure className="review-card">
              <Stars value={r.rating} size={15} />
              <blockquote className="review-card__text">"{r.text}"</blockquote>
              <figcaption className="review-card__author">
                <span className="review-card__avatar">{r.initials}</span>
                <div className="review-card__info">
                  <strong>{r.name}</strong>
                  <span>{r.role}</span>
                </div>
              </figcaption>
            </figure>
          </Reveal>
        ))}
      </SwipeCarousel>
    </div>
  </section>
);

export const Contact = () => (
  <section id="contact" className="contact-section">
    <div className="contact-section__inner">
      <Reveal className="contact-section__header">
        <span className="contact-section__label">Get in touch</span>
        <h2 className="contact-section__title">We're here to help</h2>
        <p className="contact-section__desc">Questions about a product, a bulk order, or your delivery? Our Boksburg team is happy to help during business hours.</p>
      </Reveal>

      <div className="contact-cards">
        <Reveal delay={0}>
          <div className="contact-card">
            <span className="contact-card__icon"><MapPin size={20} /></span>
            <div className="contact-card__body">
              <p className="contact-card__label">Visit us</p>
              <p className="contact-card__value">{BRAND?.address}</p>
            </div>
          </div>
        </Reveal>
        <Reveal delay={60}>
          <div className="contact-card">
            <span className="contact-card__icon"><Phone size={20} /></span>
            <div className="contact-card__body">
              <p className="contact-card__label">Call us</p>
              <p className="contact-card__value"><a href={`tel:${BRAND?.phoneRaw}`}>{BRAND?.phone}</a></p>
              <p className="contact-card__sub">Mon–Fri · 08:00–17:00</p>
            </div>
          </div>
        </Reveal>
        <Reveal delay={120}>
          <div className="contact-card">
            <span className="contact-card__icon"><Mail size={20} /></span>
            <div className="contact-card__body">
              <p className="contact-card__label">Email us</p>
              <p className="contact-card__value"><a href={`mailto:${BRAND?.email}`}>{BRAND?.email}</a></p>
              <p className="contact-card__sub">We aim to reply within one business day.</p>
            </div>
          </div>
        </Reveal>
      </div>

      <FadeReveal delay={140}>
        <div className="contact-cta">
          {BRAND?.wa && (
            <a
              href={`${BRAND.wa}?text=${encodeURIComponent("Hi Amahle Blue, I'd like to ask a question.")}`}
              target="_blank"
              rel="noopener noreferrer"
              className="contact-cta__btn contact-cta__btn--whatsapp"
            >
              <Whatsapp size={18} /> Chat on WhatsApp
            </a>
          )}
          {BRAND?.phoneRaw && (
            <a href={`tel:${BRAND.phoneRaw}`} className="contact-cta__btn contact-cta__btn--phone">
              <Phone size={16} /> Call {BRAND.phone}
            </a>
          )}
        </div>
      </FadeReveal>
    </div>
  </section>
);

export const Newsletter = () => {
  const [done, setDone] = useState(false);
  return (
    <section id="newsletter" className="content-section newsletter-wrapper">
      <Reveal>
        <div className="newsletter">
          <div className="newsletter__pattern" />
          <div className="newsletter__inner">
            <span className="newsletter__badge"><Mail size={14} /> Join the list</span>
            <h2 className="newsletter__title">Be the first to hear about deals</h2>
            <p className="newsletter__desc">Subscribe for cleaning tips, new product drops and subscriber-only deals.</p>
            {done ? (
              <div className="newsletter__success"><CheckCircle size={18} /> Thanks for subscribing!</div>
            ) : (
              <form onSubmit={(e) => { e.preventDefault(); setDone(true); }} className="newsletter-form">
                <input type="email" required placeholder="you@email.co.za" className="newsletter-form__input" />
                <button type="submit" className="newsletter-form__btn">Subscribe <ArrowRight size={17} /></button>
              </form>
            )}
            <p className="newsletter__note">No spam. Unsubscribe anytime.</p>
          </div>
        </div>
      </Reveal>
    </section>
  );
};
