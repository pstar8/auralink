'use client';

import React, { useMemo, useState } from 'react';
import { ArrowUpRight, BookOpen, Download, Flag, Search, Wallet } from 'lucide-react';
import { useStore } from '@/lib/store';
import { dateTimeLabel, naira } from '@/lib/format';
import { downloadCsv } from '@/lib/csv';
import { Button, EmptyState, Segmented, StatusChip } from '@/components/ui';
import { OrderDetails } from '@/components/OrderDetails';

type Range = '7' | '30' | 'all';

export default function LedgerPage() {
  const { ledger, orders, toast } = useStore();
  const [range, setRange] = useState<Range>('30');
  const [query, setQuery] = useState('');
  const [onlyFlagged, setOnlyFlagged] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);

  const rows = useMemo(() => {
    const cutoff = range === 'all' ? 0 : Date.now() - Number(range) * 86_400_000;
    return ledger
      .filter((l) => new Date(l.createdAt).getTime() >= cutoff)
      .filter((l) => (onlyFlagged ? l.status === 'flagged' : true))
      .filter((l) => {
        const t = query.trim().toLowerCase();
        if (!t) return true;
        return [l.id, l.orderId ?? '', l.customer, l.currency, l.bushaEventId].join(' ').toLowerCase().includes(t);
      });
  }, [ledger, range, query, onlyFlagged]);

  const totals = useMemo(
    () => ({
      gross: rows.reduce((s, l) => s + l.nairaValue, 0),
      fees: rows.reduce((s, l) => s + l.fee, 0),
      net: rows.reduce((s, l) => s + l.net, 0),
      flagged: rows.filter((l) => l.status === 'flagged').length,
    }),
    [rows],
  );

  const exportCsv = () => {
    if (!rows.length) {
      toast({ kind: 'error', title: 'Nothing to export', message: 'There are no lines in this range.' });
      return;
    }
    downloadCsv(`AuraLink-ledger-${new Date().toISOString().slice(0, 10)}.csv`, [
      ['Ledger ID', 'Order', 'Customer', 'Received', 'Currency', 'Naira value', 'Fee', 'Net', 'Status', 'Busha event', 'Date'],
      ...rows.map((l) => [
        l.id,
        l.orderId ?? 'unmatched',
        l.customer,
        l.amountReceived,
        l.currency,
        l.nairaValue,
        l.fee,
        l.net,
        l.status,
        l.bushaEventId,
        l.createdAt,
      ]),
    ]);
    toast({ kind: 'success', title: 'Ledger exported', message: `${rows.length} lines saved as CSV.` });
  };

  const detail = orders.find((o) => o.id === detailId) ?? null;

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1 className="page-title">Ledger</h1>
          <p className="page-sub">
            Every confirmed payment writes one line here. You never type a number.
          </p>
        </div>
        <div className="page-actions">
          <Segmented
            value={range}
            onChange={setRange}
            options={[
              { value: '7', label: '7 days' },
              { value: '30', label: '30 days' },
              { value: 'all', label: 'All' },
            ]}
          />
          <Button variant="ghost" onClick={exportCsv}>
            <Download size={14} /> Export CSV
          </Button>
        </div>
      </div>

      <div className="grid-stats" style={{ gridTemplateColumns: 'repeat(3, minmax(0,1fr))' }}>
        <div className="stat">
          <div className="stat-top">
            <span className="stat-label">Gross received</span>
            <span className="stat-icon">
              <Wallet size={15} />
            </span>
          </div>
          <div className="stat-value">{naira(totals.gross, { compact: true })}</div>
          <div className="stat-foot">{rows.length} ledger lines</div>
        </div>
        <div className="stat">
          <div className="stat-top">
            <span className="stat-label">Busha fees</span>
            <span className="stat-icon">
              <BookOpen size={15} />
            </span>
          </div>
          <div className="stat-value">{naira(totals.fees, { compact: true })}</div>
          <div className="stat-foot">Charged at settlement, already deducted</div>
        </div>
        <div className="stat">
          <div className="stat-top">
            <span className="stat-label">Net settled</span>
            <span className="stat-icon">
              <Flag size={15} />
            </span>
          </div>
          <div className="stat-value">{naira(totals.net, { compact: true })}</div>
          <div className="stat-foot">
            {totals.flagged > 0 ? (
              <span style={{ color: 'var(--warn)' }}>{totals.flagged} flagged line(s) inside</span>
            ) : (
              'Nothing flagged'
            )}
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-head" style={{ gap: 10 }}>
          <div className="card-title">All lines</div>
          <div className="card-actions">
            <button
              className={`pill ${onlyFlagged ? 'active' : ''}`}
              onClick={() => setOnlyFlagged((v) => !v)}
            >
              Flagged only
            </button>
            <div className="search" style={{ width: 230, height: 32, maxWidth: 'none' }}>
              <Search size={13} color="#98a0ad" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search order, customer, event…"
                style={{ fontSize: 12.5 }}
                aria-label="Search ledger"
              />
            </div>
          </div>
        </div>

        {rows.length === 0 ? (
          <EmptyState
            icon={<BookOpen size={18} />}
            title={onlyFlagged ? 'No flagged lines' : 'No lines in this range'}
            sub={
              onlyFlagged
                ? 'Short payments and unmatched money appear here when they happen.'
                : 'Pay a link and the first line will write itself.'
            }
            action={
              onlyFlagged ? (
                <Button variant="ghost" onClick={() => setOnlyFlagged(false)}>
                  Show every line
                </Button>
              ) : undefined
            }
          />
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Order</th>
                  <th>Customer</th>
                  <th className="r">Received</th>
                  <th className="r">Naira value</th>
                  <th className="r">Fee</th>
                  <th className="r">Net</th>
                  <th>Status</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {rows.map((l) => (
                  <tr
                    key={l.id}
                    className={l.orderId ? 'clickable' : ''}
                    onClick={() => l.orderId && setDetailId(l.orderId)}
                  >
                    <td className="faint">{dateTimeLabel(l.createdAt)}</td>
                    <td>
                      <span className="mono strong" style={{ fontSize: 12.5 }}>
                        {l.orderId ?? 'unmatched'}
                      </span>
                    </td>
                    <td style={{ fontSize: 12.5 }}>{l.customer}</td>
                    <td className="r tnum">
                      {l.currency === 'USDC' ? `${l.amountReceived} USDC` : naira(l.amountReceived)}
                    </td>
                    <td className="r tnum strong">{naira(l.nairaValue)}</td>
                    <td className="r tnum muted">−{naira(l.fee)}</td>
                    <td className="r tnum strong">{naira(l.net)}</td>
                    <td>
                      {l.status === 'flagged' ? (
                        <span className="chip warn">Flagged</span>
                      ) : (
                        <StatusChip status="paid" />
                      )}
                    </td>
                    <td className="r">
                      {l.orderId && (
                        <Button variant="link">
                          Order <ArrowUpRight size={12} />
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <p className="help" style={{ maxWidth: 640 }}>
        The <span className="mono">busha_event_id</span> column is the guard against double counting. If Busha
        retries a webhook, the second delivery writes nothing.
      </p>

      <OrderDetails order={detail} open={!!detail} onClose={() => setDetailId(null)} />
    </div>
  );
}
