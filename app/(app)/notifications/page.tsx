'use client';

import React from 'react';
import Link from 'next/link';
import { AlertTriangle, BellOff, CheckCheck, CircleDollarSign, Info } from 'lucide-react';
import { useStore } from '@/lib/store';
import { dateLabel, relative, timeLabel } from '@/lib/format';
import { Button, EmptyState } from '@/components/ui';

export default function NotificationsPage() {
  const { notifications, markAllNotificationsRead, markNotificationRead, orders } = useStore();

  const groups = notifications.reduce<Record<string, typeof notifications>>((acc, n) => {
    const key = dateLabel(n.at);
    acc[key] = acc[key] ? [...acc[key], n] : [n];
    return acc;
  }, {});

  const unread = notifications.filter((n) => !n.read).length;

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1 className="page-title">Notifications</h1>
          <p className="page-sub">
            {unread > 0 ? `${unread} unread. Payments, exceptions and the odd system note.` : 'You are all caught up.'}
          </p>
        </div>
        <div className="page-actions">
          <Button variant="ghost" onClick={markAllNotificationsRead} disabled={!unread}>
            <CheckCheck size={14} /> Mark all as read
          </Button>
        </div>
      </div>

      {notifications.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={<BellOff size={18} />}
            title="Nothing here yet"
            sub="Once a buyer pays, the confirmation lands here."
          />
        </div>
      ) : (
        <div className="card">
          {Object.entries(groups).map(([day, items]) => (
            <div key={day}>
              <div
                style={{
                  padding: '10px 18px',
                  background: '#f8fafc',
                  borderBottom: '1px solid var(--line-soft)',
                  fontSize: 11.5,
                  fontWeight: 650,
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  color: 'var(--ink-700)',
                }}
              >
                {day}
              </div>
              {items.map((n) => {
                const exists = n.orderId && orders.some((o) => o.id === n.orderId);
                const body = (
                  <>
                    <span
                      className="toast-icon"
                      style={{
                        background:
                          n.kind === 'payment'
                            ? 'var(--good-soft)'
                            : n.kind === 'exception'
                              ? 'var(--warn-soft)'
                              : 'var(--info-soft)',
                        color:
                          n.kind === 'payment' ? 'var(--good)' : n.kind === 'exception' ? 'var(--warn)' : 'var(--info)',
                      }}
                    >
                      {n.kind === 'payment' ? (
                        <CircleDollarSign size={14} />
                      ) : n.kind === 'exception' ? (
                        <AlertTriangle size={14} />
                      ) : (
                        <Info size={14} />
                      )}
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="row gap-6">
                        <span className="toast-title">{n.title}</span>
                        {!n.read && <span className="notif-dot" style={{ marginTop: 0 }} />}
                      </div>
                      <div className="toast-msg">{n.body}</div>
                      <div className="faint xs" style={{ marginTop: 3 }}>
                        {timeLabel(n.at)} · {relative(n.at)}
                      </div>
                    </div>
                  </>
                );
                return (
                  <div
                    key={n.id}
                    className={n.read ? '' : 'notif unread'}
                    style={{
                      display: 'flex',
                      gap: 10,
                      padding: '13px 18px',
                      borderBottom: '1px solid var(--line-soft)',
                      alignItems: 'flex-start',
                    }}
                  >
                    {body}
                    <div className="row gap-6">
                      {exists && (
                        <Link href={`/orders?order=${n.orderId}`} onClick={() => markNotificationRead(n.id)}>
                          <Button variant="ghost" size="sm">
                            Open order
                          </Button>
                        </Link>
                      )}
                      {!n.read && (
                        <Button variant="quiet" size="sm" onClick={() => markNotificationRead(n.id)}>
                          Mark read
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
