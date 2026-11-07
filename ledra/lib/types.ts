export type OrderStatus =
  | 'awaiting' // link created, waiting for money
  | 'paid' // full amount confirmed
  | 'underpaid' // part of the money arrived
  | 'expired' // timer ran out, nothing received
  | 'late_paid' // money arrived after expiry
  | 'cancelled';

export type Channel = 'NGN' | 'USDC';

export interface OrderItem {
  productId: string;
  name: string;
  qty: number;
  unitPrice: number;
  emoji: string;
}

export interface TimelineEvent {
  id: string;
  label: string;
  note?: string;
  at: string; // ISO
  tone: 'neutral' | 'good' | 'warn' | 'bad';
}

export interface Order {
  id: string; // ORD-2401
  customer: string;
  handle: string;
  city: string;
  channel: Channel;
  items: OrderItem[];
  subtotal: number; // naira
  discount: number; // naira
  total: number; // naira amount due
  status: OrderStatus;
  ref: string; // BUSHA reference, the join key
  expiresAt: string;
  createdAt: string;
  paidAt?: string;
  receivedNgn?: number;
  note?: string;
  timeline: TimelineEvent[];
}

export interface LedgerEntry {
  id: string;
  orderId: string | null;
  customer: string;
  amountReceived: number; // in the currency the buyer paid
  currency: Channel;
  nairaValue: number; // value at settlement
  fee: number;
  net: number;
  status: 'settled' | 'pending' | 'flagged';
  createdAt: string;
  bushaEventId: string;
}

export interface Product {
  id: string;
  name: string;
  price: number;
  stock: number;
  emoji: string;
  sku: string;
}

export interface AppNotification {
  id: string;
  kind: 'payment' | 'exception' | 'system';
  title: string;
  body: string;
  at: string;
  read: boolean;
  orderId?: string;
}

export interface Balances {
  ngn: number;
  usdc: number;
}

export const STATUS_META: Record<
  OrderStatus,
  { label: string; tone: 'good' | 'warn' | 'bad' | 'neutral' | 'info'; hint: string }
> = {
  awaiting: { label: 'Awaiting payment', tone: 'info', hint: 'Link is live. Nothing has landed yet.' },
  paid: { label: 'Paid', tone: 'good', hint: 'Full amount confirmed. Safe to ship.' },
  underpaid: { label: 'Underpaid', tone: 'warn', hint: 'Less than the amount due arrived.' },
  expired: { label: 'Expired', tone: 'neutral', hint: 'The quote ran out before money arrived.' },
  late_paid: { label: 'Late paid', tone: 'warn', hint: 'Money arrived after the quote expired.' },
  cancelled: { label: 'Cancelled', tone: 'bad', hint: 'You cancelled this link.' },
};
