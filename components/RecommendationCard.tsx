'use client';

import { AIInsight, ScoredAction } from '@/lib/types';

interface Props {
  aiInsight:  AIInsight;
  topAction:  ScoredAction;
  allActions: ScoredAction[];
}

function fmtBenefit(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `$${Math.round(n / 1_000)}K`;
  if (n > 0)          return `$${n}`;
  return '—';
}

export default function RecommendationCard({ aiInsight, topAction, allActions }: Props) {
  const paragraphs = aiInsight.explanation.split('\n\n').filter(Boolean);
  const firstParagraph  = paragraphs[0] ?? '';
  const restParagraphs  = paragraphs.slice(1);
  const confidence       = aiInsight.confidence;
  const isAI             = confidence < 95;
  const sourceLabel      = isAI
    ? `AI interpretation \u00B7 ${confidence}% confidence`
    : `Deterministic analysis \u00B7 ${confidence}% confidence`;

  return (
    <div className="card card-glow p-6 fade-up" style={{ overflow: 'hidden' }}>

      {/* 1 ── Eyebrow ───────────────────────────────────── */}
      <p className="brief-eyebrow">This month&rsquo;s highest-leverage action</p>

      {/* 2 ── Headline ──────────────────────────────────── */}
      <h2 className="brief-action">{aiInsight.headline}</h2>

      {/* 3 ── Narrative (first paragraph) ───────────────── */}
      <p className="brief-narrative">{firstParagraph}</p>

      {/* 4 ── Reasoning (remaining paragraphs) ─────────── */}
      {restParagraphs.length > 0 && (
        <div className="brief-reasoning" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {restParagraphs.map((para, i) => (
            <p key={i}>{para}</p>
          ))}
        </div>
      )}

      {/* 5 ── Badge row ─────────────────────────────────── */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '20px' }}>
        {topAction.estimatedAnnualBenefit > 0 && (
          <span className="badge badge-green">
            +{fmtBenefit(topAction.estimatedAnnualBenefit)}/yr est. benefit
          </span>
        )}
        <span className="badge badge-blue">
          Confidence {confidence}%
        </span>
        {topAction.urgency === 'high' && (
          <span className="badge badge-gold">High urgency</span>
        )}
      </div>

      {/* 6 ── Confidence bar ────────────────────────────── */}
      <div className="conf-bar-track" style={{ marginBottom: '6px' }}>
        <div
          className="conf-bar-fill"
          style={{ width: `${confidence}%` }}
        />
      </div>

      {/* 7 ── Source label ──────────────────────────────── */}
      <p
        style={{
          fontSize: '.72rem',
          color: 'var(--text-light)',
          marginBottom: '24px',
          letterSpacing: '.02em',
        }}
      >
        {sourceLabel}
      </p>

      {/* 8 ── Key numbers grid ─────────────────────────── */}
      {aiInsight.keyNumbers.length > 0 && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '12px',
            marginBottom: '24px',
          }}
        >
          {aiInsight.keyNumbers.map((stat, i) => (
            <div
              key={i}
              className="reveal"
              style={{
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-sm)',
                backdropFilter: 'blur(12px)',
                WebkitBackdropFilter: 'blur(12px)',
                padding: '16px 14px',
                fontSize: '.85rem',
                fontWeight: 600,
                color: 'var(--text-secondary)',
                textAlign: 'center',
                lineHeight: 1.5,
              }}
            >
              {stat}
            </div>
          ))}
        </div>
      )}

      {/* 9 ── Disclaimer ───────────────────────────────── */}
      <p
        style={{
          fontSize: '.75rem',
          color: 'var(--text-muted)',
          lineHeight: 1.65,
          borderTop: '1px solid var(--border)',
          paddingTop: '16px',
        }}
      >
        {aiInsight.disclaimer}
      </p>
    </div>
  );
}
