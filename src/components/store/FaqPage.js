'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { BRAND } from '../../lib/storeContext';
import { FadeReveal, Reveal } from '../ui/index';

const FAQ_CATEGORIES = [
  { id: 'products',      label: 'Products' },
  { id: 'carcare',       label: 'Car Care' },
  { id: 'cleaning',      label: 'Cleaning & Sanitising' },
  { id: 'account',       label: 'Account & Ordering' },
  { id: 'delivery',      label: 'Delivery' },
  { id: 'payments',      label: 'Payments' },
  { id: 'cancellations', label: 'Cancellations & Support' },
];

const DEFAULT_FAQS = [
  /* ── Products ──────────────────────────────────────────────────────────────── */
  { id:'dfaq1',  question:'What products does Amahle Blue manufacture and sell?',              answer:'Amahle Blue manufactures and sells sanitising, cleaning, and car-care products. Our range includes sanitiser, isopropyl alcohol, car interior care products, car exterior care products, tyre shine, dash shine, tile cleaner, and all-purpose cleaner.',                                                                         category:'products',      order:1,  enabled:true, showOnHomepage:true  },
  { id:'dfaq2',  question:'Are Amahle Blue products available in different sizes and quantities?', answer:'Yes. Selected products are available in different sizes and quantities. Open the relevant product page to view the currently available options before adding an item to your cart.',                                                                                                                                        category:'products',      order:2,  enabled:true, showOnHomepage:true  },
  { id:'dfaq3',  question:'Where can I find instructions for using a product?',                answer:'Please check the relevant product page and the instructions provided on the product label before use. Product usage instructions, ingredients, materials, and precautions may vary depending on the item.',                                                                                                                     category:'products',      order:3,  enabled:true, showOnHomepage:false },
  { id:'dfaq4',  question:'Do Amahle Blue products come with a warranty or guarantee?',        answer:'A warranty or guarantee may apply to selected products. The applicable terms depend on the product. Please review the product details or contact our support team before ordering if you need confirmation.',                                                                                                                   category:'products',      order:4,  enabled:true, showOnHomepage:false },
  /* ── Car Care ───────────────────────────────────────────────────────────────── */
  { id:'dfaq5',  question:'Which products can I use for car interior care?',                   answer:'Amahle Blue offers car interior care products, including dash shine. Please check the relevant product description and usage instructions to choose the correct product for your vehicle.',                                                                                                                                    category:'carcare',       order:1,  enabled:true, showOnHomepage:false },
  { id:'dfaq6',  question:'Which products can I use for car exterior care?',                   answer:'Amahle Blue offers car exterior care products and tyre shine. Review the relevant product page for usage instructions before applying any product.',                                                                                                                                                                          category:'carcare',       order:2,  enabled:true, showOnHomepage:false },
  { id:'dfaq7',  question:'Can I use the same product on every part of my vehicle?',           answer:'Not necessarily. Different surfaces may require different products. Always review the product description and follow the label instructions before applying a product to your vehicle.',                                                                                                                                       category:'carcare',       order:3,  enabled:true, showOnHomepage:false },
  /* ── Cleaning & Sanitising ──────────────────────────────────────────────────── */
  { id:'dfaq8',  question:'Do you sell products for household and general cleaning?',          answer:'Yes. Amahle Blue offers products such as tile cleaner and all-purpose cleaner. Please review the relevant product details to determine which item is suitable for your intended use.',                                                                                                                                        category:'cleaning',      order:1,  enabled:true, showOnHomepage:false },
  { id:'dfaq9',  question:'Do you sell sanitiser and isopropyl alcohol?',                      answer:'Yes. Amahle Blue sells sanitiser and isopropyl alcohol. Please select the required product size and carefully follow the instructions and precautions shown on the product page and label.',                                                                                                                                  category:'cleaning',      order:2,  enabled:true, showOnHomepage:false },
  { id:'dfaq10', question:'Should I read the product label before using a cleaning or sanitising product?', answer:'Yes. Always read the label and follow the applicable usage instructions and precautions before use. Do not use a product for a purpose that is not stated in its instructions.',                                                                                                                              category:'cleaning',      order:3,  enabled:true, showOnHomepage:false },
  /* ── Account & Ordering ─────────────────────────────────────────────────────── */
  { id:'dfaq11', question:'Do I need to create an account before ordering?',                   answer:'No. You can place an order as a guest without creating an account. However, creating an account lets you track your orders, upload proof of payment, reorder easily, and receive updates — so we recommend signing up for the best experience.',                                                                                                                                                              category:'account',       order:1,  enabled:true, showOnHomepage:false },
  { id:'dfaq12', question:'How can I place an order?',                                         answer:'Browse the products, select the required size or quantity where applicable, add the items to your cart, proceed to checkout, enter your delivery information, choose an available payment method, and confirm your order. You can check out as a guest or sign in to your account.',                                                                                                category:'account',       order:2,  enabled:true, showOnHomepage:false },
  { id:'dfaq13', question:'Will I receive an invoice after ordering?',                         answer:'Yes. You will receive an invoice after placing your order.',                                                                                                                                                                                                                                                                  category:'account',       order:3,  enabled:true, showOnHomepage:false },
  { id:'dfaq14', question:'Will I receive updates about my order?',                            answer:'Yes. Order-related updates will be sent to your registered email address.',                                                                                                                                                                                                                                                   category:'account',       order:4,  enabled:true, showOnHomepage:false },
  /* ── Delivery ───────────────────────────────────────────────────────────────── */
  { id:'dfaq15', question:'Does Amahle Blue deliver across South Africa?',                     answer:'Yes. Amahle Blue delivers orders across South Africa.',                                                                                                                                                                                                                                                                       category:'delivery',      order:1,  enabled:true, showOnHomepage:true  },
  { id:'dfaq16', question:'How much does delivery cost?',                                      answer:'Delivery charges vary according to your location and order details. The applicable delivery charge will be calculated or confirmed for your order.',                                                                                                                                                                          category:'delivery',      order:2,  enabled:true, showOnHomepage:true  },
  { id:'dfaq17', question:'How long will my order take to arrive?',                            answer:'The delivery timeline depends on your order and delivery location. The expected timeline will be confirmed after your order has been placed.',                                                                                                                                                                                category:'delivery',      order:3,  enabled:true, showOnHomepage:true  },
  { id:'dfaq18', question:'Will I receive a courier tracking link?',                           answer:'Tracking availability may depend on the courier and delivery arrangement. Any available order or delivery updates will be sent to your registered email address.',                                                                                                                                                            category:'delivery',      order:4,  enabled:true, showOnHomepage:false },
  /* ── Payments ───────────────────────────────────────────────────────────────── */
  { id:'dfaq19', question:'Which payment methods do you accept?',                              answer:'Amahle Blue currently accepts Cash and EFT payments. Select the available option that suits you when placing your order.',                                                                                                                                                                                                    category:'payments',      order:1,  enabled:true, showOnHomepage:true  },
  { id:'dfaq20', question:'Do you offer instalment payments?',                                 answer:'No. Instalment payments are currently not available.',                                                                                                                                                                                                                                                                        category:'payments',      order:2,  enabled:true, showOnHomepage:false },
  { id:'dfaq21', question:'Can I use more than one coupon code on the same order?',            answer:'No. Only one coupon code can be applied to an order.',                                                                                                                                                                                                                                                                        category:'payments',      order:3,  enabled:true, showOnHomepage:false },
  { id:'dfaq22', question:'Do you offer discounts or special deals?',                          answer:'Amahle Blue may offer promotional deals such as first-order discounts, product bundles, and seasonal sales. Available offers will be shown on the website when applicable.',                                                                                                                                                  category:'payments',      order:4,  enabled:true, showOnHomepage:false },
  /* ── Cancellations & Support ────────────────────────────────────────────────── */
  { id:'dfaq23', question:'Can I cancel my order after placing it?',                           answer:'You can request cancellation after placing an order. Please contact our support team as soon as possible. Cancellation approval may depend on the current status of your order.',                                                                                                                                             category:'cancellations', order:1,  enabled:true, showOnHomepage:true  },
  { id:'dfaq24', question:'What should I do if I need help with a product or order?',          answer:'Please contact the Amahle Blue support team using the contact details shown on the website. Share your order details where applicable so the team can assist you efficiently.',                                                                                                                                               category:'cancellations', order:2,  enabled:true, showOnHomepage:false },
  { id:'dfaq25', question:'Do you accept bulk orders?',                                        answer:'Yes. Amahle Blue accepts bulk orders. Please contact our team directly to discuss the required products, quantities, and bulk pricing.',                                                                                                                                                                                      category:'cancellations', order:3,  enabled:true, showOnHomepage:true  },
];

function useFaqs() {
  const [faqs, setFaqs] = useState(DEFAULT_FAQS.filter(f => f.enabled !== false));
  useEffect(() => {
    fetch('/api/faqs')
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (Array.isArray(data) && data.length) setFaqs(data); })
      .catch(() => {});
  }, []);
  return faqs;
}

const FaqChevron = ({ open }) => (
  <svg
    width="20" height="20" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"
    className={`faq-item__icon ${open ? 'faq-item__icon--open' : 'faq-item__icon--closed'}`}
    aria-hidden="true"
  >
    <polyline points="6 9 12 15 18 9" />
  </svg>
);

function FaqAccordionItem({ item, isOpen, onToggle, index }) {
  const bodyRef = useRef(null);
  const answerId = `faq-answer-${item.id}`;
  const btnId    = `faq-btn-${item.id}`;

  return (
    <FadeReveal delay={index * 40} className="faq-item">
      <button
        id={btnId}
        onClick={onToggle}
        aria-expanded={isOpen}
        aria-controls={answerId}
        className="faq-item__btn"
      >
        <span className="faq-item__question">{item.question}</span>
        <span className="transition-colors duration-200">
          <FaqChevron open={isOpen} />
        </span>
      </button>

      <div
        id={answerId}
        role="region"
        aria-labelledby={btnId}
        ref={bodyRef}
        style={{
          maxHeight: isOpen ? (bodyRef.current ? bodyRef.current.scrollHeight + 'px' : '600px') : '0px',
          overflow: 'hidden',
          transition: 'max-height 0.38s cubic-bezier(.16,1,.3,1)',
        }}
      >
        <div className="faq-item__answer">
          {item.answer}
        </div>
      </div>
    </FadeReveal>
  );
}

export function HomepageFaqSection() {
  const allFaqs  = useFaqs();
  const [openId, setOpenId] = useState(null);

  const items = useMemo(
    () => allFaqs
      .filter(f => f.showOnHomepage && f.enabled !== false)
      .sort((a, b) => (a.order || 0) - (b.order || 0))
      .slice(0, 8),
    [allFaqs]
  );

  const goFaq = () => window.dispatchEvent(new CustomEvent('ab:go-page', { detail: 'faq' }));

  if (!items.length) return null;

  return (
    <section className="home-faq" aria-labelledby="faq-home-heading">
      <div className="home-faq__inner">
        <Reveal className="home-faq__header">
          <p className="home-faq__label">Support</p>
          <h2 id="faq-home-heading" className="home-faq__title">Frequently Asked Questions</h2>
          <p className="home-faq__desc">Quick answers to common questions about ordering, delivery, and more.</p>
        </Reveal>

        <div className="home-faq__grid">
          {items.map((item, i) => (
            <FaqAccordionItem
              key={item.id}
              item={item}
              index={i}
              isOpen={openId === item.id}
              onToggle={() => setOpenId(openId === item.id ? null : item.id)}
            />
          ))}
        </div>

        <FadeReveal delay={items.length * 40 + 80} className="home-faq__cta">
          <button onClick={goFaq} className="home-faq__btn">
            View All FAQs
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M5 12h14M12 5l7 7-7 7"/>
            </svg>
          </button>
        </FadeReveal>
      </div>
    </section>
  );
}

export function FaqPage({ onGoHome }) {
  const allFaqs = useFaqs();
  const [openId,  setOpenId]  = useState(null);
  const [search,  setSearch]  = useState('');
  const [activeCat, setActiveCat] = useState('all');

  useEffect(() => {
    const prevTitle = document.title;
    const prevDesc  = document.querySelector('meta[name="description"]')?.getAttribute('content');
    document.title  = 'FAQs | Amahle Blue Cleaning, Car-Care and Sanitising Products';
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) metaDesc.setAttribute('content', 'Find answers about Amahle Blue products, delivery across South Africa, Cash and EFT payments, product variations, discounts, cancellations, and bulk orders.');

    const schema = document.createElement('script');
    schema.id   = 'ab-faq-schema';
    schema.type = 'application/ld+json';
    schema.text = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: allFaqs
        .filter(f => f.enabled !== false)
        .map(f => ({
          '@type':          'Question',
          name:             f.question,
          acceptedAnswer:   { '@type': 'Answer', text: f.answer },
        })),
    });
    document.head.appendChild(schema);

    return () => {
      document.title = prevTitle;
      if (metaDesc && prevDesc) metaDesc.setAttribute('content', prevDesc);
      document.getElementById('ab-faq-schema')?.remove();
    };
  }, [allFaqs]);

  useEffect(() => {
    if (window.history.pushState) {
      window.history.pushState({ page: 'faq' }, '', '/faq');
    }
    const onPop = () => onGoHome?.();
    window.addEventListener('popstate', onPop);
    return () => {
      window.removeEventListener('popstate', onPop);
      if (window.history.pushState) {
        window.history.pushState({ page: 'home' }, '', '/');
      }
    };
  }, [onGoHome]);

  const q = search.trim().toLowerCase();

  const filtered = useMemo(() => {
    let items = allFaqs.filter(f => f.enabled !== false).sort((a, b) => (a.order || 0) - (b.order || 0));
    if (activeCat !== 'all') items = items.filter(f => f.category === activeCat);
    if (q) items = items.filter(f => f.question.toLowerCase().includes(q) || f.answer.toLowerCase().includes(q));
    return items;
  }, [allFaqs, activeCat, q]);

  const usedCats = useMemo(() => {
    const ids = new Set(allFaqs.filter(f => f.enabled !== false).map(f => f.category));
    return FAQ_CATEGORIES.filter(c => ids.has(c.id));
  }, [allFaqs]);

  const grouped = useMemo(() => {
    if (activeCat !== 'all' || q) return null;
    const map = {};
    usedCats.forEach(c => { map[c.id] = []; });
    filtered.forEach(f => {
      if (!map[f.category]) map[f.category] = [];
      map[f.category].push(f);
    });
    return map;
  }, [filtered, activeCat, q, usedCats]);

  const toggle = (id) => setOpenId(prev => prev === id ? null : id);

  return (
    <main className="ab-page-enter faq-page">
      <div className="faq-hero">
        <div className="faq-hero__inner">
          <button onClick={onGoHome} className="faq-hero__back" aria-label="Back to home">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
              <path d="M19 12H5M12 5l-7 7 7 7"/>
            </svg>
            Back to store
          </button>
          <h1 className="faq-hero__title">Frequently Asked Questions</h1>
          <p className="faq-hero__subtitle">Everything you need to know about ordering, delivery, and support.</p>

          <div className="faq-search">
            <svg className="faq-search__icon" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
            <input
              type="search"
              value={search}
              onChange={e => { setSearch(e.target.value); setActiveCat('all'); }}
              placeholder="Search questions or keywords…"
              aria-label="Search FAQs"
              className="faq-search__input"
            />
            {search && (
              <button onClick={() => setSearch('')} className="faq-search__clear" aria-label="Clear search">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6L6 18M6 6l12 12"/></svg>
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="faq-main">
        {!q && (
          <div className="faq-tabs" role="tablist" aria-label="FAQ categories">
            {[{ id: 'all', label: 'All Questions' }, ...usedCats].map(cat => (
              <button
                key={cat.id}
                role="tab"
                aria-selected={activeCat === cat.id}
                onClick={() => { setActiveCat(cat.id); setOpenId(null); }}
                className={`faq-tab ${activeCat === cat.id ? 'faq-tab--active' : 'faq-tab--inactive'}`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        )}

        {filtered.length === 0 && (
          <div className="faq-empty">
            <div className="faq-empty__icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
            </div>
            <p className="faq-empty__title">No results found</p>
            <p className="faq-empty__desc">
              {q ? `No FAQs match "${search}". Try different keywords.` : 'No questions in this category yet.'}
            </p>
            {q && (
              <button onClick={() => setSearch('')} className="faq-empty__clear">Clear search</button>
            )}
          </div>
        )}

        {grouped && (
          <div className="space-y-10 pb-4 mt-6">
            {usedCats
              .filter(c => (grouped[c.id] || []).length > 0)
              .map(cat => (
                <div key={cat.id} className="faq-category">
                  <h2 className="faq-category__title">{cat.label}</h2>
                  <div className="faq-list">
                    {(grouped[cat.id] || []).map((item, i) => (
                      <FaqAccordionItem
                        key={item.id}
                        item={item}
                        index={i}
                        isOpen={openId === item.id}
                        onToggle={() => toggle(item.id)}
                      />
                    ))}
                  </div>
                </div>
              ))}
          </div>
        )}

        {!grouped && filtered.length > 0 && (
          <div className="faq-list pb-4 mt-6">
            {filtered.map((item, i) => (
              <FaqAccordionItem
                key={item.id}
                item={item}
                index={i}
                isOpen={openId === item.id}
                onToggle={() => toggle(item.id)}
              />
            ))}
          </div>
        )}

        <FadeReveal className="faq-contact">
          <p className="faq-contact__label">Still need help?</p>
          <h3 className="faq-contact__title">Contact our support team</h3>
          <p className="faq-contact__desc">Can't find what you're looking for? Reach out and we'll be happy to help.</p>
          <div className="faq-contact__actions">
            <a href={BRAND?.wa} target="_blank" rel="noopener noreferrer" className="faq-contact__btn faq-contact__btn--wa">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
              Chat on WhatsApp
            </a>
            <a href={`mailto:${BRAND?.email}`} className="faq-contact__btn faq-contact__btn--email">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                <polyline points="22,6 12,13 2,6"/>
              </svg>
              Email us
            </a>
          </div>
        </FadeReveal>
      </div>
    </main>
  );
}

export default FaqPage;
