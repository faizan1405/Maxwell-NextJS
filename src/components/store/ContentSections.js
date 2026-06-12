'use client';

import React, { useState } from 'react';
import { Award, Sparkles, Shield, Leaf, CheckCircle, Mail, ArrowRight } from '../ui/Icons';
import { Star } from '../ui/Icons';
import { FadeReveal, Reveal, Stars } from '../ui/index';
import { SwipeCarousel } from './SwipeCarousel';

const WHY = [
  { icon: Award, title: "Locally manufactured", body: "Formulated and bottled in Boksburg, Gauteng since 2019 — proudly South African.", color: "#1D4ED8" },
  { icon: Sparkles, title: "Powerful, fresh results", body: "High-active formulations that cut grease, lift stains and leave a clean, fresh finish.", color: "#0EA5E9" },
  { icon: Shield, title: "Tested & trusted", body: "Every batch is quality-checked for consistent performance you can rely on.", color: "#159A4C" },
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
          <img src={typeof window !== 'undefined' && window.__resources?.allPurposeCleaner ? window.__resources.allPurposeCleaner : "/assets/products/all-purpose-cleaner.jpg"} alt="All Purpose Cleaner" />
        </div>
        <div className="why-images__item why-images__item--down">
          <img src={typeof window !== 'undefined' && window.__resources?.tyreShine ? window.__resources.tyreShine : "/assets/products/tyre-shine.jpg"} alt="Tyre Shine" />
        </div>
        <div className="why-images__item why-images__item--up">
          <img src={typeof window !== 'undefined' && window.__resources?.carpetShampoo ? window.__resources.carpetShampoo : "/assets/products/carpet-upholstery-shampoo.png"} alt="Carpet Shampoo" />
        </div>
        <div className="why-images__item why-images__item--down">
          <img src={typeof window !== 'undefined' && window.__resources?.handSanitiser ? window.__resources.handSanitiser : "/assets/products/hand-surface-sanitiser.jpg"} alt="Sanitiser" />
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
      <Reveal delay={120}>
        <p className="content-reviews__note">Sample reviews shown for demonstration — ready to connect to your live review platform.</p>
      </Reveal>
    </div>
  </section>
);

export const Newsletter = () => {
  const [done, setDone] = useState(false);
  return (
    <section id="contact" className="content-section newsletter-wrapper">
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
