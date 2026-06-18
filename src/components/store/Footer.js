'use client';

import React from 'react';
import { Truck, Lock, Award, Whatsapp, Facebook, Instagram, MapPin, Phone, Mail, Tag } from '../ui/Icons';
import { BRAND, DEFAULT_CATEGORIES, FREE_SHIP, money, useProducts } from '../../lib/storeContext';
import { FadeReveal } from '../ui/index';
import { Wordmark } from './Header';

const scrollToHomeSection = (section) => {
  if (typeof window === 'undefined') return;
  let attempts = 0;
  const tryScroll = () => {
    const el = document.getElementById(section);
    if (el) {
      window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 110, behavior: 'smooth' });
      return;
    }
    attempts += 1;
    if (attempts < 10) setTimeout(tryScroll, 80);
  };
  setTimeout(tryScroll, 50);
};

export const Footer = ({ onShopCat }) => {
  const { categories } = useProducts();
  const shopCategories = (Array.isArray(categories) && categories.length > 0)
    ? categories
    : DEFAULT_CATEGORIES;
  return (
  <footer className="footer">
    <div className="footer__inner">
      {/* mini trust row */}
      <div className="footer-trust">
        {[
          { icon: Tag, t: "Bulk supply available", s: "5L, 20L & wholesale volumes" },
          { icon: Truck, t: "Reliable nationwide delivery", s: `Free over ${money(FREE_SHIP)} in Gauteng` },
          { icon: Award, t: "Commercial-grade quality", s: "Tested, consistent batches" },
          { icon: Whatsapp, t: "WhatsApp sales support", s: "Fast quotes & enquiries" },
        ].map((x, i) => (
          <FadeReveal key={x.t} delay={i * 60} className="footer-trust__item">
            <span className="footer-trust__icon"><x.icon size={20} /></span>
            <div className="footer-trust__text">
              <p className="footer-trust__title">{x.t}</p>
              <p className="footer-trust__desc">{x.s}</p>
            </div>
          </FadeReveal>
        ))}
      </div>

      <div className="footer-main">
        <div className="footer-about">
          <Wordmark light />
          <p className="footer-about__desc">A South African B2B supplier of commercial &amp; industrial cleaning products — bulk laundry, household, car-care and sanitiser supplies for offices, schools, factories, hospitality and cleaning contractors. Quote-based and wholesale supply, delivered nationwide.</p>
          <div className="footer-socials">
            <a href={BRAND?.facebook} target="_blank" rel="noopener noreferrer" className="footer-socials__link" aria-label="Facebook"><Facebook size={18} /></a>
            <a href={BRAND?.instagram} target="_blank" rel="noopener noreferrer" className="footer-socials__link" aria-label="Instagram"><Instagram size={18} /></a>
            <a href={BRAND?.wa} target="_blank" rel="noopener noreferrer" className="footer-socials__link footer-socials__link--wa" aria-label="WhatsApp"><Whatsapp size={18} /></a>
          </div>
        </div>

        <div className="footer-links">
          <h4 className="footer-links__title">Product Range</h4>
          <ul className="footer-links__list">
            {shopCategories.map(c => (
              <li key={c.id}>
                <a href={`/category/${c.id}`} className="footer-links__link" style={{ textDecoration: 'none' }}>{c.name}</a>
              </li>
            ))}
            <li><a href="/shop" onClick={(e) => {
              if (onShopCat) {
                e.preventDefault();
                onShopCat("all");
              }
            }} className="footer-links__link" style={{ textDecoration: 'none' }}>All Products</a></li>
          </ul>
        </div>

        <div className="footer-links">
          <h4 className="footer-links__title">Company</h4>
          <ul className="footer-links__list">
            <li>
              <button onClick={(e) => {
                e.preventDefault();
                if (typeof window !== 'undefined') {
                  window.dispatchEvent(new CustomEvent('ab:go-page', { detail: { page: 'home', url: '/#about' } }));
                  scrollToHomeSection('about');
                }
              }} className="footer-links__link">About us</button>
            </li>
            <li>
              <button onClick={(e) => {
                e.preventDefault();
                if (typeof window !== 'undefined') {
                  window.dispatchEvent(new CustomEvent('ab:go-page', { detail: { page: 'home', url: '/#contact' } }));
                  scrollToHomeSection('contact');
                }
              }} className="footer-links__link">Contact</button>
            </li>
            <li><a href={`${BRAND?.wa}?text=${encodeURIComponent("Hi Amahle Blue, I'd like to inquire about bulk and trade pricing.")}`} target="_blank" rel="noopener noreferrer" className="footer-links__link">Bulk &amp; trade</a></li>
            <li>
              <button onClick={() => typeof window !== 'undefined' && window.dispatchEvent(new CustomEvent('ab:go-page', { detail: { page: 'faq', url: '/faq' } }))} className="footer-links__link">FAQs</button>
            </li>
          </ul>
        </div>

        <div className="footer-links">
          <h4 className="footer-links__title">Policies</h4>
          <ul className="footer-links__list">
            <li>
              <button onClick={() => typeof window !== 'undefined' && window.dispatchEvent(new CustomEvent('ab:go-page', { detail: { page: 'delivery-policy', url: '/delivery-policy' } }))} className="footer-links__link">Delivery Policy</button>
            </li>
            <li>
              <button onClick={() => typeof window !== 'undefined' && window.dispatchEvent(new CustomEvent('ab:go-page', { detail: { page: 'returns-refunds', url: '/returns-refunds' } }))} className="footer-links__link">Returns &amp; Refunds</button>
            </li>
            <li>
              <button onClick={() => typeof window !== 'undefined' && window.dispatchEvent(new CustomEvent('ab:go-page', { detail: { page: 'privacy-policy', url: '/privacy-policy' } }))} className="footer-links__link">Privacy Policy</button>
            </li>
            <li>
              <button onClick={() => typeof window !== 'undefined' && window.dispatchEvent(new CustomEvent('ab:go-page', { detail: { page: 'terms-conditions', url: '/terms-conditions' } }))} className="footer-links__link">Terms &amp; Conditions</button>
            </li>
          </ul>
        </div>

        <div className="footer-contact">
          <h4 className="footer-links__title">Get in touch</h4>
          <ul className="footer-contact__list">
            <li className="footer-contact__item">
              <MapPin size={18} className="footer-contact__icon" /> 
              <span className="footer-contact__text">{BRAND?.address}</span>
            </li>
            <li className="footer-contact__item">
              <Phone size={18} className="footer-contact__icon" /> 
              <a href={`tel:${BRAND?.phoneRaw}`} className="footer-contact__text footer-contact__text--link">{BRAND?.phone}</a>
            </li>
            <li className="footer-contact__item">
              <Mail size={18} className="footer-contact__icon" /> 
              <a href={`mailto:${BRAND?.email}`} className="footer-contact__text footer-contact__text--link">{BRAND?.email}</a>
            </li>
          </ul>
        </div>
      </div>

      <div className="footer-bottom">
        <span>© 2026 Amahle Blue Cleaning Solutions. All rights reserved.</span>
        <span className="footer-bottom__badges">
          <span>Secure payments</span>
          <span className="footer-bottom__secure"><Lock size={13} /> SSL encrypted</span>
          <span className="footer-bottom__made">Made in 🇿🇦</span>
        </span>
      </div>
    </div>
  </footer>
  );
};

export const WhatsappFab = () => (
  <a href={`${BRAND?.wa}?text=${encodeURIComponent("Hello Amahle Blue Sales Team, I'd like to request a quote for bulk cleaning products.")}`} target="_blank" rel="noopener noreferrer"
    className="wa-fab group" aria-label="WhatsApp our sales team">
    <Whatsapp size={26} />
    <span className="wa-fab__text">WhatsApp Sales</span>
  </a>
);

export default Footer;
