import { NextResponse } from 'next/server';
import { put, del } from '@vercel/blob';
import { connectToDatabase } from '../../../lib/mongoose';
import { Order } from '../../../lib/models';
import { verifySession, verifyCustomerSession } from '../../../lib/auth';
import { sendEmail } from '../../../lib/email';
import { formatZar } from '../../../utils/currency';

function isVercelBlob(url) {
  return typeof url === 'string' && url.includes('.vercel-storage.com');
}

const MAX_PROOF_BYTES = 5 * 1024 * 1024; // 5 MB

const ALLOWED_TYPES = new Set([
  'image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf',
]);
const EXT_FOR_TYPE = {
  'image/jpeg':      'jpg',
  'image/jpg':       'jpg',
  'image/png':       'png',
  'image/webp':      'webp',
  'application/pdf': 'pdf',
};

const UPLOAD_ALLOWED_STATUSES = new Set([
  'Awaiting EFT Payment',
  'Proof of Payment Submitted',
  'Payment Verification Required',
  'Corrected Proof Requested',
  'Payment Rejected',
]);

async function sendProofAdminEmail(order) {
  const KEY = process.env.RESEND_API_KEY;
  const FROM = process.env.FROM_EMAIL || 'Amahle Blue <noreply@amahle-blue.co.za>';
  const to = process.env.ADMIN_EMAIL || process.env.FROM_EMAIL;
  if (!KEY || !to) return;

  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"/></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:Helvetica,Arial,sans-serif;">
<div style="max-width:540px;margin:40px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(11,37,69,.10);">
  <div style="background:linear-gradient(135deg,#1E50E0,#0B2545);padding:28px 36px;text-align:center;">
    <h1 style="color:#fff;font-size:20px;font-weight:800;margin:0;">&#128190; Proof of Payment Submitted</h1>
    <p style="color:#bfdbfe;font-size:13px;margin:6px 0 0;">${order.customer?.name || 'A customer'} · ${order.orderNumber}</p>
  </div>
  <div style="padding:28px 36px;">
    <p style="font-size:14px;color:#334155;margin:0 0 16px;line-height:1.6;">
      <strong>${order.customer?.name}</strong> (${order.customer?.email}) has uploaded a proof of payment for
      order <strong>${order.orderNumber}</strong> totalling <strong>${formatZar(order.total)}</strong>.
    </p>
    <div style="background:#eff6ff;border-radius:10px;padding:14px 18px;margin-bottom:20px;">
      <p style="font-size:13px;font-weight:700;color:#1E50E0;margin:0 0 4px;">${order.orderNumber} — ${formatZar(order.total)}</p>
      <p style="font-size:12px;color:#64748b;margin:0;">EFT Reference: <strong>${order.eftReference || order.orderNumber}</strong></p>
    </div>
    <p style="font-size:13px;color:#64748b;margin:0;">Log in to the admin panel to view the proof and verify or reject the payment.</p>
  </div>
  <div style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:16px 36px;text-align:center;">
    <p style="color:#cbd5e1;font-size:11px;margin:0;">&copy; ${new Date().getFullYear()} Amahle Blue Cleaning Solutions</p>
  </div>
</div>
</body></html>`;

  try {
    await sendEmail(to, `Proof of Payment — ${order.orderNumber} (${formatZar(order.total)})`, html);
  } catch (e) {
    console.error('[proof] admin email error:', e.message);
  }
}

async function sendProofCustomerEmail(order) {
  const KEY = process.env.RESEND_API_KEY;
  if (!KEY || !order?.customer?.email) return;

  const firstName = (order.customer.name || 'there').split(' ')[0];
  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"/></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:Helvetica,Arial,sans-serif;">
<div style="max-width:540px;margin:40px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(11,37,69,.10);">
  <div style="background:linear-gradient(135deg,#1E50E0,#0B2545);padding:32px 36px;text-align:center;">
    <p style="color:#7FC4FF;font-size:11px;letter-spacing:3px;text-transform:uppercase;margin:0 0 6px;">Amahle Blue</p>
    <h1 style="color:#fff;font-size:22px;font-weight:800;margin:0 0 6px;">Proof Received!</h1>
    <p style="color:#bfdbfe;font-size:14px;margin:0;">Hi ${firstName}, we've received your proof of payment.</p>
  </div>
  <div style="padding:32px 36px;">
    <div style="background:#eff6ff;border-radius:10px;padding:14px 18px;margin-bottom:20px;">
      <p style="font-size:13px;font-weight:700;color:#1E50E0;margin:0 0 3px;">${order.orderNumber}</p>
      <p style="font-size:12px;color:#64748b;margin:0;">Status: <span style="color:#d97706;font-weight:600;">Proof of Payment Submitted</span></p>
    </div>
    <p style="font-size:14px;color:#334155;line-height:1.6;margin:0 0 16px;">
      Your proof of payment is being reviewed. We will verify your payment and confirm your order within 1–2 business days.
    </p>
    <div style="background:#fef3c7;border:1px solid #fde68a;border-radius:10px;padding:12px 16px;margin-bottom:16px;">
      <p style="font-size:12px;color:#92400e;margin:0;line-height:1.5;">
        Please ensure the payment reference on your proof of payment matches your order number: <strong>${order.eftReference || order.orderNumber}</strong>
      </p>
    </div>
    <p style="font-size:13px;color:#64748b;margin:0;">Questions? Email us at
      <a href="mailto:info@amahle-blue.co.za" style="color:#1E50E0;">info@amahle-blue.co.za</a>
    </p>
  </div>
  <div style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:16px 36px;text-align:center;">
    <p style="color:#cbd5e1;font-size:11px;margin:0;">&copy; ${new Date().getFullYear()} Amahle Blue Cleaning Solutions &middot; Made in &#x1F1FF;&#x1F1E6;</p>
  </div>
</div>
</body></html>`;

  try {
    await sendEmail(order.customer.email, `Proof of payment received — ${order.orderNumber}`, html);
  } catch (e) {
    console.error('[proof] customer email error:', e.message);
  }
}

export async function POST(req) {
  await connectToDatabase();
  
  const adminSession = verifySession(req);
  const customerSession = adminSession ? null : verifyCustomerSession(req);

  if (!adminSession && !customerSession) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) return NextResponse.json({ error: 'Storage not configured.' }, { status: 500 });

  // Get orderId from query string (?orderId=ORD-...)
  const { searchParams } = new URL(req.url);
  const orderId = searchParams.get('orderId');
  if (!orderId) return NextResponse.json({ error: 'Missing orderId query parameter.' }, { status: 400 });

  const order = await Order.findOne({ id: orderId });
  if (!order) return NextResponse.json({ error: 'Order not found.' }, { status: 404 });

  // Customer ownership check
  if (customerSession && !adminSession) {
    const isOwner =
      (order.customerId && order.customerId === customerSession.customerId) ||
      (order.customer?.email && order.customer.email.toLowerCase() === customerSession.email.toLowerCase());
    if (!isOwner) return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });
  }

  // EFT checks
  if (order.paymentMethod !== 'EFT') {
    return NextResponse.json({ error: 'Proof of payment upload is only available for EFT orders.' }, { status: 400 });
  }

  const currentPayStatus = order.paymentStatus || 'Awaiting EFT Payment';
  if (!UPLOAD_ALLOWED_STATUSES.has(currentPayStatus)) {
    return NextResponse.json({ error: `Cannot upload proof for an order with payment status: ${currentPayStatus}.` }, { status: 400 });
  }

  // File type checks
  const rawContentType = (req.headers.get('content-type') || '').split(';')[0].trim().toLowerCase();
  const contentType = rawContentType === 'image/jpg' ? 'image/jpeg' : rawContentType;
  if (!ALLOWED_TYPES.has(contentType)) {
    return NextResponse.json({ error: 'Unsupported file type. Allowed: PDF, JPG, JPEG, PNG, WEBP.' }, { status: 415 });
  }

  try {
    const rawName = String(req.headers.get('x-filename') || `proof.${EXT_FOR_TYPE[contentType] || 'bin'}`).slice(0, 200);
    
    // Read request body as arrayBuffer
    const buffer = Buffer.from(await req.arrayBuffer());
    if (!buffer.length) return NextResponse.json({ error: 'Empty file received.' }, { status: 400 });
    if (buffer.length > MAX_PROOF_BYTES) {
      return NextResponse.json({ error: 'File exceeds the 5 MB size limit.' }, { status: 413 });
    }

    // Magic-byte check
    const head = buffer.slice(0, 12);
    let valid = false;
    if (contentType === 'application/pdf') {
      valid = head[0] === 0x25 && head[1] === 0x50 && head[2] === 0x44 && head[3] === 0x46; // %PDF
    } else if (contentType === 'image/jpeg') {
      valid = head[0] === 0xFF && head[1] === 0xD8 && head[2] === 0xFF;
    } else if (contentType === 'image/png') {
      valid = head[0] === 0x89 && head[1] === 0x50 && head[2] === 0x4E && head[3] === 0x47;
    } else if (contentType === 'image/webp') {
      valid = head[0] === 0x52 && head[1] === 0x49 && head[2] === 0x46 && head[3] === 0x46 && head[8] === 0x57;
    }
    if (!valid) {
      return NextResponse.json({ error: 'File content does not match its declared type.' }, { status: 415 });
    }

    const safeBase = rawName.replace(/[^a-zA-Z0-9._-]/g, '-').toLowerCase();
    const ext = EXT_FOR_TYPE[contentType] || 'bin';
    const storageKey = `proofs/${orderId}/${Date.now()}-${safeBase.slice(0, 40)}.${ext}`;

    // Upload to Vercel Blob
    const blob = await put(storageKey, buffer, { access: 'public', contentType, token });

    const prevPayStatus = order.paymentStatus || 'Awaiting EFT Payment';
    const newPayStatus = 'Proof of Payment Submitted';
    const changedBy = adminSession
      ? (adminSession.user?.username || adminSession.username || 'admin')
      : (customerSession?.email || 'customer');

    // Update order
    const oldStorageKey = order.proofOfPaymentStorageKey;
    const oldProofUrl   = order.proofOfPaymentUrl;

    order.proofOfPaymentUrl = blob.url;
    order.proofOfPaymentStorageKey = storageKey;
    order.proofOfPaymentMetadata = {
      filename: rawName,
      mimeType: contentType,
      fileSize: buffer.length,
      uploadedAt: Date.now(),
      orderId,
    };
    order.paymentStatus = newPayStatus;
    order.payment = { ...order.payment, status: 'pending' };
    order.paymentStatusHistory.push({
      previousStatus: prevPayStatus,
      newStatus: newPayStatus,
      changedBy,
      note: 'Proof of payment uploaded',
      createdAt: Date.now(),
    });

    await order.save();

    // Delete old proof to free space. Only delete if the previous proof URL
    // points at our Vercel Blob storage — never touch external URLs even if
    // a storageKey was somehow set against a non-Vercel-hosted proof.
    if (oldStorageKey && (oldProofUrl == null || isVercelBlob(oldProofUrl))) {
      try {
        await del(oldStorageKey, { token });
      } catch (delErr) {
        console.error('[proof] Failed to delete old proof:', oldStorageKey, delErr);
      }
    }

    // Emails
    sendProofAdminEmail(order).catch(() => {});
    sendProofCustomerEmail(order).catch(() => {});

    return NextResponse.json({
      success: true,
      proofUrl: blob.url,
      paymentStatus: newPayStatus,
      order,
    });
  } catch (err) {
    console.error('[/api/proof]', err);
    return NextResponse.json({ error: 'Upload failed. Please try again.' }, { status: 500 });
  }
}

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-filename',
    },
  });
}
