'use client';

import React, { useMemo, useState } from 'react';
import { Boxes, Package, Plus, Search, TriangleAlert } from 'lucide-react';
import { useStore } from '@/lib/store';
import { naira, nairaShort } from '@/lib/format';
import { Button, EmptyState, Tag } from '@/components/ui';
import { CreateOrderModal } from '@/components/CreateOrderModal';

export default function ProductsPage() {
  const { products, orders } = useStore();
  const [query, setQuery] = useState('');
  const [createOpen, setCreateOpen] = useState(false);

  const rows = useMemo(
    () =>
      products.filter((p) =>
        [p.name, p.sku].join(' ').toLowerCase().includes(query.trim().toLowerCase()),
      ),
    [products, query],
  );

  const stockValue = products.reduce((s, p) => s + p.price * p.stock, 0);
  const lowStock = products.filter((p) => p.stock > 0 && p.stock <= 3).length;
  const soldOut = products.filter((p) => p.stock === 0).length;

  const sold = useMemo(() => {
    const map = new Map<string, number>();
    orders.forEach((o) =>
      o.items.forEach((i) => {
        if (o.status === 'paid' || o.status === 'late_paid') {
          map.set(i.productId, (map.get(i.productId) ?? 0) + i.qty);
        }
      }),
    );
    return map;
  }, [orders]);

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1 className="page-title">Products</h1>
          <p className="page-sub">What you sell, and how much of it is left. The order form reads from here.</p>
        </div>
        <div className="page-actions">
          <Button variant="primary" onClick={() => setCreateOpen(true)}>
            <Plus size={15} /> New payment link
          </Button>
        </div>
      </div>

      <div className="grid-stats" style={{ gridTemplateColumns: 'repeat(3, minmax(0,1fr))' }}>
        <div className="stat">
          <div className="stat-top">
            <span className="stat-label">Stock on hand</span>
            <span className="stat-icon">
              <Boxes size={15} />
            </span>
          </div>
          <div className="stat-value">{naira(stockValue, { compact: true })}</div>
          <div className="stat-foot">{products.reduce((s, p) => s + p.stock, 0)} pieces across {products.length} products</div>
        </div>
        <div className="stat">
          <div className="stat-top">
            <span className="stat-label">Running low</span>
            <span className="stat-icon">
              <TriangleAlert size={15} />
            </span>
          </div>
          <div className="stat-value">{lowStock}</div>
          <div className="stat-foot">Three pieces or fewer left</div>
        </div>
        <div className="stat">
          <div className="stat-top">
            <span className="stat-label">Sold out</span>
            <span className="stat-icon">
              <Package size={15} />
            </span>
          </div>
          <div className="stat-value">{soldOut}</div>
          <div className="stat-foot">Cannot be added to a new link</div>
        </div>
      </div>

      <div className="card">
        <div className="card-head">
          <div className="card-title">Catalogue</div>
          <div className="card-actions">
            <div className="search" style={{ width: 236, height: 32, maxWidth: 'none' }}>
              <Search size={13} color="#98a0ad" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search products…"
                style={{ fontSize: 12.5 }}
                aria-label="Search products"
              />
            </div>
          </div>
        </div>

        {rows.length === 0 ? (
          <EmptyState
            icon={<Search size={18} />}
            title="No product matches that"
            sub="Try the SKU, or clear the search."
            action={
              <Button variant="ghost" onClick={() => setQuery('')}>
                Clear search
              </Button>
            }
          />
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>SKU</th>
                  <th className="r">Price</th>
                  <th>Stock</th>
                  <th className="r">Sold</th>
                  <th>Status</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {rows.map((p) => {
                  const status =
                    p.stock === 0 ? { label: 'Sold out', cls: 'bad' } : p.stock <= 3 ? { label: 'Low stock', cls: 'warn' } : { label: 'In stock', cls: 'good' };
                  return (
                    <tr key={p.id}>
                      <td>
                        <div className="product-cell">
                          <span className="product-thumb">{p.emoji}</span>
                          <span style={{ fontSize: 12.5, fontWeight: 550 }}>{p.name}</span>
                        </div>
                      </td>
                      <td className="mono faint" style={{ fontSize: 11.5 }}>
                        {p.sku}
                      </td>
                      <td className="r tnum strong">{naira(p.price)}</td>
                      <td style={{ minWidth: 130 }}>
                        <div className="row gap-8">
                          <div className="meter" style={{ width: 54 }}>
                            <span style={{ width: `${Math.min(100, (p.stock / 20) * 100)}%` }} />
                          </div>
                          <span className="tnum small">{p.stock}</span>
                        </div>
                      </td>
                      <td className="r tnum muted">{sold.get(p.id) ?? 0}</td>
                      <td>
                        <span className={`chip ${status.cls}`}>{status.label}</span>
                      </td>
                      <td className="r">
                        <Button
                          variant="link"
                          onClick={() => setCreateOpen(true)}
                          title={p.stock === 0 ? 'Sold out products cannot go on a link' : undefined}
                        >
                          Create link
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="row gap-6 faint xs">
        <Tag>Sandbox</Tag>
        Stock levels are local to this demo. In production they sync from your catalogue table.
      </div>

      <CreateOrderModal open={createOpen} onClose={() => setCreateOpen(false)} />
    </div>
  );
}
