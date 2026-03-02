'use client';

import { ScenarioProjection } from '@/lib/types';

interface Props {
  scenarios:   ScenarioProjection[];
  goalAmount:  number;
  yearsToGoal: number;
}

const PAD  = { top: 20, right: 16, bottom: 36, left: 72 };
const VW   = 600;
const VH   = 280;
const PW   = VW - PAD.left - PAD.right;
const PH   = VH - PAD.top  - PAD.bottom;

const COLORS: Record<string, string> = {
  base:      '#3b82f6',
  recession: '#ef4444',
  bull:      '#10b981',
};

const ICONS: Record<string, string> = {
  base:      '\u2694\uFE0F',
  recession: '\uD83D\uDCC9',
  bull:      '\uD83D\uDCC8',
};

function fmt(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `$${Math.round(n / 1_000)}K`;
  return `$${n}`;
}

function xScale(idx: number, years: number) {
  return PAD.left + (idx / years) * PW;
}

function yScale(val: number, maxVal: number) {
  return PAD.top + PH - (val / maxVal) * PH;
}

function linePath(values: number[], years: number, maxVal: number): string {
  return values
    .map((v, i) => `${i === 0 ? 'M' : 'L'}${xScale(i, years).toFixed(1)},${yScale(v, maxVal).toFixed(1)}`)
    .join(' ');
}

function areaPath(values: number[], years: number, maxVal: number): string {
  const line = values
    .map((v, i) => `${i === 0 ? 'M' : 'L'}${xScale(i, years).toFixed(1)},${yScale(v, maxVal).toFixed(1)}`)
    .join(' ');
  const bottomRight = `L${xScale(values.length - 1, years).toFixed(1)},${(PAD.top + PH).toFixed(1)}`;
  const bottomLeft  = `L${xScale(0, years).toFixed(1)},${(PAD.top + PH).toFixed(1)}`;
  return `${line} ${bottomRight} ${bottomLeft} Z`;
}

export default function ScenarioChart({ scenarios, goalAmount, yearsToGoal }: Props) {
  const allVals  = scenarios.flatMap(s => s.yearByYearValues);
  const rawMax   = Math.max(...allVals, goalAmount);
  const maxVal   = rawMax * 1.08;

  const goalY    = yScale(goalAmount, maxVal);

  const xTicks: number[] = [];
  for (let y = 0; y <= yearsToGoal; y += 5) xTicks.push(y);
  if (!xTicks.includes(yearsToGoal)) xTicks.push(yearsToGoal);

  const yTicks = [0, 0.25, 0.5, 0.75, 1].map(f => Math.round(maxVal * f));

  return (
    <div className="card p-6 reveal">
      {/* Section header */}
      <div style={{ marginBottom: '24px' }}>
        <h3
          className="font-semibold text-lg"
          style={{ color: 'var(--text)', marginBottom: '4px' }}
        >
          Scenario Analysis
        </h3>
        <p
          className="text-sm"
          style={{ color: 'var(--text-muted)' }}
        >
          Projected outcomes under three macro conditions
        </p>
      </div>

      {/* Scenario cards */}
      <div className="scenario-grid" style={{ marginBottom: '24px' }}>
        {scenarios.map(s => (
          <div key={s.name} className={`scenario-card ${s.name}`}>
            <div className="scenario-icon">{ICONS[s.name]}</div>
            <div className="scenario-name">{s.name}</div>
            <div className="scenario-prob">{s.goalProbability}%</div>
            <div className="scenario-sub">
              {fmt(s.finalValue)} projected
              <br />
              {s.annualReturn > 0 ? '+' : ''}{s.annualReturn}% annual return
            </div>
          </div>
        ))}
      </div>

      {/* SVG Chart */}
      <svg
        viewBox={`0 0 ${VW} ${VH}`}
        style={{ width: '100%', height: 'auto', display: 'block' }}
        aria-label="Scenario projection chart"
      >
        <defs>
          {/* Gradient fills for area under each line */}
          <linearGradient id="grad-base" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.15" />
            <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="grad-recession" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ef4444" stopOpacity="0.15" />
            <stop offset="100%" stopColor="#ef4444" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="grad-bull" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#10b981" stopOpacity="0.15" />
            <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
          </linearGradient>
        </defs>

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

        {/* Goal target line */}
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

        {/* Gradient area fills */}
        {scenarios.map(s => (
          <path
            key={`area-${s.name}`}
            d={areaPath(s.yearByYearValues, yearsToGoal, maxVal)}
            fill={`url(#grad-${s.name})`}
          />
        ))}

        {/* Scenario lines */}
        {scenarios.map(s => (
          <path
            key={s.name}
            d={linePath(s.yearByYearValues, yearsToGoal, maxVal)}
            fill="none"
            stroke={COLORS[s.name]}
            strokeWidth="2"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        ))}

        {/* End-point dots */}
        {scenarios.map(s => {
          const lastVal = s.yearByYearValues[yearsToGoal];
          return (
            <circle
              key={s.name}
              cx={xScale(yearsToGoal, yearsToGoal)}
              cy={yScale(lastVal, maxVal)}
              r="4"
              fill={COLORS[s.name]}
            />
          );
        })}
      </svg>
    </div>
  );
}
