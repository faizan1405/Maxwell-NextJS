'use client';

import React, { useState, useEffect } from 'react';
import { Award, Sparkles, Shield, Leaf, CheckCircle, Mail, ArrowRight, MapPin, Phone, Whatsapp } from '../ui/Icons';
import { Star } from '../ui/Icons';
import { FadeReveal, Reveal, Stars } from '../ui/index';
import { SwipeCarousel } from './SwipeCarousel';
import { BRAND } from '../../lib/storeContext';

function deriveInitials(name) {
  return (name || '?').trim().split(/\s+/).filter(Boolean).map(w => w[0]).slice(0, 2).join('').toUpperCase();
}

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
          <img src="/assets/products/placeholder.svg" alt="Amahle Blue product" />
        </div>
        <div className="why-images__item why-images__item--down">
          <img src="/assets/products/placeholder.svg" alt="Amahle Blue product" />
        </div>
        <div className="why-images__item why-images__item--up">
          <img src="/assets/products/placeholder.svg" alt="Amahle Blue product" />
        </div>
        <div className="why-images__item why-images__item--down">
          <img src="/assets/products/placeholder.svg" alt="Amahle Blue product" />
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

export const Reviews = () => {
  const [reviews, setReviews] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/reviews?homepage=1&limit=12');
        if (!res.ok) { if (!cancelled) setReviews([]); return; }
        const data = await res.json();
        if (!cancelled) setReviews(Array.isArray(data) ? data : []);
      } catch {
        if (!cancelled) setReviews([]);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  if (reviews !== null && reviews.length === 0) return null;

  const avg = reviews && reviews.length
    ? (reviews.reduce((s, r) => s + (r.rating || 0), 0) / reviews.length)
    : 0;

  return (
    <section className="content-reviews">
      <div className="content-reviews__inner">
        <div className="content-reviews__header">
          <Reveal><span className="content-reviews__subtitle">Loved by customers</span></Reveal>
          <Reveal delay={60}><h2 className="content-reviews__title">Real reviews, real results</h2></Reveal>
          {reviews && reviews.length > 0 && (
            <Reveal delay={110}>
              <div className="content-reviews__rating">
                <Stars value={avg} size={20} />
                <span className="score">{avg.toFixed(1)} out of 5</span>
                <span className="count">· {reviews.length} customer review{reviews.length !== 1 ? 's' : ''}</span>
              </div>
            </Reveal>
          )}
        </div>
        {reviews && reviews.length > 0 && (
          <SwipeCarousel
            className="content-reviews__carousel swipe-carousel--reviews"
            label="Customer reviews"
            previousLabel="Previous reviews"
            nextLabel="Next reviews"
            hint="Swipe to read more"
          >
            {reviews.map((r, i) => {
              const initials = (r.customerInitials || deriveInitials(r.customerName)).slice(0, 2);
              const subtitle = [
                r.isVerified ? 'Verified buyer' : null,
                r.location || null,
              ].filter(Boolean).join(' · ');
              return (
                <Reveal key={r.id || i} delay={i * 70}>
                  <figure className="review-card">
                    <Stars value={r.rating} size={15} />
                    <blockquote className="review-card__text">&ldquo;{r.text}&rdquo;</blockquote>
                    <figcaption className="review-card__author">
                      {r.customerPhoto ? (
                        <img src={r.customerPhoto} alt="" className="review-card__avatar" style={{ objectFit: 'cover' }} />
                      ) : (
                        <span className="review-card__avatar">{initials}</span>
                      )}
                      <div className="review-card__info">
                        <strong>
                          {r.customerName || 'Verified buyer'}
                          {r.isVerified && (
                            <span title="Verified customer" style={{ display: 'inline-flex', alignItems: 'center', marginLeft: 6, color: '#16a34a' }}>
                              <CheckCircle size={14} />
                            </span>
                          )}
                        </strong>
                        <span>{subtitle || (r.productName ? r.productName : '')}</span>
                      </div>
                    </figcaption>
                  </figure>
                </Reveal>
              );
            })}
          </SwipeCarousel>
        )}
      </div>
    </section>
  );
};

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
  const [email, setEmail] = useState('');
  const [website, setWebsite] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    if (submitting) return;

    setSubmitting(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const res = await fetch('/api/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, website, source: 'footer' }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || 'Something went wrong. Please try again.');
      } else {
        setSuccessMsg(data.message || 'Thanks for subscribing!');
        setEmail('');
        setWebsite('');
      }
    } catch (err) {
      setErrorMsg('Network error. Please try again later.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section id="newsletter" className="content-section newsletter-wrapper">
      <Reveal>
        <div className="newsletter">
          <div className="newsletter__pattern" />
          <div className="newsletter__inner">
            <span className="newsletter__badge"><Mail size={14} /> Join the list</span>
            <h2 className="newsletter__title">Get Amahle Blue product updates</h2>
            <p className="newsletter__desc">Subscribe for product updates, availability, and business announcements.</p>
            {successMsg ? (
              <div className="newsletter__success"><CheckCircle size={18} /> {successMsg}</div>
            ) : (
              <form onSubmit={handleSubmit} className="newsletter-form">
                {/* Honeypot field for spam protection */}
                <input
                  type="text"
                  name="website"
                  value={website}
                  onChange={e => setWebsite(e.target.value)}
                  style={{ display: 'none' }}
                  tabIndex={-1}
                  autoComplete="off"
                />
                <input
                  type="email"
                  required
                  placeholder="you@email.co.za"
                  className="newsletter-form__input"
                  value={email}
                  onChange={e => { setEmail(e.target.value); setErrorMsg(''); }}
                  disabled={submitting}
                />
                <button type="submit" disabled={submitting || !email.trim()} className="newsletter-form__btn">
                  {submitting ? 'Subscribing...' : <>Subscribe <ArrowRight size={17} /></>}
                </button>
              </form>
            )}
            {errorMsg && (
              <p style={{ color: '#fca5a5', fontSize: '13px', marginTop: '0.75rem', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem' }}>
                ⚠️ {errorMsg}
              </p>
            )}
            <p className="newsletter__note">No spam. Unsubscribe anytime.</p>
          </div>
        </div>
      </Reveal>
    </section>
  );
};
