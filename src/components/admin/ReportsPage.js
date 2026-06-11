'use client';

import React, { useState, useMemo } from 'react';
import { useAdmin } from './AdminProvider';
import { calculateOrderStats } from '../../utils/accounting';
import { StatCard, Btn } from '../ui/index';
import { Icon } from '../ui/Icons';
import '../../styles/admin/_reports.scss';

export default function ReportsPage() {
  const { orders, stats, fmtMoney } = useAdmin();
  const [range, setRange] = useState('30d'); // today, 7d, 30d, all, custom
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');

  // ── Date Filtering ────────────────────────────────────────────────────────
  const filteredOrders = useMemo(() => {
    const now = new Date();
    let start = new Date(0);
    let end = new Date();
    
    if (range === 'today') {
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    } else if (range === '7d') {
      start = new Date(now);
      start.setDate(now.getDate() - 6);
      start.setHours(0,0,0,0);
    } else if (range === '30d') {
      start = new Date(now);
      start.setDate(now.getDate() - 29);
      start.setHours(0,0,0,0);
    } else if (range === 'custom') {
      start = customStart ? new Date(customStart) : new Date(0);
      end = customEnd ? new Date(customEnd) : new Date();
      if (customEnd) end.setHours(23, 59, 59, 999);
    }

    return (orders || []).filter(o => {
      const d = new Date(o.createdAt);
      return d >= start && d <= end;
    });
  }, [orders, range, customStart, customEnd]);

  // ── Aggregation ───────────────────────────────────────────────────────────
  const {
    accountingStats,
    productSales,
    salesByDay
  } = useMemo(() => {
    const pSales = {}; // { productId: { units: 0, revenue: 0, name: '' } }
    const sDay = {};   // { 'YYYY-MM-DD': revenue }

    const acc = calculateOrderStats(filteredOrders);

    filteredOrders.forEach(o => {
      const isCancelled = o.status === 'cancelled' || o.orderStatus === 'Cancelled';
      if (!isCancelled) {
        const dateKey = new Date(o.createdAt).toISOString().split('T')[0];
        sDay[dateKey] = (sDay[dateKey] || 0) + o.total;

        (o.items || []).forEach(item => {
          if (!pSales[item.id]) pSales[item.id] = { units: 0, revenue: 0, name: item.name };
          pSales[item.id].units += item.qty;
          pSales[item.id].revenue += (item.price * item.qty);
        });
      }
    });

    const bestSelling = Object.values(pSales).sort((a,b) => b.units - a.units).slice(0, 10);
    const salesByDayArr = Object.entries(sDay).map(([date, revenue]) => ({ date, revenue })).sort((a,b) => a.date.localeCompare(b.date));

    return { accountingStats: acc, productSales: bestSelling, salesByDay: salesByDayArr };
  }, [filteredOrders]);

  const {
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
  } = accountingStats;

  // ── Exports ───────────────────────────────────────────────────────────────
  const downloadCSV = (csvContent, fileName) => {
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const escapeCSVCell = (cell) => {
    if (cell == null) return '""';
    const str = String(cell);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const exportOrders = () => {
    const headers = ["Order Number", "Date", "Customer", "Email", "Total", "Payment Method", "Status"];
    const rows = filteredOrders.map(o => [
      o.orderNumber,
      new Date(o.createdAt).toLocaleString(),
      o.customer?.name || '',
      o.customer?.email || '',
      fmtMoney(o.total),
      (o.paymentMethod || o.payment?.method || '').toUpperCase() === 'COD' ? 'COD' : 'EFT',
      o.status
    ]);
    const csv = [headers.map(escapeCSVCell).join(","), ...rows.map(r => r.map(escapeCSVCell).join(","))].join("\n");
    downloadCSV(csv, `orders_export_${new Date().toISOString().split('T')[0]}.csv`);
  };

  const exportSales = () => {
    const headers = ["Product Name", "Units Sold", "Revenue"];
    const rows = productSales.map(p => [
      p.name,
      p.units,
      fmtMoney(p.revenue)
    ]);
    const csv = [headers.map(escapeCSVCell).join(","), ...rows.map(r => r.map(escapeCSVCell).join(","))].join("\n");
    downloadCSV(csv, `product_sales_export_${new Date().toISOString().split('T')[0]}.csv`);
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="reports-page">
      
      {/* Header & Controls */}
      <div className="reports-page__header">
        <div className="reports-page__filters">
          <select value={range} onChange={(e) => setRange(e.target.value)}
            className="reports-page__select">
            <option value="today">Today</option>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
            <option value="all">All Time</option>
            <option value="custom">Custom Range</option>
          </select>
          {range === 'custom' && (
            <div className="reports-page__custom-range">
              <input type="date" value={customStart} onChange={e=>setCustomStart(e.target.value)} className="reports-page__date-input"/>
              <span className="reports-page__date-sep">to</span>
              <input type="date" value={customEnd} onChange={e=>setCustomEnd(e.target.value)} className="reports-page__date-input"/>
            </div>
          )}
        </div>
        <div className="reports-page__actions">
          <Btn variant="secondary" size="sm" onClick={exportOrders}><Icon.Download /> Orders CSV</Btn>
          <Btn variant="secondary" size="sm" onClick={exportSales}><Icon.Download /> Sales CSV</Btn>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="reports-page__stats">
        <StatCard icon="📊" label="Gross Sales" value={fmtMoney(grossSales)} color="cobalt" sub="All valid orders" />
        <StatCard icon="💰" label="Collected Revenue" value={fmtMoney(collectedRevenue)} color="green" sub="Paid orders only" />
        <StatCard icon="📦" label="Valid Orders" value={totalValidOrders} color="purple" sub="Excludes cancelled" />
        <StatCard icon="⏳" label="Outstanding COD" value={fmtMoney(outstandingCOD)} color="amber" sub="Delivered, unpaid" />
      </div>

      {/* Charts & Split Views */}
      <div className="reports-page__split">
        
        {/* Payment Methods Split */}
        <div className="reports-page__card">
          <div className="reports-page__card-header">
            <h3 className="reports-page__card-title">Revenue by Payment Method</h3>
          </div>
          <div className="reports-page__payment-boxes">
            <div className="reports-page__payment-box">
              <p className="reports-page__payment-label">Cash on Delivery</p>
              <p className="reports-page__payment-value reports-page__payment-value--cod">{fmtMoney(codSales)}</p>
              <p className="reports-page__payment-sub">{codCount} orders</p>
            </div>
            <div className="reports-page__payment-box">
              <p className="reports-page__payment-label">EFT / Transfer</p>
              <p className="reports-page__payment-value reports-page__payment-value--eft">{fmtMoney(eftSales)}</p>
              <p className="reports-page__payment-sub">{eftCount} orders</p>
            </div>
          </div>
          {/* Simple progress bar representation */}
          <div className="reports-page__payment-bar">
            <div style={{ width: `${grossSales > 0 ? (codSales/grossSales)*100 : 50}%` }} className="reports-page__payment-bar-fill reports-page__payment-bar-fill--cod"/>
            <div style={{ width: `${grossSales > 0 ? (eftSales/grossSales)*100 : 50}%` }} className="reports-page__payment-bar-fill reports-page__payment-bar-fill--eft"/>
          </div>
          <div className="reports-page__payment-legend">
            <span>{grossSales > 0 ? Math.round((codSales/grossSales)*100) : 0}% COD</span>
            <span>{grossSales > 0 ? Math.round((eftSales/grossSales)*100) : 0}% EFT</span>
          </div>
        </div>

        {/* Low Stock Alerts */}
        <div className="reports-page__card">
          <div className="reports-page__card-header">
            <h3 className="reports-page__card-title">Low Stock Products</h3>
            <span className="reports-page__card-badge">{stats.lowStockCount} items</span>
          </div>
          <div className="reports-page__low-stock">
            {stats.lowStockProducts.length === 0 ? (
              <p className="reports-page__low-stock-empty">Inventory levels are healthy.</p>
            ) : (
              stats.lowStockProducts.map(p => (
                <div key={p.id} className="reports-page__low-stock-item">
                  <div className="reports-page__low-stock-info">
                    <img src={p.img} alt={p.name} className="reports-page__low-stock-img"/>
                    <p className="reports-page__low-stock-name">{p.name}</p>
                  </div>
                  <span className={`reports-page__low-stock-count ${p.stock === 0 ? 'reports-page__low-stock-count--out' : 'reports-page__low-stock-count--low'}`}>{p.stock} left</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Best Selling Products */}
      <div className="reports-page__card">
        <div className="reports-page__card-header">
          <h3 className="reports-page__card-title">Best-Selling Products (in range)</h3>
        </div>
        <div className="reports-page__table-wrapper">
          <table className="reports-page__table">
            <thead className="reports-page__table-head">
              <tr>
                <th>Product</th>
                <th className="text-right">Units Sold</th>
                <th className="text-right">Revenue</th>
              </tr>
            </thead>
            <tbody className="reports-page__table-body">
              {productSales.length === 0 ? (
                <tr><td colSpan="3" className="reports-page__table-empty">No sales data in this range.</td></tr>
              ) : (
                productSales.map((p, i) => (
                  <tr key={i}>
                    <td className="reports-page__cell reports-page__cell--name">{p.name}</td>
                    <td className="reports-page__cell reports-page__cell--units text-right">{p.units}</td>
                    <td className="reports-page__cell reports-page__cell--revenue text-right">{fmtMoney(p.revenue)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
