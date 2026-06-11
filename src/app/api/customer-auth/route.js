import { NextResponse } from 'next/server';
import crypto from 'crypto';
import nodemailer from 'nodemailer';
import { connectToDatabase } from '../../../lib/mongoose';
import { Customer } from '../../../lib/models';
import { signCustomerJwt, verifyCustomerJwt, verifyCustomerSession } from '../../../lib/auth';

const _rateLimits = new Map();
const RL_MAX = 3;
const RL_WINDOW = 15 * 60 * 1000;

function checkRateLimit(email) {
  const now = Date.now();
  const key = email.toLowerCase();
  const hits = (_rateLimits.get(key) || []).filter(t => now - t < RL_WINDOW);
  if (hits.length >= RL_MAX) {
    const retryAfter = Math.ceil((hits[0] + RL_WINDOW - now) / 60000);
    return { limited: true, retryAfter };
  }
  hits.push(now);
  _rateLimits.set(key, hits);
  return { limited: false };
}

function generateOtp() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function createOtpToken(email, otp) {
  return signCustomerJwt({
    email: email.toLowerCase(),
    otpHash: crypto.createHash('sha256').update(otp).digest('hex'),
    type: 'otp_verify',
    exp: Math.floor(Date.now() / 1000) + 600,
    iat: Math.floor(Date.now() / 1000),
  });
}

function verifyOtpToken(token, otp) {
  const p = verifyCustomerJwt(token);
  if (!p || p.type !== 'otp_verify') return null;
  const expected = crypto.createHash('sha256').update(String(otp).trim()).digest('hex');
  try {
    const a = Buffer.from(p.otpHash, 'hex');
    const b = Buffer.from(expected, 'hex');
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  } catch { return null; }
  return p;
}

function createSessionToken(customer) {
  return signCustomerJwt({
    customerId: customer.id,
    email: customer.email,
    type: 'customer_session',
    exp: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60,
    iat: Math.floor(Date.now() / 1000),
  });
}

function buildOtpHtml(otp, name) {
  const hi = name ? `Hi ${name.split(' ')[0]},` : 'Hi there,';
  return `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width"/></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:Helvetica,Arial,sans-serif;">
<div style="max-width:500px;margin:40px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(11,37,69,.10);">
  <div style="background:linear-gradient(135deg,#1E50E0,#0B2545);padding:32px 40px;text-align:center;">
    <p style="color:#7FC4FF;font-size:11px;letter-spacing:3px;text-transform:uppercase;margin:0 0 6px;">Amahle Blue</p>
    <h1 style="color:#fff;font-size:20px;font-weight:800;margin:0;">Your sign-in code</h1>
  </div>
  <div style="padding:36px 40px;">
    <p style="color:#0B2545;font-size:15px;font-weight:600;margin:0 0 6px;">${hi}</p>
    <p style="color:#64748b;font-size:14px;line-height:1.6;margin:0 0 28px;">Use the code below to sign in to your Amahle Blue account. It expires in <strong>10 minutes</strong>.</p>
    <div style="background:#f1f5f9;border-radius:12px;padding:24px;text-align:center;margin-bottom:24px;">
      <p style="color:#64748b;font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;margin:0 0 10px;">Sign-in code</p>
      <div style="font-size:44px;font-weight:800;color:#1E50E0;letter-spacing:12px;font-family:monospace;">${otp}</div>
    </div>
    <p style="color:#94a3b8;font-size:12px;line-height:1.6;margin:0;">Didn't request this? You can safely ignore this email — your account is secure.</p>
  </div>
  <div style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:18px 40px;text-align:center;">
    <p style="color:#94a3b8;font-size:11px;margin:0;">© 2026 Amahle Blue Cleaning Solutions · Made in 🇿🇦</p>
  </div>
</div>
</body>
</html>`;
}

async function sendOtpEmail(email, otp, name) {
  const RESEND_KEY = process.env.RESEND_API_KEY;
  const GMAIL_USER = process.env.GMAIL_USER;
  const GMAIL_PASS = process.env.GMAIL_APP_PASSWORD;
  const subject = `${otp} — Your Amahle Blue sign-in code`;
  const html = buildOtpHtml(otp, name);
  const isLocal = !process.env.VERCEL_ENV && process.env.NODE_ENV !== 'production';

  if (!RESEND_KEY && !GMAIL_USER) {
    if (isLocal) {
      console.log(`[DEV] OTP for ${email}: ${otp}`);
      return { ok: true, dev: true, devOtp: otp };
    }
    console.error('[OTP] No email provider configured in production');
    return { ok: false };
  }

  if (RESEND_KEY) {
    try {
      const FROM = process.env.FROM_EMAIL || 'Amahle Blue <noreply@amahle-blue.co.za>';
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${RESEND_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ from: FROM, to: [email], subject, html }),
      });
      if (res.ok) return { ok: true };
    } catch (e) {}
  }

  if (GMAIL_USER && GMAIL_PASS) {
    try {
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: { user: GMAIL_USER, pass: GMAIL_PASS },
      });
      await transporter.sendMail({
        from: `Amahle Blue <${GMAIL_USER}>`,
        to: email,
        subject,
        html,
      });
      return { ok: true };
    } catch (e) {
      console.error('Gmail SMTP error:', e.message);
    }
  }

  return { ok: false };
}

export async function GET(req) {
  await connectToDatabase();
  const session = verifyCustomerSession(req);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const customer = await Customer.findOne({ id: session.customerId });
  if (!customer) return NextResponse.json({ error: 'Account not found' }, { status: 404 });

  return NextResponse.json({ ok: true, customer });
}

export async function PATCH(req) {
  await connectToDatabase();
  const session = verifyCustomerSession(req);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await req.json();
    const patch = {};
    if (body.name !== undefined) patch.name = String(body.name).trim().slice(0, 100);
    if (body.phone !== undefined) patch.phone = String(body.phone).trim().slice(0, 30);

    const customer = await Customer.findOneAndUpdate(
      { id: session.customerId },
      { $set: patch },
      { new: true }
    );

    if (!customer) return NextResponse.json({ error: 'Account not found' }, { status: 404 });

    return NextResponse.json({ ok: true, customer });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req) {
  await connectToDatabase();
  try {
    const body = await req.json();
    const { action } = body || {};

    if (action === 'sendOtp') {
      const email = (body.email || '').trim().toLowerCase();
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return NextResponse.json({ error: 'A valid email address is required.' }, { status: 400 });
      }

      const rl = checkRateLimit(email);
      if (rl.limited) {
        return NextResponse.json({
          error: `Too many requests. Try again in ${rl.retryAfter} minute${rl.retryAfter !== 1 ? 's' : ''}.`,
        }, { status: 429 });
      }

      const existing = await Customer.findOne({ email });
      const otp = generateOtp();
      let otpToken;
      try {
        otpToken = createOtpToken(email, otp);
      } catch (e) {
        console.error('[customer-auth] secret missing:', e.message);
        return NextResponse.json({ error: 'Auth service is misconfigured. Please contact support.' }, { status: 500 });
      }

      const sent = await sendOtpEmail(email, otp, existing?.name || '');
      if (!sent.ok && !sent.dev) {
        return NextResponse.json({ error: 'Failed to send sign-in code. Please try again in a moment.' }, { status: 500 });
      }

      return NextResponse.json({
        ok: true,
        otpToken,
        isNew: !existing,
        ...(sent.dev ? { devOtp: sent.devOtp } : {}),
      });
    }

    if (action === 'verifyOtp') {
      const { otpToken, otp } = body;
      if (!otpToken || !otp) return NextResponse.json({ error: 'OTP token and code are required.' }, { status: 400 });
      if (!/^\\d{6}$/.test(String(otp).trim())) return NextResponse.json({ error: 'Invalid code. Please enter the 6-digit code from your email.' }, { status: 400 });

      const payload = verifyOtpToken(otpToken, String(otp).trim());
      if (!payload) return NextResponse.json({ error: 'Invalid or expired code. Please try again.' }, { status: 400 });

      let customer = await Customer.findOne({ email: payload.email });
      const isNew = !customer;

      if (!customer) {
        customer = await Customer.create({
          id: `cust_${Date.now()}`,
          email: payload.email,
          name: '',
          phone: '',
          addresses: [],
        });
      }

      let sessionToken;
      try {
        sessionToken = createSessionToken(customer);
      } catch (e) {
        console.error('[customer-auth] session sign failed:', e.message);
        return NextResponse.json({ error: 'Auth service is misconfigured. Please contact support.' }, { status: 500 });
      }

      const expiresAt = Date.now() + 30 * 24 * 60 * 60 * 1000;
      return NextResponse.json({ ok: true, customer, sessionToken, expiresAt, isNew });
    }

    if (action === 'logout') return NextResponse.json({ ok: true });

    const session = verifyCustomerSession(req);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const customer = await Customer.findOne({ id: session.customerId });
    if (!customer) return NextResponse.json({ error: 'Account not found' }, { status: 404 });

    if (action === 'addAddress') {
      const { address } = body;
      if (!address || !address.line || !address.city) return NextResponse.json({ error: 'Address line and city are required.' }, { status: 400 });

      const newAddr = {
        id: `addr_${Date.now()}`,
        label: String(address.label || 'Home').trim(),
        line: String(address.line).trim(),
        city: String(address.city).trim(),
        province: String(address.province || '').trim(),
        postalCode: String(address.postalCode || '').trim(),
        isDefault: customer.addresses.length === 0 || !!address.isDefault,
      };

      let addresses = customer.addresses.map(a =>
        newAddr.isDefault ? { ...a, isDefault: false } : a
      );
      addresses.push(newAddr);

      customer.addresses = addresses;
      await Customer.updateOne({ id: session.customerId }, { $set: { addresses } });

      return NextResponse.json({ ok: true, customer: await Customer.findOne({ id: session.customerId }) });
    }

    if (action === 'updateAddress') {
      const { addressId, address } = body;
      if (!addressId) return NextResponse.json({ error: 'addressId is required.' }, { status: 400 });

      let addresses = customer.addresses.map(a => {
        if (a.id !== addressId) return address?.isDefault ? { ...a, isDefault: false } : a;
        return {
          ...a,
          label:      address.label      !== undefined ? String(address.label).trim() : a.label,
          line:       address.line       !== undefined ? String(address.line).trim() : a.line,
          city:       address.city       !== undefined ? String(address.city).trim() : a.city,
          province:   address.province   !== undefined ? String(address.province).trim() : a.province,
          postalCode: address.postalCode !== undefined ? String(address.postalCode).trim() : a.postalCode,
          isDefault:  address.isDefault  !== undefined ? !!address.isDefault : a.isDefault,
        };
      });

      await Customer.updateOne({ id: session.customerId }, { $set: { addresses } });
      return NextResponse.json({ ok: true, customer: await Customer.findOne({ id: session.customerId }) });
    }

    if (action === 'deleteAddress') {
      const { addressId } = body;
      if (!addressId) return NextResponse.json({ error: 'addressId is required.' }, { status: 400 });

      let addresses = customer.addresses.filter(a => a.id !== addressId);
      if (addresses.length > 0 && !addresses.some(a => a.isDefault)) {
        addresses[0].isDefault = true;
      }

      await Customer.updateOne({ id: session.customerId }, { $set: { addresses } });
      return NextResponse.json({ ok: true, customer: await Customer.findOne({ id: session.customerId }) });
    }

    if (action === 'setDefaultAddress') {
      const { addressId } = body;
      if (!addressId) return NextResponse.json({ error: 'addressId is required.' }, { status: 400 });

      const addresses = customer.addresses.map(a => ({ ...a, isDefault: a.id === addressId }));
      await Customer.updateOne({ id: session.customerId }, { $set: { addresses } });
      return NextResponse.json({ ok: true, customer: await Customer.findOne({ id: session.customerId }) });
    }

    return NextResponse.json({ error: 'Unknown action.' }, { status: 400 });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-filename',
    },
  });
}

