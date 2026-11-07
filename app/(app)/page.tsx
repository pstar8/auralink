'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  ArrowRight,
  ArrowUpRight,
  BadgeCheck,
  CircleDollarSign,
  Clock,
  Plus,
  TrendingUp,
  Wallet,
} from 'lucide-react';
import { useStore } from '@/lib/store';
import { BRAND, RATES } from '@/lib/config';
import { dateLabel, naira, nairaShort, relative } from '@/lib/format';
import { AreaChart, HorizontalBars } from '@/components/charts';
import { BalanceCard } from '@/components/BalanceCard';
import { Button, Countdown, EmptyState, Segmented, StatusChip, Tag } from '@/components/ui';
import { CreateOrderModal } from '@/components/CreateOrderModal';
import { OrderDetails } from '@/components/OrderDetails';

const startOfDay = (d: Date) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x.getTime();
};

export default function DashboardPage() {
  const { orders, ledger, now } = useStore();
  const [range, setRange] = useState<'monthly' | 'weekly'>('monthly');
  const [createOpen, setCreateOpen] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);

  const detail = orders.find((o) => o.id === detailId) ?? null;

  const stats = useMemo(() => {
    const todayStart = startOfDay(new Date(now));
    const yStart = todayStart - 86_400_000;

    const paidStatuses = ['paid', 'late_paid', 'underpaid'] as const;
    const collectedToday = orders
      .filter((o) => o.paidAt && new Date(o.paidAt).getTime() >= todayStart)
      .reduce((s, o) => s + (o.receivedNgn ?? 0), 0);
    const collectedYesterday = orders
      .filter((o) => o.paidAt && new Date(o.paidAt).getTime() >= yStart && new Date(o.paidAt).getTime() < todayStart)
      .reduce((s, o) => s + (o.receivedNgn ?? 0), 0);

    const awaiting = orders.filter((o) => o.status === 'awaiting');
    const attention = orders.filter((o) => o.status === 'underpaid' || o.status === 'late_paid');
    const expired = orders.filter((o) => o.status === 'expired');

    const last30 = startOfDay(new Date(now)) - 29 * 86_400_000;
    const recent = orders.filter((o) => new Date(o.createdAt).getTime() >= last30);
    const settled = recent.filter((o) => paidStatuses.includes(o.status as (typeof paidStatuses)[number])).length;
    const successRate = recent.length ? (settled / recent.length) * 100 : 0;

    const delta = collectedYesterday
      ? ((collectedToday - collectedYesterday) / collectedYesterday) * 100
      : collectedToday > 0
        ? 100
        : 0;

    return {
      collectedToday,
      delta,
      awaitingCount: awaiting.length,
      awaitingValue: awaiting.reduce((s, o) => s + o.total, 0),
      attention,
      expired,
      successRate,
      orderCount: recent.length,
    };
  }, [orders, now]);

  const chart = useMemo(() => {
    if (range === 'weekly') {
      return Array.from({ length: 7 }).map((_, i) => {
        const day = startOfDay(new Date(now)) - (6 - i) * 86_400_000;
        const next = day + 86_400_000;
        const value = ledger
          .filter((l) => {
            const t = new Date(l.createdAt).getTime();
            return t >= day && t < next;
          })
          .reduce((s, l) => s + l.nairaValue, 0);
        return {
          label: new Date(day).toLocaleDateString('en-GB', { weekday: 'short' }),
          value,
        };
      });
    }
    return Array.from({ length: 6 }).map((_, i) => {
      const d = new Date(now);
      d.setDate(1);
      d.setMonth(d.getMonth() - (5 - i));
      const start = d.getTime();
      const e = new Date(d);
      e.setMonth(e.getMonth() + 1);
      const end = e.getTime();
      const value = ledger
        .filter((l) => {
          const t = new Date(l.createdAt).getTime();
          return t >= start && t < end;
        })
        .reduce((s, l) => s + l.nairaValue, 0);
      return { label: d.toLocaleDateString('en-GB', { month: 'short' }), value };
    });
  }, [ledger, now, range]);

  const channelSplit = useMemo(() => {
    const ngn = ledger.filter((l) => l.currency === 'NGN').reduce((s, l) => s + l.nairaValue, 0);
    const usdc = ledger.filter((l) => l.currency === 'USDC').reduce((s, l) => s + l.nairaValue, 0);
    return { ngn, usdc };
  }, [ledger]);

  const recentOrders = useMemo(
    () =>
      [...orders]
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 5),
    [orders],
  );
  const recentPayments = ledger.slice(0, 4);
  const exceptions = useMemo(
    () =>
      [...stats.attention, ...stats.expired]
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 3),
    [stats.attention, stats.expired],
  );

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1 className="page-title">Good afternoon, {BRAND.seller.name.split(' ')[0]}</h1>
          <p className="page-sub">
            {stats.awaitingCount > 0 ? (
              <>
                <strong style={{ color: 'var(--ink-700)', fontWeight: 600 }}>{stats.awaitingCount} links</strong> are
                waiting on buyers, and {stats.attention.length + stats.expired.length} need a look.
              </>
            ) : (
              'Everything is settled. Nothing is waiting on you.'
            )}
          </p>
        </div>
        <div className="page-actions">
          <span className="tag">{dateLabel(new Date(now).toISOString())}</span>
          <Button variant="primary" onClick={() => setCreateOpen(true)}>
            <Plus size={15} /> New payment link
          </Button>
        </div>
      </div>
 {/* balance + chart */}
      <div >
        <BalanceCard />

        {/* <div className="card">
          <div className="card-head">
            <div>
              <div className="card-title">Money collected</div>
              <div className="card-sub">Settled value, after Busha&apos;s fee</div>
            </div>
            <div className="card-actions">
              <Segmented
                value={range}
                onChange={setRange}
                options={[
                  { value: 'weekly', label: 'Weekly' },
                  { value: 'monthly', label: 'Monthly' },
                ]}
              />
            </div>
          </div>
          <div className="card-body" style={{ paddingBottom: 10 }}>
            <div className="row gap-16" style={{ marginBottom: 6 }}>
              <div className="col gap-4">
                <span className="faint xs">Total in view</span>
                <span style={{ fontSize: 20, fontWeight: 650, letterSpacing: '-0.025em' }} className="tnum">
                  {naira(chart.reduce((s, c) => s + c.value, 0), { compact: true })}
                </span>
              </div>
              <div className="col gap-4">
                <span className="faint xs">Naira in</span>
                <span style={{ fontSize: 13.5, fontWeight: 600 }} className="tnum">
                  {naira(channelSplit.ngn, { compact: true })}
                </span>
              </div>
              <div className="col gap-4">
                <span className="faint xs">USDC in</span>
                <span style={{ fontSize: 13.5, fontWeight: 600 }} className="tnum">
                  {naira(channelSplit.usdc, { compact: true })}
                </span>
              </div>
            </div>
            <AreaChart data={chart} height={196} formatter={(n) => nairaShort(n)} />
          </div>
        </div> */}
      </div>


      {/* stats */}
      <div className="grid-stats">
        <div className="stat">
          <div className="stat-top">
            <span className="stat-label">Collected today</span>
            <span className="stat-icon">
              <CircleDollarSign size={15} />
            </span>
          </div>
          <div className="stat-value">{naira(stats.collectedToday, { compact: true })}</div>
          <div className="stat-foot">
            <span className={`delta ${stats.delta >= 0 ? 'up' : 'down'}`}>
              <TrendingUp size={12} />
              {stats.delta >= 0 ? '+' : ''}
              {stats.delta.toFixed(1)}%
            </span>
            vs yesterday
          </div>
        </div>

        <div className="stat">
          <div className="stat-top">
            <span className="stat-label">Awaiting payment</span>
            <span className="stat-icon">
              <Clock size={15} />
            </span>
          </div>
          <div className="stat-value">{stats.awaitingCount}</div>
          <div className="stat-foot">
            <span className="mono">{nairaShort(stats.awaitingValue)}</span> tied up in open links
          </div>
        </div>

        <div className="stat">
          <div className="stat-top">
            <span className="stat-label">Needs attention</span>
            <span className="stat-icon">
              <AlertTriangle size={15} />
            </span>
          </div>
          <div className="stat-value">{stats.attention.length}</div>
          <div className="stat-foot">
            {stats.attention.length ? 'Short or late payments to resolve' : 'Nothing is short or late'}
          </div>
        </div>

        <div className="stat">
          <div className="stat-top">
            <span className="stat-label">Payment success</span>
            <span className="stat-icon">
              <BadgeCheck size={15} />
            </span>
          </div>
          <div className="stat-value">{stats.successRate.toFixed(0)}%</div>
          <div className="stat-foot">of {stats.orderCount} orders in 30 days</div>
        </div>
      </div>

           {/* exceptions + payments */}
      {/* <div className="grid-main">
        <div className="card">
          <div className="card-head">
            <div>
              <div className="card-title">Needs a look</div>
              <div className="card-sub">The payments that did not go quietly</div>
            </div>
            <div className="card-actions">
              <Link href="/orders?filter=exceptions">
                <Button variant="link">
                  All exceptions <ArrowRight size={12} />
                </Button>
              </Link>
            </div>
          </div>
          {exceptions.length === 0 ? (
            <EmptyState
              icon={<BadgeCheck size={18} />}
              title="Nothing to resolve"
              sub="Every payment matched its order. That is the point of the ledger."
            />
          ) : (
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Order</th>
                    <th>What happened</th>
                    <th>Amount</th>
                    <th>Status</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {exceptions.map((o) => (
                    <tr key={o.id} className="clickable" onClick={() => setDetailId(o.id)}>
                      <td>
                        <span className="mono strong" style={{ fontSize: 12.5 }}>
                          {o.id}
                        </span>
                      </td>
                      <td style={{ whiteSpace: 'normal', maxWidth: 260 }}>
                        <div className="cell-stack">
                          <span style={{ fontSize: 12.5 }}>{o.customer}</span>
                          <span className="sub">
                            {o.status === 'underpaid'
                              ? `${naira(o.total - (o.receivedNgn ?? 0))} short`
                              : o.status === 'late_paid'
                                ? 'Paid after expiry'
                                : 'Quote expired, no money'}
                          </span>
                        </div>
                      </td>
                      <td className="tnum">{naira(o.total)}</td>
                      <td>
                        <StatusChip status={o.status} />
                      </td>
                      <td className="r">
                        <Button variant="link">
                          Resolve <ArrowUpRight size={12} />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="col gap-14" style={{ gap: 14 }}>
          <div className="card">
            <div className="card-head">
              <div className="card-title">Recent payments</div>
              <div className="card-actions">
                <Link href="/ledger">
                  <Button variant="link">
                    Ledger <ArrowRight size={12} />
                  </Button>
                </Link>
              </div>
            </div>
            <div className="card-body" style={{ paddingTop: 10, paddingBottom: 10 }}>
              {recentPayments.length === 0 ? (
                <span className="small muted">No payments yet.</span>
              ) : (
                <div className="col gap-12">
                  {recentPayments.map((l) => (
                    <div key={l.id} className="row gap-10">
                      <span className="avatar-xs">{l.customer.slice(0, 2).toUpperCase()}</span>
                      <div className="cell-stack" style={{ flex: 1, minWidth: 0 }}>
                        <span style={{ fontSize: 12.5, fontWeight: 550, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {l.customer}
                        </span>
                        <span className="sub">
                          {l.orderId} · {relative(l.createdAt)}
                        </span>
                      </div>
                      <div className="col" style={{ alignItems: 'flex-end', gap: 2 }}>
                        <span className="tnum" style={{ fontWeight: 600, fontSize: 12.5 }}>
                          +{naira(l.net, { compact: true })}
                        </span>
                        <Tag tone={l.currency === 'USDC' ? 'usdc' : 'ngn'}>{l.currency}</Tag>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="card">
            <div className="card-head">
              <div className="card-title">Where the money comes from</div>
            </div>
            <div className="card-body">
              <HorizontalBars
                formatter={(n) => nairaShort(n)}
                data={[
                  { label: 'Naira · local buyers', value: channelSplit.ngn, color: '#0d9668' },
                  { label: 'USDC · abroad', value: channelSplit.usdc, color: '#3a5ccc' },
                ]}
              />
              <div className="divider" style={{ margin: '14px 0 12px' }} />
              <div className="row gap-6 faint xs">
                <Wallet size={12} />
                Settles to ₦{RATES.usdcNgn.toLocaleString()}/USDC
              </div>
            </div>
          </div>
        </div>
      </div> */}

      {/* recent orders */}
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
              {recentOrders.map((o) => (
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
                        <span className="sub">{o.city}</span>
                      </div>
                    </div>
                  </td>
                  <td>
                    <div className="cell-stack">
                      <span style={{ fontSize: 12.5 }}>
                        {/* {o.items[0].emoji} */}
                        {o.items[0].name}
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

      <CreateOrderModal open={createOpen} onClose={() => setCreateOpen(false)} />
      <OrderDetails order={detail} open={!!detail} onClose={() => setDetailId(null)} />

    </div>
  );
}
