'use client';

import React, { useRef, useState } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  CheckCircle2,
  FileImage,
  ImageUp,
  ScanLine,
  ShieldCheck,
  ShieldX,
  TriangleAlert,
  Upload,
} from 'lucide-react';
import { useStore, errorMessage } from '@/lib/store';
import { api } from '@/lib/api';
import { dateTimeLabel, naira } from '@/lib/format';
import { Button, Field, Spinner } from '@/components/ui';
import type { Order } from '@/lib/types';

interface Extracted {
  amount: string;
  sender: string;
  reference: string;
  at: string;
}

type Verdict =
  | { kind: 'green'; order: Order; message: string }
  | { kind: 'amber'; order: Order; message: string }
  | { kind: 'red'; message: string };

export default function ShieldPage() {
  const { orders, toast } = useStore();
  const [file, setFile] = useState<File | null>(null);
  const [scanning, setScanning] = useState(false);
  const [fields, setFields] = useState<Extracted>({ amount: '', sender: '', reference: '', at: '' });
  const [verdict, setVerdict] = useState<Verdict | null>(null);
  const [error, setError] = useState('');
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const paidOrders = orders
    .filter((o) => o.status === 'paid' || o.status === 'late_paid')
    .sort((a, b) => new Date(b.paidAt ?? b.createdAt).getTime() - new Date(a.paidAt ?? a.createdAt).getTime());
  const underpaidOrder = orders.find((o) => o.status === 'underpaid');
  const awaitingOrder = orders.find((o) => o.status === 'awaiting');

  const handleFile = async (f: File) => {
    setError('');
    setVerdict(null);
    if (!f.type.startsWith('image/')) {
      setError('That is not an image. Send a PNG or JPG screenshot of the transfer.');
      toast({ kind: 'error', title: 'Wrong file type', message: 'Screenshots only: PNG, JPG or WEBP.' });
      return;
    }
    if (f.size > 6 * 1024 * 1024) {
      setError('That image is over 6MB. Screenshot it again, smaller.');
      toast({ kind: 'error', title: 'File too large', message: 'Keep screenshots under 6MB.' });
      return;
    }
    setFile(f);
    setScanning(true);
    try {
      const read = await api.scanScreenshot(f.name);
      setFields({
        amount: String(read.amount),
        sender: read.sender,
        reference: read.reference,
        at: read.at,
      });
      toast({
        kind: 'info',
        title: 'Screenshot read',
        message: 'Check the fields below. Correct anything the reader got wrong, then check the payment.',
      });
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setScanning(false);
    }
  };

  const check = (override?: Partial<Extracted>) => {
    const raw = { ...fields, ...override };
    const amount = Number(String(raw.amount).replace(/[^0-9.]/g, ''));
    if (!amount) {
      setError('Enter the amount on the screenshot so we can match it.');
      return;
    }
    setError('');

    const tolerance = 0.01;
    const near = (a: number, b: number) => Math.abs(a - b) <= Math.max(a, b) * tolerance;

    const exactPaid = paidOrders.find(
      (o) => near(amount, o.receivedNgn ?? o.total) && near(amount, o.total),
    );
    if (exactPaid) {
      setVerdict({
        kind: 'green',
        order: exactPaid,
        message: `${naira(exactPaid.receivedNgn ?? exactPaid.total)} was confirmed on Busha for ${exactPaid.id}. This one is safe to ship.`,
      });
      return;
    }

    const partial = paidOrders.find((o) => near(amount, o.receivedNgn ?? o.total));
    if (partial) {
      setVerdict({
        kind: 'amber',
        order: partial,
        message: `Busha confirms ${naira(partial.receivedNgn ?? 0)} against ${partial.id}, but the order is ${naira(partial.total)}. Ask for the balance before you ship.`,
      });
      return;
    }

    const sameTotal = orders.find((o) => near(amount, o.total));
    if (sameTotal) {
      setVerdict({
        kind: 'amber',
        order: sameTotal,
        message: `${sameTotal.id} is ${naira(sameTotal.total)}, but nothing has landed on Busha for it yet. The screenshot alone is not proof.`,
      });
      return;
    }

    setVerdict({
      kind: 'red',
      message: `No payment of ${naira(amount)} exists on Busha, for any order. Do not ship. Send the buyer a fresh link and ask them to pay through it.`,
    });
  };

  const useSample = (kind: 'green' | 'amber' | 'red') => {
    setFile(null);
    setVerdict(null);
    setError('');
    if (kind === 'green' && paidOrders[0]) {
      const o = paidOrders[0];
      setFields({
        amount: String(o.receivedNgn ?? o.total),
        sender: o.customer.toUpperCase(),
        reference: `TRF${o.ref.slice(-6)}`,
        at: o.paidAt ?? o.createdAt,
      });
      check({ amount: String(o.receivedNgn ?? o.total) });
    } else if (kind === 'amber' && underpaidOrder) {
      const o = underpaidOrder;
      setFields({
        amount: String(o.receivedNgn ?? Math.round(o.total * 0.7)),
        sender: o.customer.toUpperCase(),
        reference: `TRF${o.ref.slice(-6)}`,
        at: o.createdAt,
      });
      check({ amount: String(o.receivedNgn ?? Math.round(o.total * 0.7)) });
    } else {
      const fake = 250000;
      setFields({ amount: String(fake), sender: 'UNKNOWN SENDER', reference: 'TRF000000', at: new Date().toISOString() });
      check({ amount: String(fake) });
    }
  };

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1 className="page-title">Screenshot Shield</h1>
          <p className="page-sub">
            A buyer sends a transfer screenshot. Drop it here and we tell you whether the money is real.
          </p>
        </div>
        <div className="page-actions">
          <span className="chip good no-dot">
            <ShieldCheck size={12} /> Checks Busha, not the picture
          </span>
        </div>
      </div>

      <div className="grid-main" style={{ gridTemplateColumns: 'minmax(0, 1.15fr) minmax(0, 1fr)' }}>
        {/* left: upload + fields */}
        <div className="col gap-14" style={{ gap: 14 }}>
          <div className="card">
            <div className="card-head">
              <div>
                <div className="card-title">Drop the screenshot</div>
                <div className="card-sub">PNG, JPG or WEBP, up to 6MB</div>
              </div>
            </div>
            <div className="card-body">
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragging(true);
                }}
                onDragLeave={() => setDragging(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragging(false);
                  const f = e.dataTransfer.files?.[0];
                  if (f) handleFile(f);
                }}
                onClick={() => inputRef.current?.click()}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && inputRef.current?.click()}
                style={{
                  border: `1.5px dashed ${dragging ? 'var(--ink-900)' : '#d9dde3'}`,
                  borderRadius: 16,
                  padding: '30px 20px',
                  background: dragging ? '#f7f8fa' : '#fcfcfd',
                  textAlign: 'center',
                  cursor: 'pointer',
                  transition: 'all .15s',
                }}
              >
                <input
                  ref={inputRef}
                  type="file"
                  accept="image/*"
                  hidden
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleFile(f);
                    e.currentTarget.value = '';
                  }}
                />
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 13,
                    margin: '0 auto 10px',
                    display: 'grid',
                    placeItems: 'center',
                    background: '#fff',
                    border: '1px solid var(--line)',
                    color: 'var(--ink-600)',
                  }}
                >
                  {scanning ? <Spinner size={17} /> : <ImageUp size={18} />}
                </div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>
                  {scanning ? 'Reading the screenshot…' : file ? file.name : 'Click to choose, or drag a screenshot in'}
                </div>
                <div className="faint xs" style={{ marginTop: 3 }}>
                  We read the amount, sender and time, then check Busha
                </div>
              </div>

              {error && (
                <div className="callout bad" style={{ marginTop: 12 }}>
                  <span className="callout-icon" style={{ color: 'var(--bad)' }}>
                    <TriangleAlert size={14} />
                  </span>
                  <div>
                    <div className="callout-title">Could not check that</div>
                    <div className="callout-body">{error}</div>
                  </div>
                </div>
              )}

              <div className="row gap-6" style={{ marginTop: 12, flexWrap: 'wrap' }}>
                <span className="faint xs" style={{ marginRight: 2 }}>
                  No screenshot? Try:
                </span>
                <button className="pill" onClick={() => useSample('green')}>
                  A real payment
                </button>
                <button className="pill" onClick={() => useSample('amber')}>
                  A short payment
                </button>
                <button className="pill" onClick={() => useSample('red')}>
                  A fake alert
                </button>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-head">
              <div>
                <div className="card-title">What we read</div>
                <div className="card-sub">Correct anything before the check. Vision is good, not perfect.</div>
              </div>
              <div className="card-actions">
                <span className="tag">
                  <ScanLine size={11} /> Extracted
                </span>
              </div>
            </div>
            <div className="card-body">
              <div className="col gap-12" style={{ gap: 12 }}>
                <div className="grid-2" style={{ gap: 12 }}>
                  <Field label="Amount">
                    <div className="input-group">
                      <span className="input-prefix">₦</span>
                      <input
                        className="input mono"
                        value={fields.amount}
                        inputMode="numeric"
                        placeholder="0"
                        onChange={(e) => setFields((p) => ({ ...p, amount: e.target.value }))}
                      />
                    </div>
                  </Field>
                  <Field label="Reference">
                    <input
                      className="input mono"
                      value={fields.reference}
                      placeholder="TRF123456"
                      onChange={(e) => setFields((p) => ({ ...p, reference: e.target.value }))}
                    />
                  </Field>
                </div>
                <Field label="Sender name">
                  <input
                    className="input"
                    value={fields.sender}
                    placeholder="Name on the receipt"
                    onChange={(e) => setFields((p) => ({ ...p, sender: e.target.value }))}
                  />
                </Field>
                <div className="row-between">
                  <span className="faint xs">
                    {fields.at ? `Shown as ${dateTimeLabel(fields.at)}` : 'No date read yet'}
                  </span>
                  <Button variant="accent" onClick={() => check()} disabled={scanning}>
                    <ShieldCheck size={14} /> Check this payment
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* right: verdict */}
        <div className="col gap-14" style={{ gap: 14 }}>
          {!verdict ? (
            <div className="card">
              <div className="card-body" style={{ padding: '44px 22px', textAlign: 'center' }}>
                <div
                  style={{
                    width: 46,
                    height: 46,
                    borderRadius: 14,
                    margin: '0 auto 12px',
                    display: 'grid',
                    placeItems: 'center',
                    background: '#f5f6f8',
                    border: '1px solid var(--line-soft)',
                    color: 'var(--faint)',
                  }}
                >
                  <FileImage size={20} />
                </div>
                <div className="empty-title">No verdict yet</div>
                <div className="empty-sub" style={{ margin: '4px auto 0' }}>
                  Drop a screenshot and we will say green, amber or red, with the exact next step.
                </div>
              </div>
            </div>
          ) : (
            <div className="card" style={{ overflow: 'hidden' }}>
              <div
                style={{
                  padding: '18px 20px',
                  background:
                    verdict.kind === 'green'
                      ? 'linear-gradient(160deg,#e9f8f1,#f6fdfa)'
                      : verdict.kind === 'amber'
                        ? 'linear-gradient(160deg,#fdf5e6,#fffdf9)'
                        : 'linear-gradient(160deg,#fdecec,#fffafa)',
                  borderBottom: '1px solid var(--line-soft)',
                }}
              >
                <div className="row gap-10">
                  <span
                    style={{
                      width: 38,
                      height: 38,
                      borderRadius: 12,
                      display: 'grid',
                      placeItems: 'center',
                      background: '#fff',
                      border: '1px solid rgba(16,24,40,.06)',
                      color:
                        verdict.kind === 'green'
                          ? 'var(--good)'
                          : verdict.kind === 'amber'
                            ? 'var(--warn)'
                            : 'var(--bad)',
                    }}
                  >
                    {verdict.kind === 'green' ? (
                      <CheckCircle2 size={20} />
                    ) : verdict.kind === 'amber' ? (
                      <TriangleAlert size={20} />
                    ) : (
                      <ShieldX size={20} />
                    )}
                  </span>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 660, letterSpacing: '-0.02em' }}>
                      {verdict.kind === 'green'
                        ? 'Real payment. Safe to ship.'
                        : verdict.kind === 'amber'
                          ? 'Not that simple. Hold on.'
                          : 'Not found on Busha. Do not ship.'}
                    </div>
                    <div className="faint xs">
                      {verdict.kind === 'green'
                        ? 'Matched against a confirmed Busha payment'
                        : verdict.kind === 'amber'
                          ? 'A payment exists, but it does not settle this order'
                          : 'Screenshot proves nothing on its own'}
                    </div>
                  </div>
                </div>
              </div>

              <div className="card-body col gap-14" style={{ gap: 14 }}>
                <p className="small" style={{ lineHeight: 1.6, color: 'var(--ink-600)' }}>
                  {verdict.message}
                </p>

                {'order' in verdict && verdict.order && (
                  <div
                    className="col gap-8"
                    style={{ padding: 12, borderRadius: 12, border: '1px solid var(--line-soft)', background: '#fbfbfc' }}
                  >
                    <div className="row-between">
                      <span className="mono strong" style={{ fontSize: 12.5 }}>
                        {verdict.order.id}
                      </span>
                      <span className="faint xs">{verdict.order.customer}</span>
                    </div>
                    <div className="row-between small">
                      <span className="muted">Order total</span>
                      <span className="tnum">{naira(verdict.order.total)}</span>
                    </div>
                    <div className="row-between small">
                      <span className="muted">Confirmed on Busha</span>
                      <span className="tnum" style={{ fontWeight: 600 }}>
                        {verdict.order.receivedNgn != null ? naira(verdict.order.receivedNgn) : 'Nothing yet'}
                      </span>
                    </div>
                  </div>
                )}

                <div className="col gap-8">
                  <span className="label">What to do next</span>
                  {verdict.kind === 'green' ? (
                    <Link href={`/orders?order=${verdict.order.id}`}>
                      <Button variant="primary" block>
                        Open the order <ArrowRight size={14} />
                      </Button>
                    </Link>
                  ) : (
                    <>
                      <Button
                        variant="primary"
                        block
                        onClick={() => {
                          const msg =
                            verdict.kind === 'red'
                              ? `Hi! I could not find a payment of ${naira(Number(fields.amount) || 0)} on my end. Could you pay through this link instead? It confirms instantly.`
                              : `Hi! I can see ${naira(verdict.order.receivedNgn ?? 0)} for ${verdict.order.id}, but the order is ${naira(verdict.order.total)}. Could you complete the balance?`;
                          navigator.clipboard
                            ?.writeText(msg)
                            .then(() =>
                              toast({
                                kind: 'success',
                                title: 'Message copied',
                                message: 'Paste it into the DM and send.',
                              }),
                            )
                            .catch(() =>
                              toast({ kind: 'error', title: 'Could not copy', message: 'Your browser blocked it.' }),
                            );
                        }}
                      >
                        Copy a message for the buyer
                      </Button>
                      <Link href="/orders?new=1">
                        <Button variant="ghost" block>
                          <Upload size={14} /> Send a fresh link
                        </Button>
                      </Link>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}

          <div className="callout info">
            <span className="callout-icon" style={{ color: 'var(--info)' }}>
              <ShieldCheck size={14} />
            </span>
            <div>
              <div className="callout-title">The honest limit</div>
              <div className="callout-body">
                We can only confirm payments made through Busha. If a buyer sent a bank transfer outside Busha,
                red means “not found here, please pay through the link”. That is exactly the habit we are
                training out of them.
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-head">
              <div className="card-title">Recent confirmed payments</div>
            </div>
            <div className="card-body" style={{ paddingTop: 8, paddingBottom: 8 }}>
              <div className="col gap-10">
                {paidOrders.slice(0, 4).map((o) => (
                  <div key={o.id} className="row gap-10">
                    <span className="avatar-xs">{o.customer.slice(0, 2).toUpperCase()}</span>
                    <div className="cell-stack" style={{ flex: 1 }}>
                      <span style={{ fontSize: 12.5, fontWeight: 550 }}>{o.customer}</span>
                      <span className="sub">{o.id}</span>
                    </div>
                    <span className="tnum" style={{ fontWeight: 600, fontSize: 12.5 }}>
                      {naira(o.receivedNgn ?? o.total, { compact: true })}
                    </span>
                  </div>
                ))}
                {awaitingOrder && (
                  <div className="row gap-6 faint xs" style={{ marginTop: 4 }}>
                    <FileImage size={12} /> {awaitingOrder.id} is still waiting, so its screenshot would come back
                    amber.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
