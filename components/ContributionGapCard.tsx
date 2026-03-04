'use client';

import { useState, useMemo } from 'react';
import { PortfolioInput, PortfolioMetrics, ContributionGap } from '@/lib/types';
import { computeContributionGap } from '@/lib/financial-engine';

interface Props {
  portfolio: PortfolioInput;
  metrics: PortfolioMetrics;
}

function fmt(n: number): string {
  if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (Math.abs(n) >= 1_000) return `$${Math.round(n / 1_000).toLocaleString()}K`;
  return `$${Math.round(n).toLocaleString()}`;
}

export default function ContributionGapCard({ portfolio, metrics }: Props) {
  const [targetProb, setTargetProb] = useState(75);

  const gap: ContributionGap = useMemo(
    () => computeContributionGap(portfolio, metrics, targetProb),
    [portfolio, metrics, targetProb],
  );

  const barWidth =
    gap.requiredMonthly > 0
      ? Math.min((gap.currentMonthly / gap.requiredMonthly) * 100, 100)
      : 100;

  return (
    <div className="card p-6 reveal">
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <h3
          className="font-semibold text-lg"
          style={{ color: 'var(--text)', marginBottom: 4 }}
        >
          Contribution Gap
        </h3>
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
          Are your contributions sufficient to reach your goal?
        </p>
      </div>

      {/* Probability selector */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 24 }}>
        <span
          style={{
            fontSize: '.72rem',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '.06em',
            color: 'var(--text-muted)',
          }}
        >
          Target Probability:
        </span>
        {[50, 75, 90].map(p => (
          <button
            key={p}
            onClick={() => setTargetProb(p)}
            style={{
              padding: '5px 14px',
              borderRadius: 20,
              fontSize: '.82rem',
              fontWeight: 600,
              border: '1px solid',
              borderColor: targetProb === p ? 'var(--accent)' : 'var(--border)',
              background: targetProb === p ? 'var(--accent-bg)' : 'transparent',
              color: targetProb === p ? 'var(--accent)' : 'var(--text-muted)',
              cursor: 'pointer',
              transition: 'all .2s',
              fontFamily: 'var(--font)',
            }}
          >
            {p}%
          </button>
        ))}
      </div>

      {/* Main result */}
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        {gap.isOnTrack ? (
          <>
            <p style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--accent)', marginBottom: 4 }}>
              You&apos;re on track! ✓
            </p>
            <p style={{ fontSize: '.88rem', color: 'var(--text-muted)' }}>
              Your {fmt(gap.currentMonthly)}/mo exceeds the required {fmt(gap.requiredMonthly)}/mo by{' '}
              <strong style={{ color: 'var(--accent)' }}>{fmt(Math.abs(gap.gap))}/mo surplus</strong>
            </p>
          </>
        ) : (
          <>
            <p style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>
              You need <span style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--red)' }}>{fmt(gap.requiredMonthly)}/mo</span>
            </p>
            <p style={{ fontSize: '.88rem', color: 'var(--text-muted)' }}>
              Current: {fmt(gap.currentMonthly)}/mo · Shortfall:{' '}
              <strong style={{ color: 'var(--red)' }}>{fmt(gap.gap)}/mo</strong>
            </p>
          </>
        )}
      </div>

      {/* Progress bar */}
      <div style={{ marginBottom: 12 }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: '.72rem',
            fontWeight: 600,
            color: 'var(--text-muted)',
            marginBottom: 6,
          }}
        >
          <span>Current contribution</span>
          <span>Required contribution</span>
        </div>
        <div
          style={{
            width: '100%',
            height: 12,
            background: 'var(--gray-track)',
            borderRadius: 6,
            overflow: 'hidden',
            position: 'relative',
          }}
        >
          <div
            style={{
              width: `${barWidth}%`,
              height: '100%',
              borderRadius: 6,
              background: gap.isOnTrack ? 'var(--accent)' : 'var(--red)',
              transition: 'width .6s ease, background .3s',
            }}
          />
        </div>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: '.78rem',
            fontWeight: 700,
            marginTop: 6,
          }}
        >
          <span style={{ color: gap.isOnTrack ? 'var(--accent)' : 'var(--text-secondary)' }}>
            {fmt(gap.currentMonthly)}/mo
          </span>
          <span style={{ color: 'var(--text-muted)' }}>
            {fmt(gap.requiredMonthly)}/mo
          </span>
        </div>
      </div>

      {/* Footnote */}
      <p
        style={{
          fontSize: '.75rem',
          color: 'var(--text-light)',
          lineHeight: 1.55,
          marginTop: 16,
          paddingTop: 12,
          borderTop: '1px solid var(--border)',
        }}
      >
        Based on {(targetProb)}% target probability using risk-adjusted returns for your {portfolio.riskTolerance} profile.
        Actual returns will vary.
      </p>
    </div>
  );
}
