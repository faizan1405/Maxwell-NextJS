import crypto from 'crypto';

/**
 * JWT AUTHENTICATION LAYER
 *
 * This module implements a lightweight, dependency-free JWT solution using
 * Node's built-in `crypto` module (HMAC-SHA256 signatures).
 *
 * Two separate token namespaces exist with independent secrets:
 *   - Admin tokens: signed with ADMIN_JWT_SECRET, grant full admin access.
 *   - Customer tokens: signed with CUSTOMER_JWT_SECRET, grant customer-only access.
 *
 * In production, both secrets MUST be set as environment variables.
 * In development/local, auto-generated fallback secrets are used so the app
 * works out of the box without manual configuration.
 *
 * IMPORTANT: Never share admin and customer secrets — they are kept separate
 * so a compromised customer token cannot be reused for admin access.
 */

// IS_PROD is true on Vercel deployments (NODE_ENV=production or VERCEL_ENV is set
// and not 'development'). This determines whether fallback dev secrets are allowed.
const IS_PROD = process.env.NODE_ENV === 'production' || (process.env.VERCEL_ENV && process.env.VERCEL_ENV !== 'development');

// Admin JWT secret. Falls back to a dev-only secret if not in production.
// In production, a missing ADMIN_JWT_SECRET will cause signJwt() to throw.
const SECRET  = process.env.ADMIN_JWT_SECRET
  || (IS_PROD ? null : 'dev-admin-secret-' + (process.env.VERCEL_URL || 'local'));

/**
 * Encodes a buffer or string as a URL-safe base64 string (base64url).
 * Used for the JWT header, payload, and signature segments.
 */
function b64url(buf) {
  return Buffer.from(buf).toString('base64url');
}

/**
 * Signs a JWT payload with HMAC-SHA256 and returns a compact JWT string.
 *
 * The payload must include an `exp` (Unix epoch seconds) field so that tokens
 * expire. Tokens without `exp` will be rejected by verifyJwt().
 *
 * @param {Object} payload - Data to embed in the token (e.g. { username, exp }).
 * @returns {string} Signed JWT in "header.payload.signature" format.
 * @throws {Error} If ADMIN_JWT_SECRET is not configured in production.
 */
export function signJwt(payload) {
  if (!SECRET) throw new Error('ADMIN_JWT_SECRET is not configured');
  const header  = b64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body    = b64url(JSON.stringify(payload));
  const sig     = crypto.createHmac('sha256', SECRET).update(`${header}.${body}`).digest('base64url');
  return `${header}.${body}.${sig}`;
}

/**
 * Verifies an admin JWT and returns its decoded payload, or null if invalid.
 *
 * Security notes:
 *   - Uses `timingSafeEqual` to compare signatures, preventing timing attacks
 *     that could reveal partial signature bytes.
 *   - Explicitly checks the `exp` field against the current time (in seconds).
 *     An expired token always returns null regardless of signature validity.
 *
 * @param {string} token - JWT string to verify.
 * @returns {Object|null} Decoded payload if valid, or null if invalid/expired.
 */
export function verifyJwt(token) {
  if (!SECRET) return null;
  try {
    const [header, body, sig] = (token || '').split('.');
    if (!header || !body || !sig) return null;
    const expected = crypto.createHmac('sha256', SECRET).update(`${header}.${body}`).digest('base64url');
    const sigBuf = Buffer.from(sig, 'base64url');
    const expBuf = Buffer.from(expected, 'base64url');
    // Use constant-time comparison to prevent timing side-channel attacks
    if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) return null;
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString());
    // Reject tokens that have expired (exp is in Unix seconds)
    if (typeof payload.exp !== 'number' || payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

/**
 * Extracts and verifies the admin session from an incoming Next.js request.
 *
 * Expects the token in the Authorization header as: "Bearer <token>"
 *
 * @param {Request} req - The Next.js App Router request object.
 * @returns {Object|null} Decoded admin JWT payload, or null if not authenticated.
 */
export function verifySession(req) {
  const header = req.headers.get('authorization') || '';
  const token  = header.startsWith('Bearer ') ? header.slice(7).trim() : null;
  if (!token) return null;
  return verifyJwt(token);
}

// ─────────────────────────────────────────────────────────────────────────────
// CUSTOMER SESSION — uses a completely separate secret from the admin secret
// ─────────────────────────────────────────────────────────────────────────────

// Customer JWT secret. Separate from admin secret to limit blast radius
// if a customer token is ever compromised.
const CUSTOMER_SECRET = process.env.CUSTOMER_JWT_SECRET
  || (IS_PROD ? null : 'dev-customer-secret-' + (process.env.VERCEL_URL || 'local'));

/**
 * Signs a customer JWT. Mirrors signJwt() but uses the customer secret.
 *
 * @param {Object} payload - Customer data (e.g. { customerId, email, exp }).
 * @returns {string} Signed customer JWT.
 * @throws {Error} If CUSTOMER_JWT_SECRET is not configured in production.
 */
export function signCustomerJwt(payload) {
  if (!CUSTOMER_SECRET) throw new Error('CUSTOMER_JWT_SECRET is not configured');
  const header  = b64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body    = b64url(JSON.stringify(payload));
  const sig     = crypto.createHmac('sha256', CUSTOMER_SECRET).update(`${header}.${body}`).digest('base64url');
  return `${header}.${body}.${sig}`;
}

/**
 * Verifies a customer JWT. Mirrors verifyJwt() but uses the customer secret.
 *
 * @param {string} token - Customer JWT string to verify.
 * @returns {Object|null} Decoded payload if valid, or null if invalid/expired.
 */
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

/**
 * Extracts and verifies the customer session from an incoming Next.js request.
 *
 * @param {Request} req - The Next.js App Router request object.
 * @returns {Object|null} Decoded customer JWT payload, or null if not authenticated.
 */
export function verifyCustomerSession(req) {
  const header = req.headers.get('authorization') || '';
  const token  = header.startsWith('Bearer ') ? header.slice(7).trim() : null;
  if (!token) return null;
  return verifyCustomerJwt(token);
}
