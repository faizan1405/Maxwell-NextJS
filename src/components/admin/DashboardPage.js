'use client';

import React from 'react';
import { useAdmin } from './AdminProvider';
import { StatCard, Btn, Avatar, Badge } from '../ui/index';
import { Icon } from '../ui/Icons';
import { formatZar, formatZarCompact } from '../../utils/currency';
import '../../styles/admin/_dashboard.scss';

function RevenueChart({ orders }) {
  // Build last 7 days revenue
  const days = Array.from({length:7}, (_,i) => {
    const d = new Date(); d.setDate(d.getDate()-6+i);
    return { label: d.toLocaleDateString('en-ZA',{weekday:'short'}), date: d.toDateString(), revenue:0 };
  });
  orders.filter(o => o.payment?.status==='paid').forEach(o => {
    const d = new Date(o.createdAt).toDateString();
    const found = days.find(day => day.date===d);
    if (found) found.revenue += o.total;
  });

  const max = Math.max(...days.map(d=>d.revenue), 1);
  const H = 80;
  const pts = days.map((d,i) => [i*(100/6), H - (d.revenue/max)*H]);
  const pathD = pts.map((p,i)=>i===0?`M ${p[0]} ${p[1]}`:`L ${p[0]} ${p[1]}`).join(' ');
  const areaD = `${pathD} L ${pts[pts.length-1][0]} ${H} L 0 ${H} Z`;

  return (
    <div className="revenue-chart">
      <div className="revenue-chart__header">
        <h3 className="revenue-chart__title">Revenue — Last 7 Days</h3>
        <span className="revenue-chart__total">{formatZar(orders.filter(o=>o.payment?.status==='paid').reduce((s,o)=>s+o.total,0))} total</span>
      </div>
      <svg viewBox={`0 0 100 ${H+16}`} preserveAspectRatio="none" className="revenue-chart__svg">
        <defs>
          <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#1E50E0" stopOpacity="0.15"/>
            <stop offset="100%" stopColor="#1E50E0" stopOpacity="0"/>
          </linearGradient>
        </defs>
        <path d={areaD} fill="url(#chartGrad)"/>
        <path d={pathD} fill="none" stroke="#1E50E0" strokeWidth="1.5" vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round"/>
        {pts.map((p,i) => <circle key={i} cx={p[0]} cy={p[1]} r="2.5" fill="#1E50E0" vectorEffect="non-scaling-stroke"/>)}
      </svg>
      <div className="revenue-chart__labels">
        {days.map((d,i) => <span key={i} className="revenue-chart__label">{d.label}</span>)}
      </div>
    </div>
  );
}

function OrderStatusChart({ byStatus }) {
  const statuses = [
    { key:'pending',    label:'Pending',    color:'#F59E0B' },
    { key:'processing', label:'Processing', color:'#3B82F6' },
    { key:'shipped',    label:'Shipped',    color:'#8B5CF6' },
    { key:'delivered',  label:'Delivered',  color:'#22C55E' },
    { key:'cancelled',  label:'Cancelled',  color:'#EF4444' },
  ];
  const total = Object.values(byStatus||{}).reduce((s,n)=>s+n,0) || 1;

  return (
    <div className="status-chart">
      <h3 className="status-chart__title">Orders by Status</h3>
      <div className="status-chart__list">
        {statuses.map(s => {
          const count = byStatus?.[s.key] || 0;
          const pct   = Math.round((count/total)*100);
          return (
            <div key={s.key} className="status-chart__item">
              <div className="status-chart__item-header">
                <span className="status-chart__item-label">{s.label}</span>
                <span className="status-chart__item-value">{count}</span>
              </div>
              <div className="status-chart__track">
                <div className="status-chart__fill" style={{width:`${pct}%`,background:s.color}}/>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function DashboardPage({ setPage }) {
  const { stats, orders, fmtMoney, fmtDate } = useAdmin();

  return (
    <div className="dashboard-page">
      {/* Stats grid */}
      <div className="dashboard-page__stats">
        <StatCard icon="💰" label="Collected Revenue" value={formatZarCompact(stats.revenue)}  color="cobalt"  sub="Confirmed & paid" />
        <StatCard icon="📦" label="Total Orders"  value={stats.totalOrders}  color="purple" sub={`${(stats.byStatus?.pending||0)+(stats.byStatus?.processing||0)} active`} onClick={() => setPage('orders')} />
        <StatCard icon="🛒" label="Products"      value={stats.activeProducts} color="green"  sub={stats.lowStockCount>0?`${stats.lowStockCount} low stock`:null} onClick={() => setPage('products')} />
        <StatCard icon="👥" label="Customers"     value={stats.totalCustomers} color="amber"  sub="Unique buyers"  onClick={() => setPage('customers')} />
      </div>

      {/* Charts */}
      <div className="dashboard-page__charts">
        <RevenueChart orders={orders}/>
        <OrderStatusChart byStatus={stats.byStatus}/>
      </div>

      {/* Low stock alerts */}
      {stats.lowStockCount > 0 && (
        <div className="dashboard-page__alerts">
          <div className="dashboard-page__alerts-header">
            <Icon.Warning/>
            <h3 className="dashboard-page__alerts-title">Low Stock Alert</h3>
            <span className="dashboard-page__alerts-badge">{stats.lowStockCount} product{stats.lowStockCount!==1?'s':''}</span>
          </div>
          <div className="dashboard-page__alerts-grid">
            {stats.lowStockProducts.map(p => (
              <div key={p.id} className="dashboard-page__alert-card">
                <img src={p.img} alt={p.name} className="dashboard-page__alert-img" onError={e=>e.target.style.display='none'}/>
                <div className="dashboard-page__alert-info">
                  <p className="dashboard-page__alert-name">{p.name}</p>
                  <p className={`dashboard-page__alert-stock ${p.stock===0?'dashboard-page__alert-stock--out':'dashboard-page__alert-stock--low'}`}>{p.stock===0?'Out of stock':`${p.stock} left`}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent orders */}
      <div className="dashboard-page__recent">
        <div className="dashboard-page__recent-header">
          <h3 className="dashboard-page__recent-title">Recent Orders</h3>
          <Btn variant="ghost" size="sm" onClick={() => setPage('orders')}>View all →</Btn>
        </div>
        <div className="dashboard-page__table-wrapper">
          <table className="dashboard-page__table">
            <thead className="dashboard-page__table-head">
              <tr>
                <th>Order</th>
                <th>Customer</th>
                <th className="hidden-sm">Total</th>
                <th>Status</th>
                <th className="hidden-md">Date</th>
              </tr>
            </thead>
            <tbody className="dashboard-page__table-body">
              {stats.recentOrders.map(o => (
                <tr key={o.id}>
                  <td className="dashboard-page__cell dashboard-page__cell--order">{o.orderNumber}</td>
                  <td className="dashboard-page__cell">
                    <div className="dashboard-page__cell--customer">
                      <Avatar name={o.customer.name} size={26}/>
                      <span className="dashboard-page__customer-name">{o.customer.name}</span>
                    </div>
                  </td>
                  <td className="dashboard-page__cell dashboard-page__cell--total">{fmtMoney(o.total)}</td>
                  <td className="dashboard-page__cell"><Badge label={o.status} variant={o.status}/></td>
                  <td className="dashboard-page__cell dashboard-page__cell--date">{fmtDate(o.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
