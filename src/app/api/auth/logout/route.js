import { NextResponse } from 'next/server';
import { connectToDatabase } from '../../../../lib/mongoose';
import { CustomerSession } from '../../../../lib/models';
import { hashSessionToken, clearSessionCookie } from '../../../../lib/customerAuth';

const COOKIE = 'ab_cust_session';

export async function POST(req) {
  const cookie = req.cookies.get(COOKIE);
  if (cookie?.value) {
    await connectToDatabase();
    const hash = hashSessionToken(cookie.value);
    await CustomerSession.deleteOne({ tokenHash: hash }).catch(() => {});
  }

  const response = NextResponse.json({ ok: true });
  clearSessionCookie(response);
  return response;
}
