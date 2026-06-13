'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth, useAdmin, fmtMoney, fmtDate } from './AdminProvider';
import * as Icon from '../ui/Icons';
import { Avatar, Btn, Modal, SearchInput, Empty, Pagination, AdminToast, Badge, StatCard } from '../ui/index';
import { formatZarCompact } from '../../utils/currency';

const CUST_PER_PAGE = 10;

function CustomerDetail({ customer, onClose }) {
  const { fmtMoney, fmtDate } = useAdmin();
  const [tab, setTab] = useState('orders');
  if (!customer) return null;

  return (
    <Modal open={!!customer} onClose={onClose} size="lg" title={
      <div className="admin-customer-detail__header">
        <Avatar name={customer.name} size={36}/>
        <div>
          <p className="admin-customer-detail__name">{customer.name}</p>
          <p className="admin-customer-detail__email">{customer.email}</p>
        </div>
        {customer.hasAccount && (
          <span className="admin-customers__account-badge">
            ✓ Account
          </span>
        )}
      </div>
    }
    footer={<Btn variant="secondary" onClick={onClose}>Close</Btn>}>
      <div className="admin-customer-detail">
        {/* Stats */}
        <div className="admin-customer-detail__stats">
          <div className="admin-customer-detail__stat-box admin-customer-detail__stat-box--orders">
            <div className="admin-customer-detail__stat-val admin-customer-detail__stat-val--orders">{customer.orderCount}</div>
            <div className="admin-customer-detail__stat-label">Orders</div>
          </div>
          <div className="admin-customer-detail__stat-box admin-customer-detail__stat-box--spent">
            <div className="admin-customer-detail__stat-val admin-customer-detail__stat-val--spent">{fmtMoney(customer.totalSpent)}</div>
            <div className="admin-customer-detail__stat-label">Total Spent</div>
          </div>
          <div className="admin-customer-detail__stat-box admin-customer-detail__stat-box--avg">
            <div className="admin-customer-detail__stat-val admin-customer-detail__stat-val--avg">
              {(() => {
                const paidOrders = (customer.orders || []).filter(o =>
                  o.payment?.status === 'paid' || o.paymentStatus === 'Paid'
                );
                return paidOrders.length > 0 ? fmtMoney(customer.totalSpent / paidOrders.length) : fmtMoney(0);
              })()}
            </div>
            <div className="admin-customer-detail__stat-label">Avg. Order</div>
          </div>
        </div>

        {/* Tabs */}
        <div className="admin-customer-detail__tabs-wrap">
          {[
            { id:'orders',    label:'Orders' },
            { id:'contact',   label:'Contact' },
            { id:'addresses', label:'Addresses', hidden: !customer.hasAccount },
          ].filter(t => !t.hidden).map(t => (
            <button key={t.id} onClick={()=>setTab(t.id)}
              className={`admin-customers__tab ${tab===t.id ? 'admin-customers__tab--active' : ''}`}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Contact tab */}
        {tab === 'contact' && (
          <div className="admin-customer-detail__contact-box">
            <div className="admin-customer-detail__contact-row">
              <span className="admin-customer-detail__contact-icon">✉</span>
              <a href={`mailto:${customer.email}`} className="admin-customer-detail__contact-link">{customer.email}</a>
            </div>
            <div className="admin-customer-detail__contact-row">
              <span className="admin-customer-detail__contact-icon">📞</span>
              <span className="admin-customer-detail__contact-text">{customer.phone || '—'}</span>
            </div>
            {customer.orders?.[0]?.address && (
              <div className="admin-customer-detail__contact-row">
                <span className="admin-customer-detail__contact-icon">📍</span>
                <span className="admin-customer-detail__contact-text">{customer.orders[0].address}</span>
              </div>
            )}
            {customer.hasAccount && (
              <div className="admin-customer-detail__contact-row admin-customer-detail__contact-row--divider">
                <span className="admin-customer-detail__contact-icon">🗓</span>
                <span className="admin-customer-detail__contact-meta">Account registered {fmtDate(customer.accountSince)}</span>
              </div>
            )}
          </div>
        )}

        {/* Addresses tab */}
        {tab === 'addresses' && (
          <div className="admin-customer-detail__address-list">
            {!customer.savedAddresses?.length ? (
              <p className="admin-customer-detail__empty">No saved addresses</p>
            ) : customer.savedAddresses.map((addr, i) => (
              <div key={addr.id || i} className={`admin-customer-detail__address-card ${addr.isDefault ? 'admin-customer-detail__address-card--default' : ''}`}>
                <div className="admin-customer-detail__address-header">
                  <span className="admin-customer-detail__address-label">{addr.label || 'Address'}</span>
                  {addr.isDefault && <span className="admin-customer-detail__address-default-badge">Default</span>}
                </div>
                <p className="admin-customer-detail__address-text">{[addr.line, addr.city, addr.province, addr.postalCode].filter(Boolean).join(', ')}</p>
              </div>
            ))}
          </div>
        )}

        {/* Orders tab */}
        {tab === 'orders' && (
          <div>
            {!(customer.orders && customer.orders.length) ? (
              <p className="admin-customer-detail__empty">No orders yet</p>
            ) : (
              <div className="admin-customer-detail__orders-list">
                {[...customer.orders].sort((a,b)=>new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).map(o => (
                  <div key={o.id} className="admin-customer-detail__order-card">
                    <div className="admin-customer-detail__order-info">
                      <div className="admin-customer-detail__order-header">
                        <span className="admin-customer-detail__order-num">{o.orderNumber}</span>
                        <Badge label={o.status} variant={o.status}/>
                      </div>
                      <p className="admin-customer-detail__order-meta">{o.items?.length} item{o.items?.length!==1?'s':''} · {fmtDate(o.createdAt)}</p>
                    </div>
                    <div className="admin-customer-detail__order-totals">
                      <p className="admin-customer-detail__order-total">{fmtMoney(o.total)}</p>
                      <p className={`admin-customer-detail__order-payment ${o.payment?.status==='paid' ? 'admin-customer-detail__order-payment--paid' : 'admin-customer-detail__order-payment--unpaid'}`}>{o.payment?.method}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}

export default function CustomersPage() {
  const { customers = [], fmtMoney, fmtDate } = useAdmin();
  const { isAdmin } = useAuth();

  const [search,  setSearch]  = useState('');
  const [sort,    setSort]    = useState('spent_desc');
  const [filter,  setFilter]  = useState('all'); // 'all' | 'account' | 'guest'
  const [page,    setPage]    = useState(1);
  const [viewing, setViewing] = useState(null);
  const [isExporting, setIsExporting] = useState(false);
  const [toast, setToast] = useState({ visible:false, msg:'', type:'success' });
  
  function showToast(msg, type='success') {
    setToast({ visible:true, msg, type });
    setTimeout(() => setToast(t => ({ ...t, visible:false })), 3500);
  }

  const filtered = useMemo(() => {
    let list = [...customers];

    if (filter === 'account') list = list.filter(c => c.hasAccount);
    if (filter === 'guest')   list = list.filter(c => !c.hasAccount);

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(c =>
        (c.name||'').toLowerCase().includes(q) ||
        (c.email||'').toLowerCase().includes(q) ||
        (c.phone||'').includes(q)
      );
    }
    list.sort((a,b) => {
      if (sort==='name')        return (a.name||'').localeCompare(b.name||'');
      if (sort==='spent_asc')   return a.totalSpent - b.totalSpent;
      if (sort==='spent_desc')  return b.totalSpent - a.totalSpent;
      if (sort==='orders_desc') return b.orderCount - a.orderCount;
      if (sort==='recent')      return new Date(b.lastOrderAt).getTime() - new Date(a.lastOrderAt).getTime();
      return 0;
    });
    return list;
  }, [customers, search, sort, filter]);

  const paged = filtered.slice((page-1)*CUST_PER_PAGE, page*CUST_PER_PAGE);
  useEffect(() => setPage(1), [search, sort, filter]);

  const totalRevenue  = customers.reduce((s,c) => s+c.totalSpent, 0);
  const avgSpend      = customers.length ? totalRevenue / customers.length : 0;
  const accountCount  = customers.filter(c => c.hasAccount).length;

  const getExportData = useCallback(() => {
    return filtered.map(c => {
      return [
        c.name || '—',
        c.phone || '—',
        c.email || '—',
        c.orders?.[0]?.address || '—',
        c.hasAccount ? new Date(c.accountSince).toLocaleString('en-ZA') : '—',
        c.orderCount || 0,
        fmtMoney(c.totalSpent || 0),
        c.lastOrderAt ? new Date(c.lastOrderAt).toLocaleString('en-ZA') : '—'
      ];
    });
  }, [filtered]);

  async function handleExportCSV() {
    if (!isAdmin) return showToast('Unauthorized', 'error');
    setIsExporting(true);
    try {
      const headers = ['Customer Name', 'Phone', 'Email', 'Address', 'Registration Date', 'Total Orders', 'Total Spent', 'Last Order Date'];
      const data = getExportData();
      const escapeCell = (cell) => {
        if (cell == null) return '""';
        const str = String(cell);
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      };
      const csvContent = [
        headers.map(escapeCell).join(','),
        ...data.map(row => row.map(escapeCell).join(','))
      ].join('\n');
      
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      const dateStr = new Date().toISOString().split('T')[0];
      link.setAttribute("href", url);
      link.setAttribute("download", `customers-export-${dateStr}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      showToast('CSV Export successful');
    } catch (e) {
      console.error(e);
      showToast('Export failed', 'error');
    } finally {
      setIsExporting(false);
    }
  }

  async function handleExportPDF() {
    if (!isAdmin) return showToast('Unauthorized', 'error');
    if (isExporting) return;
    setIsExporting(true);
    try {
      const [{ jsPDF }, { default: autoTable }] = await Promise.all([
        import('jspdf'),
        import('jspdf-autotable'),
      ]);
      const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });

      const safe = (v) => (v == null ? '—' : String(v).replace(/[\x00-\x1F\x7F]/g, ' '));

      const headers = [['Name', 'Email', 'Phone', 'Type', 'Orders', 'Total Spent', 'Last Order']];
      const data = filtered.map(c => [
        safe(c.name),
        safe(c.email),
        safe(c.phone),
        c.hasAccount ? 'Registered' : 'Guest',
        c.orderCount || 0,
        safe(fmtMoney(c.totalSpent || 0)),
        c.lastOrderAt ? new Date(c.lastOrderAt).toLocaleDateString('en-ZA') : '—',
      ]);

      doc.setFontSize(14);
      doc.text('Customers Export', 40, 30);
      doc.setFontSize(9);
      doc.text(`${filtered.length} customers · Generated ${new Date().toLocaleString('en-ZA')}`, 40, 46);

      autoTable(doc, {
        startY: 60,
        head: headers,
        body: data,
        styles: { fontSize: 9, cellPadding: 4, overflow: 'linebreak' },
        headStyles: { fillColor: [30, 80, 224], textColor: 255 },
        columnStyles: { 4: { halign: 'right' }, 5: { halign: 'right' } },
        margin: { left: 40, right: 40 },
      });

      const dateStr = new Date().toISOString().split('T')[0];
      doc.save(`customers-export-${dateStr}.pdf`);
      showToast(`PDF exported (${filtered.length} customers)`);
    } catch (e) {
      console.error('PDF export failed', e);
      showToast(`Export failed: ${e?.message || 'unknown error'}`, 'error');
    } finally {
      setIsExporting(false);
    }
  }

  return (
    <div className="admin-customers">
      <AdminToast message={toast.msg} type={toast.type} visible={toast.visible}/>

      <div className="admin-customers__header">
        <div>
          <h2 className="admin-customers__title">Customers</h2>
          <p className="admin-customers__subtitle">{customers.length} customers · {accountCount} registered accounts</p>
        </div>
        <div className="admin-customers__actions">
          <Btn variant="secondary" size="sm" disabled={isExporting || filtered.length === 0} onClick={handleExportCSV}>
            {isExporting ? <span className="admin-customers__export-spin">⭘</span> : null}
            Export CSV
          </Btn>
          <Btn variant="secondary" size="sm" disabled={isExporting || filtered.length === 0} onClick={handleExportPDF}>
            {isExporting ? <span className="admin-customers__export-spin">⭘</span> : null}
            Export PDF
          </Btn>
        </div>
      </div>

      <div className="admin-customers__stats">
        <StatCard icon="👥" label="Total Customers"     value={customers.length}      color="cobalt"/>
        <StatCard icon="🔑" label="Registered Accounts" value={accountCount}          color="cobalt"/>
        <StatCard icon="💰" label="Collected Revenue"       value={formatZarCompact(totalRevenue)} color="green"/>
        <StatCard icon="🧾" label="Avg. Order Value"    value={fmtMoney(avgSpend)}   color="amber"/>
      </div>

      <div className="admin-customers__filters">
        <SearchInput value={search} onChange={setSearch} placeholder="Search customers…"/>
        <div className="admin-customers__tabs">
          {[['all','All'],['account','Has Account'],['guest','Guest']].map(([v,l]) => (
            <button key={v} onClick={()=>setFilter(v)}
              className={`admin-customers__tab ${filter===v ? 'admin-customers__tab--active' : ''}`}>
              {l}
            </button>
          ))}
        </div>
        <select value={sort} onChange={e=>setSort(e.target.value)}
          className="admin-customers__select">
          <option value="spent_desc">Highest spend</option>
          <option value="spent_asc">Lowest spend</option>
          <option value="orders_desc">Most orders</option>
          <option value="recent">Most recent</option>
          <option value="name">Name A–Z</option>
        </select>
      </div>

      <div className="admin-customers__table-container">
        {filtered.length === 0 ? (
          <Empty icon="👥" title="No customers found" description="No customers match your search."/>
        ) : (
          <>
            <div className="admin-customers__table-scroll">
              <table className="admin-customers__table">
                <thead>
                  <tr>
                    <th>Customer</th>
                    <th className="hidden-sm">Phone</th>
                    <th>Orders</th>
                    <th>Total Spent</th>
                    <th className="hidden-md">Last Order</th>
                    <th className="hidden-lg">Account</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paged.map(c => (
                    <tr key={c.accountId || c.id || c.email} onClick={()=>setViewing(c)}>
                      <td>
                        <div className="admin-customers__avatar-group">
                          <Avatar name={c.name} size={34}/>
                          <div>
                            <p className="admin-customers__name">{c.name || '—'}</p>
                            <p className="admin-customers__email">{c.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="hidden-sm">
                        <span className="admin-customers__phone">{c.phone || '—'}</span>
                      </td>
                      <td>
                        <span className="admin-customers__order-count">{c.orderCount}</span>
                      </td>
                      <td>
                        <span className="admin-customers__total-spent">{fmtMoney(c.totalSpent)}</span>
                      </td>
                      <td className="hidden-md">
                        <span className="admin-customers__date">{c.lastOrderAt ? fmtDate(c.lastOrderAt) : '—'}</span>
                      </td>
                      <td className="hidden-lg">
                        {c.hasAccount ? (
                          <span className="admin-customers__account-badge">✓ Account</span>
                        ) : (
                          <span className="admin-customers__guest-text">Guest</span>
                        )}
                      </td>
                      <td onClick={e=>e.stopPropagation()}>
                        <button onClick={()=>setViewing(c)} className="admin-customers__action-btn"><Icon.Eye/></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="admin-customers__pagination-wrap">
              <Pagination page={page} total={filtered.length} pageSize={CUST_PER_PAGE} onChange={setPage}/>
            </div>
          </>
        )}
      </div>

      <CustomerDetail customer={viewing} onClose={()=>setViewing(null)}/>
    </div>
  );
}
