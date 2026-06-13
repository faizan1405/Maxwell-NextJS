import { NextResponse } from 'next/server';
import { connectToDatabase } from '../../../../lib/mongoose';
import { Customer } from '../../../../lib/models';
import { verifyCustomerCookie } from '../../../../lib/customerAuth';

export async function GET(req) {
  await connectToDatabase();
  const session = await verifyCustomerCookie(req);
  if (!session) return NextResponse.json({ customer: null });

  const customer = await Customer.findOne({ id: session.customerId }).lean();
  return NextResponse.json({ customer: customer || null });
}
