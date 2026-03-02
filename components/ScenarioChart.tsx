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
  base:      '#2563EB',
  recession: '#DC2626',
  bull:      '#16A34A',
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

export default function ScenarioChart({ scenarios, goalAmount, yearsToGoal }: Props) {
  const allVals  = scenarios.flatMap(s => s.yearByYearValues);
  const rawMax   = Math.max(...allVals, goalAmount);
  const maxVal   = rawMax * 1.08; // 8% headroom

  const goalY    = yScale(goalAmount, maxVal);

  // X-axis tick every 5 years
  const xTicks: number[] = [];
  for (let y = 0; y <= yearsToGoal; y += 5) xTicks.push(y);
  if (!xTicks.includes(yearsToGoal)) xTicks.push(yearsToGoal);

  // Y-axis ticks (5 evenly spaced)
  const yTicks = [0, 0.25, 0.5, 0.75, 1].map(f => Math.round(maxVal * f));

  return (
    <div className="card p-6 fade-up">
      <h3 className="font-semibold text-gray-800 mb-4">Scenario Projections</h3>

      {/* Scenario probability badges */}
      <div className="flex flex-wrap gap-3 mb-4">
        {scenarios.map(s => (
          <div key={s.name} className="flex items-center gap-2 text-sm">
            <span className="w-3 h-3 rounded-full" style={{ background: COLORS[s.name] }} />
            <span className="text-gray-600">{s.label}</span>
            <span
              className="font-semibold"
              style={{ color: COLORS[s.name] }}
            >
              {s.goalProbability}% probability
            </span>
            <span className="text-gray-400">·</span>
            <span className="text-gray-500">{fmt(s.finalValue)}</span>
          </div>
        ))}
      </div>

      {/* SVG Chart */}
      <svg
        viewBox={`0 0 ${VW} ${VH}`}
        style={{ width: '100%', height: 'auto', display: 'block' }}
        aria-label="Scenario projection chart"
      >
        {/* Grid lines */}
        {yTicks.map(v => (
          <line
            key={v}
            x1={PAD.left} y1={yScale(v, maxVal)}
            x2={VW - PAD.right} y2={yScale(v, maxVal)}
            stroke="#E5E7EB" strokeWidth="1"
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
            fill="#9CA3AF"
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
            fill="#9CA3AF"
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
              stroke="#C8973A" strokeWidth="1.5" strokeDasharray="6,4"
            />
            <text
              x={VW - PAD.right - 2}
              y={goalY - 4}
              textAnchor="end"
              fontSize="9"
              fill="#C8973A"
              fontWeight="600"
            >
              GOAL {fmt(goalAmount)}
            </text>
          </>
        )}

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
