'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowDownUp,
  ArrowUpRight,
  Download,
  Filter,
  Plus,
  Search,
  ShoppingBag,
  X,
} from 'lucide-react';
import { useStore } from '@/lib/store';
import type { Order, OrderStatus } from '@/lib/types';
import { dateLabel, naira, nairaShort } from '@/lib/format';
import { downloadCsv } from '@/lib/csv';
import { Button, Countdown, EmptyState, StatusChip, Tag } from '@/components/ui';
import { CreateOrderModal } from '@/components/CreateOrderModal';
import { OrderDetails } from '@/components/OrderDetails';

type FilterKey = 'all' | 'awaiting' | 'paid' | 'attention' | 'expired';
type SortKey = 'newest' | 'oldest' | 'amount-desc' | 'amount-asc';

const FILTERS: { key: FilterKey; label: string; match: (o: Order) => boolean }[] = [
  { key: 'all', label: 'All orders', match: () => true },
  { key: 'awaiting', label: 'Awaiting', match: (o) => o.status === 'awaiting' },
  {
    key: 'paid',
    label: 'Paid',
    match: (o) => o.status === 'paid' || o.status === 'late_paid',
  },
  {
    key: 'attention',
    label: 'Needs attention',
    match: (o) => o.status === 'underpaid' || o.status === 'late_paid',
  },
  { key: 'expired', label: 'Expired', match: (o) => o.status === 'expired' || o.status === 'cancelled' },
];

const SORTS: { key: SortKey; label: string }[] = [
  { key: 'newest', label: 'Newest first' },
  { key: 'oldest', label: 'Oldest first' },
  { key: 'amount-desc', label: 'Amount: high to low' },
  { key: 'amount-asc', label: 'Amount: low to high' },
];

export default function OrdersPage() {
  const { orders, toast, hydrated } = useStore();
  const [filter, setFilter] = useState<FilterKey>('all');
  const [sort, setSort] = useState<SortKey>('newest');
  const [query, setQuery] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);

  // Deep links: /orders?q=… , ?filter=exceptions , ?order=ORD-1234 , ?new=1
  useEffect(() => {
    if (!hydrated) return;
    const params = new URLSearchParams(window.location.search);
    const q = params.get('q');
    const f = params.get('filter');
    const order = params.get('order');
    if (q) setQuery(q);
    if (f === 'exceptions') setFilter('attention');
    if (params.get('new') === '1') setCreateOpen(true);
    if (order) {
      const exists = orders.some((o) => o.id === order);
      if (exists) setDetailId(order);
      else toast({ kind: 'error', title: 'Order not found', message: `We could not find ${order}.` });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated]);

  const counts = useMemo(
    () => Object.fromEntries(FILTERS.map((f) => [f.key, orders.filter(f.match).length])) as Record<FilterKey, number>,
    [orders],
  );

  const visible = useMemo(() => {
    const term = query.trim().toLowerCase();
    const base = orders.filter(FILTERS.find((f) => f.key === filter)!.match).filter((o) => {
      if (!term) return true;
      return [o.id, o.customer, o.handle, o.ref, o.city, o.items.map((i) => i.name).join(' ')]
        .join(' ')
        .toLowerCase()
        .includes(term);
    });
    const sorted = [...base];
    sorted.sort((a, b) => {
      switch (sort) {
        case 'oldest':
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        case 'amount-desc':
          return b.total - a.total;
        case 'amount-asc':
          return a.total - b.total;
        default:
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
    });
    return sorted;
  }, [orders, filter, query, sort]);

  const attention = orders.filter((o) => o.status === 'underpaid' || o.status === 'late_paid').length;

  const exportCsv = () => {
    if (!visible.length) {
      toast({ kind: 'error', title: 'Nothing to export', message: 'Loosen the filter first.' });
      return;
    }
    downloadCsv(`AuraLink-orders-${new Date().toISOString().slice(0, 10)}.csv`, [
      ['Order ID', 'Customer', 'Handle', 'City', 'Items', 'Qty', 'Channel', 'Amount NGN', 'Status', 'Busha ref', 'Created', 'Expires'],
      ...visible.map((o) => [
        o.id,
        o.customer,
        o.handle,
        o.city,
        o.items.map((i) => `${i.name} x${i.qty}`).join(' | '),
        o.items.reduce((s, i) => s + i.qty, 0),
        o.channel,
        o.total,
        o.status,
        o.ref,
        o.createdAt,
        o.expiresAt,
      ]),
    ]);
    toast({ kind: 'success', title: 'Export ready', message: `${visible.length} orders written to CSV.` });
  };

  const detail = orders.find((o) => o.id === detailId) ?? null;
  const totalValue = visible.reduce((s, o) => s + o.total, 0);

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1 className="page-title">Orders</h1>
          <p className="page-sub">
            {orders.length} orders, {nairaShort(totalValue)} in view. Each one owns a single payment link.
          </p>
        </div>
        <div className="page-actions">
          <Button variant="ghost" onClick={exportCsv}>
            <Download size={14} /> Export CSV
          </Button>
          <Button variant="primary" onClick={() => setCreateOpen(true)}>
            <Plus size={15} /> Create new link
          </Button>
        </div>
      </div>

      {attention > 0 && (
        <div className="callout warn">
          <span className="callout-icon" style={{ color: 'var(--warn)' }}>
            <Filter size={14} />
          </span>
          <div style={{ flex: 1 }}>
            <div className="callout-title">
              {attention} payment{attention > 1 ? 's' : ''} need a decision
            </div>
            <div className="callout-body">
              Short or late payments sit here until you ask for the balance, refund, or confirm the price.
            </div>
          </div>
          <Button size="sm" variant="ghost" onClick={() => setFilter('attention')}>
            Show them
          </Button>
        </div>
      )}

      <div className="card">
        <div className="card-head" style={{ gap: 10 }}>
          <div className="pill-tabs">
            {FILTERS.map((f) => (
              <button
                key={f.key}
                className={`pill ${filter === f.key ? 'active' : ''}`}
                onClick={() => setFilter(f.key)}
              >
                {f.label}
                <span className="pill-count">{counts[f.key]}</span>
              </button>
            ))}
          </div>
          <div className="card-actions">
            <div className="search" style={{ width: 236, height: 32, maxWidth: 'none' }}>
              <Search size={13} color="#98a0ad" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search orders…"
                aria-label="Search orders"
                style={{ fontSize: 12.5 }}
              />
              {query && (
                <button
                  onClick={() => setQuery('')}
                  style={{ border: 'none', background: 'none', padding: 0, color: 'var(--faint)', display: 'grid' }}
                  aria-label="Clear search"
                >
                  <X size={13} />
                </button>
              )}
            </div>
            <div style={{ position: 'relative' }}>
              <select
                className="select"
                value={sort}
                onChange={(e) => setSort(e.target.value as SortKey)}
                style={{ height: 32, fontSize: 12.5, paddingLeft: 30, width: 168 }}
                aria-label="Sort orders"
              >
                {SORTS.map((s) => (
                  <option key={s.key} value={s.key}>
                    {s.label}
                  </option>
                ))}
              </select>
              <ArrowDownUp
                size={13}
                color="#6a7280"
                style={{ position: 'absolute', left: 10, top: 10, pointerEvents: 'none' }}
              />
            </div>
          </div>
        </div>

        {visible.length === 0 ? (
          orders.length === 0 ? (
            <EmptyState
              icon={<ShoppingBag size={18} />}
              title="No orders yet"
              sub="Create a payment link for your first buyer and it will show up here with its own status."
              action={
                <Button variant="primary" onClick={() => setCreateOpen(true)}>
                  <Plus size={15} /> New payment link
                </Button>
              }
            />
          ) : (
            <EmptyState
              icon={<Search size={18} />}
              title={query ? `Nothing matches “${query}”` : 'No orders in this filter'}
              sub={
                query
                  ? 'Try an order ID, a customer name or a Busha reference.'
                  : 'Switch the filter, or create a new link.'
              }
              action={
                <Button
                  variant="ghost"
                  onClick={() => {
                    setQuery('');
                    setFilter('all');
                  }}
                >
                  Clear filters
                </Button>
              }
            />
          )
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Order ID</th>
                  <th>Customer</th>
                  <th>Product</th>
                  <th>Qty</th>
                  <th>Channel</th>
                  <th className="r">Amount</th>
                  <th>Created</th>
                  <th>Status</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {visible.map((o) => (
                  <tr key={o.id} className="clickable" onClick={() => setDetailId(o.id)}>
                    <td>
                      <span className="mono strong" style={{ fontSize: 12.5 }}>
                        {o.id}
                      </span>
                    </td>
                    <td>
                      <div className="product-cell">
                        <span className="avatar-xs">{o.customer.slice(0, 2).toUpperCase()}</span>
                        <div className="cell-stack">
                          <span style={{ fontSize: 12.5 }}>{o.customer}</span>
                          <span className="sub">{o.handle}</span>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="product-cell">
                        <span className="product-thumb">
                          {/* { o.items[0].emoji} */}
                        </span>
                        <div className="cell-stack">
                          <span style={{ fontSize: 12.5 }}>{o.items[0].name}</span>
                          {o.items.length > 1 && <span className="sub">+{o.items.length - 1} more</span>}
                        </div>
                      </div>
                    </td>
                    <td className="tnum muted">{o.items.reduce((s, i) => s + i.qty, 0)}</td>
                    <td>
                      <Tag tone={o.channel === 'USDC' ? 'usdc' : 'ngn'}>{o.channel}</Tag>
                    </td>
                    <td className="r tnum strong">{naira(o.total)}</td>
                    <td className="faint">{dateLabel(o.createdAt)}</td>
                    <td>
                      <div className="row gap-6">
                        <StatusChip status={o.status} />
                        {o.status === 'awaiting' && (
                          <span className="faint xs mono">
                            <Countdown expiresAt={o.expiresAt} />
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="r">
                      <Button variant="link">
                        View <ArrowUpRight size={12} />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {visible.length > 0 && (
          <div className="card-head" style={{ borderBottom: 'none', borderTop: '1px solid var(--line-soft)', padding: '11px 16px' }}>
            <span className="faint xs">
              Showing {visible.length} of {orders.length} orders
            </span>
            <div className="card-actions">
              <span className="faint xs">Total value in view</span>
              <span className="tnum" style={{ fontWeight: 650, fontSize: 12.5 }}>
                {naira(totalValue)}
              </span>
            </div>
          </div>
        )}
      </div>

      <CreateOrderModal open={createOpen} onClose={() => setCreateOpen(false)} />
      <OrderDetails order={detail} open={!!detail} onClose={() => setDetailId(null)} />
    </div>
  );
}
