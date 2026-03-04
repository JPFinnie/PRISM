'use client';

import { RebalanceTrade } from '@/lib/types';

interface Props {
  trades: RebalanceTrade[];
}

function fmt(n: number): string {
  if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (Math.abs(n) >= 1_000) return `$${Math.round(n / 1_000).toLocaleString()}K`;
  return `$${Math.round(n).toLocaleString()}`;
}

export default function RebalanceWorksheet({ trades }: Props) {
  const sells = trades.filter(t => t.action === 'SELL');
  const buys = trades.filter(t => t.action === 'BUY');
  const holds = trades.filter(t => t.action === 'HOLD');

  const totalSell = sells.reduce((s, t) => s + Math.abs(t.deltaValue), 0);
  const totalBuy = buys.reduce((s, t) => s + t.deltaValue, 0);
  const netDeploy = totalBuy - totalSell;

  const activeTrades = trades.filter(t => t.action !== 'HOLD');

  return (
    <div className="card p-6 reveal">
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <h3
          className="font-semibold text-lg"
          style={{ color: 'var(--text)', marginBottom: 4 }}
        >
          Rebalancing Worksheet
        </h3>
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
          Concrete trades to reach your target allocation
        </p>
      </div>

      {/* Summary line */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 8,
          marginBottom: 20,
        }}
      >
        {sells.length > 0 && (
          <span className="badge badge-red">
            {sells.length} sell{sells.length > 1 ? 's' : ''} · {fmt(totalSell)}
          </span>
        )}
        {buys.length > 0 && (
          <span className="badge badge-green">
            {buys.length} buy{buys.length > 1 ? 's' : ''} · {fmt(totalBuy)}
          </span>
        )}
        <span className="badge badge-blue">
          {netDeploy >= 0 ? '+' : ''}{fmt(netDeploy)} net deployment
        </span>
      </div>

      {/* Trade rows */}
      {activeTrades.length > 0 ? (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {['Symbol', 'Action', 'Shares', 'Value', 'Reason'].map((h) => (
                  <th
                    key={h}
                    style={{
                      textAlign: h === 'Reason' ? 'left' : h === 'Symbol' ? 'left' : 'right',
                      padding: '10px 12px',
                      fontSize: '.72rem',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      letterSpacing: '.06em',
                      color: 'var(--text-muted)',
                      borderBottom: '1px solid var(--border)',
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {activeTrades.map((t) => (
                <tr key={t.symbol + t.action}>
                  <td
                    style={{
                      padding: '10px 12px',
                      fontSize: '.88rem',
                      fontWeight: 600,
                      color: 'var(--text)',
                      borderBottom: '1px solid var(--border)',
                    }}
                  >
                    {t.symbol}
                  </td>
                  <td
                    style={{
                      padding: '10px 12px',
                      textAlign: 'right',
                      borderBottom: '1px solid var(--border)',
                    }}
                  >
                    <span
                      style={{
                        display: 'inline-block',
                        padding: '3px 10px',
                        borderRadius: 12,
                        fontSize: '.75rem',
                        fontWeight: 700,
                        background: t.action === 'BUY' ? 'var(--accent-bg)' : 'var(--red-bg)',
                        color: t.action === 'BUY' ? 'var(--accent)' : 'var(--red)',
                      }}
                    >
                      {t.action}
                    </span>
                  </td>
                  <td
                    style={{
                      padding: '10px 12px',
                      textAlign: 'right',
                      fontSize: '.88rem',
                      fontWeight: 600,
                      color: t.action === 'BUY' ? 'var(--accent)' : 'var(--red)',
                      borderBottom: '1px solid var(--border)',
                    }}
                  >
                    {t.deltaShares > 0 ? '+' : ''}{t.deltaShares}
                  </td>
                  <td
                    style={{
                      padding: '10px 12px',
                      textAlign: 'right',
                      fontSize: '.88rem',
                      fontWeight: 600,
                      color: t.deltaValue >= 0 ? 'var(--accent)' : 'var(--red)',
                      borderBottom: '1px solid var(--border)',
                    }}
                  >
                    {t.deltaValue >= 0 ? '+' : ''}{fmt(t.deltaValue)}
                  </td>
                  <td
                    style={{
                      padding: '10px 12px',
                      fontSize: '.82rem',
                      color: 'var(--text-muted)',
                      borderBottom: '1px solid var(--border)',
                      maxWidth: 240,
                    }}
                  >
                    {t.reason}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p style={{ fontSize: '.88rem', color: 'var(--text-muted)', padding: '16px 0' }}>
          No trades needed — your portfolio is balanced within target ranges.
        </p>
      )}

      {/* Holds */}
      {holds.length > 0 && (
        <p
          style={{
            fontSize: '.78rem',
            color: 'var(--text-light)',
            marginTop: 16,
            paddingTop: 12,
            borderTop: '1px solid var(--border)',
          }}
        >
          {holds.length} position{holds.length > 1 ? 's' : ''} held unchanged:{' '}
          {holds.map(h => h.symbol).join(', ')}
        </p>
      )}
    </div>
  );
}
