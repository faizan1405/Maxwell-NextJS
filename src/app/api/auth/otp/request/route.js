import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { connectToDatabase } from '../../../../../lib/mongoose';
import { EmailOtp, Customer } from '../../../../../lib/models';
import { sendOtpEmail } from '../../../../../lib/email';

const OTP_TTL_MS  = 10 * 60 * 1000;
const RESEND_WAIT = 60 * 1000;
const HOUR_MAX    = 5;

function hashOtp(otp) {
  const s = process.env.OTP_HASH_SECRET;
  if (s) return crypto.createHmac('sha256', s).update(String(otp)).digest('hex');
  return crypto.createHash('sha256').update(String(otp)).digest('hex');
}

export async function POST(req) {
  let body;
  try { body = await req.json(); } catch { body = {}; }

  const email = (body.email || '').trim().toLowerCase();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: 'A valid email address is required.' }, { status: 400 });
  }

  await connectToDatabase();
  const now = Date.now();

  const hourAgo   = now - 60 * 60 * 1000;
  const hourCount = await EmailOtp.countDocuments({ email, createdAt: { $gte: hourAgo } });
  if (hourCount >= HOUR_MAX) {
    return NextResponse.json({ error: 'Too many sign-in attempts. Please try again in an hour.' }, { status: 429 });
  }

  const latest = await EmailOtp.findOne({ email }).sort({ createdAt: -1 }).lean();
  if (latest && now - latest.createdAt < RESEND_WAIT) {
    const wait = Math.ceil((RESEND_WAIT - (now - latest.createdAt)) / 1000);
    return NextResponse.json(
      { error: `Please wait ${wait} seconds before requesting a new code.` },
      { status: 429 }
    );
  }

  const existing = await Customer.findOne({ email }).lean();
  const otp      = String(crypto.randomInt(100000, 1000000));

  await EmailOtp.create({
    id:        `otp_${now}_${crypto.randomBytes(4).toString('hex')}`,
    email,
    otpHash:   hashOtp(otp),
    expiresAt: now + OTP_TTL_MS,
    attempts:  0,
    consumed:  false,
    createdAt: now,
  });

  EmailOtp.deleteMany({
    email,
    $or: [{ expiresAt: { $lte: now } }, { consumed: true }],
  }).catch(() => {});

  const sent = await sendOtpEmail(email, otp, existing?.name || '');
  if (!sent.ok && !sent.dev) {
    return NextResponse.json(
      { error: 'Failed to send sign-in code. Please try again.' },
      { status: 500 }
    );
  }

  return NextResponse.json({
    ok:    true,
    isNew: !existing,
    ...(sent.dev ? { devOtp: sent.devOtp } : {}),
  });
}
