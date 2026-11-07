import { APP, RATES } from './config';
import type { Channel, Order, OrderItem, Product } from './types';

/**
 * ------------------------------------------------------------------
 * SINGLE SWAP POINT
 * ------------------------------------------------------------------
 * Every call the UI makes goes through here. Today it resolves against
 * local state with a small delay so the demo feels live. When Azeez's
 * routes are up, replace the body of each function with a fetch, e.g.
 *
 *   const res = await fetch('/api/orders', {
 *     method: 'POST',
 *     headers: { 'content-type': 'application/json' },
 *     body: JSON.stringify(input),
 *   })
 *   if (!res.ok) throw new ApiError((await res.json()).message, 'create_failed')
 *   return res.json()
 *
 * Nothing else in the app needs to change. Shapes stay the same.
 */

export class ApiError extends Error {
  code: string;
  constructor(message: string, code = 'unknown') {
    super(message);
    this.code = code;
  }
}

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

export const sleep = wait;

export interface CreateOrderInput {
  customer: string;
  handle?: string;
  city?: string;
  channel: Channel;
  items: { productId: string; qty: number }[];
  discount?: number;
  note?: string;
  products: Product[];
}

export interface CreateOrderResult {
  order: Order;
}

const uid = () => Math.random().toString(36).slice(2, 9);

export const api = {
  /** Asks Busha for a one-time payment link tied to this order. */
  async createOrderLink(input: CreateOrderInput): Promise<Order> {
    await wait(850);

    if (!input.customer.trim()) {
      throw new ApiError('Add the customer name so the ledger can match the payment.', 'missing_customer');
    }
    if (!input.items.length) {
      throw new ApiError('Pick at least one product before creating the link.', 'no_items');
    }
    const soldOut = input.items.find((i) => {
      const p = input.products.find((x) => x.id === i.productId);
      return p && p.stock < i.qty;
    });
    if (soldOut) {
      const p = input.products.find((x) => x.id === soldOut.productId)!;
      throw new ApiError(`Only ${p.stock} of "${p.name}" left in stock. Reduce the quantity.`, 'out_of_stock');
    }

    const items: OrderItem[] = input.items.map((i) => {
      const p = input.products.find((x) => x.id === i.productId)!;
      return { productId: p.id, name: p.name, qty: i.qty, unitPrice: p.price, emoji: p.emoji };
    });

    const subtotal = items.reduce((s, i) => s + i.qty * i.unitPrice, 0);
    const discount = Math.min(input.discount ?? 0, subtotal);
    const now = new Date();
    const id = `ORD-${Math.floor(3000 + Math.random() * 6000)}`;

    return {
      id,
      customer: input.customer.trim(),
      handle: input.handle?.trim() || `@${input.customer.trim().split(' ')[0].toLowerCase()}`,
      city: input.city?.trim() || (input.channel === 'USDC' ? 'International' : 'Nigeria'),
      channel: input.channel,
      items,
      subtotal,
      discount,
      total: subtotal - discount,
      status: 'awaiting',
      ref: `BUSHA-${Math.floor(100000 + Math.random() * 899999)}`,
      createdAt: now.toISOString(),
      expiresAt: new Date(now.getTime() + APP.quoteMinutes * 60_000).toISOString(),
      note: input.note?.trim() || undefined,
      timeline: [
        {
          id: uid(),
          label: 'Order created',
          note: 'One-time link generated for this order only',
          at: now.toISOString(),
          tone: 'neutral',
        },
      ],
    };
  },

  /** Settlement maths shared by the dashboard and the ledger. */
  settle(amountNgn: number) {
    const fee = Math.round(amountNgn * (RATES.feePercent / 100));
    return { fee, net: amountNgn - fee };
  },

  toUsdc(amountNgn: number) {
    return +(amountNgn / RATES.usdcNgn).toFixed(2);
  },

  /**
   * Screenshot Shield: reads a transfer screenshot.
   * With Gemini wired up this is the vision call. Without it, we fall
   * back to the fields the seller types in herself.
   */
  async scanScreenshot(fileName: string) {
    await wait(1400);
    // Deterministic mock read so the demo is repeatable.
    const hash = [...fileName].reduce((a, c) => a + c.charCodeAt(0), 0);
    const amount = 18500 + (hash % 12) * 1000;
    return {
      amount,
      currency: 'NGN' as Channel,
      sender: 'AMAKA THREADS / GBENGA O.',
      at: new Date(Date.now() - (hash % 90) * 60_000).toISOString(),
      reference: `TRF${hash % 900000}`,
      confidence: 0.72 + ((hash % 20) / 100),
    };
  },
};
