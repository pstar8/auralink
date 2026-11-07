'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Bell,
  ChevronDown,
  CircleHelp,
  FileText,
  RotateCcw,
  Search,
} from 'lucide-react';
import { BRAND } from '@/lib/config';
import { useStore } from '@/lib/store';
import { relative } from '@/lib/format';
import { Button } from '@/components/ui';

export function Topbar() {
  const { notifications, orders, markAllNotificationsRead, markNotificationRead, resetDemo, toast } = useStore();
  const router = useRouter();
  const [q, setQ] = useState('');
  const [notifOpen, setNotifOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  const unread = notifications.filter((n) => !n.read).length;
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.select();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
        setUserOpen(false);
      }
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, []);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const term = q.trim();
    if (!term) {
      toast({ kind: 'info', title: 'Type something to search', message: 'Try an order ID like ORD-2401 or a customer name.' });
      return;
    }
    router.push(`/orders?q=${encodeURIComponent(term)}`);
    setNotifOpen(false);
  };

  return (
    <header className="topbar">
      <form className="search" onSubmit={submit}>
        <Search size={15} color="var(--ink-600)" />
        <input
          ref={inputRef}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search orders, customers or a Busha reference…"
          aria-label="Search"
        />
        <span className="kbd">⌘K</span>
      </form>

      <div className="topbar-actions" ref={wrapRef}>
        <div style={{ position: 'relative' }}>
          <button className="icon-btn" onClick={() => { setNotifOpen((v) => !v); setUserOpen(false); }} aria-label="Notifications">
            <Bell size={16} />
            {unread > 0 && <span className="dot-live" />}
          </button>
          {notifOpen && (
            <div className="popover">
              <div className="popover-head">
                <div className="card-title" style={{ fontSize: 13 }}>
                  Notifications
                </div>
                {unread > 0 && <span className="chip info no-dot">{unread} new</span>}
                <div style={{ marginLeft: 'auto' }}>
                  <Button variant="link" onClick={markAllNotificationsRead}>
                    Mark all read
                  </Button>
                </div>
              </div>
              <div className="popover-list">
                {notifications.slice(0, 6).map((n) => (
                  <button
                    key={n.id}
                    className={`notif ${n.read ? '' : 'unread'}`}
                    onClick={() => {
                      markNotificationRead(n.id);
                      setNotifOpen(false);
                      if (n.orderId) {
                        const exists = orders.some((o) => o.id === n.orderId);
                        if (exists) router.push(`/orders?q=${encodeURIComponent(n.orderId)}`);
                      }
                    }}
                  >
                    <span className={`notif-dot ${n.read ? 'read' : ''}`} />
                    <span style={{ minWidth: 0 }}>
                      <span className="toast-title" style={{ display: 'block' }}>
                        {n.title}
                      </span>
                      <span className="toast-msg" style={{ display: 'block' }}>
                        {n.body}
                      </span>
                      <span className="faint xs">{relative(n.at)}</span>
                    </span>
                  </button>
                ))}
                {notifications.length === 0 && (
                  <div className="empty" style={{ padding: 28 }}>
                    <div className="empty-title">Nothing yet</div>
                    <div className="empty-sub">Payments and exceptions will show up here.</div>
                  </div>
                )}
              </div>
              <div style={{ padding: 8 }}>
                <Button
                  variant="quiet"
                  block
                  size="sm"
                  onClick={() => {
                    setNotifOpen(false);
                    router.push('/notifications');
                  }}
                >
                  See all notifications
                </Button>
              </div>
            </div>
          )}
        </div>

        <div style={{ position: 'relative' }}>
          <button className="user-chip" onClick={() => { setUserOpen((v) => !v); setNotifOpen(false); }}>
            <span className="avatar">{BRAND.seller.initials}</span>
            <span className="user-meta" style={{ textAlign: 'left' }}>
              <div className="user-name">{BRAND.seller.name}</div>
              <div className="user-role">Seller · {BRAND.seller.city}</div>
            </span>
            <ChevronDown size={14} color="var(--ink-600)" />
          </button>
          {userOpen && (
            <div className="popover" style={{ width: 232 }}>
              <div className="popover-head" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 2 }}>
                <div className="card-title" style={{ fontSize: 13 }}>
                  {BRAND.seller.shop}
                </div>
                <div className="faint xs">{BRAND.seller.name} · {BRAND.seller.city}</div>
              </div>
              <div style={{ padding: 6 }}>
                <button className="nav-item" style={{ width: '100%', border: 'none', background: 'none' }} onClick={() => { setUserOpen(false); resetDemo(); }}>
                  <RotateCcw size={15} />
                  <span>Reset demo data</span>
                </button>
                <Link href="/summary" className="nav-item" onClick={() => setUserOpen(false)}>
                  <FileText size={15} />
                  <span>Lender statement</span>
                </Link>
                <a
                  href="https://docs.busha.io"
                  target="_blank"
                  rel="noreferrer"
                  className="nav-item"
                >
                  <CircleHelp size={15} />
                  <span>Busha docs</span>
                </a>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

