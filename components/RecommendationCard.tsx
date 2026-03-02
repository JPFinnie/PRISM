'use client';

import { AIInsight, ScoredAction, ActionType } from '@/lib/types';

interface Props {
  aiInsight:  AIInsight;
  topAction:  ScoredAction;
  allActions: ScoredAction[];
}

const ACTION_LABELS: Record<ActionType, { label: string; color: string }> = {
  DEPLOY_CASH:          { label: 'Deploy Cash',        color: 'bg-blue-100 text-blue-700'   },
  TFSA_OPTIMIZE:        { label: 'TFSA',               color: 'bg-green-100 text-green-700' },
  RRSP_OPTIMIZE:        { label: 'RRSP',               color: 'bg-teal-100 text-teal-700'   },
  REBALANCE:            { label: 'Rebalance',          color: 'bg-purple-100 text-purple-700'},
  TAX_LOSS_HARVEST:     { label: 'Tax-Loss Harvest',   color: 'bg-orange-100 text-orange-700'},
  REDUCE_CONCENTRATION: { label: 'Concentration Risk', color: 'bg-red-100 text-red-700'     },
  ADD_TO_POSITION:      { label: 'Add to Position',    color: 'bg-indigo-100 text-indigo-700'},
};

const URGENCY_COLORS = {
  high:   'text-red-600',
  medium: 'text-amber-600',
  low:    'text-gray-400',
};

function fmt(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `$${Math.round(n / 1_000)}K`;
  if (n > 0)          return `$${n}`;
  return '—';
}

function ConfidenceBar({ value }: { value: number }) {
  const color =
    value >= 75 ? 'bg-green-500' :
    value >= 55 ? 'bg-amber-500' :
    'bg-red-500';

  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-gray-500 w-20 shrink-0">AI Confidence</span>
      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full score-bar-fill ${color}`}
          style={{ '--bar-w': `${value}%` } as React.CSSProperties}
        />
      </div>
      <span className="text-xs font-semibold text-gray-700 w-8 text-right">{value}%</span>
    </div>
  );
}

function ActionBadge({ type }: { type: ActionType }) {
  const meta = ACTION_LABELS[type] ?? { label: type, color: 'bg-gray-100 text-gray-700' };
  return (
    <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wide ${meta.color}`}>
      {meta.label}
    </span>
  );
}

export default function RecommendationCard({ aiInsight, topAction, allActions }: Props) {
  return (
    <div className="space-y-4 fade-up">

      {/* ── Primary recommendation ─────────────────────────────────────── */}
      <div className="card p-6 space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-2">
            <ActionBadge type={topAction.type} />
            <h2 className="text-xl font-bold text-gray-900 leading-snug max-w-xl">
              {aiInsight.headline}
            </h2>
          </div>
          {topAction.estimatedAnnualBenefit > 0 && (
            <div className="text-right shrink-0">
              <p className="text-2xl font-bold text-green-600">
                +{fmt(topAction.estimatedAnnualBenefit)}
              </p>
              <p className="text-xs text-gray-400">est. annual benefit</p>
            </div>
          )}
        </div>

        <ConfidenceBar value={aiInsight.confidence} />

        {/* AI explanation */}
        <div className="space-y-3 text-sm text-gray-700 leading-relaxed">
          {aiInsight.explanation.split('\n\n').map((para, i) => (
            <p key={i}>{para}</p>
          ))}
        </div>

        {/* Key numbers */}
        {aiInsight.keyNumbers.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
            {aiInsight.keyNumbers.map((stat, i) => (
              <div key={i} className="bg-gray-50 rounded-xl px-4 py-3 text-sm text-gray-700 font-medium">
                {stat}
              </div>
            ))}
          </div>
        )}

        <p className="text-xs text-gray-400 leading-relaxed border-t pt-3">
          {aiInsight.disclaimer}
        </p>
      </div>

      {/* ── All scored actions ─────────────────────────────────────────── */}
      <div className="card p-6">
        <h3 className="font-semibold text-gray-800 mb-4">All Scored Actions</h3>
        <div className="space-y-3">
          {allActions.map((action, idx) => (
            <div
              key={action.type}
              className={`flex items-center gap-4 rounded-xl p-3 ${idx === 0 ? 'bg-blue-50 border border-blue-100' : 'bg-gray-50'}`}
            >
              {/* Rank */}
              <span className="w-6 h-6 rounded-full bg-white border border-gray-200 flex items-center justify-center text-xs font-bold text-gray-500 shrink-0">
                {idx + 1}
              </span>

              {/* Action info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-semibold text-gray-800">{action.title}</span>
                  <span className={`text-xs font-medium uppercase ${URGENCY_COLORS[action.urgency]}`}>
                    {action.urgency}
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-0.5 truncate">{action.rationale}</p>
              </div>

              {/* Score bar */}
              <div className="shrink-0 w-28 hidden sm:block">
                <div className="flex justify-between text-xs text-gray-400 mb-1">
                  <span>Score</span>
                  <span className="font-semibold text-gray-700">{action.score}</span>
                </div>
                <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-navy-700 rounded-full"
                    style={{ width: `${action.score}%` }}
                  />
                </div>
              </div>

              {/* Benefit */}
              <div className="shrink-0 text-right hidden md:block">
                {action.estimatedAnnualBenefit > 0 ? (
                  <>
                    <p className="text-sm font-semibold text-green-600">+{fmt(action.estimatedAnnualBenefit)}</p>
                    <p className="text-xs text-gray-400">/ yr</p>
                  </>
                ) : (
                  <p className="text-xs text-gray-400">Risk reduction</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
