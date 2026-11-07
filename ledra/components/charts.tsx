'use client';

import React, { useMemo, useState } from 'react';

/* Everything here is hand-rolled SVG. No chart library, no extra install. */

export interface Point {
  label: string;
  value: number;
}

const smooth = (pts: { x: number; y: number }[]) => {
  if (pts.length < 2) return '';
  let d = `M ${pts[0].x} ${pts[0].y}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] ?? p2;
    const t = 0.18;
    const c1x = p1.x + (p2.x - p0.x) * t;
    const c1y = p1.y + (p2.y - p0.y) * t;
    const c2x = p2.x - (p3.x - p1.x) * t;
    const c2y = p2.y - (p3.y - p1.y) * t;
    d += ` C ${c1x} ${c1y}, ${c2x} ${c2y}, ${p2.x} ${p2.y}`;
  }
  return d;
};

export function AreaChart({
  data,
  height = 200,
  formatter = (n: number) => String(n),
  accent = '#f0522d',
  showGrid = true,
}: {
  data: Point[];
  height?: number;
  formatter?: (n: number) => string;
  accent?: string;
  showGrid?: boolean;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const W = 640;
  const H = height;
  const pad = { top: 18, right: 14, bottom: 26, left: 46 };
  const innerW = W - pad.left - pad.right;
  const innerH = H - pad.top - pad.bottom;

  const { max, pts } = useMemo(() => {
    const values = data.map((d) => d.value);
    const rawMax = Math.max(...values, 1);
    // round the ceiling up so the gridlines look deliberate
    const mag = Math.pow(10, Math.floor(Math.log10(rawMax)));
    const top = Math.ceil(rawMax / (mag / 2)) * (mag / 2) || 1;
    const points = data.map((d, i) => ({
      x: pad.left + (innerW * i) / Math.max(1, data.length - 1),
      y: pad.top + innerH - (innerH * d.value) / top,
    }));
    return { max: top, pts: points };
  }, [data, innerH, innerW, pad.left, pad.top]);

  const line = smooth(pts);
  const area = line ? `${line} L ${pts[pts.length - 1].x} ${pad.top + innerH} L ${pts[0].x} ${pad.top + innerH} Z` : '';
  const gridLines = [0, 0.25, 0.5, 0.75, 1];
  const gid = `grad-${accent.replace('#', '')}`;

  return (
    <div style={{ position: 'relative' }}>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        width="100%"
        style={{ display: 'block', overflow: 'visible' }}
        onMouseLeave={() => setHover(null)}
        onMouseMove={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const x = ((e.clientX - rect.left) / rect.width) * W;
          let best = 0;
          let bestDist = Infinity;
          pts.forEach((p, i) => {
            const d = Math.abs(p.x - x);
            if (d < bestDist) {
              bestDist = d;
              best = i;
            }
          });
          setHover(best);
        }}
      >
        <defs>
          <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={accent} stopOpacity="0.22" />
            <stop offset="100%" stopColor={accent} stopOpacity="0" />
          </linearGradient>
        </defs>

        {showGrid &&
          gridLines.map((g) => {
            const y = pad.top + innerH - innerH * g;
            return (
              <g key={g}>
                <line
                  x1={pad.left}
                  x2={W - pad.right}
                  y1={y}
                  y2={y}
                  stroke="#eff1f4"
                  strokeWidth="1"
                  strokeDasharray={g === 0 ? undefined : '3 4'}
                />
                <text x={pad.left - 10} y={y + 3.5} textAnchor="end" fontSize="10" fill="#98a0ad">
                  {g === 0 ? '₦0' : formatter(max * g)}
                </text>
              </g>
            );
          })}

        {area && <path d={area} fill={`url(#${gid})`} />}
        {line && <path d={line} fill="none" stroke={accent} strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round" />}

        {data.map((d, i) => (
          <text
            key={d.label + i}
            x={pts[i].x}
            y={H - 8}
            textAnchor="middle"
            fontSize="10"
            fill={hover === i ? '#1f2532' : '#98a0ad'}
            fontWeight={hover === i ? 600 : 400}
          >
            {d.label}
          </text>
        ))}

        {hover !== null && (
          <g>
            <line
              x1={pts[hover].x}
              x2={pts[hover].x}
              y1={pad.top}
              y2={pad.top + innerH}
              stroke="#c9ced6"
              strokeWidth="1"
              strokeDasharray="3 3"
            />
            <circle cx={pts[hover].x} cy={pts[hover].y} r="4.5" fill="#fff" stroke={accent} strokeWidth="2.5" />
          </g>
        )}
      </svg>

      {hover !== null && (
        <div
          style={{
            position: 'absolute',
            left: `${(pts[hover].x / W) * 100}%`,
            top: `${(pts[hover].y / H) * 100}%`,
            transform: 'translate(-50%, -140%)',
            background: '#0b0e14',
            color: '#fff',
            padding: '6px 9px',
            borderRadius: 8,
            fontSize: 11.5,
            fontWeight: 600,
            whiteSpace: 'nowrap',
            pointerEvents: 'none',
            boxShadow: '0 8px 20px -10px rgba(0,0,0,.6)',
          }}
        >
          {formatter(data[hover].value)}
          <span style={{ opacity: 0.6, fontWeight: 500, marginLeft: 5 }}>{data[hover].label}</span>
        </div>
      )}
    </div>
  );
}

export function BarChart({
  data,
  height = 170,
  formatter = (n: number) => String(n),
  highlight,
  onSelect,
}: {
  data: Point[];
  height?: number;
  formatter?: (n: number) => string;
  highlight?: number | null;
  onSelect?: (i: number) => void;
}) {
  const max = Math.max(...data.map((d) => d.value), 1);
  const showEvery = data.length > 16 ? 5 : data.length > 10 ? 2 : 1;

  // keep bars from turning into slabs when there are only a few days
  const maxWidth = Math.max(260, data.length * 54);

  return (
    <div style={{ maxWidth, width: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: data.length > 16 ? 3 : 6, height }}>
        {data.map((d, i) => {
          const on = highlight === i;
          const h = Math.max(2, (d.value / max) * 100);
          return (
            <div
              key={d.label + i}
              title={`${d.label}: ${formatter(d.value)}`}
              onClick={() => onSelect?.(i)}
              style={{
                flex: 1,
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'flex-end',
                cursor: onSelect ? 'pointer' : 'default',
              }}
            >
              <div
                style={{
                  height: `${h}%`,
                  background: on ? '#0b0e14' : '#eceef1',
                  borderRadius: 5,
                  transition: 'background .15s, height .4s cubic-bezier(.4,0,.2,1)',
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLDivElement).style.background = on ? '#0b0e14' : '#dfe3e8';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLDivElement).style.background = on ? '#0b0e14' : '#eceef1';
                }}
              />
            </div>
          );
        })}
      </div>
      <div style={{ display: 'flex', gap: data.length > 16 ? 3 : 6, marginTop: 6 }}>
        {data.map((d, i) => (
          <div
            key={d.label + i}
            style={{
              flex: 1,
              textAlign: 'center',
              fontSize: 10,
              color: '#98a0ad',
              visibility: i % showEvery === 0 || i === data.length - 1 ? 'visible' : 'hidden',
              whiteSpace: 'nowrap',
            }}
          >
            {d.label}
          </div>
        ))}
      </div>
    </div>
  );
}

export function Sparkline({
  values,
  width = 90,
  height = 30,
  color = '#f0522d',
}: {
  values: number[];
  width?: number;
  height?: number;
  color?: string;
}) {
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const pts = values.map((v, i) => ({
    x: (width * i) / Math.max(1, values.length - 1),
    y: height - ((v - min) / Math.max(1, max - min)) * (height - 4) - 2,
  }));
  const d = smooth(pts);
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ display: 'block' }}>
      <path d={d} fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

export function HorizontalBars({
  data,
  formatter = (n: number) => String(n),
}: {
  data: { label: string; value: number; color: string }[];
  formatter?: (n: number) => string;
}) {
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>
      {data.map((d) => (
        <div key={d.label} style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          <div className="row-between" style={{ fontSize: 12 }}>
            <span style={{ color: 'var(--ink-700)', fontWeight: 550 }}>{d.label}</span>
            <span className="tnum" style={{ color: 'var(--muted)', fontWeight: 600 }}>
              {formatter(d.value)}
            </span>
          </div>
          <div className="meter" style={{ height: 7 }}>
            <span style={{ width: `${(d.value / max) * 100}%`, background: d.color }} />
          </div>
        </div>
      ))}
    </div>
  );
}
