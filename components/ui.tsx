'use client';

import React, { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  Copy,
  Info,
  X,
  XCircle,
} from 'lucide-react';
import { useStore } from '@/lib/store';
import { STATUS_META, type OrderStatus } from '@/lib/types';
import { countdown, remaining } from '@/lib/format';

/* ------------------------------- buttons -------------------------------- */

type BtnProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'accent' | 'ghost' | 'quiet' | 'soft' | 'danger' | 'link';
  size?: 'sm' | 'md' | 'lg';
  block?: boolean;
  loading?: boolean;
};

export function Button({
  variant = 'ghost',
  size = 'md',
  block,
  loading,
  className = '',
  children,
  disabled,
  ...rest
}: BtnProps) {
  const cls = [
    'btn',
    variant === 'link' ? 'btn-link' : `btn-${variant}`,
    size === 'sm' ? 'btn-sm' : size === 'lg' ? 'btn-lg' : '',
    block ? 'btn-block' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');
  return (
    <button className={cls} disabled={disabled || loading} {...rest}>
      {loading && <Spinner />}
      {children}
    </button>
  );
}

export function Spinner({ size = 13 }: { size?: number }) {
  return (
    <span
      aria-hidden
      style={{
        width: size,
        height: size,
        borderRadius: 999,
        border: '1.6px solid currentColor',
        borderTopColor: 'transparent',
        display: 'inline-block',
        animation: 'spin .7s linear infinite',
        opacity: 0.85,
      }}
    />
  );
}

/* -------------------------------- modal --------------------------------- */

export function Modal({
  open,
  onClose,
  title,
  sub,
  size = 'sm',
  icon,
  footer,
  children,
  dismissable = true,
}: {
  open: boolean;
  onClose: () => void;
  title: React.ReactNode;
  sub?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
  icon?: React.ReactNode;
  footer?: React.ReactNode;
  children: React.ReactNode;
  dismissable?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const dismissableRef = useRef(dismissable);
  dismissableRef.current = dismissable;

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && dismissableRef.current) onCloseRef.current();
    };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const t = setTimeout(() => {
      if (ref.current && ref.current.contains(document.activeElement)) {
        return;
      }
      const first = ref.current?.querySelector<HTMLElement>(
        '[data-autofocus], input:not([type=hidden]):not([disabled]), select:not([disabled]), textarea:not([disabled])',
      );
      first?.focus();
    }, 60);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
      clearTimeout(t);
    };
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && dismissableRef.current) onCloseRef.current();
      }}
      role="presentation"
    >
      <div
        className={`modal ${size === 'md' ? 'md' : size === 'lg' ? 'lg' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label={typeof title === 'string' ? title : 'Dialog'}
        ref={ref}
      >
        <div className="modal-head">
          {icon && <div style={{ marginTop: 2 }}>{icon}</div>}
          <div style={{ minWidth: 0 }}>
            <div className="modal-title">{title}</div>
            {sub && <div className="modal-sub">{sub}</div>}
          </div>
          {dismissable && (
            <button className="modal-x" onClick={() => onCloseRef.current()} aria-label="Close">
              <X size={16} />
            </button>
          )}
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-foot">{footer}</div>}
      </div>
    </div>
  );
}

/* ------------------------------- toasts --------------------------------- */

export function ToastHost() {
  const { toasts, dismissToast } = useStore();
  const pathname = usePathname();
  // The buyer should never see the seller's internal messages.
  if (pathname?.startsWith('/pay')) return null;
  return (
    <div className="toasts" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className="toast" role="status">
          <div className={`toast-icon ${t.kind}`}>
            {t.kind === 'success' ? (
              <CheckCircle2 size={15} />
            ) : t.kind === 'error' ? (
              <XCircle size={15} />
            ) : (
              <Info size={15} />
            )}
          </div>
          <div style={{ minWidth: 0 }}>
            <div className="toast-title">{t.title}</div>
            {t.message && <div className="toast-msg">{t.message}</div>}
          </div>
          <button className="toast-x" onClick={() => dismissToast(t.id)} aria-label="Dismiss">
            <X size={13} />
          </button>
        </div>
      ))}
    </div>
  );
}

/* ------------------------------ status ---------------------------------- */

export function StatusChip({ status }: { status: OrderStatus }) {
  const meta = STATUS_META[status];
  return <span className={`chip ${meta.tone}`}>{meta.label}</span>;
}

export function Tag({ children, tone }: { children: React.ReactNode; tone?: 'usdc' | 'ngn' }) {
  return <span className={`tag ${tone ?? ''}`}>{children}</span>;
}

/* ----------------------------- segmented -------------------------------- */

export function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="seg" role="tablist">
      {options.map((o) => (
        <button
          key={o.value}
          role="tab"
          aria-selected={value === o.value}
          className={`seg-btn ${value === o.value ? 'active' : ''}`}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/* ------------------------------- fields --------------------------------- */

export function Field({
  label,
  hint,
  error,
  required,
  children,
  htmlFor,
}: {
  label: string;
  hint?: string;
  error?: string;
  required?: boolean;
  children: React.ReactNode;
  htmlFor?: string;
}) {
  return (
    <div className="field">
      <label className="label" htmlFor={htmlFor}>
        {label}
        {required && <span className="req">*</span>}
      </label>
      {children}
      {error ? (
        <span className="field-error">
          <AlertTriangle size={12} /> {error}
        </span>
      ) : hint ? (
        <span className="help">{hint}</span>
      ) : null}
    </div>
  );
}

export function Stepper({
  value,
  onChange,
  min = 1,
  max = 99,
}: {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
}) {
  return (
    <div className="stepper">
      <button
        type="button"
        onClick={() => onChange(Math.max(min, value - 1))}
        disabled={value <= min}
        aria-label="Decrease quantity"
      >
        −
      </button>
      <span>{value}</span>
      <button
        type="button"
        onClick={() => onChange(Math.min(max, value + 1))}
        disabled={value >= max}
        aria-label="Increase quantity"
      >
        +
      </button>
    </div>
  );
}

/* ------------------------------ countdown ------------------------------- */

export function Countdown({ expiresAt, prefix }: { expiresAt: string; prefix?: string }) {
  const { now } = useStore();
  const ms = Math.max(0, new Date(expiresAt).getTime() - now);
  const urgent = ms < 3 * 60_000;
  return (
    <span className={`countdown ${urgent ? 'urgent' : ''}`}>
      {prefix}
      {ms > 0 ? countdown(ms) : 'expired'}
    </span>
  );
}

/* ------------------------------ copy button ----------------------------- */

export function CopyButton({
  value,
  label = 'Copy',
  onCopied,
}: {
  value: string;
  label?: string;
  onCopied?: () => void;
}) {
  const { toast } = useStore();
  const [done, setDone] = useState(false);

  const copy = async () => {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(value);
      } else {
        // Fallback for embedded frames that block the clipboard API.
        const el = document.createElement('textarea');
        el.value = value;
        el.style.position = 'fixed';
        el.style.opacity = '0';
        document.body.appendChild(el);
        el.select();
        const ok = document.execCommand('copy');
        document.body.removeChild(el);
        if (!ok) throw new Error('copy blocked');
      }
      setDone(true);
      onCopied?.();
      toast({ kind: 'success', title: 'Copied', message: 'The payment link is on your clipboard.' });
      setTimeout(() => setDone(false), 1800);
    } catch {
      toast({
        kind: 'error',
        title: 'Could not copy',
        message: 'Your browser blocked the clipboard. Select the link and copy it by hand.',
      });
    }
  };

  return (
    <Button variant="ghost" size="sm" onClick={copy} type="button">
      {done ? <Check size={13} /> : <Copy size={13} />}
      {done ? 'Copied' : label}
    </Button>
  );
}

/* -------------------------------- empty --------------------------------- */

export function EmptyState({
  icon,
  title,
  sub,
  action,
}: {
  icon: React.ReactNode;
  title: string;
  sub?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="empty">
      <div className="empty-icon">{icon}</div>
      <div className="empty-title">{title}</div>
      {sub && <div className="empty-sub">{sub}</div>}
      {action && <div style={{ marginTop: 10 }}>{action}</div>}
    </div>
  );
}

/* ------------------------------- confirm -------------------------------- */

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  body,
  confirmLabel = 'Confirm',
  danger,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  body: string;
  confirmLabel?: string;
  danger?: boolean;
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      size="sm"
      icon={
        <div
          className="toast-icon"
          style={{ background: danger ? 'var(--bad-soft)' : 'var(--warn-soft)', color: danger ? 'var(--bad)' : 'var(--warn)' }}
        >
          <AlertTriangle size={15} />
        </div>
      }
      footer={
        <>
          <div className="spacer" />
          <Button variant="quiet" onClick={onClose}>
            Keep it
          </Button>
          <Button
            variant={danger ? 'danger' : 'primary'}
            onClick={() => {
              onConfirm();
              onClose();
            }}
          >
            {confirmLabel}
          </Button>
        </>
      }
    >
      <p className="small muted" style={{ lineHeight: 1.55 }}>
        {body}
      </p>
    </Modal>
  );
}

/** Re-renders every second so countdowns stay honest. */
export function useTick() {
  const { now } = useStore();
  return now;
}

export { remaining };
