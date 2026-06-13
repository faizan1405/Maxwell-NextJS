import crypto from 'crypto';
import { connectToDatabase } from './mongoose';
import { CustomerSession } from './models';

const COOKIE = 'ab_cust_session';

export function generateSessionToken() {
  return crypto.randomBytes(32).toString('hex');
}

export function hashSessionToken(raw) {
  const secret = process.env.SESSION_SECRET;
  if (secret) return crypto.createHmac('sha256', secret).update(raw).digest('hex');
  return crypto.createHash('sha256').update(raw).digest('hex');
}

export function setSessionCookie(res, rawToken) {
  const secure = process.env.NODE_ENV === 'production' || !!process.env.VERCEL_ENV;
  res.cookies.set(COOKIE, rawToken, {
    httpOnly: true,
    secure,
    sameSite: 'lax',
    maxAge: 30 * 24 * 60 * 60,
    path: '/',
  });
}

export function clearSessionCookie(res) {
  res.cookies.set(COOKIE, '', {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    maxAge: 0,
    path: '/',
  });
}

export async function verifyCustomerCookie(req) {
  const cookie = req.cookies.get(COOKIE);
  if (!cookie?.value) return null;

  const tokenHash = hashSessionToken(cookie.value);
  await connectToDatabase();

  const session = await CustomerSession.findOne({
    tokenHash,
    expiresAt: { $gt: Date.now() },
  }).lean();

  if (!session) return null;
  return { customerId: session.customerId, email: session.email };
}
