// Shared tax invoice generator for Amahle Blue
export function formatZar(value) {
  const amount = Number(value) || 0;
  const sign = amount < 0 ? '-' : '';
  const [int, dec] = Math.abs(amount).toFixed(2).split('.');
  const grouped = int.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return `${sign}R ${grouped}.${dec}`;
}

export function printInvoice(order) {
  const payMethod   = order.paymentMethod || order.payment?.method || '';
  const payStatus   = order.paymentStatus || (order.payment?.status === 'paid' ? 'Paid' : order.payment?.status) || 'Pending';
  const orderStatus = order.orderStatus   || order.status || '';
  const isPaid      = payStatus === 'Paid' || order.payment?.status === 'paid';
  const codFee      = order.codFee || 0;
  const eftRef      = order.eftReference || order.orderNumber;
  const vatRate     = 0.15;
  const vatAmount   = (order.total || 0) - (order.total || 0) / (1 + vatRate);
  
  // Try safely accessing window.__settings
  let settings = {};
  if (typeof window !== 'undefined' && window.__settings) {
    settings = window.__settings;
  }
  
  const vatNumber   = "4930324332";
  const bankDetails = order.eftBankDetails || settings.eft || {};
  const date = order.createdAt ? new Date(order.createdAt).toLocaleDateString('en-ZA', { day:'numeric', month:'long', year:'numeric' }) : '';
  const bName = (settings.business && settings.business.name) || 'Amahle Blue';
  const bAddress = (settings.business && settings.business.address) || 'Unit H, 13 Main Reef Road, Dunswart, Boksburg, Gauteng, South Africa';
  const bPhone = (settings.business && settings.business.phone) || '067 101 4345';
  const bEmail = (settings.business && settings.business.email) || 'info@amahle-blue.co.za';

  const amountPaid = isPaid ? order.total : 0;
  const balanceDue = isPaid ? 0 : order.total;

  const itemRows = (order.items || []).map(item => {
    const itemTotal = (item.qty || 1) * (item.price || 0);
    const itemVat = itemTotal - (itemTotal / (1 + vatRate));
    return `
    <tr>
      <td>
        <span class="item-name">${item.name}</span>
        ${item.variation ? `<span class="item-meta">Variation: ${item.variation}</span>` : ''}
      </td>
      <td style="text-align:center">${item.qty}</td>
      <td style="text-align:right">${formatZar(item.price)}</td>
      <td style="text-align:right;color:#64748b">${formatZar(itemVat)}</td>
      <td>${formatZar(itemTotal)}</td>
    </tr>`;
  }).join('');

  const eftSection = payMethod === 'EFT' && !isPaid ? `
    <div class="pay-box eft">
      <p class="pay-title" style="color:#1E50E0">EFT Payment Instructions</p>
      <p class="pay-detail">Reference: <strong>${eftRef}</strong></p>
      ${bankDetails.bankName   ? `<p class="pay-detail">Bank: ${bankDetails.bankName}</p>` : ''}
      ${bankDetails.accountHolder ? `<p class="pay-detail">Account Holder: ${bankDetails.accountHolder}</p>` : ''}
      ${bankDetails.accountNumber ? `<p class="pay-detail">Account Number: ${bankDetails.accountNumber}</p>` : ''}
      ${bankDetails.branchCode    ? `<p class="pay-detail">Branch Code: ${bankDetails.branchCode}</p>` : ''}
      ${bankDetails.accountType   ? `<p class="pay-detail">Account Type: ${bankDetails.accountType}</p>` : ''}
      <p class="pay-detail" style="margin-top:8px;color:#64748b;font-size:11px">Please use your order number as your payment reference.</p>
    </div>` : '';

  const codSection = payMethod === 'COD' && !isPaid ? `
    <div class="pay-box cod">
      <p class="pay-title" style="color:#92400e">Cash on Delivery</p>
      <p class="pay-detail" style="color:#92400e">Amount due on delivery: <strong>${formatZar(order.total)}</strong></p>
    </div>` : '';

  const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Invoice ${order.invoiceNumber || order.orderNumber}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
  * { box-sizing: border-box; }
  body {
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    color: #1e293b;
    margin: 0;
    padding: 0;
    background: #f8fafc;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .no-print-bar {
    max-width: 800px;
    margin: 20px auto 0 auto;
    padding: 0 16px;
    text-align: right;
  }
  .print-btn {
    background: #1e50e0;
    color: #fff;
    border: none;
    padding: 10px 22px;
    border-radius: 8px;
    font-size: 13px;
    font-weight: 700;
    cursor: pointer;
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    transition: background 0.2s;
  }
  .print-btn:hover {
    background: #1540b3;
  }
  .invoice-wrapper {
    max-width: 800px;
    margin: 20px auto 40px auto;
    background: #fff;
    padding: 48px;
    border-radius: 12px;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
  }
  @media print {
    body { background: #fff; }
    .no-print-bar { display: none !important; }
    .invoice-wrapper { margin: 0; padding: 0; box-shadow: none; max-width: 100%; border-radius: 0; }
  }
  .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 40px; border-bottom: 2px solid #f1f5f9; padding-bottom: 24px; }
  .header-left { display: flex; flex-direction: column; gap: 4px; }
  .logo-text { font-size: 28px; font-weight: 700; color: #0f172a; margin: 0 0 4px 0; letter-spacing: -0.02em; }
  .logo-sub { font-size: 13px; font-weight: 600; color: #1e50e0; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.1em; }
  .business-details p { margin: 0; color: #64748b; font-size: 13px; line-height: 1.5; }
  
  .header-right { text-align: right; }
  .invoice-title { font-size: 32px; font-weight: 700; color: #1e50e0; margin: 0 0 16px 0; text-transform: uppercase; letter-spacing: 0.05em; }
  .invoice-meta { display: grid; grid-template-columns: auto auto; gap: 6px 16px; text-align: right; justify-content: end; }
  .meta-label { color: #64748b; font-size: 12px; font-weight: 500; text-transform: uppercase; }
  .meta-value { color: #0f172a; font-size: 13px; font-weight: 600; }

  .info-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 24px; margin-bottom: 40px; }
  .info-block { background: #f8fafc; padding: 16px; border-radius: 8px; border: 1px solid #e2e8f0; }
  .info-title { font-size: 11px; font-weight: 700; text-transform: uppercase; color: #64748b; margin: 0 0 12px 0; letter-spacing: 0.05em; }
  .info-content p { margin: 0 0 4px 0; font-size: 13px; color: #334155; line-height: 1.4; word-wrap: break-word; }
  .info-content .name { font-weight: 600; color: #0f172a; font-size: 14px; margin-bottom: 6px; }

  table { width: 100%; border-collapse: separate; border-spacing: 0; margin-bottom: 32px; }
  thead { display: table-header-group; }
  tr { page-break-inside: avoid; }
  th { background: #f1f5f9; padding: 12px 16px; text-align: left; font-size: 12px; font-weight: 600; color: #475569; text-transform: uppercase; letter-spacing: 0.05em; border-bottom: 1px solid #e2e8f0; }
  th:first-child { border-top-left-radius: 8px; border-bottom-left-radius: 8px; }
  th:last-child { border-top-right-radius: 8px; border-bottom-right-radius: 8px; text-align: right; }
  td { padding: 16px; border-bottom: 1px solid #f1f5f9; font-size: 14px; color: #334155; vertical-align: top; }
  td:last-child { text-align: right; font-weight: 600; color: #0f172a; }
  .item-name { font-weight: 600; color: #0f172a; margin-bottom: 4px; display: block; }
  .item-meta { font-size: 12px; color: #64748b; display: block; }

  .totals-wrapper { display: flex; justify-content: space-between; align-items: flex-start; gap: 32px; page-break-inside: avoid; }
  .payment-instructions { flex: 1; max-width: 400px; }
  .totals-box { width: 320px; background: #f8fafc; padding: 24px; border-radius: 8px; border: 1px solid #e2e8f0; }
  .total-row { display: flex; justify-content: space-between; margin-bottom: 12px; font-size: 13px; color: #475569; }
  .total-row.grand-total { margin-top: 16px; padding-top: 16px; border-top: 2px solid #e2e8f0; font-size: 18px; font-weight: 700; color: #0f172a; margin-bottom: 0; }
  .total-row.grand-total .val { color: #1e50e0; }
  
  .footer { margin-top: 64px; text-align: center; padding-top: 24px; border-top: 1px solid #e2e8f0; page-break-inside: avoid; }
  .thank-you { font-size: 16px; font-weight: 600; color: #0f172a; margin: 0 0 8px 0; }
  .footer-contact { font-size: 13px; color: #64748b; margin: 0 0 4px 0; }
  .footer-note { font-size: 11px; color: #94a3b8; margin: 0; }

  .badge { display: inline-block; padding: 4px 8px; border-radius: 4px; font-size: 11px; font-weight: 700; text-transform: uppercase; }
  .badge.paid { background: #dcfce7; color: #166534; }
  .badge.pending { background: #fef9c3; color: #854d0e; }
  .badge.slate { background: #f1f5f9; color: #475569; }
  
  .pay-box { background: #fff; border: 1px solid #bfdbfe; border-radius: 8px; padding: 16px; margin-top: 16px; }
  .pay-box.eft { border-color: #bfdbfe; background: #eff6ff; }
  .pay-box.cod { border-color: #fde68a; background: #fef3c7; }
  .pay-title { font-weight: 700; font-size: 13px; margin: 0 0 8px 0; }
  .pay-detail { margin: 0 0 4px 0; font-size: 12px; color: #334155; }
  
  @media (max-width: 600px) {
    .header, .totals-wrapper { flex-direction: column; }
    .header-right { text-align: left; margin-top: 24px; }
    .invoice-meta { justify-content: start; text-align: left; }
    .info-grid { grid-template-columns: 1fr; }
    .totals-box { width: auto; align-self: stretch; margin-top: 24px; }
    .invoice-wrapper { padding: 24px; margin: 16px; }
  }
</style>
</head>
<body>
<div class="no-print-bar">
  <button class="print-btn" onclick="window.print()">🖨️ Print / Save PDF</button>
</div>
<div class="invoice-wrapper">
  <div class="header">
    <div class="header-left">
      <h1 class="logo-text">${bName}</h1>
      <div class="logo-sub">Cleaning Solutions</div>
      <div class="business-details">
        <p>${bAddress}</p>
        <p>${bPhone} · ${bEmail}</p>
        ${vatNumber ? `<p><strong>VAT Number:</strong> ${vatNumber}</p>` : ''}
      </div>
    </div>
    <div class="header-right">
      <h2 class="invoice-title">Tax Invoice</h2>
      <div class="invoice-meta">
        <span class="meta-label">Invoice No:</span>
        <span class="meta-value">${order.invoiceNumber || order.orderNumber}</span>
        <span class="meta-label">Date:</span>
        <span class="meta-value">${date}</span>
        <span class="meta-label">Order No:</span>
        <span class="meta-value">${order.orderNumber}</span>
      </div>
    </div>
  </div>

  <div class="info-grid">
    <div class="info-block">
      <h3 class="info-title">Bill To</h3>
      <div class="info-content">
        <p class="name">${order.customer?.name || '-'}</p>
        <p>${order.customer?.email || '-'}</p>
        <p>${order.customer?.phone || '-'}</p>
      </div>
    </div>
    <div class="info-block">
      <h3 class="info-title">Deliver To</h3>
      <div class="info-content">
        <p>${order.address || '-'}</p>
      </div>
    </div>
    <div class="info-block">
      <h3 class="info-title">Invoice Details</h3>
      <div class="info-content">
        <p><strong>Payment Method:</strong> ${payMethod}</p>
        <p><strong>Payment Status:</strong> <span class="badge ${isPaid ? 'paid' : (payStatus ? 'pending' : 'slate')}">${payStatus || (isPaid ? 'Paid' : 'Pending')}</span></p>
        <p><strong>Order Status:</strong> ${orderStatus}</p>
      </div>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Product</th>
        <th style="text-align:center">Qty</th>
        <th style="text-align:right">Price</th>
        <th style="text-align:right">VAT (15%)</th>
        <th style="text-align:right">Total</th>
      </tr>
    </thead>
    <tbody>
      ${itemRows}
    </tbody>
  </table>

  <div class="totals-wrapper">
    <div class="payment-instructions">
      ${eftSection}
      ${codSection}
    </div>
    
    <div class="totals-box">
      <div class="total-row">
        <span>Subtotal</span>
        <span>${formatZar(order.subtotal)}</span>
      </div>
      <div class="total-row">
        <span>Delivery</span>
        <span>${order.delivery === 0 ? 'Free' : formatZar(order.delivery)}</span>
      </div>
      ${order.couponDiscount > 0 ? `
      <div class="total-row" style="color: #16a34a">
        <span>Coupon Discount ${order.couponCode ? `(${order.couponCode})` : ''}</span>
        <span>−${formatZar(order.couponDiscount)}</span>
      </div>` : ''}
      ${codFee > 0 ? `
      <div class="total-row" style="color: #d97706">
        <span>COD Fee</span>
        <span>${formatZar(codFee)}</span>
      </div>` : ''}
      <div class="total-row" style="color: #64748b; border-top: 1px solid #e2e8f0; margin-top: 8px; padding-top: 8px;">
        <span>VAT Included (15%)</span>
        <span>${formatZar(vatAmount)}</span>
      </div>
      <div class="total-row grand-total">
        <span>Grand Total</span>
        <span class="val">${formatZar(order.total)}</span>
      </div>
      <div class="total-row" style="margin-top: 8px; font-weight: 500; font-size: 13px;">
        <span>Amount Paid</span>
        <span>${formatZar(amountPaid)}</span>
      </div>
      <div class="total-row" style="font-weight: 600; font-size: 13px; color: ${balanceDue > 0 ? '#b45309' : '#166534'}">
        <span>Balance Due</span>
        <span>${formatZar(balanceDue)}</span>
      </div>
    </div>
  </div>

  <div class="footer">
    <p class="thank-you">Thank you for your business!</p>
    <p class="footer-contact">If you have any questions, please contact customer support at ${bEmail} or call ${bPhone}</p>
    <p class="footer-note">This tax invoice was generated electronically.</p>
  </div>
</div>
<script>
  window.onload = function() {
    setTimeout(function() {
      // window.print(); // Handled by manual print/save button click or triggered optionally
    }, 500);
  };
</script>
</body>
</html>`;
 
  const w = window.open('', '_blank');
  if (!w) { alert('Allow popups to print the invoice.'); return; }
  w.document.open(); 
  w.document.write(html); 
  w.document.close();
}
