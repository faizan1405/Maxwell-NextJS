import { NextResponse } from 'next/server';
import { v2 as cloudinary } from 'cloudinary';
import { requireAdmin } from '../../../../lib/auth';

const ALLOWED_IMAGES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const FOLDER = 'amahle-blue/category-banners';

// Cloudinary credentials. All three MUST be present for uploads to work.
const CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME;
const API_KEY    = process.env.CLOUDINARY_API_KEY;
const API_SECRET = process.env.CLOUDINARY_API_SECRET;
const IS_CONFIGURED = !!(CLOUD_NAME && API_KEY && API_SECRET);

if (IS_CONFIGURED) {
  cloudinary.config({
    cloud_name: CLOUD_NAME,
    api_key: API_KEY,
    api_secret: API_SECRET,
    secure: true,
  });
}

// Verify magic bytes match the declared image type. Prevents disguised uploads.
function magicBytesValid(buffer, contentType) {
  const head = buffer.slice(0, 12);
  if (contentType === 'image/jpeg') return head[0] === 0xFF && head[1] === 0xD8 && head[2] === 0xFF;
  if (contentType === 'image/png')  return head[0] === 0x89 && head[1] === 0x50 && head[2] === 0x4E && head[3] === 0x47;
  if (contentType === 'image/webp') return head[0] === 0x52 && head[1] === 0x49 && head[2] === 0x46 && head[3] === 0x46 && head[8] === 0x57;
  return false;
}

function uploadToCloudinary(buffer) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder: FOLDER, resource_type: 'image' },
      (err, result) => (err ? reject(err) : resolve(result))
    );
    stream.end(buffer);
  });
}

export async function POST(req) {
  const auth = requireAdmin(req);
  if (auth.response) return auth.response;

  if (!IS_CONFIGURED) {
    return NextResponse.json(
      { success: false, error: 'Image upload is not configured. Add CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET in environment variables.' },
      { status: 500 }
    );
  }

  try {
    const form = await req.formData();
    const file = form.get('file');
    if (!file || typeof file.arrayBuffer !== 'function') {
      return NextResponse.json({ success: false, error: 'No file provided.' }, { status: 400 });
    }

    const rawType = (file.type || '').toLowerCase();
    const contentType = rawType === 'image/jpg' ? 'image/jpeg' : rawType;
    if (!ALLOWED_IMAGES.has(contentType)) {
      return NextResponse.json({ success: false, error: 'Unsupported file type. Allowed: JPG, PNG, WEBP.' }, { status: 415 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    if (!buffer.length) return NextResponse.json({ success: false, error: 'Empty file received.' }, { status: 400 });
    if (buffer.length > MAX_IMAGE_BYTES) {
      return NextResponse.json({ success: false, error: 'File exceeds 5 MB limit.' }, { status: 413 });
    }
    if (!magicBytesValid(buffer, contentType)) {
      return NextResponse.json({ success: false, error: 'File content does not match its declared type.' }, { status: 415 });
    }

    const result = await uploadToCloudinary(buffer);
    return NextResponse.json({ success: true, url: result.secure_url });
  } catch (err) {
    console.error('[/api/admin/upload-category-banner]', err);
    return NextResponse.json({ success: false, error: 'Upload failed.' }, { status: 500 });
  }
}
