'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  AlertTriangle,
  Ban,
  CheckCircle2,
  Clock,
  Copy,
  Download,
  Info,
  Lock,
  ShieldAlert,
  Wallet,
} from 'lucide-react';
import { useStore } from '@/lib/store';
import { BRAND, RATES } from '@/lib/config';
import { api } from '@/lib/api';
import type { Order } from '@/lib/types';
import { countdown, dateTimeLabel, naira, remaining } from '@/lib/format';
import { Button, CopyButton, Spinner } from '@/components/ui';

export default function PayPage() {
  const params = useParams<{ ref: string }>();
  const ref = decodeURIComponent(String(params.ref));
  const { orders, payOrder, hydrated, now, toast } = useStore();
  const [busy, setBusy] = useState(false);
  const [fetchedOrder, setFetchedOrder] = useState<Order | null>(null);
  const [loadingOrder, setLoadingOrder] = useState(false);

  const storeOrder = orders.find((o) => o.ref === ref);

  useEffect(() => {
    if (!storeOrder && ref) {
      setLoadingOrder(true);
      api
        .fetchOrderByRef(ref)
        .then((o) => setFetchedOrder(o))
        .catch(() => setFetchedOrder(null))
        .finally(() => setLoadingOrder(false));
    }
  }, [storeOrder, ref]);

  const order = storeOrder || fetchedOrder;

  if (!hydrated || loadingOrder) {
    return (
      <div className="pay-wrap">
        <div className="pay-card" style={{ padding: 40, textAlign: 'center' }}>
          <Spinner size={18} />
          <p className="muted small" style={{ marginTop: 12 }}>
            Loading your payment…
          </p>
        </div>
      </div>
    );
  }

  /* --------------------------- link not found -------------------------- */
  if (!order) {
    return (
      <div className="pay-wrap">
        <div className="pay-card">
          <div className="pay-body" style={{ alignItems: 'center', textAlign: 'center', padding: '40px 26px' }}>
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: 14,
                display: 'grid',
                placeItems: 'center',
                background: 'var(--bad-soft)',
                color: 'var(--bad)',
              }}
            >
              <ShieldAlert size={22} />
            </div>
            <div>
              <div className="modal-title" style={{ fontSize: 17 }}>
                This link is not valid
              </div>
              <p className="small muted" style={{ marginTop: 6, lineHeight: 1.6 }}>
                The reference <span className="mono">{ref}</span> does not belong to any order. Ask {BRAND.seller.shop}{' '}
                for a fresh link before sending any money.
              </p>
            </div>
            <div className="callout warn" style={{ textAlign: 'left' }}>
              <span className="callout-icon" style={{ color: 'var(--warn)' }}>
                <AlertTriangle size={14} />
              </span>
              <div className="callout-body">
                Do not send money to an account you were not given by the seller. Payment links expire, and
                expired links are a favourite tool of scammers.
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const msLeft = remaining(order.expiresAt);
  const isDead = order.status === 'expired' || order.status === 'cancelled';
  const isPaid = order.status === 'paid' || order.status === 'late_paid';
  const usdcAmount = (order.total / RATES.usdcNgn).toFixed(2);

  const pay = async () => {
    setBusy(true);
    try {
      await payOrder(order.id, order.total);
    } finally {
      setBusy(false);
    }
  };

  /* ------------------------------- receipt ----------------------------- */
  if (isPaid) {
    return (
      <div className="pay-wrap">
        <div className="pay-card">
          <div className="pay-head">
            <BrandMark />
            <div>
              <div className="brand-name" style={{ fontSize: 13.5 }}>
                {BRAND.seller.shop}
              </div>
              <div className="brand-shop">Ibadan · Instagram boutique</div>
            </div>
            <span className="chip good no-dot" style={{ marginLeft: 'auto' }}>
              Paid
            </span>
          </div>
          <div className="pay-body" style={{ alignItems: 'center', textAlign: 'center' }}>
            <div
              style={{
                width: 54,
                height: 54,
                borderRadius: 999,
                display: 'grid',
                placeItems: 'center',
                background: 'var(--good-soft)',
                color: 'var(--good)',
                marginTop: 6,
              }}
            >
              <CheckCircle2 size={26} />
            </div>
            <div>
              <div style={{ fontSize: 20, fontWeight: 660, letterSpacing: '-0.025em' }}>Payment received</div>
              <p className="small muted" style={{ marginTop: 4 }}>
                {BRAND.seller.name.split(' ')[0]} has been told, and this order is written into her books.
              </p>
            </div>
            <div
              className="col gap-8"
              style={{
                width: '100%',
                padding: 14,
                borderRadius: 14,
                border: '1px solid var(--line-soft)',
                background: '#fbfbfc',
                textAlign: 'left',
              }}
            >
              {[
                ['Order', order.id],
                ['Amount', naira(order.receivedNgn ?? order.total)],
                ['Paid with', order.channel === 'USDC' ? 'USDC · Polygon' : 'Naira transfer'],
                ['Reference', order.ref],
                ['Time', order.paidAt ? dateTimeLabel(order.paidAt) : '—'],
              ].map(([k, v]) => (
                <div key={k} className="row-between small">
                  <span className="muted">{k}</span>
                  <span className="tnum" style={{ fontWeight: 600 }}>
                    {v}
                  </span>
                </div>
              ))}
            </div>
            <Button
              variant="ghost"
              block
              onClick={() =>
                toast({ kind: 'info', title: 'Receipt', message: 'In the demo the receipt is this screen. Printing works too.' })
              }
            >
              <Download size={14} /> Save receipt
            </Button>
            <span className="faint xs">You can close this page now.</span>
          </div>
        </div>
      </div>
    );
  }

  /* ------------------------------- dead link --------------------------- */
  if (isDead) {
    return (
      <div className="pay-wrap">
        <div className="pay-card">
          <div className="pay-head">
            <BrandMark />
            <div className="brand-name" style={{ fontSize: 13.5 }}>
              {BRAND.seller.shop}
            </div>
          </div>
          <div className="pay-body" style={{ alignItems: 'center', textAlign: 'center' }}>
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: 14,
                display: 'grid',
                placeItems: 'center',
                background: order.status === 'cancelled' ? 'var(--bad-soft)' : 'var(--warn-soft)',
                color: order.status === 'cancelled' ? 'var(--bad)' : 'var(--warn)',
              }}
            >
              {order.status === 'cancelled' ? <Ban size={20} /> : <Clock size={20} />}
            </div>
            <div>
              <div style={{ fontSize: 18, fontWeight: 660, letterSpacing: '-0.02em' }}>
                {order.status === 'cancelled' ? 'This order was cancelled' : 'This link has expired'}
              </div>
              <p className="small muted" style={{ marginTop: 6, lineHeight: 1.6 }}>
                {order.status === 'cancelled'
                  ? 'The seller cancelled this order, so it cannot take payment.'
                  : `The locked exchange rate ran out at ${dateTimeLabel(order.expiresAt)}. Nothing was taken from you.`}{' '}
                Ask {BRAND.seller.shop} for a fresh link. The amount will be re-quoted at the live rate.
              </p>
            </div>
            <div className="callout" style={{ textAlign: 'left', width: '100%' }}>
              <span className="callout-icon" style={{ color: 'var(--muted)' }}>
                <Info size={14} />
              </span>
              <div className="callout-body">
                If you already sent money against {order.id}, message {BRAND.seller.name.split(' ')[0]} with your
                reference. Late payments are matched by hand and flagged in her ledger.
              </div>
            </div>
            <Link href="/" style={{ width: '100%' }}>
              <Button variant="ghost" block>
                Back to the shop
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  /* ------------------------------- pay form ---------------------------- */
  return (
    <div className="pay-wrap">
      <div className="pay-card">
        <div className="pay-head">
          <BrandMark />
          <div style={{ minWidth: 0 }}>
            <div className="brand-name" style={{ fontSize: 13.5 }}>
              {BRAND.seller.shop}
            </div>
            <div className="brand-shop">
              {order.id} · {order.customer}
            </div>
          </div>
          <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
            <div className="faint xs">Locked for</div>
            <span className={`countdown ${msLeft < 180000 ? 'urgent' : ''}`}>
              <Clock size={12} /> {countdown(msLeft)}
            </span>
          </div>
        </div>

        <div className="pay-body">
          <div className="pay-amount">
            <div className="faint xs">Pay this amount</div>
            <div className="pay-amount-value">{naira(order.total)}</div>
            {order.channel === 'USDC' && (
              <div className="small muted">
                ≈ <strong>{usdcAmount} USDC</strong> at ₦{RATES.usdcNgn.toLocaleString()}/USDC
              </div>
            )}
          </div>

          <div className="col gap-8">
            {order.items.map((i) => (
              <div key={i.productId} className="row gap-10">
                <span className="product-thumb">{i.emoji}</span>
                <div className="cell-stack" style={{ flex: 1 }}>
                  <span style={{ fontSize: 12.5, fontWeight: 550 }}>{i.name}</span>
                  <span className="sub">Qty {i.qty}</span>
                </div>
                <span className="tnum small" style={{ fontWeight: 600 }}>
                  {naira(i.unitPrice * i.qty)}
                </span>
              </div>
            ))}
          </div>

          <div className="divider" />

          {order.channel === 'NGN' ? (
            <div className="col gap-10">
              <span className="label">Transfer to this account</span>
              <div
                className="col gap-8"
                style={{ padding: 13, borderRadius: 14, border: '1px solid var(--line-soft)', background: '#fbfbfc' }}
              >
                <div className="row-between">
                  <span className="muted xs">Bank</span>
                  <span style={{ fontWeight: 600, fontSize: 12.5 }}>Wema Bank</span>
                </div>
                <div className="row-between">
                  <span className="muted xs">Account number</span>
                  <span className="row gap-6">
                    <span className="mono" style={{ fontWeight: 650, fontSize: 13 }}>
                      8123 4567 89
                    </span>
                    <CopyButton value="8123456789" label="" />
                  </span>
                </div>
                <div className="row-between">
                  <span className="muted xs">Account name</span>
                  <span style={{ fontWeight: 600, fontSize: 12.5 }}>AuraLink / {order.id}</span>
                </div>
              </div>
              <span className="help">
                Use <strong>{order.id}</strong> as your narration so the payment matches this order.
              </span>
              <Button variant="primary" block size="lg" onClick={pay} loading={busy}>
                {busy ? 'Confirming with Busha…' : "I've sent the money"}
              </Button>
            </div>
          ) : (
            <div className="col gap-10">
              <span className="label">Pay with</span>
              <button className="net-option selected" type="button">
                <span className="net-logo">
                  <Wallet size={16} color="#3a5ccc" />
                </span>
                <div className="cell-stack" style={{ flex: 1 }}>
                  <span style={{ fontSize: 12.5, fontWeight: 600 }}>USDC on Polygon</span>
                  <span className="sub">From any wallet or exchange</span>
                </div>
                <CheckCircle2 size={16} color="var(--good)" />
              </button>
              <div className="row gap-6">
                <span className="net-option" style={{ opacity: 0.45, cursor: 'not-allowed', padding: '9px 12px' }}>
                  <span className="net-logo" style={{ width: 26, height: 26 }}>
                    <Wallet size={13} color="#98a0ad" />
                  </span>
                  <span className="xs muted">Ethereum</span>
                </span>
                <span className="net-option" style={{ opacity: 0.45, cursor: 'not-allowed', padding: '9px 12px' }}>
                  <span className="net-logo" style={{ width: 26, height: 26 }}>
                    <Wallet size={13} color="#98a0ad" />
                  </span>
                  <span className="xs muted">Tron</span>
                </span>
                <span className="faint xs" style={{ alignSelf: 'center' }}>
                  Not available for this order
                </span>
              </div>

              <div className="callout warn">
                <span className="callout-icon" style={{ color: 'var(--warn)' }}>
                  <ShieldAlert size={14} />
                </span>
                <div>
                  <div className="callout-title">Send on Polygon only</div>
                  <div className="callout-body">
                    This link accepts USDC on Polygon and nothing else. Coins sent on another network cannot be
                    recovered, by us or by Busha.
                  </div>
                </div>
              </div>

              <Button variant="primary" block size="lg" onClick={pay} loading={busy}>
                {busy ? 'Waiting for the wallet…' : `Pay ${usdcAmount} USDC`}
              </Button>
            </div>
          )}

          <div className="row gap-6" style={{ justifyContent: 'center' }}>
            <Lock size={11} color="var(--faint)" />
            <span className="faint xs">Secured by Busha · the seller never sees your card or wallet</span>
          </div>

          <button
            className="btn-link"
            style={{ justifyContent: 'center', color: 'var(--faint)' }}
            onClick={() =>
              toast({
                kind: 'info',
                title: 'Problem reported',
                message: `${BRAND.seller.name.split(' ')[0]} will see this in her dashboard.`,
              })
            }
          >
            Something is wrong with this link
          </button>
        </div>
      </div>
    </div>
  );
}

function BrandMark() {
  return (
    <span className="brand-mark" style={{ width: 32, height: 32, borderRadius: 10 }}>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path d="M4 7.5h16M4 12h10.5M4 16.5h7" stroke="white" strokeWidth="2.1" strokeLinecap="round" />
        <circle cx="18.5" cy="16" r="2.6" stroke="#f0522d" strokeWidth="2.1" />
      </svg>
    </span>
  );
}
