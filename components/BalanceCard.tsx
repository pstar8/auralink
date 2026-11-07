'use client';

import React, { useState } from 'react';
import {
  ArrowDownLeft,
  ArrowUpRight,
  Banknote,
  Copy,
  Info,
  Landmark,
  Repeat,
  ShieldCheck,
  Wallet,
} from 'lucide-react';
import { useStore } from '@/lib/store';
import { RATES } from '@/lib/config';
import { naira } from '@/lib/format';
import { Button, CopyButton, Field, Modal } from '@/components/ui';
import { Sparkline } from '@/components/charts';

type Mode = 'NGN' | 'USDC';

export function BalanceCard() {
  const { balances, orders, ledger } = useStore();
  const [mode, setMode] = useState<Mode>('NGN');
  const [dialog, setDialog] = useState<'withdraw' | 'receive' | 'convert' | null>(null);

  const last14 = Array.from({ length: 14 }).map((_, i) => {
    const day = new Date();
    day.setHours(0, 0, 0, 0);
    day.setDate(day.getDate() - (13 - i));
    const start = day.getTime();
    const end = start + 86_400_000;
    return ledger
      .filter((l) => {
        const t = new Date(l.createdAt).getTime();
        return t >= start && t < end;
      })
      .reduce((sum, l) => sum + l.net, 0);
  });

  return (
    <>
      <div className="balance-card" style={{display: 'flex'}}>
        <div className="row-between" style={{ position: 'relative', zIndex: 1 }}>
          <div className="balance-label">{mode === 'NGN' ? 'Naira balance' : 'USDC treasury'}</div>
          <div className="currency-switch">
            <button className={mode === 'NGN' ? 'active' : ''} onClick={() => setMode('NGN')}>
              NGN
            </button>
            <button className={mode === 'USDC' ? 'active' : ''} onClick={() => setMode('USDC')}>
              USDC
            </button>
          </div>
        </div>

        <div className="balance-value" style={{ position: 'relative', zIndex: 1 }}>
          {mode === 'NGN'
            ? naira(balances.ngn)
            : `${balances.usdc.toLocaleString('en-US', { minimumFractionDigits: 2 })}`}
          {mode === 'USDC' && <span style={{ fontSize: 15, fontWeight: 500, marginLeft: 6, opacity: 0.7 }}>USDC</span>}
        </div>

        <div className="balance-secondary">
          <Repeat size={12} />
          {mode === 'NGN'
            ? `≈ ${(balances.ngn / RATES.usdcNgn).toFixed(2)} USDC at ₦${RATES.usdcNgn.toLocaleString()}`
            : `≈ ${naira(balances.usdc * RATES.usdcNgn)} at ₦${RATES.usdcNgn.toLocaleString()}`}
        </div>

        {/* <div style={{ marginTop: 16, position: 'relative', zIndex: 1 }}>
          <span className="balance-label">Last 14 days</span>
          <div style={{ opacity: 0.8, marginTop: 2 }}>
            <Sparkline values={last14} color="rgba(255,255,255,.9)" width={252} height={36} />
          </div>
        </div> */}

        <div className="balance-actions">
          <button className="balance-btn solid" onClick={() => setDialog('withdraw')}>
            <ArrowUpRight size={14} /> Withdraw
          </button>
          <button className="balance-btn" onClick={() => setDialog('receive')}>
            <ArrowDownLeft size={14} /> Receive
          </button>
          <button className="balance-btn" onClick={() => setDialog('convert')}>
            <Repeat size={14} /> Convert
          </button>
        </div>

        <div className="balance-foot">
          <div className="balance-foot-row">
            <span>Awaiting in open links</span>
            <span className="tnum">
              {naira(orders.filter((o) => o.status === 'awaiting').reduce((s, o) => s + o.total, 0), {
                compact: true,
              })}
            </span>
          </div>
          <div className="balance-foot-row">
            <span>
              Last settlement · {ledger[0] ? new Date(ledger[0].createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) : '—'}
            </span>
            <span className="tnum">{ledger[0] ? naira(ledger[0].net, { compact: true }) : '—'}</span>
          </div>
        </div>
      </div>

      <WithdrawModal open={dialog === 'withdraw'} onClose={() => setDialog(null)} />
      <ReceiveModal open={dialog === 'receive'} onClose={() => setDialog(null)} />
      <ConvertModal open={dialog === 'convert'} onClose={() => setDialog(null)} />
    </>
  );
}

/* -------------------------------- withdraw ------------------------------- */

function WithdrawModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { balances, withdraw } = useStore();
  const [amount, setAmount] = useState('');
  const [bank, setBank] = useState('gtb');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const value = Number(amount) || 0;

  const submit = async () => {
    if (!value) return setError('Enter how much you want to send to your bank.');
    if (value < 100) return setError('The smallest withdrawal is ₦100.');
    if (value > balances.ngn) return setError(`That is more than your balance of ${naira(balances.ngn)}.`);
    setError('');
    setBusy(true);
    try {
      await withdraw(value);
      onClose();
      setAmount('');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Withdraw to your bank"
      sub="Naira lands in your account, usually within minutes."
      icon={
        <div className="stat-icon" style={{ margin: 0 }}>
          <Landmark size={15} />
        </div>
      }
      footer={
        <>
          <div className="spacer" />
          <Button variant="quiet" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button variant="primary" onClick={submit} loading={busy}>
            Withdraw {value ? naira(value) : ''}
          </Button>
        </>
      }
    >
      <div className="col gap-14" style={{ gap: 14 }}>
        <Field label="Amount" error={error} required>
          <div className="input-group">
            <span className="input-prefix">₦</span>
            <input
              className={`input ${error ? 'invalid' : ''}`}
              value={amount ? Number(amount).toLocaleString('en-NG') : ''}
              inputMode="numeric"
              placeholder="0.00"
              onChange={(e) => {
                setAmount(e.target.value.replace(/[^0-9]/g, ''));
                setError('');
              }}
            />
          </div>
        </Field>
        <div className="row gap-6">
          {[0.25, 0.5, 1].map((f) => (
            <button
              key={f}
              className="pill"
              onClick={() => setAmount(String(Math.floor(balances.ngn * f)))}
              type="button"
            >
              {f === 1 ? 'All' : `${f * 100}%`}
            </button>
          ))}
          <span className="faint xs" style={{ marginLeft: 'auto' }}>
            Available {naira(balances.ngn)}
          </span>
        </div>

        <Field label="Destination account">
          <select className="select" value={bank} onChange={(e) => setBank(e.target.value)}>
            <option value="gtb">GTBank · Amaka Obi · 4412</option>
            <option value="zenith">Zenith · Amaka Obi · 8890</option>
            <option value="add">+ Add a new account</option>
          </select>
        </Field>

        <div className="callout">
          <span className="callout-icon" style={{ color: 'var(--muted)' }}>
            <Info size={14} />
          </span>
          <div>
            <div className="callout-body">
              Busha pays out {naira(Math.max(0, value * 0.005))} in fees on this amount. You will see the exact
              figure before it leaves.
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
}

/* -------------------------------- receive -------------------------------- */

function ReceiveModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [tab, setTab] = useState<'ngn' | 'usdc'>('ngn');
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Receive money"
      sub="Top up your balance from a bank or a wallet."
      icon={
        <div className="stat-icon" style={{ margin: 0 }}>
          <Wallet size={15} />
        </div>
      }
      footer={
        <>
          <div className="spacer" />
          <Button variant="primary" onClick={onClose}>
            Done
          </Button>
        </>
      }
    >
      <div className="col gap-14" style={{ gap: 14 }}>
        <div className="seg" style={{ width: '100%' }}>
          <button className={`seg-btn ${tab === 'ngn' ? 'active' : ''}`} style={{ flex: 1 }} onClick={() => setTab('ngn')}>
            Naira account
          </button>
          <button className={`seg-btn ${tab === 'usdc' ? 'active' : ''}`} style={{ flex: 1 }} onClick={() => setTab('usdc')}>
            USDC address
          </button>
        </div>

        {tab === 'ngn' ? (
          <div className="col gap-10">
            {[
              { k: 'Bank', v: 'Wema Bank' },
              { k: 'Account number', v: '8123 4567 89', copy: '8123456789' },
              { k: 'Account name', v: 'AuraLink / AMAKA THREADS' },
            ].map((row) => (
              <div key={row.k} className="row-between" style={{ padding: '10px 12px', background: '#fbfbfc', borderRadius: 10, border: '1px solid var(--line-soft)' }}>
                <div className="col" style={{ gap: 2 }}>
                  <span className="faint xs">{row.k}</span>
                  <span style={{ fontWeight: 600, fontSize: 13 }} className={row.copy ? 'mono' : ''}>
                    {row.v}
                  </span>
                </div>
                {row.copy && <CopyButton value={row.copy} label="Copy" />}
              </div>
            ))}
            <span className="help">
              Send naira here from any Nigerian bank. Tell buyers to use their order ID as the narration.
            </span>
          </div>
        ) : (
          <div className="col gap-10">
            <div className="row-between" style={{ padding: '10px 12px', background: '#fbfbfc', borderRadius: 10, border: '1px solid var(--line-soft)' }}>
              <div className="col" style={{ gap: 2, minWidth: 0 }}>
                <span className="faint xs">USDC · Polygon only</span>
                <span className="mono" style={{ fontWeight: 600, fontSize: 12, wordBreak: 'break-all' }}>
                  0x7F3a9C21eD45b8B0a2E1d6F4c98B3a5E1d0C7b92
                </span>
              </div>
              <CopyButton value="0x7F3a9C21eD45b8B0a2E1d6F4c98B3a5E1d0C7b92" label="Copy" />
            </div>
            <div className="callout warn">
              <span className="callout-icon" style={{ color: 'var(--warn)' }}>
                <ShieldCheck size={14} />
              </span>
              <div>
                <div className="callout-title">Polygon only</div>
                <div className="callout-body">
                  Coins sent on another network cannot be recovered. This is Busha's rule, not ours.
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}

/* -------------------------------- convert -------------------------------- */

function ConvertModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { balances, convert } = useStore();
  const [amount, setAmount] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const value = Number(amount) || 0;
  const out = value / RATES.usdcNgn;

  const submit = async () => {
    if (!value) return setError('Enter the amount you want to convert.');
    if (value > balances.ngn) return setError(`You only have ${naira(balances.ngn)} in naira.`);
    setError('');
    setBusy(true);
    try {
      await convert(value);
      onClose();
      setAmount('');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Convert naira to USDC"
      sub="Keep dollars in your treasury for the suppliers who charge in dollars."
      icon={
        <div className="stat-icon" style={{ margin: 0 }}>
          <Repeat size={15} />
        </div>
      }
      footer={
        <>
          <div className="spacer" />
          <Button variant="quiet" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button variant="primary" onClick={submit} loading={busy}>
            Convert
          </Button>
        </>
      }
    >
      <div className="col gap-14" style={{ gap: 14 }}>
        <Field label="You convert" error={error} required>
          <div className="input-group">
            <span className="input-prefix">₦</span>
            <input
              className={`input ${error ? 'invalid' : ''}`}
              value={amount ? Number(amount).toLocaleString('en-NG') : ''}
              inputMode="numeric"
              placeholder="0.00"
              onChange={(e) => {
                setAmount(e.target.value.replace(/[^0-9]/g, ''));
                setError('');
              }}
            />
          </div>
        </Field>

        <div className="callout" style={{ background: '#fbfbfc' }}>
          <span className="callout-icon" style={{ color: 'var(--muted)' }}>
            <Banknote size={14} />
          </span>
          <div style={{ flex: 1 }}>
            <div className="row-between">
              <span className="callout-title">You receive</span>
              <span style={{ fontWeight: 650 }} className="tnum">
                {out.toFixed(2)} USDC
              </span>
            </div>
            <div className="callout-body">
              Rate ₦{RATES.usdcNgn.toLocaleString()} per USDC, locked for 60 seconds. No hidden spread.
            </div>
          </div>
        </div>

        <div className="row-between small muted">
          <span>Busha fee (0.3%)</span>
          <span className="tnum">{naira(value * 0.003)}</span>
        </div>
        <div className="row-between small muted">
          <span>You have</span>
          <span className="tnum">{naira(balances.ngn)}</span>
        </div>
      </div>
    </Modal>
  );
}
