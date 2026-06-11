import nodemailer from 'nodemailer';

export function buildOtpHtml(otp, name) {
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

export async function sendEmail(to, subject, html) {
  const RESEND_KEY = process.env.RESEND_API_KEY;
  const FROM = process.env.FROM_EMAIL || 'Amahle Blue <noreply@amahle-blue.co.za>';
  const GMAIL_USER = process.env.GMAIL_USER;
  const GMAIL_PASS = process.env.GMAIL_APP_PASSWORD;

  if (RESEND_KEY) {
    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${RESEND_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: FROM,
          to: Array.isArray(to) ? to : [to],
          subject,
          html,
        }),
      });
      if (res.ok) return { ok: true };
      const text = await res.text();
      console.warn('[email] Resend failed:', text);
    } catch (e) {
      console.warn('[email] Resend fetch error:', e.message);
    }
  }

  if (GMAIL_USER && GMAIL_PASS) {
    try {
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: { user: GMAIL_USER, pass: GMAIL_PASS },
      });
      await transporter.sendMail({
        from: `Amahle Blue <${GMAIL_USER}>`,
        to: Array.isArray(to) ? to.join(',') : to,
        subject,
        html,
      });
      return { ok: true };
    } catch (e) {
      console.error('[email] Gmail SMTP error:', e.message);
    }
  }

  const isLocal = !process.env.VERCEL_ENV && process.env.NODE_ENV !== 'production';
  if (isLocal) {
    console.log(`[DEV-EMAIL-LOG] To: ${to} | Subject: ${subject}`);
    return { ok: true, dev: true };
  }

  console.error('[email] No email provider configured or all providers failed');
  return { ok: false };
}

export async function sendOtpEmail(email, otp, name) {
  const isLocal = !process.env.VERCEL_ENV && process.env.NODE_ENV !== 'production';
  const RESEND_KEY = process.env.RESEND_API_KEY;
  const GMAIL_USER = process.env.GMAIL_USER;

  if (!RESEND_KEY && !GMAIL_USER && isLocal) {
    console.log(`[DEV] OTP for ${email}: ${otp}`);
    return { ok: true, dev: true, devOtp: otp };
  }

  const subject = `${otp} — Your Amahle Blue sign-in code`;
  const html = buildOtpHtml(otp, name);
  const sent = await sendEmail(email, subject, html);
  
  if (sent.ok) {
    return { ok: true, dev: sent.dev, devOtp: sent.dev ? otp : undefined };
  }
  return { ok: false };
}

