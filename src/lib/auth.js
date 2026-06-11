import crypto from 'crypto';

const IS_PROD = process.env.NODE_ENV === 'production' || (process.env.VERCEL_ENV && process.env.VERCEL_ENV !== 'development');
const SECRET  = process.env.ADMIN_JWT_SECRET
  || (IS_PROD ? null : 'dev-admin-secret-' + (process.env.VERCEL_URL || 'local'));

function b64url(buf) {
  return Buffer.from(buf).toString('base64url');
}

export function signJwt(payload) {
  if (!SECRET) throw new Error('ADMIN_JWT_SECRET is not configured');
  const header  = b64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body    = b64url(JSON.stringify(payload));
  const sig     = crypto.createHmac('sha256', SECRET).update(`${header}.${body}`).digest('base64url');
  return `${header}.${body}.${sig}`;
}

export function verifyJwt(token) {
  if (!SECRET) return null;
  try {
    const [header, body, sig] = (token || '').split('.');
    if (!header || !body || !sig) return null;
    const expected = crypto.createHmac('sha256', SECRET).update(`${header}.${body}`).digest('base64url');
    const sigBuf = Buffer.from(sig, 'base64url');
    const expBuf = Buffer.from(expected, 'base64url');
    if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) return null;
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString());
    if (typeof payload.exp !== 'number' || payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

export function verifySession(req) {
  // req is NextRequest in App Router
  const header = req.headers.get('authorization') || '';
  const token  = header.startsWith('Bearer ') ? header.slice(7).trim() : null;
  if (!token) return null;
  return verifyJwt(token);
}

// Same for customer sessions
const CUSTOMER_SECRET = process.env.CUSTOMER_JWT_SECRET
  || (IS_PROD ? null : 'dev-customer-secret-' + (process.env.VERCEL_URL || 'local'));

export function signCustomerJwt(payload) {
  if (!CUSTOMER_SECRET) throw new Error('CUSTOMER_JWT_SECRET is not configured');
  const header  = b64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body    = b64url(JSON.stringify(payload));
  const sig     = crypto.createHmac('sha256', CUSTOMER_SECRET).update(`${header}.${body}`).digest('base64url');
  return `${header}.${body}.${sig}`;
}

export function verifyCustomerJwt(token) {
  if (!CUSTOMER_SECRET) return null;
  try {
    const [header, body, sig] = (token || '').split('.');
    if (!header || !body || !sig) return null;
    const expected = crypto.createHmac('sha256', CUSTOMER_SECRET).update(`${header}.${body}`).digest('base64url');
    const sigBuf = Buffer.from(sig, 'base64url');
    const expBuf = Buffer.from(expected, 'base64url');
    if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) return null;
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString());
    if (typeof payload.exp !== 'number' || payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

export function verifyCustomerSession(req) {
  const header = req.headers.get('authorization') || '';
  const token  = header.startsWith('Bearer ') ? header.slice(7).trim() : null;
  if (!token) return null;
  return verifyCustomerJwt(token);
}
