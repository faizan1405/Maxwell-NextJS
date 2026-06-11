import { NextResponse } from 'next/server';
import { connectToDatabase } from '../../../lib/mongoose';
import { Customer } from '../../../lib/models';
import { verifySession } from '../../../lib/auth';

export async function GET(req) {
  const session = verifySession(req);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await connectToDatabase();
    
    const customers = await Customer.find({}).lean();
    
    // Remove password field if it exists just to be safe
    const safeCustomers = customers.map(c => {
      const { password, ...rest } = c;
      return rest;
    });

    return NextResponse.json(safeCustomers);
  } catch (error) {
    console.error('[customers] GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
