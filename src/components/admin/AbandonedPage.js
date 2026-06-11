'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useAdmin } from './AdminProvider';
import { StatCard, SearchInput, Empty, Avatar, Pagination } from '../ui/index';
import { Mail } from '../ui/Icons';
import '../../styles/admin/_abandoned.scss';

const ABANDONED_PAGE_SIZE = 15;

export default function AbandonedPage() {
  const { abandonedCarts, fmtMoney, fmtDateTime } = useAdmin();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [expanded, setExpanded] = useState(null);

  const carts = abandonedCarts || [];

  const filtered = useMemo(() => {
    if (!search.trim()) return carts;
    const q = search.toLowerCase();
    return carts.filter(c =>
      (c.email || '').toLowerCase().includes(q) ||
      (c.guestId || '').toLowerCase().includes(q)
    );
  }, [carts, search]);

  const paged = filtered.slice((page - 1) * ABANDONED_PAGE_SIZE, page * ABANDONED_PAGE_SIZE);
  
  useEffect(() => {
    setPage(1);
  }, [search]);

  const totalValue = carts.reduce((s, c) =>
    s + (c.items || []).reduce((sv, i) => sv + (i.price || 0) * (i.qty || 1), 0), 0);

  return (
    <div className="abandoned">
      <div className="abandoned__header">
        <h2 className="abandoned__header-title">Abandoned Carts</h2>
        <p className="abandoned__header-subtitle">
          {carts.length} cart{carts.length !== 1 ? 's' : ''} &middot; {fmtMoney ? fmtMoney(totalValue) : totalValue} potential revenue
        </p>
      </div>

      <div className="abandoned__stats">
        <StatCard icon="🛒" label="Abandoned Carts" value={carts.length} color="amber" />
        <StatCard icon="💸" label="Potential Revenue" value={fmtMoney ? fmtMoney(totalValue) : totalValue} color="cobalt" />
        <div className="abandoned__stats-hidden-sm">
          <StatCard icon="👤" label="With Email" value={carts.filter(c => c.email).length} color="green" />
        </div>
      </div>

      <div className="abandoned__card">
        <div className="abandoned__search">
          <SearchInput value={search} onChange={setSearch} placeholder="Search by email or guest ID…" />
        </div>

        {filtered.length === 0 ? (
          <Empty 
            icon="🛒" 
            title="No abandoned carts"
            description={search ? 'No carts match your search.' : 'All carts have been converted or are still active.'} 
          />
        ) : (
          <>
            <div className="abandoned__table-wrapper">
              <table className="abandoned__table">
                <thead>
                  <tr>
                    <th>Customer</th>
                    <th className="hidden-sm">Items</th>
                    <th className="hidden-md">Value</th>
                    <th className="hidden-lg">Last Seen</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {paged.map(cart => {
                    const cartKey = cart.guestId || cart.email || cart.id || Math.random();
                    const cartValue = (cart.items || []).reduce((s, i) => s + (i.price || 0) * (i.qty || 1), 0);
                    const itemCount = (cart.items || []).reduce((s, i) => s + (i.qty || 1), 0);
                    const isExpanded = expanded === cartKey;

                    return (
                      <React.Fragment key={cartKey}>
                        <tr className="abandoned__row" onClick={() => setExpanded(isExpanded ? null : cartKey)}>
                          <td>
                            <div className="abandoned__customer">
                              <Avatar name={cart.email || cart.guestId || '?'} size={28} />
                              <div className="abandoned__customer-info">
                                <p className="abandoned__customer-name">
                                  {cart.email || <span>Guest</span>}
                                </p>
                                <p className="abandoned__customer-id">{cart.guestId}</p>
                              </div>
                            </div>
                          </td>
                          <td className="abandoned__items-count hidden-sm">
                            {itemCount} item{itemCount !== 1 ? 's' : ''}
                          </td>
                          <td className="abandoned__value hidden-md">
                            {fmtMoney ? fmtMoney(cartValue) : cartValue}
                          </td>
                          <td className="abandoned__date hidden-lg">
                            {fmtDateTime ? fmtDateTime(cart.updatedAt) : cart.updatedAt}
                          </td>
                          <td>
                            <svg 
                              className={`abandoned__chevron ${isExpanded ? 'abandoned__chevron--expanded' : ''}`}
                              viewBox="0 0 24 24" 
                              fill="none" 
                              stroke="currentColor" 
                              strokeWidth="2.5"
                            >
                              <polyline points="6 9 12 15 18 9" />
                            </svg>
                          </td>
                        </tr>

                        {isExpanded && (
                          <tr className="abandoned__expanded">
                            <td colSpan={5}>
                              <div className="abandoned__expanded-content">
                                <p className="abandoned__expanded-title">Cart Items</p>
                                {(cart.items || []).map((item, i) => (
                                  <div key={i} className="abandoned__expanded-item">
                                    <div className="abandoned__expanded-item-info">
                                      {item.img && (
                                        <img 
                                          src={item.img} 
                                          alt="" 
                                          onError={e => { e.target.style.display = 'none'; }} 
                                        />
                                      )}
                                      <span className="name">{item.name || item.id}</span>
                                      <span className="qty">&times; {item.qty || 1}</span>
                                    </div>
                                    <span className="abandoned__expanded-item-price">
                                      {fmtMoney ? fmtMoney((item.price || 0) * (item.qty || 1)) : (item.price || 0) * (item.qty || 1)}
                                    </span>
                                  </div>
                                ))}
                                {cart.email && (
                                  <div className="abandoned__expanded-footer">
                                    <a 
                                      href={`mailto:${cart.email}?subject=Your cart at Amahle Blue&body=Hi! You left some items in your cart. Come back and complete your purchase.`}
                                    >
                                      <Mail size={12} /> Email customer
                                    </a>
                                    <span>{fmtDateTime ? fmtDateTime(cart.updatedAt) : cart.updatedAt}</span>
                                  </div>
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="abandoned__pagination">
              <Pagination page={page} total={filtered.length} pageSize={ABANDONED_PAGE_SIZE} onChange={setPage} />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
