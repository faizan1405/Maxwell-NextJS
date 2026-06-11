import { NextResponse } from 'next/server';
import { connectToDatabase } from '../../../lib/mongoose';
import { Category } from '../../../lib/models';
import { verifySession } from '../../../lib/auth';

export async function GET(req) {
  await connectToDatabase();
  const all = req.nextUrl.searchParams.get('all');
  
  let filter = {};
  if (all !== '1') {
    filter.status = { $ne: 'inactive' };
  }
  
  const categories = await Category.find(filter).lean();
  return NextResponse.json(categories);
}

export async function POST(req) {
  const session = verifySession(req);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await connectToDatabase();
  
  let body;
  try {
    body = await req.json();
  } catch {
    body = {};
  }
  
  const { name, id, short, icon, blurb, accent, status, displayOrder, image } = body;
  if (!name || !id) {
    return NextResponse.json({ error: 'Name and ID (slug) are required.' }, { status: 400 });
  }

  const existing = await Category.findOne({ id }).lean();
  if (existing) {
    return NextResponse.json({ error: 'A category with this ID/slug already exists.' }, { status: 400 });
  }

  const cat = {
    id,
    name,
    short: short || name,
    icon: icon || 'Box',
    image: image || null,
    blurb: blurb || '',
    accent: accent || '#0B2545',
    status: status === 'inactive' ? 'inactive' : 'active',
    displayOrder: typeof displayOrder === 'number' ? displayOrder : 99,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  const created = await Category.create(cat);
  return NextResponse.json(created, { status: 201 });
}

export async function PATCH(req) {
  const session = verifySession(req);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

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

  const updated = await Category.findOneAndUpdate(
    { id },
    { $set: { ...patch, id, updatedAt: Date.now() } },
    { new: true, lean: true }
  );

  return NextResponse.json(updated);
}

export async function DELETE(req) {
  const session = verifySession(req);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await connectToDatabase();

  let id = req.nextUrl.searchParams.get('id');
  if (!id) {
    try {
      const body = await req.json();
      id = body.id;
    } catch {}
  }

  if (!id) return NextResponse.json({ error: 'Missing id.' }, { status: 400 });

  await Category.findOneAndDelete({ id });
  return NextResponse.json({ ok: true });
}
