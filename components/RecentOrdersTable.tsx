'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowRight, ArrowUpRight } from 'lucide-react';
import type { Order } from '@/lib/types';
import { naira } from '@/lib/format';
import { Button, Countdown, StatusChip, Tag } from '@/components/ui';

interface RecentOrdersTableProps {
  orders: Order[];
  onSelectOrder: (id: string) => void;
}

export function RecentOrdersTable({ orders, onSelectOrder }: RecentOrdersTableProps) {
  return (
    <div className="card">
      <div className="card-head">
        <div>
          <div className="card-title">Latest orders</div>
          <div className="card-sub">Every order carries one link, and one ledger line</div>
        </div>
        <div className="card-actions">
          <Link href="/orders">
            <Button variant="ghost" size="sm">
              View all orders <ArrowRight size={13} />
            </Button>
          </Link>
        </div>
      </div>
      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Order</th>
              <th>Customer</th>
              <th>Items</th>
              <th>Channel</th>
              <th>Amount</th>
              <th>Status</th>
              <th>Expires</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.id} className="clickable" onClick={() => onSelectOrder(o.id)}>
                <td>
                  <span className="mono strong" style={{ fontSize: 12.5 }}>
                    {o.id}
                  </span>
                </td>
                <td>
                  <div className="product-cell">
                    <span className="avatar-xs">{o.customer.slice(0, 2).toUpperCase()}</span>
                    <div className="cell-stack">
                      <span style={{ fontSize: 12.5, fontWeight: 550, color: 'var(--ink-900)' }}>
                        {o.customer}
                      </span>
                      <span className="sub">{o.city}</span>
                    </div>
                  </div>
                </td>
                <td>
                  <div className="cell-stack">
                    <span style={{ fontSize: 12.5, color: 'var(--ink-800)' }}>
                      {o.items[0]?.name || '—'}
                    </span>
                    <span className="sub">
                      {o.items.reduce((s, i) => s + i.qty, 0)} item
                      {o.items.reduce((s, i) => s + i.qty, 0) > 1 ? 's' : ''}
                    </span>
                  </div>
                </td>
                <td>
                  <Tag tone={o.channel === 'USDC' ? 'usdc' : 'ngn'}>{o.channel}</Tag>
                </td>
                <td className="tnum strong">{naira(o.total)}</td>
                <td>
                  <StatusChip status={o.status} />
                </td>
                <td className="faint">
                  {o.status === 'awaiting' ? <Countdown expiresAt={o.expiresAt} /> : '—'}
                </td>
                <td className="r">
                  <Button variant="link">
                    Details <ArrowUpRight size={12} />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

