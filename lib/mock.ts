import { APP, RATES } from './config';
import type {
  AppNotification,
  Balances,
  Channel,
  LedgerEntry,
  Order,
  OrderItem,
  OrderStatus,
  Product,
  TimelineEvent,
} from './types';

/* ------------------------------------------------------------------ *
 * Deterministic pseudo-random so the demo looks the same every load,
 * unless you clear state (the store keeps everything in localStorage).
 * ------------------------------------------------------------------ */
function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(20261107);
const pick = <T,>(arr: T[]) => arr[Math.floor(rand() * arr.length)];
const between = (min: number, max: number) => Math.round(min + rand() * (max - min));

export const PRODUCTS: Product[] = [
  { id: 'p1', name: 'Adire Wrap Dress', price: 42000, stock: 6, emoji: '👗', sku: 'AT-DR-01' },
  { id: 'p2', name: 'Linen Two-Piece Set', price: 58500, stock: 3, emoji: '🧵', sku: 'AT-ST-02' },
  { id: 'p3', name: 'Ankara Tote Bag', price: 18000, stock: 12, emoji: '👜', sku: 'AT-BG-03' },
  { id: 'p4', name: 'Silk Head Wrap', price: 9500, stock: 20, emoji: '🧣', sku: 'AT-HW-04' },
  { id: 'p5', name: 'Beaded Earrings', price: 7200, stock: 0, emoji: '💎', sku: 'AT-JW-05' },
  { id: 'p6', name: 'Boubou Kaftan', price: 63000, stock: 4, emoji: '🥻', sku: 'AT-DR-06' },
];

const CUSTOMERS = [
  { name: 'Sarah Johnson', handle: '@sarahj', city: 'Manchester, UK' },
  { name: 'Adaeze Nwosu', handle: '@adaeze.n', city: 'Ibadan, NG' },
  { name: 'Tunde Bakare', handle: '@tundeb', city: 'Lagos, NG' },
  { name: 'Chiamaka Eze', handle: '@chiamaka_e', city: 'Enugu, NG' },
  { name: 'Grace Adeyemi', handle: '@graceade', city: 'Ibadan, NG' },
  { name: 'Farida Yusuf', handle: '@fariday', city: 'Abuja, NG' },
  { name: 'Olivia Bennett', handle: '@olivb', city: 'London, UK' },
  { name: 'Ngozi Okonkwo', handle: '@ngozi.o', city: 'Aba, NG' },
  { name: 'Kemi Alabi', handle: '@kemialabi', city: 'Oyo, NG' },
  { name: 'Daniel Mba', handle: '@danmba', city: 'Port Harcourt, NG' },
  { name: 'Zainab Bello', handle: '@zainabb', city: 'Ilorin, NG' },
  { name: 'Ifeoma Anyanwu', handle: '@ifeoma.a', city: 'Owerri, NG' },
  { name: 'Ryan Clarke', handle: '@ryan_cl', city: 'Leeds, UK' },
  { name: 'Bola Ogunleye', handle: '@bolao', city: 'Abeokuta, NG' },
  { name: 'Amanda Mills', handle: '@amandam', city: 'Bristol, UK' },
];

const OWED = [
  'Manchester, UK',
  'Ibadan, NG',
  'Lagos, NG',
  'Enugu, NG',
  'London, UK',
  'Abuja, NG',
  'Aba, NG',
  'Oyo, NG',
];

const minutesAgo = (m: number) => new Date(Date.now() - m * 60_000).toISOString();
const daysAgo = (d: number, hour = 10) => {
  const dt = new Date();
  dt.setDate(dt.getDate() - d);
  dt.setHours(hour, between(0, 59), 0, 0);
  return dt.toISOString();
};

const item = (pid: string, qty: number): OrderItem => {
  const p = PRODUCTS.find((x) => x.id === pid)!;
  return { productId: p.id, name: p.name, qty, unitPrice: p.price, emoji: p.emoji };
};

interface Seed {
  customerIdx: number;
  channel: Channel;
  items: OrderItem[];
  status: OrderStatus;
  createdAt: string;
  paidAt?: string;
  receivedNgn?: number;
  note?: string;
}

const money = (items: OrderItem[], discount = 0) =>
  items.reduce((s, i) => s + i.qty * i.unitPrice, 0) - discount;

/* ---------------- today, the ones on screen during the demo --------------- */

const liveSeeds: Seed[] = [
  {
    customerIdx: 0,
    channel: 'USDC',
    items: [item('p1', 1)],
    status: 'paid',
    createdAt: minutesAgo(52),
    paidAt: minutesAgo(48),
    receivedNgn: money([item('p1', 1)]),
  },
  {
    customerIdx: 1,
    channel: 'NGN',
    items: [item('p4', 2), item('p3', 1)],
    status: 'awaiting',
    createdAt: minutesAgo(9),
  },
  {
    customerIdx: 2,
    channel: 'NGN',
    items: [item('p2', 1)],
    status: 'underpaid',
    createdAt: minutesAgo(126),
    receivedNgn: money([item('p2', 1)]) - 12000,
    note: 'Buyer paid ₦46,500 of ₦58,500. Short by ₦12,000.',
  },
  {
    customerIdx: 3,
    channel: 'USDC',
    items: [item('p6', 1)],
    status: 'late_paid',
    createdAt: minutesAgo(340),
    paidAt: minutesAgo(70),
    receivedNgn: money([item('p6', 1)]),
    note: 'Paid 22 minutes after the quote expired. Confirm the price with the buyer.',
  },
  {
    customerIdx: 4,
    channel: 'NGN',
    items: [item('p3', 2)],
    status: 'expired',
    createdAt: minutesAgo(420),
  },
  {
    customerIdx: 5,
    channel: 'USDC',
    items: [item('p1', 1), item('p4', 1)],
    status: 'awaiting',
    createdAt: minutesAgo(3),
  },
];

/* --------------------------- history for charts -------------------------- */

const historySeeds: Seed[] = [];
for (let d = 1; d <= 150; d++) {
  // more orders on recent days, quiet days too
  const count = d < 30 ? between(0, 3) : between(0, 2);
  for (let k = 0; k < count; k++) {
    const cIdx = between(0, CUSTOMERS.length - 1);
    const channel: Channel = rand() > 0.55 ? 'USDC' : 'NGN';
    const pid = pick(PRODUCTS).id;
    const qty = between(1, 3);
    const items = [item(pid, qty)];
    if (rand() > 0.7) items.push(item(pick(PRODUCTS).id, 1));
    const createdAt = daysAgo(d, between(8, 21));
    const roll = rand();
    // History is mostly clean books. The messy payments live in today's orders,
    // where they belong for the demo.
    const status: OrderStatus = roll < 0.975 ? 'paid' : roll < 0.995 ? 'expired' : 'underpaid';
    const total = money(items);
    historySeeds.push({
      customerIdx: cIdx,
      channel,
      items,
      status,
      createdAt,
      paidAt:
        status === 'paid'
          ? new Date(new Date(createdAt).getTime() + between(2, 40) * 60000).toISOString()
          : undefined,
      receivedNgn: status === 'paid' ? total : status === 'underpaid' ? total - between(2000, 15000) : undefined,
    });
  }
}

const allSeeds = [...historySeeds, ...liveSeeds].sort(
  (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
);

function buildTimeline(seed: Seed, ref: string): TimelineEvent[] {
  const t: TimelineEvent[] = [
    { id: 't1', label: 'Order created', note: 'Link generated for this order only', at: seed.createdAt, tone: 'neutral' },
  ];
  if (seed.status !== 'expired') {
    t.push({
      id: 't2',
      label: 'Payment received',
      note: seed.channel === 'USDC' ? 'USDC on Polygon' : 'Naira transfer',
      at: seed.paidAt ?? new Date(new Date(seed.createdAt).getTime() + 14 * 60000).toISOString(),
      tone: 'good',
    });
  }
  if (seed.status === 'underpaid') {
    t.push({ id: 't3', label: 'Short payment flagged', note: seed.note, at: seed.paidAt!, tone: 'warn' });
  }
  if (seed.status === 'expired') {
    t.push({ id: 't2', label: 'Quote Expired', note: 'Nothing received before the timer ran out', at: new Date(new Date(seed.createdAt).getTime() + APP.quoteMinutes * 60000).toISOString(), tone: 'neutral' });
  }
  if (seed.status === 'late_paid') {
    t.push({ id: 't3', label: 'Late payment matched', note: 'Matched to ' + ref + ' after expiry', at: seed.paidAt!, tone: 'warn' });
  }
  return t.sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());
}

export function seedOrders(): Order[] {
  return allSeeds.map((seed, i) => {
    const customer = CUSTOMERS[seed.customerIdx] ?? CUSTOMERS[i % CUSTOMERS.length];
    const id = `ORD-${2401 + i}`;
    const ref = `BUSHA-${String(90210 + i * 7)}`;
    const subtotal = money(seed.items);
    const createdAt = seed.createdAt;
    return {
      id,
      customer: customer.name,
      handle: customer.handle,
      city: customer.city,
      channel: seed.channel,
      items: seed.items,
      subtotal,
      discount: 0,
      total: subtotal,
      status: seed.status,
      ref,
      createdAt,
      expiresAt: new Date(new Date(createdAt).getTime() + APP.quoteMinutes * 60000).toISOString(),
      paidAt: seed.paidAt,
      receivedNgn: seed.receivedNgn,
      note: seed.note,
      timeline: buildTimeline(seed, ref),
    };
  });
}

export function seedLedger(orders: Order[]): LedgerEntry[] {
  return orders
    .filter((o) => o.status === 'paid' || o.status === 'late_paid' || o.status === 'underpaid')
    .map((o, i) => {
      const nairaValue = o.receivedNgn ?? o.total;
      const fee = Math.round(nairaValue * (RATES.feePercent / 100));
      return {
        id: `LED-${5001 + i}`,
        orderId: o.id,
        customer: o.customer,
        amountReceived: o.channel === 'USDC' ? +(nairaValue / RATES.usdcNgn).toFixed(2) : nairaValue,
        currency: o.channel,
        nairaValue,
        fee,
        net: nairaValue - fee,
        status: o.status === 'underpaid' ? 'flagged' : o.status === 'late_paid' ? 'settled' : 'settled',
        createdAt: o.paidAt ?? o.createdAt,
        bushaEventId: `evt_${o.ref.toLowerCase()}`,
      } satisfies LedgerEntry;
    })
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export const seedBalances = (): Balances => ({ ngn: 1284500, usdc: 842.35 });

export const seedNotifications = (orders: Order[]): AppNotification[] => {
  const paid = orders.filter((o) => o.status === 'paid').slice(-3).reverse();
  const short = orders.find((o) => o.status === 'underpaid');
  const late = orders.find((o) => o.status === 'late_paid');
  const notifs: AppNotification[] = paid.map((o, i) => ({
    id: `n${i + 1}`,
    kind: 'payment' as const,
    title: `Payment received for ${o.id}`,
    body: `${o.customer} paid ₦${o.total.toLocaleString('en-NG')} on ${o.channel}. A ledger line was written.`,
    at: o.paidAt ?? o.createdAt,
    read: i > 1,
    orderId: o.id,
  }));
  const exceptions: AppNotification[] = [
    ...(short
      ? [
          {
            id: 'nx1',
            kind: 'exception' as const,
            title: `Short payment on ${short.id}`,
            body: `${short.note ?? 'Part of the money arrived.'} Ask the buyer for the balance or send a new link.`,
            at: short.createdAt,
            read: false,
            orderId: short.id,
          },
        ]
      : []),
    ...(late
      ? [
          {
            id: 'nx2',
            kind: 'exception' as const,
            title: `Late payment on ${late.id}`,
            body: 'Money arrived after the quote expired. Confirm the price before you ship.',
            at: late.paidAt ?? late.createdAt,
            read: false,
            orderId: late.id,
          },
        ]
      : []),
  ];
  const sys: AppNotification = {
    id: 'ns1',
    kind: 'system',
    title: 'Sandbox mode is on',
    body: 'Payments here are simulated. No real money moves.',
    at: daysAgo(0, 8),
    read: true,
  };
  return [...exceptions, ...notifs, sys].sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
};
