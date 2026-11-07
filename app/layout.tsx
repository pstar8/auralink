import type { Metadata, Viewport } from 'next';
import { StoreProvider } from '@/lib/store';
import { ToastHost } from '@/components/ui';
import './globals.css';

export const metadata: Metadata = {
  title: 'AuraLink — payments that reconcile themselves',
  description:
    'One payment link per order. Naira and USDC land in the same books, and every confirmed payment writes its own ledger line.',
};

export const viewport: Viewport = {
  themeColor: '#f6f7f9',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <StoreProvider>
          {children}
          <ToastHost />
        </StoreProvider>
      </body>
    </html>
  );
}
