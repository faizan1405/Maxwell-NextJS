import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { connectToDatabase } from '../../../../../lib/mongoose';
import { EmailOtp, Customer, CustomerSession, Order } from '../../../../../lib/models';
import { generateSessionToken, hashSessionToken, setSessionCookie } from '../../../../../lib/customerAuth';
import { saPhoneRegexes, saPhoneVariants } from '../../../../../utils/phone';

const MAX_ATTEMPTS = 5;

function hashOtp(otp) {
  const s = process.env.OTP_HASH_SECRET;
  if (s) return crypto.createHmac('sha256', s).update(String(otp)).digest('hex');
  return crypto.createHash('sha256').update(String(otp)).digest('hex');
}

export async function POST(req) {
  let body;
  try { body = await req.json(); } catch { body = {}; }

  const email = (body.email || '').trim().toLowerCase();
  const otp   = String(body.otp || '').trim();

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: 'Invalid email address.' }, { status: 400 });
  }
  if (!/^\d{6}$/.test(otp)) {
    return NextResponse.json({ error: 'Please enter the 6-digit code from your email.' }, { status: 400 });
  }

  await connectToDatabase();
  const now = Date.now();

  const otpDoc = await EmailOtp.findOne({
    email,
    consumed:  false,
    expiresAt: { $gt: now },
    attempts:  { $lt: MAX_ATTEMPTS },
  }).sort({ createdAt: -1 });

  if (!otpDoc) {
    return NextResponse.json(
      { error: 'No valid code found. Please request a new one.' },
      { status: 400 }
    );
  }

  const expectedHash = hashOtp(otp);
  let matches = false;
  try {
    const a = Buffer.from(otpDoc.otpHash, 'hex');
    const b = Buffer.from(expectedHash, 'hex');
    matches = a.length === b.length && crypto.timingSafeEqual(a, b);
  } catch { matches = false; }

  if (!matches) {
    otpDoc.attempts += 1;
    await otpDoc.save();
    const remaining = MAX_ATTEMPTS - otpDoc.attempts;
    if (remaining <= 0) {
      return NextResponse.json(
        { error: 'Too many incorrect attempts. Please request a new code.' },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: `Incorrect code. ${remaining} attempt${remaining === 1 ? '' : 's'} remaining.` },
      { status: 400 }
    );
  }

  /* Atomic claim — prevents race-condition double-use of the same OTP.
   * findOneAndUpdate only succeeds for one concurrent request; the second
   * will get null (consumed is already true) and receive a safe error. */
  const claimed = await EmailOtp.findOneAndUpdate(
    { _id: otpDoc._id, consumed: false },
    { $set: { consumed: true } }
  );
  if (!claimed) {
    return NextResponse.json(
      { error: 'This code has already been used. Please request a new one.' },
      { status: 400 }
    );
  }

  let customer = await Customer.findOne({ email });
  const isNew  = !customer;
  if (!customer) {
    customer = await Customer.create({
      id:        `cust_${now}_${crypto.randomBytes(4).toString('hex')}`,
      email,
      name:      '',
      phone:     '',
      addresses: [],
    });
  }

  /* Link any guest orders placed with this email (or this customer's phone)
   * back to the now-authenticated customer. Without this, a guest who later
   * signs in would see "No orders" because My Orders queries by customerId
   * first. We update orders whose customerId is null (guest orders) and which
   * match the verified email or the stored phone number. Best-effort: errors
   * here must not block sign-in. */
  try {
    const phone = String(customer.phone || '').trim();
    const phoneMatches = [
      ...saPhoneVariants(phone).map(v => ({ 'customer.phone': v })),
      ...saPhoneRegexes(phone).map(regex => ({ 'customer.phone': regex })),
    ];
    const orMatch = [
      { 'customer.email': email },
      { customerEmail: email },
      ...phoneMatches,
    ];

    await Order.updateMany(
      {
        $and: [
          { $or: [{ customerId: null }, { customerId: { $exists: false } }] },
          { $or: orMatch },
        ],
      },
      { $set: { customerId: customer.id, 'customer.id': customer.id, updatedAt: now } }
    );
  } catch (e) {
    console.error('[otp/verify] guest-order backfill failed:', e.message);
  }

  const rawToken  = generateSessionToken();
  const tokenHash = hashSessionToken(rawToken);
  const expiresAt = now + 30 * 24 * 60 * 60 * 1000;

  await CustomerSession.create({
    id:         `sess_${now}_${crypto.randomBytes(4).toString('hex')}`,
    customerId: customer.id,
    email:      customer.email,
    tokenHash,
    expiresAt,
    createdAt:  now,
  });

  const response = NextResponse.json({ ok: true, customer, isNew });
  setSessionCookie(response, rawToken);
  return response;
}
