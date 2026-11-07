'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  ArrowUpRight,
  Ban,
  CheckCircle2,
  Clock,
  FlaskConical,
  RefreshCw,
  Send,
  Wallet,
} from 'lucide-react';
import { useStore, errorMessage } from '@/lib/store';
import type { Order } from '@/lib/types';
import { STATUS_META } from '@/lib/types';
import { dateTimeLabel, naira, relative, remaining } from '@/lib/format';
import { RATES } from '@/lib/config';
import {
  Button,
  ConfirmDialog,
  CopyButton,
  Countdown,
  Modal,
  StatusChip,
} from '@/components/ui';

export function OrderDetails({
  order,
  open,
  onClose,
}: {
  order: Order | null;
  open: boolean;
  onClose: () => void;
}) {
  const { payOrder, cancelOrder, expireOrder, createOrder, toast, now } = useStore();
  const [busy, setBusy] = useState<string | null>(null);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [confirmExpire, setConfirmExpire] = useState(false);

  if (!order) return null;

  const link = `AuraLink.app/pay/${order.ref}`;
  const meta = STATUS_META[order.status];
  const isOpen = order.status === 'awaiting';
  const shortfall = order.receivedNgn != null ? Math.max(0, order.total - order.receivedNgn) : 0;
  const msLeft = remaining(order.expiresAt);

  const simulate = async (kind: 'full' | 'short') => {
    setBusy(kind + (kind === 'short' ? `-${order.id}` : ''));
    try {
      await payOrder(order.id, kind === 'full' ? order.total : Math.round(order.total * 0.68));
    } catch (err) {
      toast({ kind: 'error', title: 'Simulation failed', message: errorMessage(err) });
    } finally {
      setBusy(null);
    }
  };

  const reissue = async () => {
    setBusy('reissue');
    try {
      await createOrder({
        customer: order.customer,
        handle: order.handle,
        city: order.city,
        channel: order.channel,
        items: order.items.map((i) => ({ productId: i.productId, qty: i.qty })),
        discount: order.discount,
        note: order.note,
      });
    } catch (err) {
      toast({ kind: 'error', title: 'Could not issue a new link', message: errorMessage(err) });
    } finally {
      setBusy(null);
    }
  };

  return (
    <>
      <Modal
        open={open}
        onClose={onClose}
        size="md"
        title={
          <span className="row gap-8">
            <span className="mono" style={{ fontSize: 15 }}>
              {order.id}
            </span>
            <StatusChip status={order.status} />
          </span>
        }
        sub={`${order.customer} · ${order.city} · ${order.channel === 'USDC' ? 'USDC on Polygon' : 'Naira transfer'}`}
        footer={
          <>
            {isOpen && (
              <Button variant="quiet" onClick={() => setConfirmCancel(true)}>
                <Ban size={14} /> Cancel order
              </Button>
            )}
            <div className="spacer" />
            {isOpen ? (
              <Link href={`/pay/${order.ref}`} target="_blank">
                <Button variant="ghost">
                  Open pay page <ArrowUpRight size={14} />
                </Button>
              </Link>
            ) : (
              <Button variant="ghost" onClick={reissue} loading={busy === 'reissue'}>
                <RefreshCw size={14} /> Send a fresh link
              </Button>
            )}
            {isOpen && (
              <Button variant="primary" onClick={() => simulate('full')} loading={busy?.startsWith('full')}>
                Mark as paid
              </Button>
            )}
          </>
        }
      >
        <div className="col gap-16">
          {/* status explainer */}
          <div
            className={`callout ${
              order.status === 'paid'
                ? 'good'
                : order.status === 'underpaid' || order.status === 'late_paid'
                  ? 'warn'
                  : order.status === 'cancelled'
                    ? 'bad'
                    : 'info'
            }`}
          >
            <span className="callout-icon">
              {order.status === 'paid' ? (
                <CheckCircle2 size={16} color="var(--good)" />
              ) : order.status === 'awaiting' ? (
                <Clock size={16} color="var(--info)" />
              ) : (
                <AlertTriangle size={16} color="var(--warn)" />
              )}
            </span>
            <div>
              <div className="callout-title">{meta.label}</div>
              <div className="callout-body">
                {order.status === 'awaiting' && msLeft > 0
                  ? `Waiting for the money. The quote expires in ${Math.ceil(msLeft / 60000)} minutes, after which the link stops working.`
                  : order.status === 'paid'
                    ? 'Full amount confirmed on Busha. A ledger line has been written. Safe to send the parcel.'
                    : order.status === 'underpaid'
                      ? `${naira(shortfall)} is still outstanding. Ask the buyer for the balance, or refund and start again.`
                      : order.status === 'late_paid'
                        ? 'The money arrived after the quote expired. Confirm the price with the buyer before you ship.'
                        : order.status === 'expired'
                          ? 'Nobody paid before the timer ran out. Send a fresh link if they are still interested.'
                          : 'This order was cancelled. The link no longer accepts money.'}
              </div>
            </div>
          </div>

          {/* money */}
          <div className="grid-2" style={{ gap: 12 }}>
            <div className="col gap-4">
              <span className="faint xs">Amount due</span>
              <span style={{ fontSize: 19, fontWeight: 650, letterSpacing: '-0.02em' }} className="tnum">
                {naira(order.total)}
              </span>
              {order.channel === 'USDC' && (
                <span className="faint xs">≈ {(order.total / RATES.usdcNgn).toFixed(2)} USDC at ₦{RATES.usdcNgn}/USDC</span>
              )}
            </div>
            <div className="col gap-4">
              <span className="faint xs">{order.receivedNgn != null ? 'Received' : 'Quote expires'}</span>
              <span
                style={{
                  fontSize: 19,
                  fontWeight: 650,
                  letterSpacing: '-0.02em',
                  color: order.receivedNgn != null && order.receivedNgn < order.total ? 'var(--warn)' : undefined,
                }}
                className="tnum"
              >
                {order.receivedNgn != null ? naira(order.receivedNgn) : <Countdown expiresAt={order.expiresAt} />}
              </span>
              {order.receivedNgn != null && (
                <span className="faint xs">
                  Fee {naira(Math.round(order.receivedNgn * (RATES.feePercent / 100)))} · settled in naira
                </span>
              )}
            </div>
          </div>

          {/* items */}
          <div className="col gap-8">
            <span className="label">Items</span>
            <div className="col gap-6">
              {order.items.map((i) => (
                <div key={i.productId} className="row gap-10">
                  <span className="product-thumb">{i.emoji}</span>
                  <div className="cell-stack" style={{ flex: 1 }}>
                    <span style={{ fontWeight: 550, fontSize: 12.5 }}>{i.name}</span>
                    <span className="sub">
                      {i.qty} × {naira(i.unitPrice)}
                    </span>
                  </div>
                  <span className="tnum small" style={{ fontWeight: 600 }}>
                    {naira(i.qty * i.unitPrice)}
                  </span>
                </div>
              ))}
            </div>
            {order.discount > 0 && (
              <div className="row-between small muted" style={{ marginTop: 2 }}>
                <span>Discount</span>
                <span className="tnum">−{naira(order.discount)}</span>
              </div>
            )}
          </div>

          {order.note && (
            <div className="callout">
              <span className="callout-icon" style={{ color: 'var(--muted)' }}>
                <Send size={14} />
              </span>
              <div>
                <div className="callout-title">Note on this order</div>
                <div className="callout-body">{order.note}</div>
              </div>
            </div>
          )}

          {/* link */}
          <div className="col gap-6">
            <span className="label">Payment link</span>
            <div className="link-box">
              <Wallet size={14} color="#98a0ad" />
              <span className="link-url">{link}</span>
              <CopyButton value={link} label="Copy" />
            </div>
          </div>

          {/* timeline */}
          <div className="col gap-10">
            <div className="row-between">
              <span className="label">Timeline</span>
              <span className="faint xs mono">{order.ref}</span>
            </div>
            <div className="timeline">
              {order.timeline.map((t) => (
                <div className="tl-item" key={t.id + t.at}>
                  <span className={`tl-dot ${t.tone}`}>
                    <CheckCircle2 size={11} />
                  </span>
                  <div>
                    <div className="tl-label">{t.label}</div>
                    {t.note && <div className="tl-note">{t.note}</div>}
                    <div className="tl-time">
                      {dateTimeLabel(t.at)} · {relative(t.at)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* sandbox tools */}
          <div className="col gap-8">
            <div className="row gap-6">
              <FlaskConical size={13} color="var(--faint)" />
              <span className="label" style={{ color: 'var(--muted)' }}>
                Sandbox tools
              </span>
              <span className="faint xs">stand-ins for Busha's webhook</span>
            </div>
            <div className="row gap-8" style={{ flexWrap: 'wrap' }}>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => simulate('full')}
                loading={busy === 'full'}
                disabled={!isOpen}
              >
                Full payment
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => simulate('short')}
                loading={busy === 'short'}
                disabled={!isOpen}
              >
                Short payment
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setConfirmExpire(true)} disabled={!isOpen}>
                Force expire
              </Button>
              {!isOpen && <span className="faint xs">Only links that are still open can be simulated.</span>}
            </div>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={confirmCancel}
        onClose={() => setConfirmCancel(false)}
        onConfirm={() => cancelOrder(order.id)}
        title="Cancel this order?"
        body="The link stops accepting money right away and the order moves to cancelled. You cannot undo this."
        confirmLabel="Cancel order"
        danger
      />

      <ConfirmDialog
        open={confirmExpire}
        onClose={() => setConfirmExpire(false)}
        onConfirm={() => expireOrder(order.id)}
        title="Force this link to expire?"
        body="Handy for the demo: it shows what Amaka sees when a buyer goes quiet and the quote runs out."
        confirmLabel="Expire link"
      />
    </>
  );
}
