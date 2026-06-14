import { NextResponse } from 'next/server';
import { connectToDatabase } from '../../../lib/mongoose';
import { Customer, Order } from '../../../lib/models';
import { verifySession } from '../../../lib/auth';

export async function GET(req) {
  const session = verifySession(req);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await connectToDatabase();
    
    const { searchParams } = req.nextUrl;
    const page = Math.max(1, parseInt(searchParams.get('page'), 10) || 1);
    const limit = Math.max(1, parseInt(searchParams.get('limit'), 10) || 20);
    const search = searchParams.get('search') || '';
    const filter = searchParams.get('filter') || 'all';
    const sort = searchParams.get('sort') || 'spent_desc';

    const registeredCustomers = await Customer.find({}).lean();
    
    const orders = await Order.find({ status: { $ne: 'cancelled' } })
      .select('id orderNumber status orderStatus total paymentStatus paymentMethod payment createdAt items customer')
      .lean();

    const map = {};
    orders.forEach(o => {
      const c = o.customer;
      if (!c) return;
      const key = (c.email || c.id || '').toLowerCase();
      if (!key) return;
      if (!map[key]) {
        map[key] = {
          id: c.id,
          name: c.name || '',
          email: c.email,
          phone: c.phone || '',
          orders: [],
          totalSpent: 0,
          orderCount: 0,
          lastOrderAt: 0,
          hasAccount: false
        };
      }
      
      map[key].orders.push({
        id: o.id,
        orderNumber: o.orderNumber,
        status: o.status,
        orderStatus: o.orderStatus || o.status,
        createdAt: o.createdAt,
        total: o.total,
        paymentMethod: o.paymentMethod || o.payment?.method,
        paymentStatus: o.paymentStatus || o.payment?.status,
        items: o.items || []
      });
      map[key].orderCount++;
      const isPaid = o.payment?.status === 'paid' || o.paymentStatus === 'Paid';
      if (isPaid) map[key].totalSpent += o.total;
      if (o.createdAt > map[key].lastOrderAt) map[key].lastOrderAt = o.createdAt;
    });

    registeredCustomers.forEach(rc => {
      if (!rc.email) return;
      const key = rc.email.toLowerCase();
      if (map[key]) {
        map[key].hasAccount = true;
        map[key].accountId = rc.id;
        map[key].accountSince = rc.createdAt;
        map[key].savedAddresses = rc.addresses || [];
        if (rc.name && !map[key].name) map[key].name = rc.name;
        if (rc.phone && !map[key].phone) map[key].phone = rc.phone;
      } else {
        map[key] = {
          id: rc.id,
          name: rc.name || '(no name)',
          email: rc.email,
          phone: rc.phone || '',
          orders: [],
          totalSpent: 0,
          orderCount: 0,
          lastOrderAt: rc.createdAt,
          hasAccount: true,
          accountId: rc.id,
          accountSince: rc.createdAt,
          savedAddresses: rc.addresses || [],
        };
      }
    });

    let customersList = Object.values(map);

    if (filter === 'account') {
      customersList = customersList.filter(c => c.hasAccount);
    } else if (filter === 'guest') {
      customersList = customersList.filter(c => !c.hasAccount);
    }

    if (search.trim()) {
      const q = search.toLowerCase().trim();
      customersList = customersList.filter(c =>
        (c.name || '').toLowerCase().includes(q) ||
        (c.email || '').toLowerCase().includes(q) ||
        (c.phone || '').includes(q)
      );
    }

    customersList.sort((a, b) => {
      if (sort === 'name')        return (a.name || '').localeCompare(b.name || '');
      if (sort === 'spent_asc')   return a.totalSpent - b.totalSpent;
      if (sort === 'spent_desc')  return b.totalSpent - a.totalSpent;
      if (sort === 'orders_desc') return b.orderCount - a.orderCount;
      if (sort === 'recent')      return b.lastOrderAt - a.lastOrderAt;
      return 0;
    });

    const totalCustomersCount = customersList.length;
    const totalRevenue = customersList.reduce((s, c) => s + c.totalSpent, 0);
    const avgSpend = totalCustomersCount ? totalRevenue / totalCustomersCount : 0;
    const accountCount = customersList.filter(c => c.hasAccount).length;

    const total = customersList.length;
    const totalPages = Math.ceil(total / limit);
    const pagedData = customersList.slice((page - 1) * limit, page * limit);

    return NextResponse.json({
      data: pagedData,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      },
      summary: {
        totalRevenue,
        avgSpend,
        accountCount
      }
    });
  } catch (error) {
    console.error('[customers] GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
