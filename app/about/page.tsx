'use client';

import Link from 'next/link';

/* ─── Reusable section heading ──────────────────────────────────────────── */
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p
      style={{
        fontSize: '.72rem',
        fontWeight: 700,
        letterSpacing: '.08em',
        textTransform: 'uppercase',
        color: 'var(--accent)',
        marginBottom: 8,
      }}
    >
      {children}
    </p>
  );
}

function SectionSub({ children }: { children: React.ReactNode }) {
  return (
    <p
      style={{
        fontSize: '.95rem',
        color: 'var(--text-muted)',
        lineHeight: 1.65,
        maxWidth: 620,
      }}
    >
      {children}
    </p>
  );
}

/* ─── Code pill (monospace accent-bg tag) ────────────────────────────────── */
function Code({ children }: { children: React.ReactNode }) {
  return (
    <code
      style={{
        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
        fontSize: '.82em',
        background: 'var(--accent-bg)',
        color: 'var(--accent)',
        padding: '2px 8px',
        borderRadius: 6,
      }}
    >
      {children}
    </code>
  );
}

/* ─── Header ────────────────────────────────────────────────────────────── */
function Header() {
  return (
    <header
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 50,
        background: 'var(--bg-subtle)',
        borderBottom: '1px solid var(--border)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
      }}
    >
      <div
        style={{
          maxWidth: 'var(--max-w)',
          margin: '0 auto',
          padding: '14px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        {/* Left — logo + title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 'var(--radius-sm)',
              background: 'var(--accent)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 700,
              fontSize: '.78rem',
              color: '#fff',
            }}
          >
            NE
          </div>
          <span style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text)' }}>
            Nexus Edge
          </span>
        </div>

        {/* Right — back link */}
        <Link
          href="/"
          style={{
            fontSize: '.85rem',
            fontWeight: 600,
            color: 'var(--text-muted)',
            textDecoration: 'none',
            transition: 'color .2s',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--text)')}
          onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}
        >
          &larr; Back to app
        </Link>
      </div>
    </header>
  );
}

/* ─── Pipeline flow arrow ────────────────────────────────────────────────── */
const pipelineSteps = [
  'Form Input',
  'computeMetrics()',
  'scoreActions()',
  'projectScenarios()',
  'AI Narrative',
  'Dashboard',
];

function PipelineFlow() {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexWrap: 'wrap',
        gap: 6,
        marginTop: 32,
      }}
    >
      {pipelineSteps.map((step, i) => (
        <span key={step} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <span
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 20,
              padding: '6px 14px',
              fontSize: '.78rem',
              fontWeight: 600,
              color: 'var(--text-secondary)',
              fontFamily: step.includes('(')
                ? 'ui-monospace, SFMono-Regular, Menlo, monospace'
                : 'inherit',
              backdropFilter: 'blur(8px)',
              whiteSpace: 'nowrap',
            }}
          >
            {step}
          </span>
          {i < pipelineSteps.length - 1 && (
            <span style={{ color: 'var(--text-light)', fontSize: '.85rem' }}>&rarr;</span>
          )}
        </span>
      ))}
    </div>
  );
}

/* ─── Action scoring table ───────────────────────────────────────────────── */
const actionRows = [
  { action: 'Deploy Cash', trigger: 'Excess cash above target allocation', urgency: 'High if >10% excess' },
  { action: 'TFSA Optimize', trigger: 'Unused TFSA room > $1K', urgency: 'High if >$20K room' },
  { action: 'RRSP Optimize', trigger: 'Unused RRSP room > $5K', urgency: 'Medium' },
  { action: 'Rebalance', trigger: 'Allocation drift > 5%', urgency: 'High if drift >15%' },
  { action: 'Tax-Loss Harvest', trigger: 'Position down > 8%', urgency: 'High if savings >$2K' },
  { action: 'Reduce Concentration', trigger: 'Holding > 25% of portfolio', urgency: 'High if >40%' },
];

/* ─── Timeline items ──────────────────────────────────────────────────────── */
const roadmapItems = [
  { title: 'Real-time pricing', desc: 'Market data API integration (Alpha Vantage, etc.)' },
  { title: 'Portfolio persistence', desc: 'Database + auth (Postgres / Supabase)' },
  { title: 'PDF / CSV export', desc: 'Server-side rendering for reports' },
  { title: 'CIBC account import', desc: 'Open Banking API integration' },
  { title: 'Custom scenarios', desc: 'User-defined shock parameters' },
  { title: 'Backtesting', desc: 'Historical return data integration' },
];

/* ═══════════════════════════════════════════════════════════════════════════
   ABOUT PAGE
   ═══════════════════════════════════════════════════════════════════════════ */
export default function AboutPage() {
  return (
    <>
      <Header />

      <main
        style={{
          maxWidth: 'var(--max-w)',
          margin: '0 auto',
          padding: '0 24px 80px',
        }}
      >
        {/* ── Hero ──────────────────────────────────────────────────────── */}
        <section
          className="reveal"
          style={{ textAlign: 'center', padding: '56px 0 48px' }}
        >
          <h1
            style={{
              fontSize: '2.2rem',
              fontWeight: 800,
              letterSpacing: '-.03em',
              lineHeight: 1.2,
              color: 'var(--text)',
              marginBottom: 14,
            }}
          >
            How Nexus Edge Works
          </h1>
          <p
            style={{
              fontSize: '.95rem',
              lineHeight: 1.7,
              color: 'var(--text-muted)',
              maxWidth: 560,
              margin: '0 auto',
            }}
          >
            An AI-powered portfolio analysis engine built for Canadian self-directed
            investors. Deterministic math first, AI narration second.
          </p>
        </section>

        {/* ── Section 1: Design Principles ─────────────────────────────── */}
        <section style={{ marginBottom: 56 }}>
          <SectionLabel>Design Principles</SectionLabel>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: 16,
              marginTop: 16,
            }}
            className="about-grid-2"
          >
            {[
              {
                icon: '\uD83E\uDDEE',
                title: 'Deterministic First',
                desc: 'The math engine computes every metric before AI touches anything. Portfolio value, allocation drift, concentration risk, tax-loss candidates \u2014 all calculated with pure arithmetic.',
              },
              {
                icon: '\uD83E\uDDE0',
                title: 'AI Explains, Never Invents',
                desc: 'GPT-4o-mini receives pre-calculated numbers and writes a narrative. It cannot invent statistics. If no API key exists, a deterministic fallback generates the explanation.',
              },
              {
                icon: '\uD83C\uDFAF',
                title: 'One Clear Recommendation',
                desc: 'Instead of overwhelming you with options, the engine scores 6 possible actions and surfaces the single highest-value move. This prevents decision paralysis.',
              },
              {
                icon: '\uD83C\uDF41',
                title: 'Canadian-Specific',
                desc: 'TFSA and RRSP contribution room scoring, Canadian marginal tax rates for tax-loss harvesting, and Canadian ETF return assumptions are baked into every calculation.',
              },
            ].map((card) => (
              <div key={card.title} className="card reveal" style={{ padding: '28px 24px' }}>
                <div style={{ fontSize: '1.5rem', marginBottom: 10 }}>{card.icon}</div>
                <h3
                  style={{
                    fontSize: '.95rem',
                    fontWeight: 700,
                    color: 'var(--text)',
                    marginBottom: 8,
                  }}
                >
                  {card.title}
                </h3>
                <p style={{ fontSize: '.85rem', lineHeight: 1.65, color: 'var(--text-muted)' }}>
                  {card.desc}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* ── Section 2: The Engine Pipeline ────────────────────────────── */}
        <section style={{ marginBottom: 56 }}>
          <SectionLabel>The Engine Pipeline</SectionLabel>
          <SectionSub>
            Three pure functions process your portfolio data in sequence.
          </SectionSub>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: 16,
              marginTop: 20,
            }}
            className="about-grid-3"
          >
            {[
              {
                step: 1,
                fn: 'computeMetrics()',
                desc: 'Calculates total value, cost basis, unrealized G/L, asset-class breakdown, allocation drift, weighted annual return, concentration risk, positions in loss, savings rate, and emergency fund coverage.',
              },
              {
                step: 2,
                fn: 'scoreActions()',
                desc: 'Evaluates 6 possible actions (Deploy Cash, TFSA Optimize, RRSP Optimize, Rebalance, Tax-Loss Harvest, Reduce Concentration) and scores each 0\u2013100 based on expected financial impact and time-sensitivity.',
              },
              {
                step: 3,
                fn: 'projectScenarios()',
                desc: 'Projects portfolio growth over your goal timeline under Base, Recession, and Bull market conditions. Each scenario outputs a goal probability and year-by-year portfolio values.',
              },
            ].map((card) => (
              <div key={card.step} className="card reveal" style={{ padding: '28px 24px' }}>
                <div
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 28,
                    height: 28,
                    borderRadius: '50%',
                    background: 'var(--accent-bg)',
                    color: 'var(--accent)',
                    fontSize: '.78rem',
                    fontWeight: 700,
                    marginBottom: 12,
                  }}
                >
                  {card.step}
                </div>
                <h3
                  style={{
                    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                    fontSize: '.88rem',
                    fontWeight: 700,
                    color: 'var(--text)',
                    marginBottom: 10,
                  }}
                >
                  {card.fn}
                </h3>
                <p style={{ fontSize: '.84rem', lineHeight: 1.65, color: 'var(--text-muted)' }}>
                  {card.desc}
                </p>
              </div>
            ))}
          </div>

          <PipelineFlow />
        </section>

        {/* ── Section 3: Action Scoring ─────────────────────────────────── */}
        <section style={{ marginBottom: 56 }}>
          <SectionLabel>Action Scoring</SectionLabel>
          <SectionSub>Six possible actions are evaluated every analysis.</SectionSub>

          <div className="card reveal" style={{ marginTop: 20, overflow: 'hidden' }}>
            {/* Table header */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1.6fr 1fr',
                gap: 16,
                padding: '14px 24px',
                borderBottom: '1px solid var(--border)',
              }}
            >
              {['Action', 'Trigger', 'Urgency'].map((h) => (
                <span
                  key={h}
                  style={{
                    fontSize: '.72rem',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '.06em',
                    color: 'var(--text-muted)',
                  }}
                >
                  {h}
                </span>
              ))}
            </div>

            {/* Table rows */}
            {actionRows.map((row, i) => (
              <div
                key={row.action}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1.6fr 1fr',
                  gap: 16,
                  padding: '12px 24px',
                  borderBottom:
                    i < actionRows.length - 1 ? '1px solid var(--border)' : 'none',
                }}
              >
                <span
                  style={{
                    fontSize: '.85rem',
                    fontWeight: 600,
                    color: 'var(--text)',
                  }}
                >
                  {row.action}
                </span>
                <span style={{ fontSize: '.84rem', color: 'var(--text-muted)' }}>
                  {row.trigger}
                </span>
                <span style={{ fontSize: '.84rem', color: 'var(--text-muted)' }}>
                  {row.urgency}
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* ── Section 4: The AI Layer ──────────────────────────────────── */}
        <section style={{ marginBottom: 56 }}>
          <SectionLabel>The AI Layer</SectionLabel>

          <div className="card reveal" style={{ padding: '28px 24px', marginTop: 16 }}>
            <p style={{ fontSize: '.9rem', lineHeight: 1.7, color: 'var(--text-secondary)', marginBottom: 16 }}>
              GPT-4o-mini receives the pre-calculated outputs from the engine and generates:
            </p>
            <ul
              style={{
                listStyle: 'none',
                padding: 0,
                margin: '0 0 20px 0',
                display: 'flex',
                flexDirection: 'column',
                gap: 10,
              }}
            >
              {[
                'A punchy headline',
                '2\u20133 paragraph explanation',
                '3 key numbers from the action details',
                'A confidence score (constrained to \u00B1 a small range of the engine score)',
              ].map((item) => (
                <li
                  key={item}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 10,
                    fontSize: '.88rem',
                    color: 'var(--text-secondary)',
                    lineHeight: 1.55,
                  }}
                >
                  <span
                    style={{
                      display: 'inline-block',
                      width: 6,
                      height: 6,
                      borderRadius: '50%',
                      background: 'var(--accent)',
                      marginTop: 7,
                      flexShrink: 0,
                    }}
                  />
                  {item}
                </li>
              ))}
            </ul>
            <p style={{ fontSize: '.88rem', lineHeight: 1.7, color: 'var(--text-muted)', marginBottom: 12 }}>
              <strong style={{ color: 'var(--text-secondary)' }}>Strict rules:</strong>{' '}
              The AI cannot invent numbers, must stay within confidence bounds, and always
              includes a disclaimer.
            </p>
            <p style={{ fontSize: '.85rem', lineHeight: 1.65, color: 'var(--text-light)' }}>
              If no OpenAI API key is configured, a deterministic mock generates the
              narrative using the same data.
            </p>
          </div>
        </section>

        {/* ── Section 5: Tech Stack ────────────────────────────────────── */}
        <section style={{ marginBottom: 56 }}>
          <SectionLabel>Tech Stack</SectionLabel>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: 16,
              marginTop: 16,
            }}
            className="about-grid-3"
          >
            {[
              { name: 'Next.js 14', desc: 'App Router, server-side API routes' },
              { name: 'TypeScript', desc: 'End-to-end type safety' },
              { name: 'React 18', desc: 'Client-side interactivity' },
              { name: 'Tailwind CSS', desc: 'Utility-first styling' },
              { name: 'GPT-4o-mini', desc: 'AI narrative generation' },
              { name: 'Vercel', desc: 'Edge deployment, zero config' },
            ].map((item) => (
              <div
                key={item.name}
                className="card reveal"
                style={{ padding: '24px 20px', textAlign: 'center' }}
              >
                <h3
                  style={{
                    fontSize: '.92rem',
                    fontWeight: 700,
                    color: 'var(--text)',
                    marginBottom: 6,
                  }}
                >
                  {item.name}
                </h3>
                <p style={{ fontSize: '.82rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* ── Section 6: What's Next ───────────────────────────────────── */}
        <section style={{ marginBottom: 56 }}>
          <SectionLabel>What&apos;s Next</SectionLabel>
          <SectionSub>Future development roadmap</SectionSub>

          <div style={{ marginTop: 24, paddingLeft: 20 }}>
            {roadmapItems.map((item, i) => (
              <div
                key={item.title}
                className="reveal"
                style={{
                  position: 'relative',
                  paddingLeft: 28,
                  paddingBottom: i < roadmapItems.length - 1 ? 28 : 0,
                  borderLeft: '2px solid var(--border)',
                }}
              >
                {/* Dot */}
                <div
                  style={{
                    position: 'absolute',
                    left: -7,
                    top: 2,
                    width: 12,
                    height: 12,
                    borderRadius: '50%',
                    background: 'var(--accent)',
                    border: '2px solid var(--bg)',
                  }}
                />
                <h4
                  style={{
                    fontSize: '.9rem',
                    fontWeight: 700,
                    color: 'var(--text)',
                    marginBottom: 4,
                  }}
                >
                  {item.title}
                </h4>
                <p style={{ fontSize: '.84rem', color: 'var(--text-muted)', lineHeight: 1.55 }}>
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* ── Footer ───────────────────────────────────────────────────── */}
        <footer
          className="reveal"
          style={{
            textAlign: 'center',
            padding: '32px 0 0',
            borderTop: '1px solid var(--border)',
          }}
        >
          <p style={{ fontSize: '.78rem', color: 'var(--text-light)' }}>
            Built for demonstration purposes. This does not constitute financial advice.
          </p>
        </footer>
      </main>

      {/* ── Responsive overrides (injected via style tag) ───────────────── */}
      <style>{`
        @media (max-width: 640px) {
          .about-grid-2 { grid-template-columns: 1fr !important; }
          .about-grid-3 { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </>
  );
}
