'use client';

import React, { useCallback, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  Check,
  Copy,
  ExternalLink,
  AtSign,
  Link2,
  MessageCircle,
  Plus,
  Trash2,
} from 'lucide-react';
import { useStore, errorMessage } from '@/lib/store';
import type { Channel, Order } from '@/lib/types';
import { naira, nairaShort } from '@/lib/format';
import { Button, CopyButton, Field, Modal, Spinner, Stepper } from '@/components/ui';
import { RATES } from '@/lib/config';

interface Line {
  id: string;
  productId: string;
  qty: number;
}

const newLine = (): Line => ({
  id: Math.random().toString(36).slice(2, 9),
  productId: '',
  qty: 1,
});

export function CreateOrderModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated?: (o: Order) => void;
}) {
  const { products, createOrder, toast } = useStore();
  const [customer, setCustomer] = useState('');
  const [handle, setHandle] = useState('');
  const [city, setCity] = useState('');
  const [channel, setChannel] = useState<Channel>('NGN');
  const [lines, setLines] = useState<Line[]>([newLine()]);
  const [discount, setDiscount] = useState('');
  const [note, setNote] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [created, setCreated] = useState<Order | null>(null);

  const reset = useCallback(() => {
    setCustomer('');
    setHandle('');
    setCity('');
    setChannel('NGN');
    setLines([newLine()]);
    setDiscount('');
    setNote('');
    setErrors({});
    setCreated(null);
    setSubmitting(false);
  }, []);

  const close = useCallback(() => {
    onClose();
    setTimeout(reset, 220);
  }, [onClose, reset]);

  const subtotal = useMemo(
    () =>
      lines.reduce((sum, l) => {
        const p = products.find((x) => x.id === l.productId);
        return sum + (p ? p.price * l.qty : 0);
      }, 0),
    [lines, products],
  );

  const discountNum = Math.min(Number(discount.replace(/[^0-9]/g, '')) || 0, subtotal);
  const total = Math.max(0, subtotal - discountNum);

  const setLine = (id: string, patch: Partial<Line>) =>
    setLines((prev) => prev.map((l) => (l.id === id ? { ...l, ...patch } : l)));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const next: Record<string, string> = {};
    if (!customer.trim()) next.customer = 'Who is this order for? Add a name.';
    const picked = lines.filter((l) => l.productId);
    if (!picked.length) next.lines = 'Pick at least one product.';
    if (discountNum > 0 && discountNum >= subtotal) next.discount = 'The discount cannot cover the whole order.';
    if (channel === 'USDC' && total < 500) next.channel = 'USDC links need an order above ₦500.';
    setErrors(next);
    if (Object.keys(next).length) {
      toast({ kind: 'error', title: 'Check the form', message: Object.values(next)[0] });
      return;
    }

    setSubmitting(true);
    try {
      const order = await createOrder({
        customer,
        handle,
        city,
        channel,
        items: picked.map(({ productId, qty }) => ({ productId, qty })),
        discount: discountNum,
        note,
      });
      setCreated(order);
      onCreated?.(order);
    } catch (err) {
      const msg = errorMessage(err);
      setErrors({ form: msg });
      toast({ kind: 'error', title: 'Link not created', message: msg });
    } finally {
      setSubmitting(false);
    }
  };

  /* ------------------------------ success ------------------------------ */
  if (created) {
    const link = `localhost:3000/pay/${created.ref}`;
    return (
      <Modal
        open={open}
        onClose={close}
        title="Payment link ready"
        sub={`Send this to ${created.customer}. It only works for ${created.id}.`}
        size="md"
        footer={
          <>
            <Button variant="ghost" onClick={reset}>
              <Plus size={14} /> Another order
            </Button>
            <div className="spacer" />
            <Link href={`/orders?order=${created.id}`} onClick={close}>
              <Button variant="primary">
                Open order <ArrowRight size={14} />
              </Button>
            </Link>
          </>
        }
      >
        <div className="col gap-16">
          <div
            className="callout good"
            style={{ alignItems: 'center' }}
          >
            <span className="callout-icon" style={{ color: 'var(--good)' }}>
              <Check size={16} />
            </span>
            <div>
              <div className="callout-title">
                {naira(created.total)} due from {created.customer}
              </div>
              <div className="callout-body">
                {created.channel === 'USDC'
                  ? `About ${(created.total / RATES.usdcNgn).toFixed(2)} USDC at today's rate.`
                  : 'Naira transfer straight into the order account.'}{' '}
                The quote holds for 15 minutes.
              </div>
            </div>
          </div>

          <div className="col gap-6">
            <span className="label">Payment link</span>
            <div className="link-box">
              <Link2 size={14} color="#98a0ad" />
              <span className="link-url">{link}</span>
              <CopyButton value={link} label="Copy link" />
            </div>
            <span className="help">
              Preview it as the buyer would see it:{' '}
              <Link href={`/pay/${created.ref}`} style={{ color: 'var(--info)' }} target="_blank">
                open the pay page <ExternalLink size={10} style={{ display: 'inline' }} />
              </Link>
            </span>
          </div>

          <div className="col gap-8">
            <span className="label">Share it</span>
            <div className="share-row">
              <a
                className="share-btn"
                href={`https://wa.me/?text=${encodeURIComponent(`Hi ${created.customer.split(' ')[0]}, here is the payment link for ${created.id}: ${naira(created.total)} → ${link}`)}`}
                target="_blank"
                rel="noreferrer"
              >
                <MessageCircle size={17} color="#0d9668" />
                WhatsApp
              </a>
              <button
                className="share-btn"
                onClick={() => {
                  const text = `Hi ${created.customer.split(' ')[0]}, here is the payment link for ${created.id}: ${naira(created.total)}. ${link}`;
                  navigator.clipboard
                    ?.writeText(text)
                    .then(() => toast({ kind: 'success', title: 'Message copied', message: 'Paste it into the DM.' }))
                    .catch(() =>
                      toast({ kind: 'error', title: 'Could not copy', message: 'Your browser blocked the clipboard.' }),
                    );
                }}
              >
                <AtSign size={17} color="#c13584" />
                Copy DM
              </button>
              <Link className="share-btn" href={`/pay/${created.ref}`} target="_blank">
                <ExternalLink size={17} color="#3a5ccc" />
                Preview
              </Link>
            </div>
          </div>

          <div className="row-between" style={{ fontSize: 12, color: 'var(--faint)' }}>
            <span>
              Reference <span className="mono">{created.ref}</span>
            </span>
            <span>{created.channel === 'USDC' ? 'USDC · Polygon' : 'Naira · bank transfer'}</span>
          </div>
        </div>
      </Modal>
    );
  }

  /* -------------------------------- form -------------------------------- */
  return (
    <Modal
      open={open}
      onClose={close}
      title="New order"
      sub="One order, one link. The link dies when the quote expires."
      size="md"
      footer={
        <>
          <div className="col" style={{ lineHeight: 1.3 }}>
            <span className="faint xs">Amount due</span>
            <span style={{ fontWeight: 650, fontSize: 15 }} className="tnum">
              {naira(total)}
            </span>
          </div>
          <div className="spacer" />
          <Button variant="quiet" onClick={close} disabled={submitting}>
            Cancel
          </Button>
          <Button variant="accent" onClick={submit} loading={submitting}>
            {submitting ? 'Creating link…' : 'Create link'}
            {!submitting && <ArrowRight size={14} />}
          </Button>
        </>
      }
    >
      <form className="col gap-16" onSubmit={submit} noValidate>
        <div className="grid-2" style={{ gap: 12 }}>
          <Field label="Customer name" required error={errors.customer}>
            <input
              className={`input ${errors.customer ? 'invalid' : ''}`}
              value={customer}
              onChange={(e) => {
                setCustomer(e.target.value);
                setErrors((p) => ({ ...p, customer: '' }));
              }}
              placeholder="Sarah Johnson"
              aria-label="Customer name"
            />
          </Field>
          <Field label="Instagram handle" hint="Optional, helps you match DMs">
            <input
              className="input"
              value={handle}
              onChange={(e) => setHandle(e.target.value)}
              placeholder="@sarahj"
            />
          </Field>
        </div>

        <div className="grid-2" style={{ gap: 12 }}>
          <Field label="City" hint="Naira for local, USDC for abroad">
            <input
              className="input"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="Ibadan, NG"
            />
          </Field>
          <Field label="How are they paying?" error={errors.channel}>
            <div className="seg" style={{ width: '100%' }}>
              <button
                type="button"
                className={`seg-btn ${channel === 'NGN' ? 'active' : ''}`}
                style={{ flex: 1 }}
                onClick={() => setChannel('NGN')}
              >
                Naira transfer
              </button>
              <button
                type="button"
                className={`seg-btn ${channel === 'USDC' ? 'active' : ''}`}
                style={{ flex: 1 }}
                onClick={() => setChannel('USDC')}
              >
                USDC
              </button>
            </div>
          </Field>
        </div>

        <div className="col gap-8">
          <span className="label">
            Items <span className="req">*</span>
          </span>
          {lines.map((line) => {
            const p = products.find((x) => x.id === line.productId);
            return (
              <div key={line.id} className="row gap-8">
                <select
                  className={`select ${errors.lines ? 'invalid' : ''}`}
                  value={line.productId}
                  onChange={(e) => {
                    setLine(line.id, { productId: e.target.value, qty: 1 });
                    setErrors((prev) => ({ ...prev, lines: '' }));
                  }}
                  aria-label="Product"
                  style={{ flex: 1 }}
                >
                  <option value="">Select a product…</option>
                  {products.map((prod) => (
                    <option key={prod.id} value={prod.id} disabled={prod.stock === 0}>
                      {prod.emoji} {prod.name} — {nairaShort(prod.price)}
                      {prod.stock === 0 ? ' (sold out)' : ` · ${prod.stock} left`}
                    </option>
                  ))}
                </select>
                <Stepper value={line.qty} onChange={(q) => setLine(line.id, { qty: q })} max={p?.stock || 99} />
                <span
                  className="tnum"
                  style={{ width: 86, textAlign: 'right', fontSize: 12.5, fontWeight: 600, color: 'var(--ink-800)' }}
                >
                  {p ? nairaShort(p.price * line.qty) : '—'}
                </span>
                <button
                  type="button"
                  className="icon-btn"
                  style={{ width: 30, height: 30, borderRadius: 9, border: 'none' }}
                  onClick={() => setLines((prev) => (prev.length > 1 ? prev.filter((l) => l.id !== line.id) : prev))}
                  aria-label="Remove item"
                >
                  <Trash2 size={14} color="#98a0ad" />
                </button>
              </div>
            );
          })}
          {errors.lines ? (
            <span className="field-error">{errors.lines}</span>
          ) : (
            <Button
              type="button"
              variant="link"
              onClick={() => setLines((prev) => [...prev, newLine()])}
              style={{ alignSelf: 'flex-start' }}
            >
              <Plus size={13} /> Add another item
            </Button>
          )}
        </div>

        <div className="grid-2" style={{ gap: 12 }}>
          <Field label="Discount / coupon" error={errors.discount} hint="Naira off this order">
            <div className="input-group">
              <span className="input-prefix">₦</span>
              <input
                className={`input ${errors.discount ? 'invalid' : ''}`}
                value={discount}
                inputMode="numeric"
                onChange={(e) => setDiscount(e.target.value.replace(/[^0-9]/g, ''))}
                placeholder="0"
              />
            </div>
          </Field>
          <div className="col gap-6" style={{ justifyContent: 'flex-end' }}>
            <div className="row-between small">
              <span className="muted">Subtotal</span>
              <span className="tnum">{naira(subtotal)}</span>
            </div>
            <div className="row-between small">
              <span className="muted">Discount</span>
              <span className="tnum">−{naira(discountNum)}</span>
            </div>
            <div className="divider" />
            <div className="row-between" style={{ fontWeight: 650, fontSize: 13 }}>
              <span>Total</span>
              <span className="tnum">{naira(total)}</span>
            </div>
          </div>
        </div>

        <Field label="Note for yourself" hint="Shows on the order. Buyers never see it.">
          <textarea
            className="textarea"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Size 12, deliver to Yaba on Friday."
            rows={2}
          />
        </Field>

        {errors.form && (
          <div className="callout bad">
            <span className="callout-icon" style={{ color: 'var(--bad)' }}>
              <Copy size={14} />
            </span>
            <div>
              <div className="callout-title">Could not create the link</div>
              <div className="callout-body">{errors.form}</div>
            </div>
          </div>
        )}

        <p className="help">
          The link is one-time and locked to this amount. If the buyer pays late, we re-quote at the live rate
          and flag it for you instead of silently accepting it.
        </p>
      </form>
    </Modal>
  );
}
