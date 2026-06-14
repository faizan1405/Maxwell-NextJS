'use client';

import React from 'react';
import { BRAND } from '../../lib/storeContext';
import { FadeReveal } from '../ui/index';

/* ── Shared back button helper ──────────────────────────────────────────────── */
function BackBtn({ onGoHome }) {
  return (
    <button onClick={onGoHome} className="faq-hero__back" aria-label="Back to home">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <polyline points="15 18 9 12 15 6" />
      </svg>
      Back to store
    </button>
  );
}

/* ── Shared section layout ──────────────────────────────────────────────────── */
function PolicySection({ title, children }) {
  return (
    <div className="policy-section">
      {title && <h2 className="policy-section__title">{title}</h2>}
      <div className="policy-section__body">{children}</div>
    </div>
  );
}

function PolicyParagraph({ children }) {
  return <p className="policy-p">{children}</p>;
}

function PolicyList({ items }) {
  return (
    <ul className="policy-list">
      {items.map((item, i) => <li key={i}>{item}</li>)}
    </ul>
  );
}

function ContactBox() {
  return (
    <div className="policy-contact-box">
      <p className="policy-contact-box__title">Questions? Contact us.</p>
      <div className="policy-contact-box__links">
        <a href={`mailto:${BRAND?.email}`} className="policy-contact-box__link">{BRAND?.email}</a>
        <span className="policy-contact-box__sep">·</span>
        <a href={`tel:${BRAND?.phoneRaw}`} className="policy-contact-box__link">{BRAND?.phone}</a>
        <span className="policy-contact-box__sep">·</span>
        <a href={BRAND?.wa} target="_blank" rel="noopener noreferrer" className="policy-contact-box__link">WhatsApp</a>
      </div>
    </div>
  );
}

/* ── Delivery Policy ─────────────────────────────────────────────────────────── */
function DeliveryPolicyContent() {
  return (
    <>
      <PolicySection title="Nationwide delivery">
        <PolicyParagraph>
          Amahle Blue delivers orders across South Africa. We work with reputable couriers to get your order to you as quickly and safely as possible.
        </PolicyParagraph>
      </PolicySection>

      <PolicySection title="Delivery charges">
        <PolicyParagraph>
          Delivery charges are calculated at checkout based on your delivery province and order total. Free delivery is available on qualifying orders in Gauteng (minimum order threshold applies — check your cart for the current amount).
        </PolicyParagraph>
        <PolicyParagraph>
          For deliveries outside Gauteng, a delivery fee is quoted and displayed at checkout before you confirm your order.
        </PolicyParagraph>
      </PolicySection>

      <PolicySection title="Estimated delivery times">
        <PolicyParagraph>
          Delivery timelines are estimates and may vary depending on your location, courier availability, and peak periods. Typical estimates from dispatch:
        </PolicyParagraph>
        <PolicyList items={[
          'Gauteng — 1 to 3 business days',
          'Major centres (Cape Town, Durban, Port Elizabeth, East London) — 2 to 4 business days',
          'Other provinces and remote areas — 3 to 7 business days',
        ]} />
        <PolicyParagraph>
          Orders are typically dispatched within 1 to 2 business days after payment is confirmed. EFT orders are dispatched after the bank transfer is verified by our team.
        </PolicyParagraph>
      </PolicySection>

      <PolicySection title="Payment methods and dispatch">
        <PolicyList items={[
          'EFT / Bank Transfer — order is held until your payment is verified. Please upload your proof of payment through your account or contact us directly to speed up verification.',
          'Cash on Delivery (COD) — available in selected areas. Payment is collected at the time of delivery.',
        ]} />
      </PolicySection>

      <PolicySection title="Tracking your order">
        <PolicyParagraph>
          Once your order is dispatched, tracking updates will be sent to the email address you provided at checkout. You can also view your order status in your account under My Orders.
        </PolicyParagraph>
        <PolicyParagraph>
          Tracking availability may depend on the courier used for your specific delivery.
        </PolicyParagraph>
      </PolicySection>

      <PolicySection title="Delivery address">
        <PolicyParagraph>
          Please ensure your delivery address is accurate and complete at checkout. Amahle Blue is not responsible for failed or delayed deliveries caused by incorrect or incomplete address details provided by the customer.
        </PolicyParagraph>
      </PolicySection>

      <PolicySection title="Bulk and trade orders">
        <PolicyParagraph>
          For large or bulk orders, delivery arrangements may be handled separately. Please contact us on WhatsApp or email to discuss your requirements before placing a bulk order.
        </PolicyParagraph>
      </PolicySection>

      <ContactBox />
    </>
  );
}

/* ── Returns & Refund Policy ─────────────────────────────────────────────────── */
function ReturnsPolicyContent() {
  return (
    <>
      <PolicySection title="Our commitment">
        <PolicyParagraph>
          We want you to be satisfied with every Amahle Blue order. If something is wrong with your order, please contact us as soon as possible so we can make it right.
        </PolicyParagraph>
      </PolicySection>

      <PolicySection title="Damaged or incorrect items">
        <PolicyParagraph>
          If you receive a damaged product or the wrong item, please contact us within 7 days of delivery with:
        </PolicyParagraph>
        <PolicyList items={[
          'Your order number',
          'A brief description of the issue',
          'Clear photos of the damaged or incorrect item',
        ]} />
        <PolicyParagraph>
          We will arrange a replacement or refund for verified claims. Please do not discard the damaged item before we have assessed your claim.
        </PolicyParagraph>
      </PolicySection>

      <PolicySection title="Change of mind returns">
        <PolicyParagraph>
          Change of mind returns are accepted on a case-by-case basis within 7 days of delivery, provided the product is:
        </PolicyParagraph>
        <PolicyList items={[
          'Unopened and in its original, sealed packaging',
          'In a resaleable condition with no damage',
          'Returned at the customer\'s expense',
        ]} />
        <PolicyParagraph>
          Opened cleaning products, sanitisers, and chemical formulations cannot be returned for safety and hygiene reasons.
        </PolicyParagraph>
      </PolicySection>

      <PolicySection title="How to request a return or refund">
        <PolicyParagraph>
          To start a return or refund request, contact us on WhatsApp, by email, or by phone with your order number and the reason for the return. Do not send items back without first confirming the return with our team.
        </PolicyParagraph>
        <PolicyList items={[
          `Email: ${BRAND?.email}`,
          `Phone / WhatsApp: ${BRAND?.phone}`,
        ]} />
      </PolicySection>

      <PolicySection title="Refund processing">
        <PolicyParagraph>
          Once a refund is approved, it will be processed to your original payment method within 5 to 7 business days. EFT refunds will be paid to the bank account used for the original payment. Please provide your banking details when making your refund request.
        </PolicyParagraph>
      </PolicySection>

      <PolicySection title="Non-returnable items">
        <PolicyList items={[
          'Opened or used cleaning products, sanitisers, or chemical formulations',
          'Products purchased under a special promotion or final sale (noted at time of purchase)',
          'Products damaged after delivery due to customer handling or misuse',
        ]} />
      </PolicySection>

      <ContactBox />
    </>
  );
}

/* ── Privacy Policy ──────────────────────────────────────────────────────────── */
function PrivacyPolicyContent() {
  return (
    <>
      <PolicySection title="Who we are">
        <PolicyParagraph>
          Amahle Blue Cleaning Solutions is a South African business that manufactures and sells cleaning, car-care, and sanitising products. We are committed to protecting your personal information in accordance with the Protection of Personal Information Act (POPIA) of South Africa.
        </PolicyParagraph>
        <PolicyParagraph>
          Business address: {BRAND?.address}
        </PolicyParagraph>
      </PolicySection>

      <PolicySection title="What information we collect">
        <PolicyParagraph>
          When you place an order or register an account, we collect:
        </PolicyParagraph>
        <PolicyList items={[
          'Name and contact details (email address, phone number)',
          'Delivery address',
          'Payment method selection (EFT or COD — we do not store card numbers)',
          'Order history and purchase activity',
          'Proof of payment documents (uploaded by you for EFT orders)',
        ]} />
        <PolicyParagraph>
          We also collect basic usage data (such as pages visited) to improve the website experience.
        </PolicyParagraph>
      </PolicySection>

      <PolicySection title="How we use your information">
        <PolicyList items={[
          'To process and fulfil your orders',
          'To send you order confirmations, updates, and invoices',
          'To respond to queries and support requests',
          'To verify EFT payments and match proof of payment to orders',
          'To notify you of promotions or new products (only if you have opted in via the newsletter)',
          'To comply with legal and regulatory obligations',
        ]} />
      </PolicySection>

      <PolicySection title="Who we share your information with">
        <PolicyParagraph>
          We do not sell your personal information to third parties. Your information may be shared with:
        </PolicyParagraph>
        <PolicyList items={[
          'Courier and logistics partners — to deliver your order to the correct address',
          'Email service providers — to send order confirmations and updates',
          'IT and hosting providers — to operate our website and store systems securely',
        ]} />
        <PolicyParagraph>
          All third parties are required to handle your data responsibly and only for the purpose stated.
        </PolicyParagraph>
      </PolicySection>

      <PolicySection title="Cookies">
        <PolicyParagraph>
          Our website uses essential cookies to keep your cart, session, and preferences working correctly. We do not use advertising or tracking cookies. By using the website, you agree to the use of these essential cookies.
        </PolicyParagraph>
      </PolicySection>

      <PolicySection title="Your rights">
        <PolicyParagraph>
          Under POPIA, you have the right to:
        </PolicyParagraph>
        <PolicyList items={[
          'Access the personal information we hold about you',
          'Request correction of inaccurate information',
          'Request deletion of your personal information (subject to legal retention requirements)',
          'Opt out of marketing communications at any time',
        ]} />
        <PolicyParagraph>
          To exercise any of these rights, contact us at the details below.
        </PolicyParagraph>
      </PolicySection>

      <PolicySection title="Data retention">
        <PolicyParagraph>
          We retain your order and account data for as long as necessary to fulfil the purposes above, or as required by South African law. Once data is no longer needed, it is securely deleted.
        </PolicyParagraph>
      </PolicySection>

      <PolicySection title="Policy updates">
        <PolicyParagraph>
          We may update this Privacy Policy from time to time. The current version will always be available on this page. Significant changes will be communicated to registered customers by email.
        </PolicyParagraph>
      </PolicySection>

      <ContactBox />
    </>
  );
}

/* ── Terms and Conditions ────────────────────────────────────────────────────── */
function TermsContent() {
  return (
    <>
      <PolicySection title="Acceptance of terms">
        <PolicyParagraph>
          By placing an order on this website, you confirm that you are at least 18 years old and that you agree to these Terms and Conditions. If you do not agree, please do not use this website or place an order.
        </PolicyParagraph>
      </PolicySection>

      <PolicySection title="Products and pricing">
        <PolicyParagraph>
          All products are subject to availability. We reserve the right to discontinue or modify any product at any time without prior notice.
        </PolicyParagraph>
        <PolicyParagraph>
          Prices displayed on the website are inclusive of VAT at the applicable South African rate. Prices may change without notice. The price confirmed at the time of your order will apply to that order.
        </PolicyParagraph>
      </PolicySection>

      <PolicySection title="Order placement and acceptance">
        <PolicyParagraph>
          Placing an order on this website constitutes an offer to purchase the selected products. Your order is accepted when we confirm it by email. We reserve the right to cancel or refuse any order at our discretion, including in cases of:
        </PolicyParagraph>
        <PolicyList items={[
          'Suspected fraudulent or abusive activity',
          'Product unavailability after order placement',
          'Errors in pricing or product descriptions',
          'Failure to confirm payment within the required timeframe (EFT orders)',
        ]} />
        <PolicyParagraph>
          If your order is cancelled by us, you will be notified and any payment received will be refunded.
        </PolicyParagraph>
      </PolicySection>

      <PolicySection title="Payment">
        <PolicyParagraph>
          We accept EFT (bank transfer) and Cash on Delivery (COD) where available. EFT orders are held until payment is received and manually verified by our team. You are responsible for providing accurate payment references and uploading proof of payment within a reasonable time after placing your order.
        </PolicyParagraph>
        <PolicyParagraph>
          Amahle Blue is not responsible for lost or misdirected EFT payments caused by incorrect banking details entered by the customer. Always verify the bank details shown on your order confirmation or invoice before making a transfer.
        </PolicyParagraph>
      </PolicySection>

      <PolicySection title="Delivery">
        <PolicyParagraph>
          Delivery is subject to our Delivery Policy. Estimated delivery times are provided as a guide only and are not guaranteed. Amahle Blue is not liable for delays caused by couriers, force majeure events, or incorrect address information provided by the customer.
        </PolicyParagraph>
      </PolicySection>

      <PolicySection title="Returns and refunds">
        <PolicyParagraph>
          Returns and refunds are subject to our Returns and Refund Policy. Please review that policy before placing your order.
        </PolicyParagraph>
      </PolicySection>

      <PolicySection title="Product use and safety">
        <PolicyParagraph>
          Always read the product label and follow the instructions provided before using any Amahle Blue product. Amahle Blue is not liable for any damage, injury, or loss resulting from misuse of a product, use contrary to label instructions, or use for an unintended purpose.
        </PolicyParagraph>
      </PolicySection>

      <PolicySection title="Limitation of liability">
        <PolicyParagraph>
          To the maximum extent permitted by South African law, Amahle Blue's liability for any claim related to a purchase is limited to the value of the order in question. We are not liable for indirect, incidental, or consequential losses.
        </PolicyParagraph>
      </PolicySection>

      <PolicySection title="Intellectual property">
        <PolicyParagraph>
          All content on this website — including product names, images, descriptions, and the Amahle Blue brand — is the property of Amahle Blue Cleaning Solutions. You may not copy, reproduce, or use any content without prior written permission.
        </PolicyParagraph>
      </PolicySection>

      <PolicySection title="Governing law">
        <PolicyParagraph>
          These Terms and Conditions are governed by the laws of the Republic of South Africa. Any disputes will be subject to the jurisdiction of the South African courts.
        </PolicyParagraph>
      </PolicySection>

      <PolicySection title="Contact">
        <PolicyParagraph>
          If you have questions about these terms, contact us at the details below.
        </PolicyParagraph>
      </PolicySection>

      <ContactBox />
    </>
  );
}

/* ── Policy page config ──────────────────────────────────────────────────────── */
const POLICY_CONFIG = {
  'delivery-policy': {
    title: 'Delivery Policy',
    subtitle: 'How we get your order to you across South Africa.',
    Content: DeliveryPolicyContent,
  },
  'returns-refunds': {
    title: 'Returns & Refund Policy',
    subtitle: 'What to do if something is wrong with your order.',
    Content: ReturnsPolicyContent,
  },
  'privacy-policy': {
    title: 'Privacy Policy',
    subtitle: 'How we collect, use, and protect your personal information.',
    Content: PrivacyPolicyContent,
  },
  'terms-conditions': {
    title: 'Terms & Conditions',
    subtitle: 'The terms that apply when you use this website and place an order.',
    Content: TermsContent,
  },
};

/* ── PolicyPage (main export) ────────────────────────────────────────────────── */
export function PolicyPage({ type, onGoHome }) {
  const config = POLICY_CONFIG[type];
  if (!config) return null;

  const { title, subtitle, Content } = config;

  return (
    <div className="policy-page ab-page-enter">
      {/* Dark hero header — matches FAQ page pattern */}
      <div className="faq-hero">
        <div className="faq-hero__inner">
          <BackBtn onGoHome={onGoHome} />
          <h1 className="faq-hero__title">{title}</h1>
          <p className="faq-hero__subtitle">{subtitle}</p>
          <p className="policy-last-updated">Last updated: June 2026</p>
        </div>
      </div>

      {/* Content */}
      <div className="policy-body">
        <FadeReveal className="policy-body__inner">
          <Content />
          <div className="policy-back-top">
            <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="policy-back-top__btn">
              ↑ Back to top
            </button>
          </div>
        </FadeReveal>
      </div>
    </div>
  );
}

export default PolicyPage;
