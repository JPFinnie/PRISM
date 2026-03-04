'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import Link from 'next/link';
import PortfolioForm from '@/components/PortfolioForm';
import RecommendationCard from '@/components/RecommendationCard';
import ScenarioChart from '@/components/ScenarioChart';
import HoldingsTable from '@/components/HoldingsTable';
import RebalanceWorksheet from '@/components/RebalanceWorksheet';
import MonteCarloChart from '@/components/MonteCarloChart';
import ContributionGapCard from '@/components/ContributionGapCard';
import LoadingState from '@/components/LoadingState';
import ChatPanel from '@/components/ChatPanel';
import { PortfolioInput, AnalysisResult, ScenarioProjection, RiskTolerance } from '@/lib/types';
import {
  projectCustomScenario,
  computeMetrics,
  scoreActions,
  projectScenarios,
  computeTradeoffs,
  generateRebalanceTrades,
  runMonteCarlo,
} from '@/lib/financial-engine';
import { generatePDF } from '@/lib/pdf-export';

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

/* CSV export helper */
function exportCSV(result: AnalysisResult, portfolio: PortfolioInput | null) {
  const rows: string[][] = [];
  const esc = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;

  /* Section: Summary */
  rows.push(['PORTFOLIO SUMMARY']);
  rows.push(['Total Value', `$${Math.round(result.metrics.totalValue).toLocaleString()}`]);
  rows.push(['Unrealized G/L', `$${Math.round(result.metrics.unrealizedGainLoss).toLocaleString()}`]);
  rows.push(['Equity %', `${result.metrics.currentAllocation.equityPct.toFixed(1)}%`]);
  rows.push(['Fixed Income %', `${result.metrics.currentAllocation.fixedIncomePct.toFixed(1)}%`]);
  rows.push(['Cash %', `${result.metrics.currentAllocation.cashPct.toFixed(1)}%`]);
  if (result.metrics.savingsRate !== null) rows.push(['Savings Rate', `${(result.metrics.savingsRate * 100).toFixed(1)}%`]);
  if (result.metrics.liquidityRatio !== null) rows.push(['Liquidity Ratio', `${result.metrics.liquidityRatio.toFixed(1)} months`]);
  rows.push([]);

  /* Section: Scored Actions */
  rows.push(['SCORED ACTIONS']);
  rows.push(['Rank', 'Action', 'Score', 'Urgency', 'Est. Annual Benefit']);
  result.allActions.forEach((a, i) => {
    rows.push([String(i + 1), a.title, String(a.score), a.urgency, `$${a.estimatedAnnualBenefit.toLocaleString()}`]);
  });
  rows.push([]);

  /* Section: Top Recommendation */
  rows.push(['TOP RECOMMENDATION']);
  rows.push(['Action', result.topAction.title]);
  rows.push(['Score', String(result.topAction.score)]);
  rows.push(['Rationale', result.topAction.rationale]);
  rows.push(['AI Headline', result.aiInsight.headline]);
  rows.push([]);

  /* Section: Scenario Projections */
  rows.push(['SCENARIO PROJECTIONS']);
  const years = result.scenarios[0]?.yearByYearValues.length ?? 0;
  const header = ['Year', ...result.scenarios.map(s => s.label)];
  rows.push(header);
  for (let y = 0; y < years; y++) {
    rows.push([String(y), ...result.scenarios.map(s => `$${s.yearByYearValues[y]?.toLocaleString() ?? '0'}`)]);
  }
  rows.push([]);
  rows.push(['Scenario', 'Final Value', 'Goal Probability']);
  result.scenarios.forEach(s => {
    rows.push([s.label, `$${Math.round(s.finalValue).toLocaleString()}`, `${s.goalProbability}%`]);
  });

  /* Section: Holdings */
  if (portfolio) {
    rows.push([]);
    rows.push(['HOLDINGS']);
    rows.push(['Symbol', 'Shares', 'Current Price', 'Cost Basis', 'Asset Class', 'Sector']);
    portfolio.holdings.forEach(h => {
      rows.push([h.symbol, String(h.shares), `$${h.currentPrice}`, `$${h.costBasis}`, h.assetClass, h.sector]);
    });
  }

  const csvContent = rows.map(row => row.map(esc).join(',')).join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `prism-analysis-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
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
            P
          </div>
          <div>
            <p className="font-bold text-base leading-tight" style={{ color: 'var(--text)' }}>
              Prism
            </p>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              Portfolio Intelligence
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

function ActionComparison({
  actions,
  metrics,
  portfolio,
}: {
  actions: AnalysisResult['allActions'];
  metrics: AnalysisResult['metrics'];
  portfolio: PortfolioInput | null;
}) {
  const [expanded, setExpanded] = useState<string | null>(null);

  function fmtBenefit(n: number): string {
    if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `$${Math.round(n / 1_000)}K`;
    if (n > 0) return `$${n}`;
    return '—';
  }

  return (
    <div>
      <p className="section-label">Action Comparison</p>
      <p className="section-sub" style={{ marginBottom: 16 }}>
        All evaluated actions ranked by composite score — click to expand
      </p>
      <div className="card" style={{ padding: '20px 28px' }}>
        {actions.map((action, i) => {
          const isExpanded = expanded === action.type;
          const tradeoffs = portfolio ? computeTradeoffs(action, metrics, portfolio) : [];

          return (
            <div key={action.type + i}>
              <div
                className={`action-row ${i === 0 ? 'top-action' : ''}`}
                onClick={() => setExpanded(isExpanded ? null : action.type)}
                style={{ cursor: 'pointer' }}
              >
                <span className="action-name">
                  {i === 0 && '\u2B50 '}{action.title}
                  <span style={{ fontSize: '.72rem', color: 'var(--text-light)', marginLeft: 6 }}>
                    {isExpanded ? '▾' : '▸'}
                  </span>
                </span>
                <div className="action-bar-track">
                  <div
                    className="action-bar-fill"
                    style={{ width: `${action.score}%` }}
                  />
                </div>
                <span className="action-score">{action.score}</span>
              </div>

              {/* Expanded panel */}
              <div
                style={{
                  maxHeight: isExpanded ? 600 : 0,
                  opacity: isExpanded ? 1 : 0,
                  overflow: 'hidden',
                  transition: 'max-height .35s ease, opacity .25s ease',
                }}
              >
                <div
                  style={{
                    padding: '16px 14px 20px',
                    marginBottom: 8,
                    background: 'var(--surface)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-sm)',
                  }}
                >
                  {/* Rationale */}
                  <p style={{ fontSize: '.88rem', color: 'var(--text-secondary)', lineHeight: 1.65, marginBottom: 14 }}>
                    {action.rationale}
                  </p>

                  {/* Badges */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 14 }}>
                    <span className={`badge ${action.urgency === 'high' ? 'badge-red' : action.urgency === 'medium' ? 'badge-gold' : 'badge-blue'}`}>
                      {action.urgency} urgency
                    </span>
                    {action.estimatedAnnualBenefit > 0 && (
                      <span className="badge badge-green">
                        +{fmtBenefit(action.estimatedAnnualBenefit)}/yr benefit
                      </span>
                    )}
                  </div>

                  {/* Action details */}
                  {Object.keys(action.actionDetails).length > 0 && (
                    <div style={{ marginBottom: 14 }}>
                      <p style={{ fontSize: '.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--text-muted)', marginBottom: 8 }}>
                        Details
                      </p>
                      <div className="form-grid-2col" style={{ gap: '6px 16px' }}>
                        {Object.entries(action.actionDetails).map(([key, val]) => (
                          <div key={key} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '.82rem', padding: '4px 0', borderBottom: '1px solid var(--border)' }}>
                            <span style={{ color: 'var(--text-muted)' }}>{key.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase())}</span>
                            <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>{typeof val === 'number' ? val.toLocaleString() : val}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Tradeoffs */}
                  {tradeoffs.length > 0 && (
                    <div>
                      <p style={{ fontSize: '.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--text-muted)', marginBottom: 8 }}>
                        Tradeoffs
                      </p>
                      <ul style={{ paddingLeft: 16, margin: 0 }}>
                        {tradeoffs.map((t, ti) => (
                          <li key={ti} style={{ fontSize: '.82rem', color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: 4 }}>
                            {t}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   AI Analysis Detail (collapsible, inline)
   ═══════════════════════════════════════════════════ */

function AIAnalysisDetail({ result, portfolio }: { result: AnalysisResult; portfolio: PortfolioInput | null }) {
  const [expanded, setExpanded] = useState(false);
  const { allActions, metrics, topAction } = result;

  const tradeoffs = portfolio ? computeTradeoffs(topAction, metrics, portfolio) : [];

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
            <div className="detail-block-content">
              {tradeoffs.length > 0 ? (
                <ul style={{ paddingLeft: 16, margin: 0 }}>
                  {tradeoffs.map((t, i) => (
                    <li key={i} style={{ marginBottom: 4 }}>{t}</li>
                  ))}
                </ul>
              ) : (
                <p>No significant tradeoffs identified for this action.</p>
              )}
            </div>
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
   Monte Carlo Section (memoised)
   ═══════════════════════════════════════════════════ */

function MonteCarloSection({ portfolio, metrics }: { portfolio: PortfolioInput; metrics: AnalysisResult['metrics'] }) {
  const mc = useMemo(() => runMonteCarlo(portfolio, metrics), [portfolio, metrics]);
  return (
    <div className="reveal">
      <MonteCarloChart
        result={mc}
        goalAmount={portfolio.goal.targetAmount}
        yearsToGoal={portfolio.goal.yearsToGoal}
      />
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   Rebalance Section (memoised)
   ═══════════════════════════════════════════════════ */

function RebalanceSection({ portfolio, metrics }: { portfolio: PortfolioInput; metrics: AnalysisResult['metrics'] }) {
  const trades = useMemo(() => generateRebalanceTrades(portfolio, metrics), [portfolio, metrics]);
  return (
    <div className="reveal">
      <RebalanceWorksheet trades={trades} />
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   What-If Explorer
   ═══════════════════════════════════════════════════ */

function WhatIfExplorer({
  portfolio,
  originalResult,
  wiContribution, setWiContribution,
  wiCash, setWiCash,
  wiYears, setWiYears,
  wiRisk, setWiRisk,
}: {
  portfolio: PortfolioInput;
  originalResult: AnalysisResult;
  wiContribution: number;
  setWiContribution: (v: number) => void;
  wiCash: number;
  setWiCash: (v: number) => void;
  wiYears: number;
  setWiYears: (v: number) => void;
  wiRisk: RiskTolerance;
  setWiRisk: (v: RiskTolerance) => void;
}) {
  const modified = useMemo(() => {
    const modPortfolio: PortfolioInput = {
      ...portfolio,
      annualContribution: wiContribution,
      cashBalance: wiCash,
      riskTolerance: wiRisk,
      goal: { ...portfolio.goal, yearsToGoal: wiYears },
    };
    const m = computeMetrics(modPortfolio);
    const actions = scoreActions(modPortfolio, m);
    const scenarios = projectScenarios(modPortfolio, m);
    const baseScenario = scenarios.find(s => s.name === 'base');
    return {
      goalProb: baseScenario?.goalProbability ?? 0,
      topAction: actions[0]?.title ?? '—',
      topScore: actions[0]?.score ?? 0,
      weightedReturn: m.weightedAnnualReturn,
    };
  }, [portfolio, wiContribution, wiCash, wiYears, wiRisk]);

  const original = useMemo(() => {
    const baseScenario = originalResult.scenarios.find(s => s.name === 'base');
    return {
      goalProb: baseScenario?.goalProbability ?? 0,
      topAction: originalResult.topAction.title,
      topScore: originalResult.topAction.score,
      weightedReturn: originalResult.metrics.weightedAnnualReturn,
    };
  }, [originalResult]);

  function delta(current: number, orig: number): { text: string; color: string } {
    const d = current - orig;
    if (Math.abs(d) < 0.1) return { text: '—', color: 'var(--text-light)' };
    return {
      text: `${d > 0 ? '▲' : '▼'} ${d > 0 ? '+' : ''}${d < 1 && d > -1 ? d.toFixed(1) : Math.round(d)}`,
      color: d > 0 ? 'var(--accent)' : 'var(--red)',
    };
  }

  const riskOptions: RiskTolerance[] = ['conservative', 'balanced', 'growth', 'aggressive'];

  return (
    <div className="card" style={{ padding: '24px 28px' }}>
      <p className="section-sub" style={{ marginBottom: 20 }}>
        Adjust parameters to see how changes affect your portfolio outcomes in real-time.
      </p>

      {/* Sliders */}
      <div className="form-grid-2col" style={{ marginBottom: 24 }}>
        <div>
          <label style={{ display: 'block', fontSize: '.78rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 8 }}>
            Annual Contribution: ${wiContribution.toLocaleString()}
          </label>
          <input type="range" min="0" max="50000" step="500" value={wiContribution} onChange={e => setWiContribution(Number(e.target.value))} style={{ width: '100%', accentColor: 'var(--accent)' }} />
          <div className="flex justify-between" style={{ fontSize: '.72rem', color: 'var(--text-light)', marginTop: 4 }}>
            <span>$0</span><span>$50K</span>
          </div>
        </div>
        <div>
          <label style={{ display: 'block', fontSize: '.78rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 8 }}>
            Cash Balance: ${wiCash.toLocaleString()}
          </label>
          <input type="range" min="0" max="100000" step="1000" value={wiCash} onChange={e => setWiCash(Number(e.target.value))} style={{ width: '100%', accentColor: 'var(--accent)' }} />
          <div className="flex justify-between" style={{ fontSize: '.72rem', color: 'var(--text-light)', marginTop: 4 }}>
            <span>$0</span><span>$100K</span>
          </div>
        </div>
        <div>
          <label style={{ display: 'block', fontSize: '.78rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 8 }}>
            Years to Goal: {wiYears}
          </label>
          <input type="range" min="1" max="50" step="1" value={wiYears} onChange={e => setWiYears(Number(e.target.value))} style={{ width: '100%', accentColor: 'var(--accent)' }} />
          <div className="flex justify-between" style={{ fontSize: '.72rem', color: 'var(--text-light)', marginTop: 4 }}>
            <span>1 yr</span><span>50 yrs</span>
          </div>
        </div>
        <div>
          <label style={{ display: 'block', fontSize: '.78rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 8 }}>
            Risk Tolerance
          </label>
          <div style={{ display: 'flex', gap: 6 }}>
            {riskOptions.map(r => (
              <button
                key={r}
                onClick={() => setWiRisk(r)}
                style={{
                  flex: 1,
                  padding: '6px 4px',
                  borderRadius: 8,
                  fontSize: '.72rem',
                  fontWeight: 600,
                  border: '1px solid',
                  borderColor: wiRisk === r ? 'var(--accent)' : 'var(--border)',
                  background: wiRisk === r ? 'var(--accent-bg)' : 'transparent',
                  color: wiRisk === r ? 'var(--accent)' : 'var(--text-muted)',
                  cursor: 'pointer',
                  transition: 'all .2s',
                  fontFamily: 'var(--font)',
                  textTransform: 'capitalize',
                }}
              >
                {r.slice(0, 4)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Comparison grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }} className="wi-grid">
        {[
          {
            label: 'Goal Probability',
            orig: `${original.goalProb}%`,
            mod: `${modified.goalProb}%`,
            d: delta(modified.goalProb, original.goalProb),
          },
          {
            label: 'Top Action',
            orig: original.topAction,
            mod: modified.topAction,
            d: modified.topAction !== original.topAction
              ? { text: 'CHANGED', color: 'var(--gold)' }
              : { text: 'Same', color: 'var(--text-light)' },
          },
          {
            label: 'Top Score',
            orig: String(original.topScore),
            mod: String(modified.topScore),
            d: delta(modified.topScore, original.topScore),
          },
          {
            label: 'Weighted Return',
            orig: `${(original.weightedReturn * 100).toFixed(1)}%`,
            mod: `${(modified.weightedReturn * 100).toFixed(1)}%`,
            d: delta(modified.weightedReturn * 100, original.weightedReturn * 100),
          },
        ].map(card => (
          <div
            key={card.label}
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-sm)',
              padding: '16px 14px',
              textAlign: 'center',
            }}
          >
            <p style={{ fontSize: '.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.04em', color: 'var(--text-muted)', marginBottom: 8 }}>
              {card.label}
            </p>
            <p style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text)', marginBottom: 4 }}>
              {card.mod}
            </p>
            <p style={{ fontSize: '.78rem', fontWeight: 700, color: card.d.color }}>
              {card.d.text}
            </p>
          </div>
        ))}
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
  const [customOpen, setCustomOpen] = useState(false);
  const [customReturn, setCustomReturn] = useState(8);
  const [customShock, setCustomShock] = useState(-15);
  const [customScenario, setCustomScenario] = useState<ScenarioProjection | null>(null);

  /* ── What-If state ── */
  const [whatIfOpen, setWhatIfOpen] = useState(false);
  const [wiContribution, setWiContribution] = useState(0);
  const [wiCash, setWiCash] = useState(0);
  const [wiYears, setWiYears] = useState(10);
  const [wiRisk, setWiRisk] = useState<RiskTolerance>('balanced');

  const actionCompRef = useRef<HTMLDivElement>(null);

  /* ── Theme persistence ── */
  useEffect(() => {
    const saved = localStorage.getItem('prism-theme') as 'dark' | 'light' | null;
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
    localStorage.setItem('prism-theme', next);
  }

  /* ── Sync What-If defaults from portfolio ── */
  useEffect(() => {
    if (portfolio) {
      setWiContribution(portfolio.annualContribution);
      setWiCash(portfolio.cashBalance);
      setWiYears(portfolio.goal.yearsToGoal);
      setWiRisk(portfolio.riskTolerance);
    }
  }, [portfolio]);

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
    window.scrollTo({ top: 0, behavior: 'smooth' });

    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ portfolio: input }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Analysis failed');
      setResult(data as AnalysisResult);
      window.scrollTo({ top: 0, behavior: 'smooth' });
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
              <div className="flex items-center gap-2" style={{ marginLeft: 'auto' }}>
                <button
                  className="btn-outline"
                  onClick={() => {
                    exportCSV(result, portfolio);
                    setToast('Analysis exported as CSV.');
                  }}
                >
                  Export CSV
                </button>
                <button
                  className="btn-primary"
                  onClick={() => {
                    generatePDF(result, portfolio);
                    setToast('PDF report downloaded.');
                  }}
                  style={{ padding: '8px 18px', fontSize: '.82rem' }}
                >
                  Export PDF
                </button>
              </div>
            </div>

            {/* 4. At a Glance */}
            <div className="reveal">
              <GlanceGrid result={result} />
            </div>

            {/* 4b. Holdings Breakdown */}
            {portfolio && (
              <div className="reveal">
                <HoldingsTable portfolio={portfolio} metrics={result.metrics} />
              </div>
            )}

            {/* 5. Scenario Chart */}
            <div className="reveal">
              <ScenarioChart
                scenarios={customScenario ? [...result.scenarios, customScenario] : result.scenarios}
                goalAmount={portfolio?.goal.targetAmount ?? 0}
                yearsToGoal={
                  portfolio?.goal.yearsToGoal ??
                  (result.scenarios[0]?.yearByYearValues.length - 1)
                }
              />
            </div>

            {/* 5b. Custom Scenario Builder */}
            <div className="reveal">
              <div className="detail-toggle">
                <p className="section-label" style={{ margin: 0 }}>Custom Scenario</p>
                <button
                  onClick={() => setCustomOpen(!customOpen)}
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
                  {customOpen ? 'Hide' : 'Build your own'}
                </button>
              </div>
              <div className={`detail-content ${customOpen ? 'expanded' : 'collapsed'}`}>
                <div className="card" style={{ padding: '24px 28px' }}>
                  <p className="section-sub" style={{ marginBottom: 20 }}>
                    Define custom return and year-1 shock parameters to model your own scenario.
                  </p>
                  <div className="form-grid-2col">
                    <div>
                      <label style={{
                        display: 'block', fontSize: '.78rem', fontWeight: 600,
                        color: 'var(--text-muted)', textTransform: 'uppercase',
                        letterSpacing: '.05em', marginBottom: 8,
                      }}>
                        Annual Return: {customReturn}%
                      </label>
                      <input
                        type="range"
                        min="-10"
                        max="25"
                        step="0.5"
                        value={customReturn}
                        onChange={e => setCustomReturn(parseFloat(e.target.value))}
                        style={{ width: '100%', accentColor: 'var(--accent)' }}
                      />
                      <div className="flex justify-between" style={{ fontSize: '.72rem', color: 'var(--text-light)', marginTop: 4 }}>
                        <span>-10%</span><span>25%</span>
                      </div>
                    </div>
                    <div>
                      <label style={{
                        display: 'block', fontSize: '.78rem', fontWeight: 600,
                        color: 'var(--text-muted)', textTransform: 'uppercase',
                        letterSpacing: '.05em', marginBottom: 8,
                      }}>
                        Year-1 Shock: {customShock}%
                      </label>
                      <input
                        type="range"
                        min="-60"
                        max="40"
                        step="1"
                        value={customShock}
                        onChange={e => setCustomShock(parseFloat(e.target.value))}
                        style={{ width: '100%', accentColor: 'var(--accent)' }}
                      />
                      <div className="flex justify-between" style={{ fontSize: '.72rem', color: 'var(--text-light)', marginTop: 4 }}>
                        <span>-60%</span><span>+40%</span>
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 20 }}>
                    <button
                      className="btn-primary"
                      onClick={() => {
                        if (portfolio && result) {
                          const m = computeMetrics(portfolio);
                          const cs = projectCustomScenario(portfolio, m, {
                            annualReturn: customReturn / 100,
                            year1Shock: customShock / 100,
                            label: `Custom (${customReturn}% / ${customShock}% yr1)`,
                          });
                          setCustomScenario(cs);
                        }
                      }}
                      style={{ padding: '8px 20px', fontSize: '.85rem' }}
                    >
                      Run Scenario
                    </button>
                    {customScenario && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 16, fontSize: '.85rem' }}>
                        <span style={{ color: 'var(--text-muted)' }}>
                          Final: <strong style={{ color: '#a855f7' }}>{fmt(customScenario.finalValue)}</strong>
                        </span>
                        <span style={{ color: 'var(--text-muted)' }}>
                          Goal: <strong style={{ color: '#a855f7' }}>{customScenario.goalProbability}%</strong>
                        </span>
                        <button
                          className="btn-ghost"
                          onClick={() => setCustomScenario(null)}
                          style={{ fontSize: '.82rem', padding: '4px 12px' }}
                        >
                          Clear
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* 5c. Monte Carlo Analysis */}
            {portfolio && (
              <MonteCarloSection portfolio={portfolio} metrics={result.metrics} />
            )}

            {/* 6. Action Comparison (with drill-down) */}
            <div className="reveal" ref={actionCompRef}>
              <ActionComparison actions={result.allActions} metrics={result.metrics} portfolio={portfolio} />
            </div>

            {/* 6b. Rebalancing Worksheet — only when REBALANCE is scored */}
            {portfolio && result.allActions.some(a => a.type === 'REBALANCE') && (
              <RebalanceSection portfolio={portfolio} metrics={result.metrics} />
            )}

            {/* 7. What-If Explorer */}
            {portfolio && (
              <div className="reveal">
                <div className="detail-toggle">
                  <p className="section-label" style={{ margin: 0 }}>What-If Explorer</p>
                  <button
                    onClick={() => setWhatIfOpen(!whatIfOpen)}
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
                    {whatIfOpen ? 'Hide' : 'Explore scenarios'}
                  </button>
                </div>
                <div className={`detail-content ${whatIfOpen ? 'expanded' : 'collapsed'}`}>
                  <WhatIfExplorer
                    portfolio={portfolio}
                    originalResult={result}
                    wiContribution={wiContribution}
                    setWiContribution={setWiContribution}
                    wiCash={wiCash}
                    setWiCash={setWiCash}
                    wiYears={wiYears}
                    setWiYears={setWiYears}
                    wiRisk={wiRisk}
                    setWiRisk={setWiRisk}
                  />
                </div>
              </div>
            )}

            {/* 8. Contribution Gap */}
            {portfolio && (
              <div className="reveal">
                <ContributionGapCard portfolio={portfolio} metrics={result.metrics} />
              </div>
            )}

            {/* 9. AI Analysis Detail */}
            <div className="reveal">
              <AIAnalysisDetail result={result} portfolio={portfolio} />
            </div>

            {/* 10. Chat Panel */}
            {portfolio && (
              <div className="reveal">
                <ChatPanel analysis={result} portfolio={portfolio} />
              </div>
            )}

            {/* 11. Guardrails */}
            <div className="reveal">
              <div className="guardrails">
                <p style={{ marginBottom: 10 }}>
                  Prism provides analysis for informational purposes only. This is not
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
