'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import PortfolioForm from '@/components/PortfolioForm';
import RecommendationCard from '@/components/RecommendationCard';
import ScenarioChart from '@/components/ScenarioChart';
import LoadingState from '@/components/LoadingState';
import ChatPanel from '@/components/ChatPanel';
import { PortfolioInput, AnalysisResult } from '@/lib/types';

/* ═══════════════════════════════════════════════════
   Helpers
   ═══════════════════════════════════════════════════ */

function fmt(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${Math.round(n / 1_000)}K`;
  return `$${Math.round(n)}`;
}

function pct(n: number): string {
  return `${(n * 100).toFixed(1)}%`;
}

/* ═══════════════════════════════════════════════════
   Header
   ═══════════════════════════════════════════════════ */

function Header({
  theme,
  onToggleTheme,
}: {
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
}) {
  return (
    <header
      className="sticky top-0 z-50"
      style={{
        background: 'var(--surface)',
        borderBottom: '1px solid var(--border)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
      }}
    >
      <div
        className="mx-auto flex items-center justify-between px-6 py-4"
        style={{ maxWidth: 'var(--max-w)' }}
      >
        {/* Left: Logo + title */}
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-lg flex items-center justify-center font-bold text-sm"
            style={{ background: 'var(--accent)', color: '#fff' }}
          >
            NE
          </div>
          <div>
            <p className="font-bold text-base leading-tight" style={{ color: 'var(--text)' }}>
              Nexus Edge
            </p>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              for CIBC Investor&apos;s Edge users
            </p>
          </div>
        </div>

        {/* Right: About link + theme toggle */}
        <div className="flex items-center gap-4">
          <Link
            href="/about"
            className="text-sm font-medium"
            style={{ color: 'var(--text-muted)', transition: 'var(--transition)' }}
          >
            About
          </Link>

          <button
            onClick={onToggleTheme}
            aria-label="Toggle theme"
            className="w-9 h-9 flex items-center justify-center rounded-lg"
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              transition: 'var(--transition)',
            }}
          >
            {theme === 'dark' ? (
              /* Sun icon */
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="5" />
                <line x1="12" y1="1" x2="12" y2="3" />
                <line x1="12" y1="21" x2="12" y2="23" />
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                <line x1="1" y1="12" x2="3" y2="12" />
                <line x1="21" y1="12" x2="23" y2="12" />
                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
              </svg>
            ) : (
              /* Moon icon */
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
              </svg>
            )}
          </button>
        </div>
      </div>
    </header>
  );
}

/* ═══════════════════════════════════════════════════
   Glance Grid (inline)
   ═══════════════════════════════════════════════════ */

function GlanceGrid({ result }: { result: AnalysisResult }) {
  const { metrics, scenarios } = result;
  const baseScenario = scenarios.find((s) => s.name === 'base');
  const goalProb = baseScenario?.goalProbability ?? 0;

  /* SVG ring params */
  const R = 54;
  const CX = 64;
  const CY = 64;
  const STROKE = 10;
  const CIRC = 2 * Math.PI * R;

  /* Goal progress color */
  const goalColor =
    goalProb >= 70 ? 'var(--accent)' : goalProb >= 40 ? 'var(--gold)' : 'var(--red)';

  /* Allocation segments */
  const eqPct = metrics.currentAllocation.equityPct;
  const fiPct = metrics.currentAllocation.fixedIncomePct;
  const caPct = metrics.currentAllocation.cashPct;

  /* Savings rate */
  const sr = metrics.savingsRate;
  const srDisplay = sr !== null ? `${(sr * 100).toFixed(0)}%` : 'N/A';
  const srColor =
    sr === null
      ? 'var(--text-muted)'
      : sr >= 0.2
        ? 'var(--accent)'
        : sr >= 0.1
          ? 'var(--gold)'
          : 'var(--red)';
  const srBarClass = sr === null ? '' : sr >= 0.2 ? 'green' : sr >= 0.1 ? 'gold' : 'red';
  const srBarWidth = sr !== null ? Math.min(sr * 100 * 2, 100) : 0; /* 50% savings = 100% bar */

  /* Liquidity ratio */
  const lr = metrics.liquidityRatio;
  const lrDisplay = lr !== null ? lr.toFixed(1) : 'N/A';
  const lrColor =
    lr === null
      ? 'var(--text-muted)'
      : lr >= 6
        ? 'var(--accent)'
        : lr >= 3
          ? 'var(--gold)'
          : 'var(--red)';
  const lrBarClass = lr === null ? '' : lr >= 6 ? 'green' : lr >= 3 ? 'gold' : 'red';
  const lrBarWidth = lr !== null ? Math.min((lr / 12) * 100, 100) : 0;

  /* Allocation donut segments */
  const eqLen = (eqPct / 100) * CIRC;
  const fiLen = (fiPct / 100) * CIRC;
  const caLen = (caPct / 100) * CIRC;

  const eqOffset = 0;
  const fiOffset = -eqLen;
  const caOffset = -(eqLen + fiLen);

  return (
    <div className="glance-grid">
      {/* --- Goal Progress --- */}
      <div className="card glance-card">
        <svg width="128" height="128" viewBox="0 0 128 128">
          {/* Track */}
          <circle
            cx={CX}
            cy={CY}
            r={R}
            fill="none"
            stroke="var(--gray-track)"
            strokeWidth={STROKE}
          />
          {/* Progress */}
          <circle
            cx={CX}
            cy={CY}
            r={R}
            fill="none"
            stroke={goalColor}
            strokeWidth={STROKE}
            strokeLinecap="round"
            strokeDasharray={CIRC}
            strokeDashoffset={CIRC - (goalProb / 100) * CIRC}
            transform={`rotate(-90 ${CX} ${CY})`}
            style={{ transition: 'stroke-dashoffset 1s ease' }}
          />
          {/* Center text */}
          <text
            x={CX}
            y={CY - 2}
            textAnchor="middle"
            dominantBaseline="central"
            className="ring-center-text"
            fontSize="22"
          >
            {Math.round(goalProb)}%
          </text>
          <text
            x={CX}
            y={CY + 18}
            textAnchor="middle"
            dominantBaseline="central"
            className="ring-label-text"
            fontSize="10"
          >
            probability
          </text>
        </svg>
        <p className="glance-label">Goal Progress</p>
      </div>

      {/* --- Portfolio Allocation --- */}
      <div className="card glance-card">
        <svg width="128" height="128" viewBox="0 0 128 128">
          {/* Track */}
          <circle
            cx={CX}
            cy={CY}
            r={R}
            fill="none"
            stroke="var(--gray-track)"
            strokeWidth={STROKE}
          />
          {/* Equity segment */}
          <circle
            cx={CX}
            cy={CY}
            r={R}
            fill="none"
            stroke="var(--accent)"
            strokeWidth={STROKE}
            strokeDasharray={`${eqLen} ${CIRC - eqLen}`}
            strokeDashoffset={eqOffset}
            transform={`rotate(-90 ${CX} ${CY})`}
            style={{ transition: 'stroke-dasharray 1s ease' }}
          />
          {/* Fixed Income segment */}
          <circle
            cx={CX}
            cy={CY}
            r={R}
            fill="none"
            stroke="var(--blue)"
            strokeWidth={STROKE}
            strokeDasharray={`${fiLen} ${CIRC - fiLen}`}
            strokeDashoffset={fiOffset}
            transform={`rotate(-90 ${CX} ${CY})`}
            style={{ transition: 'stroke-dasharray 1s ease' }}
          />
          {/* Cash segment */}
          <circle
            cx={CX}
            cy={CY}
            r={R}
            fill="none"
            stroke="var(--text-light)"
            strokeWidth={STROKE}
            strokeDasharray={`${caLen} ${CIRC - caLen}`}
            strokeDashoffset={caOffset}
            transform={`rotate(-90 ${CX} ${CY})`}
            style={{ transition: 'stroke-dasharray 1s ease' }}
          />
        </svg>
        {/* Legend */}
        <div className="flex items-center gap-4 mt-2" style={{ fontSize: '.72rem', color: 'var(--text-muted)' }}>
          <span className="flex items-center gap-1">
            <span className="inline-block w-2 h-2 rounded-full" style={{ background: 'var(--accent)' }} />
            Equity {Math.round(eqPct)}%
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-2 h-2 rounded-full" style={{ background: 'var(--blue)' }} />
            Fixed {Math.round(fiPct)}%
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-2 h-2 rounded-full" style={{ background: 'var(--text-light)' }} />
            Cash {Math.round(caPct)}%
          </span>
        </div>
        <p className="glance-label">Portfolio Allocation</p>
      </div>

      {/* --- Savings Rate --- */}
      <div className="card glance-card">
        <p className="glance-value" style={{ color: srColor, fontSize: '2rem' }}>
          {srDisplay}
        </p>
        {sr !== null && (
          <p className="mt-1" style={{ fontSize: '.78rem', color: 'var(--text-muted)' }}>
            of income
          </p>
        )}
        <div className="metric-bar-track" style={{ marginTop: 14, width: '100%', maxWidth: 160 }}>
          <div
            className={`metric-bar-fill ${srBarClass}`}
            style={{ width: `${srBarWidth}%` }}
          />
        </div>
        <p className="glance-label">Savings Rate</p>
      </div>

      {/* --- Liquidity Ratio --- */}
      <div className="card glance-card">
        <p className="glance-value" style={{ color: lrColor, fontSize: '2rem' }}>
          {lrDisplay}
        </p>
        {lr !== null && (
          <p className="mt-1" style={{ fontSize: '.78rem', color: 'var(--text-muted)' }}>
            months
          </p>
        )}
        <div className="metric-bar-track" style={{ marginTop: 14, width: '100%', maxWidth: 160 }}>
          <div
            className={`metric-bar-fill ${lrBarClass}`}
            style={{ width: `${lrBarWidth}%` }}
          />
        </div>
        <p className="glance-label">Liquidity Ratio</p>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   Action Comparison (inline)
   ═══════════════════════════════════════════════════ */

function ActionComparison({ actions }: { actions: AnalysisResult['allActions'] }) {
  return (
    <div>
      <p className="section-label">Action Comparison</p>
      <p className="section-sub" style={{ marginBottom: 16 }}>
        All evaluated actions ranked by composite score
      </p>
      <div className="card" style={{ padding: '20px 28px' }}>
        {actions.map((action, i) => (
          <div key={action.type + i} className={`action-row ${i === 0 ? 'top-action' : ''}`}>
            <span className="action-name">
              {i === 0 && '\u2B50 '}{action.title}
            </span>
            <div className="action-bar-track">
              <div
                className="action-bar-fill"
                style={{ width: `${action.score}%` }}
              />
            </div>
            <span className="action-score">{action.score}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   AI Analysis Detail (collapsible, inline)
   ═══════════════════════════════════════════════════ */

function AIAnalysisDetail({ result }: { result: AnalysisResult }) {
  const [expanded, setExpanded] = useState(false);
  const { allActions, metrics } = result;

  const alternativeText =
    allActions.length > 2
      ? `Other considered actions include "${allActions[1]?.title}" (score ${allActions[1]?.score}) and "${allActions[2]?.title}" (score ${allActions[2]?.score}). These scored lower due to less favorable risk-adjusted expected value.`
      : allActions.length > 1
        ? `Another considered action was "${allActions[1]?.title}" (score ${allActions[1]?.score}), which scored lower due to less favorable risk-adjusted expected value.`
        : 'No alternative actions were evaluated.';

  const hasLosses = metrics.positionsInLoss.length > 0;

  return (
    <div>
      <div className="detail-toggle">
        <p className="section-label" style={{ margin: 0 }}>AI Analysis Detail</p>
        <button
          onClick={() => setExpanded(!expanded)}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--accent)',
            fontSize: '.85rem',
            fontWeight: 600,
            cursor: 'pointer',
            fontFamily: 'var(--font)',
          }}
        >
          {expanded ? 'Hide analysis' : 'Show analysis'}
        </button>
      </div>
      <div className={`detail-content ${expanded ? 'expanded' : 'collapsed'}`}>
        <div className="detail-grid">
          <div className="detail-block">
            <p className="detail-block-title">Tradeoffs</p>
            <p className="detail-block-content">
              No significant tradeoffs identified for this action.
            </p>
          </div>
          <div className="detail-block">
            <p className="detail-block-title">What Wasn&apos;t Recommended</p>
            <p className="detail-block-content">{alternativeText}</p>
          </div>
          <div className="detail-block">
            <p className="detail-block-title">Risk Warnings</p>
            <div className="detail-block-content">
              {hasLosses ? (
                <ul style={{ paddingLeft: 16, margin: 0 }}>
                  {metrics.positionsInLoss.map((pos) => (
                    <li key={pos.symbol} style={{ marginBottom: 4 }}>
                      {pos.symbol}: {fmt(pos.unrealizedLoss)} ({pos.lossPercent.toFixed(1)}% loss)
                    </li>
                  ))}
                </ul>
              ) : (
                <p>No risk warnings at this time.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   Main Page
   ═══════════════════════════════════════════════════ */

export default function HomePage() {
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [portfolio, setPortfolio] = useState<PortfolioInput | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [toast, setToast] = useState<string | null>(null);

  const actionCompRef = useRef<HTMLDivElement>(null);

  /* ── Theme persistence ── */
  useEffect(() => {
    const saved = localStorage.getItem('nexus-theme') as 'dark' | 'light' | null;
    if (saved === 'dark' || saved === 'light') {
      setTheme(saved);
      document.documentElement.className = saved;
    } else {
      document.documentElement.className = 'dark';
    }
  }, []);

  function toggleTheme() {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    document.documentElement.className = next;
    localStorage.setItem('nexus-theme', next);
  }

  /* ── Toast auto-clear ── */
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(timer);
  }, [toast]);

  /* ── Analysis handler ── */
  async function handleAnalyze(input: PortfolioInput) {
    setPortfolio(input);
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ portfolio: input }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Analysis failed');
      setResult(data as AnalysisResult);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }

  /* ── Re-analyse with existing portfolio ── */
  function handleReanalyze() {
    if (portfolio) handleAnalyze(portfolio);
  }

  return (
    <>
      <Header theme={theme} onToggleTheme={toggleTheme} />

      <main
        className="mx-auto px-5 py-8"
        style={{ maxWidth: 'var(--max-w)' }}
      >
        {/* ═══ HERO + FORM (no result, not loading) ═══ */}
        {!result && !loading && (
          <div className="space-y-8">
            <div className="text-center py-6 fade-up">
              <h1
                className="text-2xl sm:text-3xl font-extrabold mb-3"
                style={{ color: 'var(--text)', letterSpacing: '-0.02em' }}
              >
                What&apos;s your #1 financial move this month?
              </h1>
              <p
                className="text-sm sm:text-base mx-auto"
                style={{ color: 'var(--text-muted)', maxWidth: 540, lineHeight: 1.7 }}
              >
                Enter your portfolio details and our engine scores every possible action
                &mdash; from tax-loss harvesting to TFSA optimisation &mdash; and surfaces
                the single highest-expected-value move.
              </p>
            </div>
            <PortfolioForm onAnalyze={handleAnalyze} />
          </div>
        )}

        {/* ═══ LOADING ═══ */}
        {loading && <LoadingState />}

        {/* ═══ ERROR ═══ */}
        {error && (
          <div className="card fade-up" style={{ padding: 32, textAlign: 'center' }}>
            <p className="font-medium mb-3" style={{ color: 'var(--red)' }}>{error}</p>
            <button
              onClick={() => setError(null)}
              className="btn-ghost"
              style={{ fontSize: '.85rem' }}
            >
              Try again
            </button>
          </div>
        )}

        {/* ═══ RESULTS ═══ */}
        {result && !loading && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
            {/* 1. Profile Bar */}
            <div className="card reveal" style={{ padding: '18px 24px' }}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm" style={{ color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                  <span className="font-semibold" style={{ color: 'var(--text)' }}>
                    {fmt(result.metrics.totalValue)}
                  </span>{' '}
                  portfolio{' '}
                  <span style={{ color: 'var(--text-light)' }}>&middot;</span>{' '}
                  {portfolio?.riskTolerance} risk{' '}
                  <span style={{ color: 'var(--text-light)' }}>&middot;</span>{' '}
                  <span className="font-semibold" style={{ color: 'var(--text)' }}>
                    {fmt(portfolio?.goal.targetAmount ?? 0)}
                  </span>{' '}
                  {portfolio?.goal.description} in {portfolio?.goal.yearsToGoal}yr
                </p>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => {
                      setResult(null);
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--accent)',
                      fontSize: '.84rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      fontFamily: 'var(--font)',
                    }}
                  >
                    Edit profile
                  </button>
                  <button className="btn-primary" onClick={handleReanalyze} style={{ padding: '8px 18px', fontSize: '.82rem' }}>
                    Re-analyse
                  </button>
                </div>
              </div>
            </div>

            {/* 2. Recommendation Card */}
            <div className="reveal">
              <RecommendationCard
                aiInsight={result.aiInsight}
                topAction={result.topAction}
                allActions={result.allActions}
              />
            </div>

            {/* 3. Decision Controls */}
            <div className="reveal flex flex-wrap items-center gap-3">
              <button
                className="btn-primary"
                onClick={() =>
                  setToast(
                    'Action approved. In production this would initiate a workflow.',
                  )
                }
              >
                Approve Action
              </button>
              <button
                className="btn-outline"
                onClick={() => {
                  actionCompRef.current?.scrollIntoView({ behavior: 'smooth' });
                }}
              >
                Explore Alternatives
              </button>
              <button
                className="btn-ghost"
                onClick={() =>
                  setToast("Decision deferred. We'll re-evaluate next month.")
                }
              >
                Defer Decision
              </button>
            </div>

            {/* 4. At a Glance */}
            <div className="reveal">
              <GlanceGrid result={result} />
            </div>

            {/* 5. Scenario Chart */}
            <div className="reveal">
              <ScenarioChart
                scenarios={result.scenarios}
                goalAmount={portfolio?.goal.targetAmount ?? 0}
                yearsToGoal={
                  portfolio?.goal.yearsToGoal ??
                  (result.scenarios[0]?.yearByYearValues.length - 1)
                }
              />
            </div>

            {/* 6. Action Comparison */}
            <div className="reveal" ref={actionCompRef}>
              <ActionComparison actions={result.allActions} />
            </div>

            {/* 7. AI Analysis Detail */}
            <div className="reveal">
              <AIAnalysisDetail result={result} />
            </div>

            {/* 8. Chat Panel */}
            {portfolio && (
              <div className="reveal">
                <ChatPanel analysis={result} portfolio={portfolio} />
              </div>
            )}

            {/* 9. Guardrails */}
            <div className="reveal">
              <div className="guardrails">
                <p style={{ marginBottom: 10 }}>
                  Nexus Edge provides analysis for informational purposes only. This is not
                  financial advice. All projections are estimates based on historical data and
                  assumptions that may not reflect future performance. Always consult a
                  qualified financial advisor before making investment decisions.
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="badge badge-green">AI-Powered</span>
                  <span className="badge badge-blue">Simulation-Based</span>
                  <span className="badge badge-gold">Not Financial Advice</span>
                </div>
              </div>
            </div>

            {/* 10. Reset link */}
            <div className="reveal text-center" style={{ paddingBottom: 24 }}>
              <button
                onClick={() => {
                  setResult(null);
                  setPortfolio(null);
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--accent)',
                  fontSize: '.85rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontFamily: 'var(--font)',
                  textDecoration: 'underline',
                  textUnderlineOffset: '3px',
                }}
              >
                &larr; Analyse a different portfolio
              </button>
            </div>
          </div>
        )}
      </main>

      {/* ═══ TOAST ═══ */}
      {toast && <div className="toast">{toast}</div>}
    </>
  );
}
