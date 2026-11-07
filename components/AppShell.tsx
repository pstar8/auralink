'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import React from 'react';
import {
  BookOpen,
  Boxes,
  FileText,
  LayoutGrid,
  ShieldCheck,
  ShoppingBag,
} from 'lucide-react';
import { BRAND } from '@/lib/config';
import { useStore } from '@/lib/store';
import { Topbar } from './Topbar';

const NAV = [
  { href: '/', label: 'Dashboard', icon: LayoutGrid },
  { href: '/orders', label: 'Orders', icon: ShoppingBag, badge: 'awaiting' as const },
  { href: '/ledger', label: 'Ledger', icon: BookOpen },
  { href: '/summary', label: 'Statement', icon: FileText },
  { href: '/shield', label: 'Screenshot Shield', icon: ShieldCheck },
];

const NAV2 = [
  { href: '/products', label: 'Products', icon: Boxes },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const { orders, hydrated } = useStore();
  const pathname = usePathname();

  const awaiting = orders.filter((o) => o.status === 'awaiting').length;

  return (
    <div className="shell">
      <aside className="rail">
        <Link href="/" className="brand">
          <span className="brand-mark">
            <LogoGlyph />
          </span>
          <span className="brand-text">
            <div className="brand-name">{BRAND.name}</div>
            <div className="brand-shop">{BRAND.seller.shop}</div>
          </span>
        </Link>

        <nav className="nav">
          {NAV.map((item) => {
            const active = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link key={item.href} href={item.href} className={`nav-item ${active ? 'active' : ''}`}>
                <Icon size={17} strokeWidth={2} />
                <span className="label">{item.label}</span>
                {item.badge === 'awaiting' && awaiting > 0 && <span className="nav-badge">{awaiting}</span>}
              </Link>
            );
          })}

          <div className="nav-label">Catalogue</div>
          {NAV2.map((item) => {
            const active = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link key={item.href} href={item.href} className={`nav-item ${active ? 'active' : ''}`}>
                <Icon size={17} strokeWidth={2} />
                <span className="label">{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </aside>

      <main className="main">
        <Topbar />
        {hydrated ? children : <PageSkeleton />}
      </main>
    </div>
  );
}

function LogoGlyph() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M4 7.5h16M4 12h10.5M4 16.5h7" stroke="white" strokeWidth="2.1" strokeLinecap="round" />
      <circle cx="18.5" cy="16" r="2.6" stroke="#f0522d" strokeWidth="2.1" />
    </svg>
  );
}

function PageSkeleton() {
  return (
    <div className="page">
      <div className="skeleton" style={{ width: 220, height: 26 }} />
      <div className="skeleton" style={{ width: 320, height: 14 }} />
      <div className="grid-stats" style={{ marginTop: 8 }}>
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="skeleton" style={{ height: 108, borderRadius: 18 }} />
        ))}
      </div>
      <div className="skeleton" style={{ height: 300, borderRadius: 18 }} />
      <div className="skeleton" style={{ height: 220, borderRadius: 18 }} />
    </div>
  );
}
