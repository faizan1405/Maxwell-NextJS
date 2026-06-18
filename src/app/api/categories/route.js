import { NextResponse } from 'next/server';
import { connectToDatabase } from '../../../lib/mongoose';
import { Category, Product } from '../../../lib/models';
import { requireAdmin, verifySession } from '../../../lib/auth';

function slugify(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 60);
}

function cleanCategory(input = {}) {
  const name = String(input.name || '').trim().slice(0, 120);
  const id = slugify(input.id || name);
  return {
    id,
    name,
    short: String(input.short || name).trim().slice(0, 80),
    icon: String(input.icon || 'Box').trim().slice(0, 40),
    image: input.image ? String(input.image).trim().slice(0, 1024) : null,
    bannerImage: input.bannerImage ? String(input.bannerImage).trim().slice(0, 1024) : null,
    blurb: String(input.blurb || '').trim().slice(0, 500),
    description: String(input.description || '').trim().slice(0, 5000),
    seoTitle: String(input.seoTitle || '').trim().slice(0, 200),
    seoDescription: String(input.seoDescription || '').trim().slice(0, 400),
    accent: /^#[0-9a-f]{6}$/i.test(String(input.accent || '')) ? input.accent : '#111111',
    status: input.status === 'inactive' ? 'inactive' : 'active',
    displayOrder: Number.isFinite(Number(input.displayOrder)) ? Number(input.displayOrder) : 99,
  };
}

export async function GET(req) {
  const all = req.nextUrl.searchParams.get('all');
  if (all === '1') {
    const session = verifySession(req);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  await connectToDatabase();
  
  let filter = {};
  if (all !== '1') {
    filter.status = { $ne: 'inactive' };
  }
  
  const categories = await Category.find(filter).lean();
  return NextResponse.json(categories);
}

export async function POST(req) {
  const auth = requireAdmin(req);
  if (auth.response) return auth.response;

  await connectToDatabase();
  
  let body;
  try {
    body = await req.json();
  } catch {
    body = {};
  }
  
  const clean = cleanCategory(body);
  if (!clean.name || !clean.id) {
    return NextResponse.json({ error: 'Category name and slug are required.' }, { status: 400 });
  }

  const existing = await Category.findOne({ id: clean.id }).lean();
  if (existing) {
    return NextResponse.json({ error: 'A category with this slug already exists.' }, { status: 400 });
  }

  const cat = {
    ...clean,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  const created = await Category.create(cat);
  return NextResponse.json(created, { status: 201 });
}

export async function PATCH(req) {
  const auth = requireAdmin(req);
  if (auth.response) return auth.response;

  await connectToDatabase();

  let body;
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const { id, patch } = body;
  if (!id || !patch) {
    return NextResponse.json({ error: 'Missing id or patch object.' }, { status: 400 });
  }

  const existing = await Category.findOne({ id }).lean();
  if (!existing) {
    return NextResponse.json({ error: 'Category not found.' }, { status: 404 });
  }

  const cleanPatch = cleanCategory({ ...existing, ...patch, id });
  delete cleanPatch.id;

  const updated = await Category.findOneAndUpdate(
    { id },
    { $set: { ...cleanPatch, updatedAt: Date.now() } },
    { new: true, lean: true }
  );

  return NextResponse.json(updated);
}

export async function DELETE(req) {
  const auth = requireAdmin(req);
  if (auth.response) return auth.response;

  await connectToDatabase();

  let id = req.nextUrl.searchParams.get('id');
  let reassignTo = req.nextUrl.searchParams.get('reassignTo');
  if (!id) {
    try {
      const body = await req.json();
      id = body.id;
      reassignTo = body.reassignTo;
    } catch {}
  }

  if (!id) return NextResponse.json({ error: 'Missing id.' }, { status: 400 });

  const linkedCount = await Product.countDocuments({ cat: id });
  if (linkedCount > 0) {
    if (!reassignTo || reassignTo === id) {
      return NextResponse.json({ error: 'Reassign linked products before deleting this category.' }, { status: 400 });
    }
    const target = await Category.findOne({ id: reassignTo }).lean();
    if (!target) return NextResponse.json({ error: 'Reassignment category not found.' }, { status: 400 });
    await Product.updateMany({ cat: id }, { $set: { cat: reassignTo, updatedAt: Date.now() } });
  }

  await Category.findOneAndDelete({ id });
  return NextResponse.json({ ok: true });
}
