'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { api, ApiError, CreateOrderInput, sleep } from './api';
import { APP, RATES } from './config';
import {
  PRODUCTS,
  seedBalances,
  seedLedger,
  seedNotifications,
  seedOrders,
} from './mock';
import type {
  AppNotification,
  Balances,
  LedgerEntry,
  Order,
  Product,
} from './types';

const STORAGE_KEY = 'AuraLink.state.v1';

export type ToastKind = 'success' | 'error' | 'info';
export interface Toast {
  id: string;
  kind: ToastKind;
  title: string;
  message?: string;
}

interface PersistedState {
  orders: Order[];
  ledger: LedgerEntry[];
  products: Product[];
  notifications: AppNotification[];
  balances: Balances;
}

interface StoreValue extends PersistedState {
  hydrated: boolean;
  now: number;
  toasts: Toast[];
  /** create a link for one order */
  createOrder: (input: Omit<CreateOrderInput, 'products'>) => Promise<Order>;
  /** the webhook, fired by Busha (or by our simulate button) */
  payOrder: (orderId: string, amountNgn?: number) => Promise<void>;
  expireOrder: (orderId: string) => void;
  cancelOrder: (orderId: string) => void;
  convert: (nairaAmount: number) => Promise<void>;
  withdraw: (amount: number) => Promise<void>;
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;
  toast: (t: Omit<Toast, 'id'>) => void;
  dismissToast: (id: string) => void;
  resetDemo: () => void;
  orderById: (id: string) => Order | undefined;
}

const StoreContext = createContext<StoreValue | null>(null);

const uid = () => Math.random().toString(36).slice(2, 9);

function freshState(): PersistedState {
  const orders = seedOrders();
  return {
    orders,
    ledger: seedLedger(orders),
    products: PRODUCTS.map((p) => ({ ...p })),
    notifications: seedNotifications(orders),
    balances: seedBalances(),
  };
}

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<PersistedState>(() => freshState());
  const [hydrated, setHydrated] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const [toasts, setToasts] = useState<Toast[]>([]);
  const stateRef = useRef(state);
  stateRef.current = state;

  /* ---------------------------- hydration ---------------------------- */
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as PersistedState;
        if (parsed?.orders?.length) setState(parsed);
      }
    } catch {
      /* corrupt state is not worth crashing over */
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      /* storage full, ignore */
    }
  }, [state, hydrated]);

  /* ------------------------- clock + auto expiry --------------------- */
  useEffect(() => {
    const t = setInterval(() => {
      const stamp = Date.now();
      setNow(stamp);
      setState((prev) => {
        const stale = prev.orders.filter(
          (o) => o.status === 'awaiting' && new Date(o.expiresAt).getTime() < stamp,
        );
        if (!stale.length) return prev;
        const staleIds = new Set(stale.map((o) => o.id));
        return {
          ...prev,
          orders: prev.orders.map((o) =>
            staleIds.has(o.id)
              ? {
                  ...o,
                  status: 'expired',
                  timeline: [
                    ...o.timeline,
                    {
                      id: uid(),
                      label: 'Quote expired',
                      note: 'Nothing arrived before the timer ran out',
                      at: new Date(stamp).toISOString(),
                      tone: 'neutral' as const,
                    },
                  ],
                }
              : o,
          ),
          notifications: [
            ...stale.map((o) => ({
              id: uid(),
              kind: 'exception' as const,
              title: `Link expired for ${o.id}`,
              body: `${o.customer} never paid. Send a fresh link if they are still keen.`,
              at: new Date(stamp).toISOString(),
              read: false,
              orderId: o.id,
            })),
            ...prev.notifications,
          ],
        };
      });
    }, 1000);
    return () => clearInterval(t);
  }, []);

  /* ------------------------------- toasts ---------------------------- */
  const toast = useCallback((t: Omit<Toast, 'id'>) => {
    const id = uid();
    setToasts((prev) => [...prev, { ...t, id }]);
    setTimeout(() => setToasts((prev) => prev.filter((x) => x.id !== id)), 5200);
  }, []);
  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((x) => x.id !== id));
  }, []);

  /* ------------------------------- actions --------------------------- */
  const createOrder = useCallback(
    async (input: Omit<CreateOrderInput, 'products'>) => {
      const order = await api.createOrderLink({ ...input, products: stateRef.current.products });
      setState((prev) => ({
        ...prev,
        orders: [order, ...prev.orders],
        products: prev.products.map((p) => {
          const line = order.items.find((i) => i.productId === p.id);
          return line ? { ...p, stock: Math.max(0, p.stock - line.qty) } : p;
        }),
        notifications: [
          {
            id: uid(),
            kind: 'system',
            title: `Link ready for ${order.id}`,
            body: `${order.customer} owes ₦${order.total.toLocaleString('en-NG')}. The quote holds for ${APP.quoteMinutes} minutes.`,
            at: new Date().toISOString(),
            read: false,
            orderId: order.id,
          },
          ...prev.notifications,
        ],
      }));
      toast({ kind: 'success', title: 'Payment link created', message: `${order.id} is ready to send to ${order.customer}.` });
      return order;
    },
    [toast],
  );

  const payOrder = useCallback(
    async (orderId: string, amountNgn?: number) => {
      await sleep(700);
      setState((prev) => {
        const order = prev.orders.find((o) => o.id === orderId);
        if (!order) return prev;
        const received = amountNgn ?? order.total;
        const short = received < order.total * (1 - APP.underpayTolerance / 100);
        const late = new Date(order.expiresAt).getTime() < Date.now() || order.status === 'expired';
        const status = short ? 'underpaid' : late ? 'late_paid' : 'paid';
        const stamp = new Date().toISOString();
        const { fee, net } = api.settle(received);

        const ledgerEntry: LedgerEntry = {
          id: `LED-${Math.floor(7000 + Math.random() * 2000)}`,
          orderId: order.id,
          customer: order.customer,
          amountReceived: order.channel === 'USDC' ? api.toUsdc(received) : received,
          currency: order.channel,
          nairaValue: received,
          fee,
          net,
          status: short ? 'flagged' : 'settled',
          createdAt: stamp,
          bushaEventId: `evt_${uid()}`,
        };

        const note = short
          ? `₦${(order.total - received).toLocaleString('en-NG')} still outstanding. Ask for the balance or refund.`
          : late
            ? 'Money arrived after the quote expired. Confirm the price with the buyer.'
            : undefined;

        return {
          ...prev,
          orders: prev.orders.map((o) =>
            o.id === orderId
              ? {
                  ...o,
                  status,
                  paidAt: stamp,
                  receivedNgn: received,
                  note,
                  timeline: [
                    ...o.timeline,
                    {
                      id: uid(),
                      label: short ? 'Short payment received' : 'Payment received',
                      note: `${order.channel === 'USDC' ? `${api.toUsdc(received)} USDC on Polygon` : 'Naira transfer'} · settled to ${'₦'}${net.toLocaleString('en-NG')} after fee`,
                      at: stamp,
                      tone: short ? ('warn' as const) : ('good' as const),
                    },
                  ],
                }
              : o,
          ),
          ledger: [ledgerEntry, ...prev.ledger],
          balances: {
            ...prev.balances,
            ngn: prev.balances.ngn + net,
            // USDC payments settle to naira by default, so the treasury stays put
            usdc: prev.balances.usdc,
          },
          notifications: [
            {
              id: uid(),
              kind: short ? 'exception' : 'payment',
              title: short ? `Short payment on ${order.id}` : `Payment received for ${order.id}`,
              body: short
                ? note!
                : `${order.customer} paid ₦${received.toLocaleString('en-NG')} on ${order.channel}. A ledger line was written.`,
              at: stamp,
              read: false,
              orderId: order.id,
            },
            ...prev.notifications,
          ],
        };
      });
      const order = stateRef.current.orders.find((o) => o.id === orderId);
      const received = amountNgn ?? order?.total ?? 0;
      if (order && received < order.total) {
        toast({ kind: 'error', title: 'Short payment', message: `${order.id} is underpaid. The parcel should wait.` });
      } else {
        toast({ kind: 'success', title: 'Payment matched', message: `${orderId} is paid and written to your ledger.` });
      }
    },
    [toast],
  );

  const expireOrder = useCallback((orderId: string) => {
    setState((prev) => ({
      ...prev,
      orders: prev.orders.map((o) =>
        o.id === orderId && o.status === 'awaiting'
          ? {
              ...o,
              status: 'expired',
              timeline: [
                ...o.timeline,
                { id: uid(), label: 'Quote expired', note: 'Closed from the dashboard', at: new Date().toISOString(), tone: 'neutral' as const },
              ],
            }
          : o,
      ),
    }));
    toast({ kind: 'info', title: 'Link closed', message: `${orderId} can no longer be paid.` });
  }, [toast]);

  const cancelOrder = useCallback((orderId: string) => {
    setState((prev) => ({
      ...prev,
      orders: prev.orders.map((o) => (o.id === orderId ? { ...o, status: 'cancelled' } : o)),
    }));
    toast({ kind: 'info', title: 'Order cancelled', message: `${orderId} was cancelled.` });
  }, [toast]);

  const convert = useCallback(
    async (nairaAmount: number) => {
      await sleep(900);
      setState((prev) => {
        if (nairaAmount <= 0 || nairaAmount > prev.balances.ngn) return prev;
        const out = api.toUsdc(nairaAmount);
        return {
          ...prev,
          balances: {
            ngn: prev.balances.ngn - nairaAmount,
            usdc: prev.balances.usdc + out,
          },
          notifications: [
            {
              id: uid(),
              kind: 'system',
              title: 'Converted to USDC',
              body: `₦${nairaAmount.toLocaleString('en-NG')} became ${out} USDC at ₦${RATES.usdcNgn}/USDC.`,
              at: new Date().toISOString(),
              read: false,
            },
            ...prev.notifications,
          ],
        };
      });
      toast({ kind: 'success', title: 'Conversion complete', message: `₦${nairaAmount.toLocaleString('en-NG')} is now USDC in your treasury.` });
    },
    [toast],
  );

  const withdraw = useCallback(
    async (amount: number) => {
      await sleep(1000);
      setState((prev) => ({
        ...prev,
        balances: { ...prev.balances, ngn: Math.max(0, prev.balances.ngn - amount) },
        notifications: [
          {
            id: uid(),
            kind: 'system',
            title: 'Withdrawal on the way',
            body: `₦${amount.toLocaleString('en-NG')} is heading to your GTBank account ending 4412.`,
            at: new Date().toISOString(),
            read: false,
          },
          ...prev.notifications,
        ],
      }));
      toast({ kind: 'success', title: 'Withdrawal started', message: `₦${amount.toLocaleString('en-NG')} will land in your bank shortly.` });
    },
    [toast],
  );

  const markNotificationRead = useCallback((id: string) => {
    setState((prev) => ({
      ...prev,
      notifications: prev.notifications.map((n) => (n.id === id ? { ...n, read: true } : n)),
    }));
  }, []);

  const markAllNotificationsRead = useCallback(() => {
    setState((prev) => ({ ...prev, notifications: prev.notifications.map((n) => ({ ...n, read: true })) }));
  }, []);

  const resetDemo = useCallback(() => {
    const fresh = freshState();
    setState(fresh);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {}
    toast({ kind: 'info', title: 'Demo reset', message: 'Orders, ledger and balances are back to the seed data.' });
  }, [toast]);

  const orderById = useCallback((id: string) => stateRef.current.orders.find((o) => o.id === id), []);

  const value = useMemo<StoreValue>(
    () => ({
      ...state,
      hydrated,
      now,
      toasts,
      createOrder,
      payOrder,
      expireOrder,
      cancelOrder,
      convert,
      withdraw,
      markNotificationRead,
      markAllNotificationsRead,
      toast,
      dismissToast,
      resetDemo,
      orderById,
    }),
    [
      state,
      hydrated,
      now,
      toasts,
      createOrder,
      payOrder,
      expireOrder,
      cancelOrder,
      convert,
      withdraw,
      markNotificationRead,
      markAllNotificationsRead,
      toast,
      dismissToast,
      resetDemo,
      orderById,
    ],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used inside <StoreProvider>');
  return ctx;
}

/** Turns any thrown value into a line worth showing a human. */
export function errorMessage(err: unknown) {
  if (err instanceof ApiError) return err.message;
  if (err instanceof Error) return err.message;
  return 'Something went wrong. Try again.';
}
