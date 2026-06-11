export function calculateOrderStats(ordersArray) {
  let grossSales = 0;
  let collectedRevenue = 0;
  let outstandingCOD = 0;
  let pendingPayments = 0;
  let totalValidOrders = 0;

  let codSales = 0;
  let eftSales = 0;
  let codCount = 0;
  let eftCount = 0;
  let pendingOrdersCount = 0;

  (ordersArray || []).forEach(order => {
    // 1. Cancelled orders must not count as sales or revenue
    const isCancelled = order.status === 'cancelled' || order.orderStatus === 'Cancelled';
    if (isCancelled) return;

    totalValidOrders++;
    grossSales += (order.total || 0);

    const method = (order.paymentMethod || order.payment?.method || '').toUpperCase();
    const isPaid = order.payment?.status === 'paid' || order.paymentStatus === 'Paid';
    const isDelivered = order.status === 'delivered' || order.orderStatus === 'Delivered';

    if (method === 'COD') {
      codCount++;
      codSales += (order.total || 0);
      
      if (isPaid) {
        collectedRevenue += (order.total || 0);
      } else if (isDelivered) {
        outstandingCOD += (order.total || 0);
      } else {
        pendingPayments += (order.total || 0);
      }
    } else {
      // EFT or other methods
      eftCount++;
      eftSales += (order.total || 0);

      if (isPaid) {
        collectedRevenue += (order.total || 0);
      } else {
        pendingPayments += (order.total || 0);
      }
    }

    // Determine pending orders (awaiting processing/payment)
    const isPendingOrder = order.status === 'pending' || order.orderStatus === 'Order Placed' || order.orderStatus === 'Awaiting Payment';
    if (isPendingOrder) {
      pendingOrdersCount++;
    }
  });

  return {
    grossSales,
    collectedRevenue,
    outstandingCOD,
    pendingPayments,
    totalValidOrders,
    codSales,
    eftSales,
    codCount,
    eftCount,
    pendingOrdersCount
  };
}
