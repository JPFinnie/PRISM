'use client';

import { useState } from 'react';
import { PortfolioInput, PortfolioMetrics } from '@/lib/types';

interface Props {
  portfolio: PortfolioInput;
  metrics: PortfolioMetrics;
}

interface HoldingRow {
  symbol: string;
  shares: number;
  price: number;
  costBasis: number;
  marketValue: number;
  costBasisTotal: number;
  unrealizedGL: number;
  unrealizedGLPct: number;
  weight: number;
  assetClass: string;
  sector: string;
}

type SortCol = 'symbol' | 'marketValue' | 'unrealizedGL' | 'unrealizedGLPct' | 'weight';

function fmt(n: number): string {
  if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (Math.abs(n) >= 1_000) return `$${Math.round(n / 1_000).toLocaleString()}K`;
  return `$${Math.round(n).toLocaleString()}`;
}

export default function HoldingsTable({ portfolio, metrics }: Props) {
  const [sort, setSort] = useState<{ col: SortCol; dir: 'asc' | 'desc' }>({
    col: 'weight',
    dir: 'desc',
  });

  const rows: HoldingRow[] = portfolio.holdings.map((h) => {
    const marketValue = h.shares * h.currentPrice;
    const costBasisTotal = h.shares * h.costBasis;
    const unrealizedGL = marketValue - costBasisTotal;
    const unrealizedGLPct = costBasisTotal > 0 ? (unrealizedGL / costBasisTotal) * 100 : 0;
    const weight = metrics.totalValue > 0 ? (marketValue / metrics.totalValue) * 100 : 0;
    return {
      symbol: h.symbol,
      shares: h.shares,
      price: h.currentPrice,
      costBasis: h.costBasis,
      marketValue,
      costBasisTotal,
      unrealizedGL,
      unrealizedGLPct,
      weight,
      assetClass: h.assetClass,
      sector: h.sector,
    };
  });

  /* Sort */
  const sorted = [...rows].sort((a, b) => {
    const mul = sort.dir === 'asc' ? 1 : -1;
    if (sort.col === 'symbol') return mul * a.symbol.localeCompare(b.symbol);
    return mul * ((a[sort.col] as number) - (b[sort.col] as number));
  });

  function toggleSort(col: SortCol) {
    setSort((prev) =>
      prev.col === col
        ? { col, dir: prev.dir === 'asc' ? 'desc' : 'asc' }
        : { col, dir: 'desc' },
    );
  }

  /* Totals */
  const totalMarket = rows.reduce((s, r) => s + r.marketValue, 0);
  const totalCost = rows.reduce((s, r) => s + r.costBasisTotal, 0);
  const totalGL = rows.reduce((s, r) => s + r.unrealizedGL, 0);

  const columns: { key: SortCol; label: string; align: 'left' | 'right' }[] = [
    { key: 'symbol', label: 'Holding', align: 'left' },
    { key: 'marketValue', label: 'Market Value', align: 'right' },
    { key: 'unrealizedGL', label: 'Gain / Loss', align: 'right' },
    { key: 'unrealizedGLPct', label: 'G/L %', align: 'right' },
    { key: 'weight', label: 'Weight', align: 'right' },
  ];

  const arrow = (col: SortCol) =>
    sort.col === col ? (sort.dir === 'asc' ? ' ▲' : ' ▼') : '';

  return (
    <div className="card p-6 reveal">
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <h3
          className="font-semibold text-lg"
          style={{ color: 'var(--text)', marginBottom: 4 }}
        >
          Holdings Breakdown
        </h3>
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
          Per-holding performance, weight, and risk flags
        </p>
      </div>

      {/* Table */}
      <div style={{ overflowX: 'auto' }}>
        <table className="holdings-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              {columns.map((c) => (
                <th
                  key={c.key}
                  onClick={() => toggleSort(c.key)}
                  style={{
                    textAlign: c.align,
                    padding: '10px 12px',
                    fontSize: '.72rem',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '.06em',
                    color: sort.col === c.key ? 'var(--accent)' : 'var(--text-muted)',
                    borderBottom: '1px solid var(--border)',
                    cursor: 'pointer',
                    userSelect: 'none',
                    whiteSpace: 'nowrap',
                    transition: 'color .2s',
                  }}
                >
                  {c.label}{arrow(c.key)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map((r) => {
              const isConcentrated = r.symbol === metrics.mostConcentratedHolding && r.weight > 20;
              const glColor =
                r.unrealizedGL > 0
                  ? 'var(--accent)'
                  : r.unrealizedGL < 0
                    ? 'var(--red)'
                    : 'var(--text-muted)';

              return (
                <tr
                  key={r.symbol}
                  style={{
                    borderLeft: isConcentrated ? '3px solid var(--gold)' : '3px solid transparent',
                  }}
                >
                  <td
                    style={{
                      padding: '10px 12px',
                      fontSize: '.88rem',
                      fontWeight: 600,
                      color: 'var(--text)',
                      borderBottom: '1px solid var(--border)',
                    }}
                  >
                    <span>{r.symbol}</span>
                    <span
                      style={{
                        display: 'block',
                        fontSize: '.72rem',
                        color: 'var(--text-light)',
                        fontWeight: 400,
                      }}
                    >
                      {r.shares} × ${r.price.toFixed(2)}
                    </span>
                  </td>
                  <td
                    style={{
                      padding: '10px 12px',
                      textAlign: 'right',
                      fontSize: '.88rem',
                      fontWeight: 600,
                      color: 'var(--text)',
                      borderBottom: '1px solid var(--border)',
                    }}
                  >
                    {fmt(r.marketValue)}
                  </td>
                  <td
                    style={{
                      padding: '10px 12px',
                      textAlign: 'right',
                      fontSize: '.88rem',
                      fontWeight: 600,
                      color: glColor,
                      borderBottom: '1px solid var(--border)',
                    }}
                  >
                    {r.unrealizedGL >= 0 ? '+' : ''}{fmt(r.unrealizedGL)}
                  </td>
                  <td
                    style={{
                      padding: '10px 12px',
                      textAlign: 'right',
                      fontSize: '.88rem',
                      fontWeight: 600,
                      color: glColor,
                      borderBottom: '1px solid var(--border)',
                    }}
                  >
                    {r.unrealizedGLPct >= 0 ? '+' : ''}{r.unrealizedGLPct.toFixed(1)}%
                  </td>
                  <td
                    style={{
                      padding: '10px 12px',
                      textAlign: 'right',
                      fontSize: '.88rem',
                      borderBottom: '1px solid var(--border)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8 }}>
                      <div
                        style={{
                          width: 48,
                          height: 6,
                          background: 'var(--gray-track)',
                          borderRadius: 3,
                          overflow: 'hidden',
                        }}
                      >
                        <div
                          style={{
                            width: `${Math.min(r.weight, 100)}%`,
                            height: '100%',
                            borderRadius: 3,
                            background: isConcentrated ? 'var(--gold)' : 'var(--accent)',
                          }}
                        />
                      </div>
                      <span
                        style={{
                          fontWeight: 600,
                          color: isConcentrated ? 'var(--gold)' : 'var(--text-secondary)',
                          minWidth: 42,
                        }}
                      >
                        {r.weight.toFixed(1)}%
                      </span>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
          {/* Totals row */}
          <tfoot>
            <tr>
              <td
                style={{
                  padding: '12px 12px',
                  fontSize: '.82rem',
                  fontWeight: 700,
                  color: 'var(--text-muted)',
                  textTransform: 'uppercase',
                  letterSpacing: '.04em',
                  borderTop: '2px solid var(--border)',
                }}
              >
                Total ({rows.length} holdings)
              </td>
              <td
                style={{
                  padding: '12px 12px',
                  textAlign: 'right',
                  fontSize: '.88rem',
                  fontWeight: 700,
                  color: 'var(--text)',
                  borderTop: '2px solid var(--border)',
                }}
              >
                {fmt(totalMarket)}
              </td>
              <td
                style={{
                  padding: '12px 12px',
                  textAlign: 'right',
                  fontSize: '.88rem',
                  fontWeight: 700,
                  color: totalGL >= 0 ? 'var(--accent)' : 'var(--red)',
                  borderTop: '2px solid var(--border)',
                }}
              >
                {totalGL >= 0 ? '+' : ''}{fmt(totalGL)}
              </td>
              <td
                style={{
                  padding: '12px 12px',
                  textAlign: 'right',
                  fontSize: '.88rem',
                  fontWeight: 700,
                  color: totalGL >= 0 ? 'var(--accent)' : 'var(--red)',
                  borderTop: '2px solid var(--border)',
                }}
              >
                {totalCost > 0 ? `${totalGL >= 0 ? '+' : ''}${((totalGL / totalCost) * 100).toFixed(1)}%` : '—'}
              </td>
              <td
                style={{
                  padding: '12px 12px',
                  textAlign: 'right',
                  fontSize: '.82rem',
                  fontWeight: 600,
                  color: 'var(--text-muted)',
                  borderTop: '2px solid var(--border)',
                }}
              >
                {metrics.totalValue > 0
                  ? `${((totalMarket / metrics.totalValue) * 100).toFixed(1)}%`
                  : '—'}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
