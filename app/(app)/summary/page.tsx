'use client';

import React, { useMemo, useState } from 'react';
import {
  ArrowUpRight,
  BadgeCheck,
  Download,
  FileText,
  Printer,
  Repeat2,
  Share2,
  TrendingUp,
} from 'lucide-react';
import { useStore } from '@/lib/store';
import { BRAND, RATES } from '@/lib/config';
import { naira, nairaShort, percent } from '@/lib/format';
import { BarChart } from '@/components/charts';
import { Button, EmptyState } from '@/components/ui';

export default function SummaryPage() {
  const { ledger, orders, now, toast } = useStore();
  const [monthOffset, setMonthOffset] = useState(0);

  const monthOptions = useMemo(
    () =>
      Array.from({ length: 6 }).map((_, i) => {
        const d = new Date(now);
        d.setDate(1);
        d.setMonth(d.getMonth() - i);
        return {
          offset: i,
          label: d.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }),
          start: d.getTime(),
          end: (() => {
            const e = new Date(d);
            e.setMonth(e.getMonth() + 1);
            return e.getTime();
          })(),
        };
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const period = monthOptions[monthOffset];

  const data = useMemo(() => {
    const monthLedger = ledger.filter((l) => {
      const t = new Date(l.createdAt).getTime();
      return t >= period.start && t < period.end;
    });
    const monthOrders = orders.filter((o) => {
      const t = new Date(o.createdAt).getTime();
      return t >= period.start && t < period.end;
    });

    const revenue = monthLedger.reduce((s, l) => s + l.net, 0);
    const paidOrders = monthOrders.filter((o) => o.status === 'paid' || o.status === 'late_paid');
    const aov = paidOrders.length ? revenue / paidOrders.length : 0;
    const success = monthOrders.length ? (paidOrders.length / monthOrders.length) * 100 : 0;

    const byCustomer = new Map<string, { total: number; orders: number }>();
    monthLedger.forEach((l) => {
      const cur = byCustomer.get(l.customer) ?? { total: 0, orders: 0 };
      byCustomer.set(l.customer, { total: cur.total + l.net, orders: cur.orders + 1 });
    });
    const topCustomers = [...byCustomer.entries()]
      .map(([name, v]) => ({ name, ...v }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);

    const repeat = topCustomers.filter((c) => c.orders > 1).length;
    const repeatRate = byCustomer.size ? (repeat / byCustomer.size) * 100 : 0;
    const usdcShare = monthLedger.length
      ? (monthLedger.filter((l) => l.currency === 'USDC').reduce((s, l) => s + l.nairaValue, 0) /
          monthLedger.reduce((s, l) => s + l.nairaValue, 0)) *
        100
      : 0;

    // daily series for the bar chart
    // only draw days that have actually happened
    const endLimit = Math.min(period.end, Date.now());
    const days = Math.max(1, Math.ceil((endLimit - period.start) / 86_400_000));
    const daily = Array.from({ length: days }).map((_, i) => {
      const s = period.start + i * 86_400_000;
      const e = s + 86_400_000;
      const value = monthLedger
        .filter((l) => {
          const t = new Date(l.createdAt).getTime();
          return t >= s && t < e;
        })
        .reduce((sum, l) => sum + l.net, 0);
      return { label: String(i + 1), value };
    });

    return {
      revenue,
      aov,
      success,
      topCustomers,
      repeatRate,
      usdcShare,
      daily,
      count: monthLedger.length,
      feeTotal: monthLedger.reduce((s, l) => s + l.fee, 0),
    };
  }, [ledger, orders, period]);

  const share = async () => {
    const url = `AuraLink.app/statement/${period.label.toLowerCase().replace(' ', '-')}`;
    try {
      await navigator.clipboard.writeText(url);
      toast({ kind: 'success', title: 'Statement link copied', message: 'Read-only. Safe to send to a lender.' });
    } catch {
      toast({ kind: 'error', title: 'Could not copy', message: 'Your browser blocked the clipboard.' });
    }
  };

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1 className="page-title">Statement</h1>
          <p className="page-sub">Built from the ledger, so every number ties back to a Busha payment.</p>
        </div>
        <div className="page-actions">
          <select
            className="select"
            style={{ width: 190 }}
            value={monthOffset}
            onChange={(e) => setMonthOffset(Number(e.target.value))}
          >
            {monthOptions.map((m) => (
              <option key={m.offset} value={m.offset}>
                {m.label}
              </option>
            ))}
          </select>
          <Button variant="ghost" onClick={share}>
            <Share2 size={14} /> Share
          </Button>
          <Button variant="primary" onClick={() => window.print()}>
            <Printer size={14} /> Print / PDF
          </Button>
        </div>
      </div>

      <div className="card" style={{ background: 'linear-gradient(180deg,#fff, #fcfcfd)' }}>
        <div className="card-head" style={{ padding: '18px 22px' }}>
          <div className="row gap-10">
            <span className="brand-mark" style={{ width: 32, height: 32, borderRadius: 10 }}>
              <FileText size={15} color="#fff" />
            </span>
            <div>
              <div className="card-title" style={{ fontSize: 15 }}>
                {BRAND.seller.shop} — income statement
              </div>
              <div className="card-sub">
                {period.label} · prepared for lenders, landlords and accountants
              </div>
            </div>
          </div>
          <div className="card-actions">
            <span className="chip good no-dot">
              <BadgeCheck size={12} /> Verified by ledger
            </span>
          </div>
        </div>

        {data.count === 0 ? (
          <EmptyState
            icon={<FileText size={18} />}
            title="Nothing collected this month"
            sub="Pick an earlier month, or pay a link to start filling the statement."
          />
        ) : (
          <div className="card-body" style={{ padding: 22 }}>
            <div className="grid-stats" style={{ gridTemplateColumns: 'repeat(4, minmax(0,1fr))' }}>
              <Metric label="Revenue collected" value={naira(data.revenue, { compact: true })} hint={`${data.count} settled payments`} icon={<TrendingUp size={14} />} />
              <Metric label="Average order value" value={naira(data.aov, { compact: true })} hint="Per paid order" icon={<FileText size={14} />} />
              <Metric label="Payment success rate" value={percent(data.success)} hint="Paid vs attempted links" icon={<BadgeCheck size={14} />} />
              <Metric label="Repeat buyers" value={percent(data.repeatRate)} hint="Bought more than once" icon={<Repeat2 size={14} />} />
            </div>

            <div style={{ marginTop: 22 }}>
              <div className="row-between" style={{ marginBottom: 6 }}>
                <div className="card-title">Daily collections</div>
                <span className="faint xs">Net of fees · {naira(data.feeTotal, { compact: true })} paid in fees</span>
              </div>
              <BarChart data={data.daily} height={170} formatter={(n) => nairaShort(n)} />
            </div>

            <div className="grid-2" style={{ marginTop: 22, gap: 22 }}>
              <div>
                <div className="card-title" style={{ marginBottom: 10 }}>
                  Top buyers
                </div>
                <div className="col gap-10">
                  {data.topCustomers.map((c, i) => (
                    <div key={c.name} className="row gap-10">
                      <span className="avatar-xs">{i + 1}</span>
                      <div className="cell-stack" style={{ flex: 1 }}>
                        <span style={{ fontSize: 12.5, fontWeight: 550 }}>{c.name}</span>
                        <span className="sub">
                          {c.orders} payment{c.orders > 1 ? 's' : ''}
                        </span>
                      </div>
                      <span className="tnum" style={{ fontWeight: 600, fontSize: 12.5 }}>
                        {naira(c.total, { compact: true })}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ paddingLeft: 22, borderLeft: '1px solid var(--line-soft)' }}>
                <div className="card-title" style={{ marginBottom: 10 }}>
                  How the money arrived
                </div>
                <div className="col gap-10">
                  <div className="row-between small">
                    <span className="muted">Digital dollars (USDC)</span>
                    <span className="tnum" style={{ fontWeight: 600 }}>
                      {percent(data.usdcShare)}
                    </span>
                  </div>
                  <div className="meter accent">
                    <span style={{ width: `${data.usdcShare}%` }} />
                  </div>
                  <div className="row-between small">
                    <span className="muted">Naira transfers</span>
                    <span className="tnum" style={{ fontWeight: 600 }}>
                      {percent(100 - data.usdcShare)}
                    </span>
                  </div>
                  <div className="meter good">
                    <span style={{ width: `${100 - data.usdcShare}%` }} />
                  </div>
                  <div className="divider" style={{ margin: '4px 0' }} />
                  <div className="row-between small muted">
                    <span>Rate used for conversion</span>
                    <span className="tnum">₦{RATES.usdcNgn.toLocaleString()}/USDC</span>
                  </div>
                  <div className="row-between small muted">
                    <span>Settlement currency</span>
                    <span>Naira (auto)</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="callout info" style={{ marginTop: 22 }}>
              <span className="callout-icon" style={{ color: 'var(--info)' }}>
                <ArrowUpRight size={14} />
              </span>
              <div>
                <div className="callout-title">Why a lender can trust this page</div>
                <div className="callout-body">
                  Every line comes from a signed Busha webhook, not from you typing figures. Duplicate webhooks
                  write nothing because each event id is unique. Screenshots do not count here, and they should
                  not.
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <p className="help">
        Tip for the demo: print this to PDF and hand it to a judge. It is the proof of income the pitch promises.
      </p>
    </div>
  );
}

function Metric({
  label,
  value,
  hint,
  icon,
}: {
  label: string;
  value: string;
  hint: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="col gap-6" style={{ padding: '14px 14px 14px', border: '1px solid var(--line-soft)', borderRadius: 14, background: '#fff' }}>
      <div className="row gap-6">
        <span className="faint xs">{label}</span>
        <span style={{ marginLeft: 'auto', color: 'var(--faint)' }}>{icon}</span>
      </div>
      <span style={{ fontSize: 22, fontWeight: 650, letterSpacing: '-0.03em' }} className="tnum">
        {value}
      </span>
      <span className="faint xs">{hint}</span>
    </div>
  );
}
