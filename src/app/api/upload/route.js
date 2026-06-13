import { NextResponse } from 'next/server';
import { put, del } from '@vercel/blob';
import { connectToDatabase } from '../../../lib/mongoose';
import { Product } from '../../../lib/models';
import { requireAdmin } from '../../../lib/auth';

const ALLOWED_IMAGES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const ALLOWED_VIDEOS = new Set(['video/mp4', 'video/webm']);
const EXT_FOR_TYPE = {
  'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp',
  'video/mp4':  'mp4', 'video/webm': 'webm',
};
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const MAX_VIDEO_BYTES = 50 * 1024 * 1024;

function isVercelBlob(url) {
  return typeof url === 'string' && url.includes('.vercel-storage.com');
}

function sanitizeMediaItem(m, i) {
  return {
    id:         String(m.id || `${Date.now()}-${i}`).slice(0, 60),
    type:       m.type === 'video' ? 'video' : 'image',
    url:        String(m.url || '').slice(0, 1024),
    storageKey: m.storageKey ? String(m.storageKey).slice(0, 500) : null,
    altText:    m.altText    ? String(m.altText).slice(0, 200)    : '',
    sortOrder:  i,
    isPrimary:  !!m.isPrimary,
    fileName:   m.fileName   ? String(m.fileName).slice(0, 200)   : '',
    mimeType:   m.mimeType   ? String(m.mimeType).slice(0, 50)    : '',
    fileSize:   Math.max(0, Number(m.fileSize) || 0),
    createdAt:  m.createdAt  || Date.now(),
  };
}

export async function POST(req) {
  await connectToDatabase();
  const auth = requireAdmin(req);
  if (auth.response) return auth.response;

  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) return NextResponse.json({ error: 'BLOB_READ_WRITE_TOKEN is not configured.' }, { status: 500 });

  const rawContentType = (req.headers.get('content-type') || '').split(';')[0].trim().toLowerCase();
  const contentType = rawContentType === 'image/jpg' ? 'image/jpeg' : rawContentType;
  const isImage = ALLOWED_IMAGES.has(contentType);
  const isVideo = ALLOWED_VIDEOS.has(contentType);

  if (!isImage && !isVideo) {
    return NextResponse.json({ error: 'Unsupported file type. Allowed images: JPG, PNG, WEBP. Allowed videos: MP4, WEBM.' }, { status: 415 });
  }

  const maxBytes = isImage ? MAX_IMAGE_BYTES : MAX_VIDEO_BYTES;

  try {
    const rawName = String(req.headers.get('x-filename') || `upload.${EXT_FOR_TYPE[contentType]}`);
    const base = rawName.replace(/[^a-zA-Z0-9._-]/g, '-').toLowerCase().replace(/\.[a-z0-9]+$/, '');
    const ext = EXT_FOR_TYPE[contentType];
    const filename = `products/${Date.now()}-${base.slice(0, 40)}.${ext}`;

    const buffer = Buffer.from(await req.arrayBuffer());
    if (!buffer.length) return NextResponse.json({ error: 'Empty file received.' }, { status: 400 });
    if (buffer.length > maxBytes) {
      const mb = (maxBytes / 1048576).toFixed(0);
      return NextResponse.json({ error: `File exceeds ${mb} MB limit.` }, { status: 413 });
    }

    // Validate magic bytes
    const head = buffer.slice(0, 12);
    let valid = false;
    if (isImage) {
      const isJpg  = head[0] === 0xFF && head[1] === 0xD8 && head[2] === 0xFF;
      const isPng  = head[0] === 0x89 && head[1] === 0x50 && head[2] === 0x4E && head[3] === 0x47;
      const isWebp = head[0] === 0x52 && head[1] === 0x49 && head[2] === 0x46 && head[3] === 0x46 && head[8] === 0x57;
      valid = isJpg || isPng || isWebp;
    } else {
      const isMp4  = buffer.length > 7 && (
        (head[4] === 0x66 && head[5] === 0x74 && head[6] === 0x79 && head[7] === 0x70) ||
        (head[4] === 0x6D && head[5] === 0x6F && head[6] === 0x6F && head[7] === 0x76)
      );
      const isWebm = head[0] === 0x1A && head[1] === 0x45 && head[2] === 0xDF && head[3] === 0xA3;
      valid = isMp4 || isWebm;
    }
    if (!valid) return NextResponse.json({ error: 'File content does not match its declared type.' }, { status: 415 });

    const blob = await put(filename, buffer, { access: 'public', contentType, token });
    return NextResponse.json({
      url: blob.url,
      type: isImage ? 'image' : 'video',
      fileName: rawName.slice(0, 200),
      mimeType: contentType,
      fileSize: buffer.length,
      storageKey: filename,
    });
  } catch (err) {
    console.error('[/api/upload]', err);
    return NextResponse.json({ error: 'Upload failed.' }, { status: 500 });
  }
}

export async function PATCH(req) {
  await connectToDatabase();
  const auth = requireAdmin(req);
  if (auth.response) return auth.response;

  const token = process.env.BLOB_READ_WRITE_TOKEN;

  try {
    const body = await req.json();
    const { productId, media } = body;
    if (!productId) return NextResponse.json({ error: 'Missing productId' }, { status: 400 });
    if (!Array.isArray(media)) return NextResponse.json({ error: 'media must be an array' }, { status: 400 });

    const product = await Product.findOne({ id: productId });
    if (!product) return NextResponse.json({ error: 'Product not found' }, { status: 404 });

    const prevUrls = (product.media || []).map(m => m.url).filter(Boolean);

    const cleanMedia = media.slice(0, 12).map(sanitizeMediaItem);
    if (!cleanMedia.some(m => m.isPrimary && m.type === 'image')) {
      const first = cleanMedia.find(m => m.type === 'image');
      if (first) first.isPrimary = true;
    }
    const primaryImg = cleanMedia.find(m => m.isPrimary && m.type === 'image')
                    || cleanMedia.find(m => m.type === 'image');

    product.media = cleanMedia;
    product.img = primaryImg ? primaryImg.url : (product.img || '');
    await product.save();

    // Diff-and-cleanup: any previously-saved URL that's no longer present in
    // the new media array AND is a Vercel Blob URL is safe to delete.
    // Non-Vercel URLs (external CDNs, legacy /assets/*) are NEVER deleted.
    if (token) {
      const nextUrls = new Set(cleanMedia.map(m => m.url).filter(Boolean));
      const removed = prevUrls.filter(u => !nextUrls.has(u) && isVercelBlob(u));
      if (removed.length) {
        try {
          await del(removed, { token });
        } catch (e) {
          console.error('[/api/upload PATCH] media diff cleanup error:', e.message);
        }
      }
    }

    return NextResponse.json(product);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req) {
  const auth = requireAdmin(req);
  if (auth.response) return auth.response;

  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) return NextResponse.json({ error: 'BLOB_READ_WRITE_TOKEN is not configured.' }, { status: 500 });

  let body;
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  // Unsaved-blob cleanup path: the admin uploaded a file in the Add/Edit
  // Product modal but cancelled or removed it before saving. The URL is not
  // attached to any product. Defensive: only delete Vercel Blob URLs.
  if (body && body.unsaved && body.url) {
    if (!isVercelBlob(body.url)) {
      // External URL — refuse to touch it.
      return NextResponse.json({ ok: true, skipped: 'non-vercel-url' });
    }
    try {
      await del(body.url, { token });
      return NextResponse.json({ ok: true });
    } catch (e) {
      console.error('[/api/upload DELETE unsaved] blob error:', e.message);
      return NextResponse.json({ ok: false, error: 'cleanup-failed' }, { status: 200 });
    }
  }

  // Standard path: remove a media item already attached to a product.
  await connectToDatabase();

  try {
    const { productId, mediaId } = body || {};
    if (!productId || !mediaId) return NextResponse.json({ error: 'Missing productId or mediaId' }, { status: 400 });

    const product = await Product.findOne({ id: productId });
    if (!product) return NextResponse.json({ error: 'Product not found' }, { status: 404 });

    const media = product.media ? product.media.map(m => m.toObject()) : [];
    const item = media.find(m => m.id === mediaId);
    if (!item) return NextResponse.json({ error: 'Media item not found' }, { status: 404 });

    if (isVercelBlob(item.url)) {
      try {
        await del(item.url, { token });
      } catch (e) {
        console.error('[/api/upload DELETE] blob error:', e.message);
      }
    }

    let newMedia = media.filter(m => m.id !== mediaId).map((m, i) => ({ ...m, sortOrder: i }));
    if (item.isPrimary && item.type === 'image') {
      const nextImg = newMedia.find(m => m.type === 'image');
      if (nextImg) nextImg.isPrimary = true;
    }
    const primaryImg = newMedia.find(m => m.isPrimary && m.type === 'image')
                    || newMedia.find(m => m.type === 'image');

    product.media = newMedia;
    product.img = primaryImg ? primaryImg.url : (product.img || '');
    await product.save();

    return NextResponse.json(product);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, PATCH, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-filename',
    },
  });
}
