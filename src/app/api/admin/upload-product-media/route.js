import { NextResponse } from 'next/server';
import { v2 as cloudinary } from 'cloudinary';
import { requireAdmin } from '../../../../lib/auth';

const ALLOWED_IMAGES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const ALLOWED_VIDEOS = new Set(['video/mp4', 'video/webm']);
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;   // 5 MB
const MAX_VIDEO_BYTES = 50 * 1024 * 1024;  // 50 MB
const FOLDER = 'amahle-blue/product-media';

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

// Verify magic bytes match the declared file type. Prevents disguised uploads.
function magicBytesValid(buffer, contentType, isImage) {
  const head = buffer.slice(0, 12);
  if (isImage) {
    if (contentType === 'image/jpeg') return head[0] === 0xFF && head[1] === 0xD8 && head[2] === 0xFF;
    if (contentType === 'image/png')  return head[0] === 0x89 && head[1] === 0x50 && head[2] === 0x4E && head[3] === 0x47;
    if (contentType === 'image/webp') return head[0] === 0x52 && head[1] === 0x49 && head[2] === 0x46 && head[3] === 0x46 && head[8] === 0x57;
    return false;
  }
  // Video
  const isMp4 = buffer.length > 7 && (
    (head[4] === 0x66 && head[5] === 0x74 && head[6] === 0x79 && head[7] === 0x70) ||  // ftyp
    (head[4] === 0x6D && head[5] === 0x6F && head[6] === 0x6F && head[7] === 0x76)     // moov
  );
  const isWebm = head[0] === 0x1A && head[1] === 0x45 && head[2] === 0xDF && head[3] === 0xA3;  // EBML
  return isMp4 || isWebm;
}

// Stream the buffer to Cloudinary. resource_type 'auto' lets Cloudinary
// detect image vs video itself.
function uploadToCloudinary(buffer) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder: FOLDER, resource_type: 'auto' },
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
      { success: false, error: 'Media upload is not configured. Add CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET in environment variables.' },
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
    const isImage = ALLOWED_IMAGES.has(contentType);
    const isVideo = ALLOWED_VIDEOS.has(contentType);
    if (!isImage && !isVideo) {
      return NextResponse.json(
        { success: false, error: 'Unsupported file type. Allowed images: JPG, PNG, WEBP. Allowed videos: MP4, WEBM.' },
        { status: 415 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    if (!buffer.length) return NextResponse.json({ success: false, error: 'Empty file received.' }, { status: 400 });

    const maxBytes = isImage ? MAX_IMAGE_BYTES : MAX_VIDEO_BYTES;
    if (buffer.length > maxBytes) {
      const mb = (maxBytes / 1048576).toFixed(0);
      return NextResponse.json({ success: false, error: `File exceeds ${mb} MB limit.` }, { status: 413 });
    }

    if (!magicBytesValid(buffer, contentType, isImage)) {
      return NextResponse.json({ success: false, error: 'File content does not match its declared type.' }, { status: 415 });
    }

    const result = await uploadToCloudinary(buffer);
    return NextResponse.json({
      success:    true,
      url:        result.secure_url,
      type:       result.resource_type === 'video' ? 'video' : 'image',
      fileName:   (file.name || '').slice(0, 200),
      mimeType:   contentType,
      fileSize:   buffer.length,
      storageKey: result.public_id || null,
    });
  } catch (err) {
    console.error('[/api/admin/upload-product-media]', err);
    return NextResponse.json({ success: false, error: 'Upload failed.' }, { status: 500 });
  }
}
