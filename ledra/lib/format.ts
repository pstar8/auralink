export const naira = (n: number, opts: { compact?: boolean } = {}) => {
  if (!isFinite(n)) return '₦0';
  if (opts.compact && Math.abs(n) >= 1_000_000) return `₦${(n / 1_000_000).toFixed(1)}m`;
  if (opts.compact && Math.abs(n) >= 10_000) return `₦${Math.round(n / 1000)}k`;
  return `₦${n.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

export const nairaShort = (n: number) => {
  if (Math.abs(n) >= 1_000_000) return `₦${(n / 1_000_000).toFixed(1)}m`;
  if (Math.abs(n) >= 1_000) return `₦${(n / 1_000).toFixed(1)}k`;
  return `₦${n.toFixed(0)}`;
};

export const usdc = (n: number) => `${n.toLocaleString('en-US', { maximumFractionDigits: 2 })} USDC`;

export const dateLabel = (iso: string) =>
  new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

export const timeLabel = (iso: string) =>
  new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

export const dateTimeLabel = (iso: string) => `${dateLabel(iso)}, ${timeLabel(iso)}`;

export const relative = (iso: string) => {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs} hr${hrs > 1 ? 's' : ''} ago`;
  const days = Math.round(hrs / 24);
  return `${days} day${days > 1 ? 's' : ''} ago`;
};

/** Milliseconds left, floored at 0. */
export const remaining = (expiresAt: string) =>
  Math.max(0, new Date(expiresAt).getTime() - Date.now());

export const countdown = (ms: number) => {
  const total = Math.floor(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
};

export const initialsOf = (name: string) =>
  name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('');

export const percent = (n: number, digits = 0) => `${n.toFixed(digits)}%`;
