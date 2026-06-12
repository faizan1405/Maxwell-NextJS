/**
 * Calculates financial and operational order statistics from an array of order objects.
 * 
 * STRICT ACCOUNTING LOGIC / BUSINESS RULES:
 * 1. Gross Sales: Total value of all valid, non-cancelled orders.
 * 2. Cash on Delivery (COD) Sales: Total value of all valid COD orders, paid or unpaid.
 * 3. Collected Revenue: Total revenue confirmed as received. This includes:
 *    - EFT/bank payments that are paid.
 *    - COD payments explicitly marked as paid (isPaid === true / paymentStatus === 'Paid').
 * 4. Outstanding COD: Total value of delivered COD orders where payment is NOT yet collected.
 * 5. Pending Payments: Total value of payments awaiting collection or verification (EFT pending, or COD undelivered & unpaid).
 * 
 * Note: Cancelled orders are excluded from all calculations.
 * 
 * @param {Array} ordersArray - Array of order documents.
 * @returns {Object} Calculated metrics including Gross Sales, Collected Revenue, and payment method breakdowns.
 */
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
    // Cancelled orders must not count towards sales, revenue, or stats
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
        // Cash has been physically received and confirmed in the system
        collectedRevenue += (order.total || 0);
      } else if (isDelivered) {
        // Order delivered but cash is still outstanding from delivery agent/driver
        outstandingCOD += (order.total || 0);
      } else {
        // Order is processing/placed, payment is pending delivery
        pendingPayments += (order.total || 0);
      }
    } else {
      // EFT or other prepaid/bank transfer methods
      eftCount++;
      eftSales += (order.total || 0);

      if (isPaid) {
        // EFT transfer has been verified by admin
        collectedRevenue += (order.total || 0);
      } else {
        // Bank transfer hasn't been verified or received yet
        pendingPayments += (order.total || 0);
      }
    }

    // Determine pending orders (awaiting processing/payment validation)
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
