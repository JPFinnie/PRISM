'use client';

import { MonteCarloResult } from '@/lib/types';

interface Props {
  result: MonteCarloResult;
  goalAmount: number;
  yearsToGoal: number;
}

const PAD = { top: 20, right: 16, bottom: 36, left: 72 };
const VW = 600;
const VH = 280;
const PW = VW - PAD.left - PAD.right;
const PH = VH - PAD.top - PAD.bottom;

function fmt(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${Math.round(n / 1_000)}K`;
  return `$${n}`;
}

function xScale(idx: number, years: number) {
  return PAD.left + (idx / years) * PW;
}

function yScale(val: number, maxVal: number) {
  return PAD.top + PH - (val / maxVal) * PH;
}

function bandPath(upper: number[], lower: number[], years: number, maxVal: number): string {
  // Forward along upper
  let path = upper
    .map((v, i) => `${i === 0 ? 'M' : 'L'}${xScale(i, years).toFixed(1)},${yScale(v, maxVal).toFixed(1)}`)
    .join(' ');
  // Backward along lower
  for (let i = lower.length - 1; i >= 0; i--) {
    path += ` L${xScale(i, years).toFixed(1)},${yScale(lower[i], maxVal).toFixed(1)}`;
  }
  return path + ' Z';
}

function linePath(values: number[], years: number, maxVal: number): string {
  return values
    .map((v, i) => `${i === 0 ? 'M' : 'L'}${xScale(i, years).toFixed(1)},${yScale(v, maxVal).toFixed(1)}`)
    .join(' ');
}

export default function MonteCarloChart({ result, goalAmount, yearsToGoal }: Props) {
  const { percentiles } = result;

  const allVals = [
    ...percentiles.p10,
    ...percentiles.p90,
    goalAmount,
  ];
  const rawMax = Math.max(...allVals);
  const maxVal = rawMax * 1.08;

  const goalY = yScale(goalAmount, maxVal);

  const xTicks: number[] = [];
  for (let y = 0; y <= yearsToGoal; y += 5) xTicks.push(y);
  if (!xTicks.includes(yearsToGoal)) xTicks.push(yearsToGoal);

  const yTicks = [0, 0.25, 0.5, 0.75, 1].map(f => Math.round(maxVal * f));

  return (
    <div className="card p-6 reveal">
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h3
          className="font-semibold text-lg"
          style={{ color: 'var(--text)', marginBottom: 4 }}
        >
          Monte Carlo Analysis
        </h3>
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
          {result.runs} randomized return paths — percentile bands shown
        </p>
      </div>

      {/* Stats cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 12,
          marginBottom: 24,
        }}
        className="mc-stats-grid"
      >
        {[
          { label: 'Goal Hit Rate', value: `${result.goalHitRate}%`, color: result.goalHitRate >= 70 ? 'var(--accent)' : result.goalHitRate >= 40 ? 'var(--gold)' : 'var(--red)' },
          { label: 'Median Final', value: fmt(result.medianFinal), color: 'var(--text)' },
          { label: 'Best Case (P95)', value: fmt(result.bestCase), color: 'var(--accent)' },
          { label: 'Worst Case (P5)', value: fmt(result.worstCase), color: 'var(--red)' },
        ].map(s => (
          <div
            key={s.label}
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-sm)',
              padding: '16px 14px',
              textAlign: 'center',
            }}
          >
            <p style={{ fontSize: '1.1rem', fontWeight: 800, color: s.color }}>{s.value}</p>
            <p style={{ fontSize: '.72rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.04em', marginTop: 4 }}>
              {s.label}
            </p>
          </div>
        ))}
      </div>

      {/* SVG Fan Chart */}
      <svg
        viewBox={`0 0 ${VW} ${VH}`}
        style={{ width: '100%', height: 'auto', display: 'block' }}
        aria-label="Monte Carlo fan chart"
      >
        {/* Grid lines */}
        {yTicks.map(v => (
          <line
            key={v}
            x1={PAD.left} y1={yScale(v, maxVal)}
            x2={VW - PAD.right} y2={yScale(v, maxVal)}
            stroke="rgba(255,255,255,0.06)" strokeWidth="1"
          />
        ))}

        {/* Y-axis labels */}
        {yTicks.map(v => (
          <text
            key={v}
            x={PAD.left - 6}
            y={yScale(v, maxVal) + 4}
            textAnchor="end"
            fontSize="10"
            fill="#71717a"
          >
            {fmt(v)}
          </text>
        ))}

        {/* X-axis labels */}
        {xTicks.map(y => (
          <text
            key={y}
            x={xScale(y, yearsToGoal)}
            y={VH - 6}
            textAnchor="middle"
            fontSize="10"
            fill="#71717a"
          >
            Yr {y}
          </text>
        ))}

        {/* Goal line */}
        {goalAmount > 0 && goalAmount < maxVal && (
          <>
            <line
              x1={PAD.left} y1={goalY}
              x2={VW - PAD.right} y2={goalY}
              stroke="#f59e0b" strokeWidth="1.5" strokeDasharray="6,4"
            />
            <text
              x={VW - PAD.right - 2}
              y={goalY - 4}
              textAnchor="end"
              fontSize="9"
              fill="#f59e0b"
              fontWeight="600"
            >
              GOAL {fmt(goalAmount)}
            </text>
          </>
        )}

        {/* P10-P90 band (lightest) */}
        <path
          d={bandPath(percentiles.p90, percentiles.p10, yearsToGoal, maxVal)}
          fill="#10b981"
          fillOpacity="0.06"
        />

        {/* P25-P75 band */}
        <path
          d={bandPath(percentiles.p75, percentiles.p25, yearsToGoal, maxVal)}
          fill="#10b981"
          fillOpacity="0.12"
        />

        {/* P50 median line */}
        <path
          d={linePath(percentiles.p50, yearsToGoal, maxVal)}
          fill="none"
          stroke="#10b981"
          strokeWidth="2.5"
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        {/* P10 and P90 boundary lines */}
        <path
          d={linePath(percentiles.p10, yearsToGoal, maxVal)}
          fill="none"
          stroke="#10b981"
          strokeWidth="1"
          strokeDasharray="3,3"
          opacity="0.4"
        />
        <path
          d={linePath(percentiles.p90, yearsToGoal, maxVal)}
          fill="none"
          stroke="#10b981"
          strokeWidth="1"
          strokeDasharray="3,3"
          opacity="0.4"
        />

        {/* End labels */}
        <text
          x={xScale(yearsToGoal, yearsToGoal) + 4}
          y={yScale(percentiles.p90[yearsToGoal], maxVal) + 3}
          fontSize="8"
          fill="#10b981"
          opacity="0.6"
        >
          P90
        </text>
        <text
          x={xScale(yearsToGoal, yearsToGoal) + 4}
          y={yScale(percentiles.p50[yearsToGoal], maxVal) + 3}
          fontSize="8"
          fill="#10b981"
          fontWeight="600"
        >
          P50
        </text>
        <text
          x={xScale(yearsToGoal, yearsToGoal) + 4}
          y={yScale(percentiles.p10[yearsToGoal], maxVal) + 3}
          fontSize="8"
          fill="#10b981"
          opacity="0.6"
        >
          P10
        </text>
      </svg>
    </div>
  );
}
