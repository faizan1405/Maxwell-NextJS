import { NextResponse } from 'next/server';
import crypto from 'crypto';
import {
  ADMIN_SESSION_SECONDS,
  clearAdminSessionCookie,
  publicAdminSession,
  setAdminSessionCookie,
  signJwt,
  verifySession,
} from '../../../lib/auth';

const SALT       = 'ab_salt_2024:';
const SESSION_S  = ADMIN_SESSION_SECONDS; // 8 hours

function sha256hex(text) {
  return crypto.createHash('sha256').update(SALT + text).digest('hex');
}

const IS_PROD_AUTH = process.env.NODE_ENV === 'production' || (process.env.VERCEL_ENV && process.env.VERCEL_ENV !== 'development');

function getCredentials() {
  try {
    const raw = process.env.ADMIN_CREDS;
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {
    console.error('[auth] ADMIN_CREDS parse error:', e.message);
  }

  const creds = [];
  if (process.env.ADMIN_PASSWORD_HASH) {
    creds.push({
      username:     process.env.ADMIN_USERNAME || 'admin',
      passwordHash: process.env.ADMIN_PASSWORD_HASH,
      role:         'admin',
      name:         process.env.ADMIN_NAME  || 'Admin',
      email:        process.env.ADMIN_EMAIL || 'admin@amahle-blue.co.za',
    });
  }
  if (process.env.MANAGER_PASSWORD_HASH) {
    creds.push({
      username:     process.env.MANAGER_USERNAME || 'manager',
      passwordHash: process.env.MANAGER_PASSWORD_HASH,
      role:         'manager',
      name:         process.env.MANAGER_NAME  || 'Manager',
      email:        process.env.MANAGER_EMAIL || 'manager@amahle-blue.co.za',
    });
  }

  if (!creds.length && !IS_PROD_AUTH) {
    creds.push({
      username:     'admin',
      passwordHash: sha256hex('DevAdmin!2026'),
      role:         'admin',
      name:         'Dev Admin',
      email:        'dev@amahle-blue.co.za',
    });
  }

  return creds;
}

const attempts = {};
const MAX_ATTEMPTS = 5;
const LOCKOUT_MS   = 15 * 60 * 1000;

export async function POST(req) {
  let body = {};
  try { body = await req.json(); } catch {}
  
  const { action } = body || {};

  if (action === 'logout') {
    const response = NextResponse.json({ ok: true });
    clearAdminSessionCookie(response);
    return response;
  }

  if (action === 'login') {
    const { username, password } = body;
    if (!username || !password) return NextResponse.json({ error: 'Missing credentials' }, { status: 400 });

    const key = username.toLowerCase().trim();
    const now = Date.now();
    const att = attempts[key] || { count: 0, lastAttempt: 0 };
    const locked = att.count >= MAX_ATTEMPTS && (now - att.lastAttempt) < LOCKOUT_MS;
    if (locked) {
      const mins = Math.ceil((LOCKOUT_MS - (now - att.lastAttempt)) / 60000);
      return NextResponse.json({ error: `Account locked. Try again in ${mins} min.` }, { status: 429 });
    }

    const inputHash = sha256hex(password);
    const creds     = getCredentials();
    if (!creds.length) {
      return NextResponse.json({ error: 'Login is not available. Contact support.' }, { status: 503 });
    }

    let user = null;
    for (const c of creds) {
      if (c.username !== key) continue;
      try {
        const a = Buffer.from(c.passwordHash, 'hex');
        const b = Buffer.from(inputHash, 'hex');
        if (a.length === b.length && crypto.timingSafeEqual(a, b)) user = c;
      } catch {}
    }

    if (!user) {
      const wasLocked = att.count >= MAX_ATTEMPTS && (now - att.lastAttempt) >= LOCKOUT_MS;
      const count = wasLocked ? 1 : att.count + 1;
      attempts[key] = { count, lastAttempt: now };
      const left = MAX_ATTEMPTS - count;
      return NextResponse.json({
        error: left > 0 ? `Invalid credentials — ${left} attempt${left !== 1 ? 's' : ''} remaining.` : 'Account locked for 15 minutes.'
      }, { status: 401 });
    }

    attempts[key] = { count: 0, lastAttempt: 0 };

    const exp   = Math.floor(Date.now() / 1000) + SESSION_S;
    const token = signJwt({ username: user.username, role: user.role, name: user.name, email: user.email, exp });
    const session = publicAdminSession({ username: user.username, role: user.role, name: user.name, email: user.email, exp });
    const response = NextResponse.json({ ok: true, session });
    setAdminSessionCookie(response, token);
    return response;
  }

  if (action === 'changePassword') {
    const { currentPassword, newPassword } = body;
    if (!currentPassword || !newPassword) return NextResponse.json({ error: 'Current and new passwords are required.' }, { status: 400 });
    if (String(newPassword).length < 8)   return NextResponse.json({ error: 'New password must be at least 8 characters.' }, { status: 400 });

    const sess = verifySession(req);
    if (!sess) return NextResponse.json({ error: 'Session expired. Sign in again.' }, { status: 401 });

    const creds   = getCredentials();
    const userIdx = creds.findIndex(c => c.username === sess.username);
    if (userIdx === -1) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    const check = sha256hex(currentPassword);
    try {
      const a = Buffer.from(check, 'hex');
      const b = Buffer.from(creds[userIdx].passwordHash, 'hex');
      if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
        return NextResponse.json({ error: 'Current password is incorrect.' }, { status: 401 });
      }
    } catch { return NextResponse.json({ error: 'Current password is incorrect.' }, { status: 401 }); }

    const newHash = sha256hex(newPassword);
    const updated = [...creds];
    updated[userIdx] = { ...updated[userIdx], passwordHash: newHash };

    const teamId    = process.env.VERCEL_TEAM_ID;
    const projectId = process.env.VERCEL_PROJECT_ID;
    const apiToken  = process.env.VERCEL_API_TOKEN;
    if (!teamId || !projectId || !apiToken) {
      return NextResponse.json({ error: 'Password rotation requires VERCEL_API_TOKEN / VERCEL_TEAM_ID / VERCEL_PROJECT_ID to be configured.' }, { status: 501 });
    }
    try {
      const r = await fetch(`https://api.vercel.com/v10/projects/${projectId}/env?teamId=${teamId}&upsert=true`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${apiToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'ADMIN_CREDS', value: JSON.stringify(updated), type: 'encrypted', target: ['production', 'preview', 'development'] }),
      });
      if (!r.ok) {
        return NextResponse.json({ error: 'Failed to persist new password. Contact support.' }, { status: 502 });
      }
    } catch (e) {
      return NextResponse.json({ error: 'Failed to persist new password. Contact support.' }, { status: 502 });
    }
    return NextResponse.json({ ok: true, note: 'Password updated. New Vercel deployment will pick up the change shortly.' });
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
}

export async function GET(req) {
  const session = verifySession(req);
  return NextResponse.json({ session: publicAdminSession(session) });
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
