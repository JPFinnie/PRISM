'use client';

import { useState } from 'react';
import { PortfolioInput, Holding, RiskTolerance, AssetClass } from '@/lib/types';

/* ═══════════════════════════════════════════════════════════════════════
   Types & Constants
   ═══════════════════════════════════════════════════════════════════════ */

interface HoldingRow {
  id:           string;
  symbol:       string;
  shares:       string;
  currentPrice: string;
  costBasis:    string;
  assetClass:   AssetClass;
  sector:       string;
}

type LifeStage = 'student' | 'early_career' | 'mid_career' | 'pre_retirement' | 'retired';
type GoalPurpose = 'home' | 'retirement' | 'education' | 'travel' | 'emergency' | 'wealth';

interface FormState {
  /* Step 0 – Welcome */
  firstName:           string;
  riskTolerance:       RiskTolerance;

  /* Step 1 – Life Stage */
  lifeStage:           LifeStage;

  /* Step 2 – Finances */
  cashBalance:         string;
  annualIncome:        string;
  monthlyExpenses:     string;
  annualContribution:  string;

  /* Step 3 – Portfolio */
  holdings:            HoldingRow[];
  tfsaRoom:            string;
  rrspRoom:            string;
  targetEquityPct:     string;
  targetFixedIncomePct: string;

  /* Step 4 – Goal */
  goalPurpose:         GoalPurpose;
  goalAmount:          string;
  goalYears:           string;
  goalDescription:     string;
}

const SECTORS = [
  'Financial Services', 'Technology', 'Energy', 'Healthcare',
  'Consumer', 'Industrial', 'Real Estate', 'Fixed Income', 'Other',
];

const BLANK_HOLDING = (): HoldingRow => ({
  id:           Math.random().toString(36).slice(2),
  symbol:       '',
  shares:       '',
  currentPrice: '',
  costBasis:    '',
  assetClass:   'equity',
  sector:       'Other',
});

const DEMO: FormState = {
  firstName:            'Alex',
  riskTolerance:        'growth',
  lifeStage:            'mid_career',
  cashBalance:          '12400',
  annualIncome:         '85000',
  monthlyExpenses:      '5200',
  annualContribution:   '12000',
  holdings: [
    { id: '1', symbol: 'TD.TO',  shares: '100', currentPrice: '83.50',  costBasis: '79.00',  assetClass: 'equity',       sector: 'Financial Services' },
    { id: '2', symbol: 'XIU.TO', shares: '250', currentPrice: '33.20',  costBasis: '31.00',  assetClass: 'equity',       sector: 'Other'              },
    { id: '3', symbol: 'VFV.TO', shares: '75',  currentPrice: '132.80', costBasis: '128.00', assetClass: 'equity',       sector: 'Technology'         },
    { id: '4', symbol: 'ZAG.TO', shares: '200', currentPrice: '13.40',  costBasis: '14.80',  assetClass: 'fixed_income', sector: 'Fixed Income'       },
    { id: '5', symbol: 'RY.TO',  shares: '60',  currentPrice: '149.50', costBasis: '135.00', assetClass: 'equity',       sector: 'Financial Services' },
  ],
  tfsaRoom:             '18500',
  rrspRoom:             '32000',
  targetEquityPct:      '75',
  targetFixedIncomePct: '20',
  goalPurpose:          'wealth',
  goalAmount:           '800000',
  goalYears:            '18',
  goalDescription:      'Financial independence fund',
};

const BLANK_FORM: FormState = {
  firstName:            '',
  riskTolerance:        'balanced',
  lifeStage:            'early_career',
  cashBalance:          '',
  annualIncome:         '',
  monthlyExpenses:      '',
  annualContribution:   '',
  holdings:             [BLANK_HOLDING()],
  tfsaRoom:             '',
  rrspRoom:             '',
  targetEquityPct:      '70',
  targetFixedIncomePct: '25',
  goalPurpose:          'wealth',
  goalAmount:           '',
  goalYears:            '',
  goalDescription:      '',
};

const TOTAL_STEPS = 5;

const STEP_LABELS = [
  'Welcome',
  'Life Stage',
  'Finances',
  'Portfolio',
  'Goal',
];

/* ═══════════════════════════════════════════════════════════════════════
   Selector Data
   ═══════════════════════════════════════════════════════════════════════ */

const RISK_OPTIONS: { value: RiskTolerance; icon: string; label: string; desc: string }[] = [
  { value: 'conservative', icon: '🛡', label: 'Conservative', desc: 'Preserve capital' },
  { value: 'balanced',     icon: '⚖',  label: 'Balanced',     desc: 'Steady growth'   },
  { value: 'growth',       icon: '📈', label: 'Growth',       desc: 'Higher returns'  },
  { value: 'aggressive',   icon: '🚀', label: 'Aggressive',   desc: 'Maximum growth'  },
];

const LIFE_STAGE_OPTIONS: { value: LifeStage; icon: string; label: string }[] = [
  { value: 'student',        icon: '🎓', label: 'Student'         },
  { value: 'early_career',   icon: '🚀', label: 'Early Career'    },
  { value: 'mid_career',     icon: '💼', label: 'Mid Career'      },
  { value: 'pre_retirement', icon: '🌱', label: 'Pre-Retirement'  },
  { value: 'retired',        icon: '⛈',  label: 'Retired'         },
];

const GOAL_PURPOSE_OPTIONS: { value: GoalPurpose; icon: string; label: string }[] = [
  { value: 'home',       icon: '🏠', label: 'Home'            },
  { value: 'retirement', icon: '🌞', label: 'Retirement'      },
  { value: 'education',  icon: '🏫', label: 'Education'       },
  { value: 'travel',     icon: '✈',  label: 'Travel'          },
  { value: 'emergency',  icon: '🛡', label: 'Emergency Fund'  },
  { value: 'wealth',     icon: '💰', label: 'General Wealth'  },
];

/* ═══════════════════════════════════════════════════════════════════════
   Component
   ═══════════════════════════════════════════════════════════════════════ */

interface Props {
  onAnalyze: (portfolio: PortfolioInput) => void;
}

export default function PortfolioForm({ onAnalyze }: Props) {
  const [form,  setForm]  = useState<FormState>(BLANK_FORM);
  const [step,  setStep]  = useState(0);
  const [error, setError] = useState<string | null>(null);

  /* ── Helpers ──────────────────────────────────────────────────────── */
  function updateHolding(id: string, field: keyof HoldingRow, value: string) {
    setForm(f => ({
      ...f,
      holdings: f.holdings.map(h => h.id === id ? { ...h, [field]: value } : h),
    }));
  }

  function addHolding() {
    setForm(f => ({ ...f, holdings: [...f.holdings, BLANK_HOLDING()] }));
  }

  function removeHolding(id: string) {
    setForm(f => ({
      ...f,
      holdings: f.holdings.filter(h => h.id !== id),
    }));
  }

  function loadDemo() {
    setForm(DEMO);
  }

  /* ── Navigation ──────────────────────────────────────────────────── */
  function goNext() {
    setError(null);
    if (step < TOTAL_STEPS - 1) {
      setStep(s => s + 1);
    } else {
      handleSubmit();
    }
  }

  function goBack() {
    setError(null);
    if (step > 0) setStep(s => s - 1);
  }

  /* ── Submit (original logic preserved) ───────────────────────────── */
  function handleSubmit() {
    setError(null);

    const validHoldings = form.holdings.filter(
      h => h.symbol.trim() && h.shares && h.currentPrice && h.costBasis,
    );

    if (validHoldings.length === 0) {
      setError('Add at least one complete holding (symbol, shares, prices).');
      setStep(3);
      return;
    }

    const goalAmount = parseFloat(form.goalAmount);
    const goalYears  = parseInt(form.goalYears);

    if (!goalAmount || goalAmount <= 0) { setError('Enter a valid goal amount.'); setStep(4); return; }
    if (!goalYears  || goalYears  <= 0) { setError('Enter a valid number of years.'); setStep(4); return; }

    const equityPct      = parseFloat(form.targetEquityPct)      || 70;
    const fixedIncomePct = parseFloat(form.targetFixedIncomePct) || 25;
    const cashPct        = Math.max(0, 100 - equityPct - fixedIncomePct);

    const holdings: Holding[] = validHoldings.map(h => ({
      symbol:       h.symbol.trim().toUpperCase(),
      shares:       parseFloat(h.shares),
      currentPrice: parseFloat(h.currentPrice),
      costBasis:    parseFloat(h.costBasis),
      assetClass:   h.assetClass,
      sector:       h.sector,
    }));

    const portfolio: PortfolioInput = {
      holdings,
      cashBalance:         parseFloat(form.cashBalance)        || 0,
      tfsaRoomRemaining:   parseFloat(form.tfsaRoom)           || 0,
      rrspRoomRemaining:   parseFloat(form.rrspRoom)           || 0,
      riskTolerance:       form.riskTolerance,
      annualContribution:  parseFloat(form.annualContribution) || 0,
      ...(form.annualIncome    && { annualIncome:    parseFloat(form.annualIncome)    }),
      ...(form.monthlyExpenses && { monthlyExpenses: parseFloat(form.monthlyExpenses) }),
      goal: {
        targetAmount: goalAmount,
        yearsToGoal:  goalYears,
        description:  form.goalDescription || 'Investment goal',
      },
      targetAllocation: { equityPct, fixedIncomePct, cashPct },
    };

    onAnalyze(portfolio);
  }

  /* ── Computed ─────────────────────────────────────────────────────── */
  const progressPct = ((step + 1) / TOTAL_STEPS) * 100;
  const cashPctCalc = Math.max(
    0,
    100 - (parseFloat(form.targetEquityPct) || 0) - (parseFloat(form.targetFixedIncomePct) || 0),
  );
  const isLastStep = step === TOTAL_STEPS - 1;

  /* ═══════════════════════════════════════════════════════════════════
     Render
     ═══════════════════════════════════════════════════════════════════ */

  return (
    <div style={{ maxWidth: 'var(--max-w)', margin: '0 auto', padding: '32px 20px 48px' }}>

      {/* ── Header ─────────────────────────────────────────────────── */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: 8,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: '.78rem', fontWeight: 600, color: 'var(--text-muted)' }}>
            Step {step + 1} of {TOTAL_STEPS}
          </span>
          <span style={{
            fontSize: '.72rem', fontWeight: 600, color: 'var(--accent)',
            background: 'var(--accent-bg)', padding: '3px 10px', borderRadius: 12,
          }}>
            {STEP_LABELS[step]}
          </span>
        </div>
        <button
          type="button"
          onClick={loadDemo}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            fontSize: '.82rem', fontWeight: 600, color: 'var(--accent)',
            fontFamily: 'var(--font)', textDecoration: 'underline',
            textUnderlineOffset: 3,
          }}
        >
          Load demo portfolio
        </button>
      </div>

      {/* ── Progress Bar ───────────────────────────────────────────── */}
      <div className="wiz-progress">
        <div
          className="wiz-progress-fill"
          style={{ width: `${progressPct}%` }}
        />
      </div>

      {/* ── Error Banner ───────────────────────────────────────────── */}
      {error && (
        <div style={{
          background: 'var(--red-bg)', border: '1px solid var(--red)',
          color: 'var(--red)', fontSize: '.85rem', fontWeight: 500,
          borderRadius: 'var(--radius-sm)', padding: '12px 18px', marginBottom: 24,
        }}>
          {error}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════
         STEP 0 – Welcome
         ═══════════════════════════════════════════════════════════════ */}
      {step === 0 && (
        <div className="fade-up">
          <div style={{ textAlign: 'center', marginBottom: 40 }}>
            <h1 style={{
              fontSize: '2rem', fontWeight: 800, letterSpacing: '-.03em',
              color: 'var(--text)', marginBottom: 8,
            }}>
              Welcome to Nexus Edge
            </h1>
            <p style={{ fontSize: '.95rem', color: 'var(--text-muted)', maxWidth: 440, margin: '0 auto' }}>
              Let&apos;s analyze your portfolio. This takes about 2 minutes.
            </p>
          </div>

          {/* First Name */}
          <div className="card" style={{ padding: '28px 28px 32px', marginBottom: 28 }}>
            <label style={{
              display: 'block', fontSize: '.78rem', fontWeight: 600,
              color: 'var(--text-muted)', textTransform: 'uppercase',
              letterSpacing: '.05em', marginBottom: 8,
            }}>
              First Name <span style={{ color: 'var(--text-light)', textTransform: 'none', fontWeight: 400 }}>(optional)</span>
            </label>
            <input
              className="input"
              placeholder="e.g. Alex"
              value={form.firstName}
              onChange={e => setForm(f => ({ ...f, firstName: e.target.value }))}
            />
          </div>

          {/* Risk Tolerance */}
          <div className="card" style={{ padding: '28px 28px 32px' }}>
            <label style={{
              display: 'block', fontSize: '.78rem', fontWeight: 600,
              color: 'var(--text-muted)', textTransform: 'uppercase',
              letterSpacing: '.05em', marginBottom: 16,
            }}>
              Risk Tolerance
            </label>
            <div className="card-selector" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
              {RISK_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  className={`sel-card${form.riskTolerance === opt.value ? ' selected' : ''}`}
                  onClick={() => setForm(f => ({ ...f, riskTolerance: opt.value }))}
                >
                  <span className="sel-icon">{opt.icon}</span>
                  <span className="sel-label">{opt.label}</span>
                  <span style={{ fontSize: '.72rem', color: 'var(--text-muted)', fontWeight: 400 }}>
                    {opt.desc}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════
         STEP 1 – Life Stage
         ═══════════════════════════════════════════════════════════════ */}
      {step === 1 && (
        <div className="fade-up">
          <div style={{ textAlign: 'center', marginBottom: 32 }}>
            <h2 style={{
              fontSize: '1.5rem', fontWeight: 800, letterSpacing: '-.02em',
              color: 'var(--text)', marginBottom: 6,
            }}>
              Where are you in life?
            </h2>
            <p style={{ fontSize: '.88rem', color: 'var(--text-muted)' }}>
              This helps us tailor our analysis to your situation.
            </p>
          </div>

          <div className="card" style={{ padding: '32px 28px' }}>
            <div className="card-selector" style={{ gridTemplateColumns: 'repeat(5, 1fr)' }}>
              {LIFE_STAGE_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  className={`sel-card${form.lifeStage === opt.value ? ' selected' : ''}`}
                  onClick={() => setForm(f => ({ ...f, lifeStage: opt.value }))}
                >
                  <span className="sel-icon">{opt.icon}</span>
                  <span className="sel-label">{opt.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════
         STEP 2 – Finances
         ═══════════════════════════════════════════════════════════════ */}
      {step === 2 && (
        <div className="fade-up">
          <div style={{ textAlign: 'center', marginBottom: 32 }}>
            <h2 style={{
              fontSize: '1.5rem', fontWeight: 800, letterSpacing: '-.02em',
              color: 'var(--text)', marginBottom: 6,
            }}>
              Your Finances
            </h2>
            <p style={{ fontSize: '.88rem', color: 'var(--text-muted)' }}>
              We use this to model savings capacity and cash reserves.
            </p>
          </div>

          <div className="card" style={{ padding: '32px 28px' }}>
            <div style={{
              display: 'grid', gridTemplateColumns: '1fr 1fr',
              gap: 24,
            }}>
              {/* Cash Balance */}
              <div>
                <label style={{
                  display: 'block', fontSize: '.78rem', fontWeight: 600,
                  color: 'var(--text-muted)', textTransform: 'uppercase',
                  letterSpacing: '.05em', marginBottom: 8,
                }}>
                  Cash Balance
                </label>
                <div style={{ position: 'relative' }}>
                  <span style={{
                    position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)',
                    color: 'var(--text-light)', fontSize: '.92rem', fontWeight: 600, pointerEvents: 'none',
                  }}>$</span>
                  <input
                    className="input"
                    style={{ paddingLeft: 30 }}
                    placeholder="12,400"
                    type="number"
                    min="0"
                    value={form.cashBalance}
                    onChange={e => setForm(f => ({ ...f, cashBalance: e.target.value }))}
                  />
                </div>
              </div>

              {/* Annual Contribution */}
              <div>
                <label style={{
                  display: 'block', fontSize: '.78rem', fontWeight: 600,
                  color: 'var(--text-muted)', textTransform: 'uppercase',
                  letterSpacing: '.05em', marginBottom: 8,
                }}>
                  Annual Contribution
                </label>
                <div style={{ position: 'relative' }}>
                  <span style={{
                    position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)',
                    color: 'var(--text-light)', fontSize: '.92rem', fontWeight: 600, pointerEvents: 'none',
                  }}>$</span>
                  <input
                    className="input"
                    style={{ paddingLeft: 30 }}
                    placeholder="12,000"
                    type="number"
                    min="0"
                    value={form.annualContribution}
                    onChange={e => setForm(f => ({ ...f, annualContribution: e.target.value }))}
                  />
                </div>
              </div>

              {/* Annual Income (optional) */}
              <div>
                <label style={{
                  display: 'block', fontSize: '.78rem', fontWeight: 600,
                  color: 'var(--text-muted)', textTransform: 'uppercase',
                  letterSpacing: '.05em', marginBottom: 8,
                }}>
                  Gross Annual Income{' '}
                  <span style={{ color: 'var(--text-light)', textTransform: 'none', fontWeight: 400 }}>(optional)</span>
                </label>
                <div style={{ position: 'relative' }}>
                  <span style={{
                    position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)',
                    color: 'var(--text-light)', fontSize: '.92rem', fontWeight: 600, pointerEvents: 'none',
                  }}>$</span>
                  <input
                    className="input"
                    style={{ paddingLeft: 30 }}
                    placeholder="85,000"
                    type="number"
                    min="0"
                    value={form.annualIncome}
                    onChange={e => setForm(f => ({ ...f, annualIncome: e.target.value }))}
                  />
                </div>
              </div>

              {/* Monthly Expenses (optional) */}
              <div>
                <label style={{
                  display: 'block', fontSize: '.78rem', fontWeight: 600,
                  color: 'var(--text-muted)', textTransform: 'uppercase',
                  letterSpacing: '.05em', marginBottom: 8,
                }}>
                  Monthly Expenses{' '}
                  <span style={{ color: 'var(--text-light)', textTransform: 'none', fontWeight: 400 }}>(optional)</span>
                </label>
                <div style={{ position: 'relative' }}>
                  <span style={{
                    position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)',
                    color: 'var(--text-light)', fontSize: '.92rem', fontWeight: 600, pointerEvents: 'none',
                  }}>$</span>
                  <input
                    className="input"
                    style={{ paddingLeft: 30 }}
                    placeholder="5,200"
                    type="number"
                    min="0"
                    value={form.monthlyExpenses}
                    onChange={e => setForm(f => ({ ...f, monthlyExpenses: e.target.value }))}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════
         STEP 3 – Portfolio
         ═══════════════════════════════════════════════════════════════ */}
      {step === 3 && (
        <div className="fade-up">
          <div style={{ textAlign: 'center', marginBottom: 32 }}>
            <h2 style={{
              fontSize: '1.5rem', fontWeight: 800, letterSpacing: '-.02em',
              color: 'var(--text)', marginBottom: 6,
            }}>
              Your Holdings
            </h2>
            <p style={{ fontSize: '.88rem', color: 'var(--text-muted)' }}>
              Add your current positions. Use data from your brokerage.
            </p>
          </div>

          {/* Holdings Table */}
          <div className="card" style={{ padding: '28px 24px 24px' }}>
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              marginBottom: 16,
            }}>
              <span style={{
                fontSize: '.82rem', fontWeight: 700, color: 'var(--text-muted)',
                textTransform: 'uppercase', letterSpacing: '.05em',
              }}>
                Holdings
              </span>
              <span style={{ fontSize: '.78rem', color: 'var(--text-light)' }}>
                {form.holdings.length} position{form.holdings.length !== 1 ? 's' : ''}
              </span>
            </div>

            {/* Column Headers */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '2fr 1fr 1.2fr 1.2fr 1.5fr 1.5fr auto',
              gap: 8, padding: '0 2px', marginBottom: 8,
            }}>
              {['Symbol', 'Shares', 'Current $', 'Cost Basis $', 'Asset Class', 'Sector', ''].map((h, i) => (
                <span key={i} style={{
                  fontSize: '.7rem', fontWeight: 700, color: 'var(--text-light)',
                  textTransform: 'uppercase', letterSpacing: '.06em',
                }}>
                  {h}
                </span>
              ))}
            </div>

            {/* Rows */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {form.holdings.map(h => (
                <div
                  key={h.id}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '2fr 1fr 1.2fr 1.2fr 1.5fr 1.5fr auto',
                    gap: 8, alignItems: 'center',
                  }}
                >
                  <input
                    className="input"
                    placeholder="TD.TO"
                    value={h.symbol}
                    onChange={e => updateHolding(h.id, 'symbol', e.target.value)}
                    style={{ textTransform: 'uppercase' }}
                  />
                  <input
                    className="input"
                    placeholder="100"
                    type="number"
                    min="0"
                    value={h.shares}
                    onChange={e => updateHolding(h.id, 'shares', e.target.value)}
                  />
                  <input
                    className="input"
                    placeholder="83.50"
                    type="number"
                    min="0"
                    step="0.01"
                    value={h.currentPrice}
                    onChange={e => updateHolding(h.id, 'currentPrice', e.target.value)}
                  />
                  <input
                    className="input"
                    placeholder="79.00"
                    type="number"
                    min="0"
                    step="0.01"
                    value={h.costBasis}
                    onChange={e => updateHolding(h.id, 'costBasis', e.target.value)}
                  />
                  <select
                    className="input"
                    value={h.assetClass}
                    onChange={e => updateHolding(h.id, 'assetClass', e.target.value as AssetClass)}
                  >
                    <option value="equity">Equity</option>
                    <option value="fixed_income">Fixed Income</option>
                    <option value="cash">Cash</option>
                    <option value="alternative">Alternative</option>
                  </select>
                  <select
                    className="input"
                    value={h.sector}
                    onChange={e => updateHolding(h.id, 'sector', e.target.value)}
                  >
                    {SECTORS.map(s => <option key={s}>{s}</option>)}
                  </select>
                  <button
                    type="button"
                    onClick={() => removeHolding(h.id)}
                    disabled={form.holdings.length === 1}
                    style={{
                      background: 'none', border: 'none', cursor: 'pointer',
                      color: 'var(--text-light)', fontSize: '1.1rem', lineHeight: 1,
                      padding: '0 4px', transition: 'color .2s',
                      opacity: form.holdings.length === 1 ? 0.2 : 1,
                    }}
                    onMouseEnter={e => { if (form.holdings.length > 1) (e.target as HTMLElement).style.color = 'var(--red)'; }}
                    onMouseLeave={e => { (e.target as HTMLElement).style.color = 'var(--text-light)'; }}
                    aria-label="Remove holding"
                  >
                    &times;
                  </button>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={addHolding}
              style={{
                marginTop: 14, background: 'none', border: 'none', cursor: 'pointer',
                fontSize: '.82rem', fontWeight: 600, color: 'var(--accent)',
                fontFamily: 'var(--font)',
              }}
            >
              + Add holding
            </button>
          </div>

          {/* Tax Room & Target Allocation */}
          <div style={{
            display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginTop: 20,
          }}>
            {/* Tax Room */}
            <div className="card" style={{ padding: '24px 24px 28px' }}>
              <span style={{
                display: 'block', fontSize: '.78rem', fontWeight: 700,
                color: 'var(--text-muted)', textTransform: 'uppercase',
                letterSpacing: '.05em', marginBottom: 16,
              }}>
                Registered Account Room
              </span>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div>
                  <label style={{
                    display: 'block', fontSize: '.78rem', fontWeight: 600,
                    color: 'var(--text-muted)', marginBottom: 6,
                  }}>
                    Remaining TFSA Room
                  </label>
                  <div style={{ position: 'relative' }}>
                    <span style={{
                      position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)',
                      color: 'var(--text-light)', fontSize: '.92rem', fontWeight: 600, pointerEvents: 'none',
                    }}>$</span>
                    <input
                      className="input"
                      style={{ paddingLeft: 30 }}
                      placeholder="18,500"
                      type="number"
                      min="0"
                      value={form.tfsaRoom}
                      onChange={e => setForm(f => ({ ...f, tfsaRoom: e.target.value }))}
                    />
                  </div>
                </div>
                <div>
                  <label style={{
                    display: 'block', fontSize: '.78rem', fontWeight: 600,
                    color: 'var(--text-muted)', marginBottom: 6,
                  }}>
                    Remaining RRSP Room
                  </label>
                  <div style={{ position: 'relative' }}>
                    <span style={{
                      position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)',
                      color: 'var(--text-light)', fontSize: '.92rem', fontWeight: 600, pointerEvents: 'none',
                    }}>$</span>
                    <input
                      className="input"
                      style={{ paddingLeft: 30 }}
                      placeholder="32,000"
                      type="number"
                      min="0"
                      value={form.rrspRoom}
                      onChange={e => setForm(f => ({ ...f, rrspRoom: e.target.value }))}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Target Allocation */}
            <div className="card" style={{ padding: '24px 24px 28px' }}>
              <span style={{
                display: 'block', fontSize: '.78rem', fontWeight: 700,
                color: 'var(--text-muted)', textTransform: 'uppercase',
                letterSpacing: '.05em', marginBottom: 16,
              }}>
                Target Allocation
              </span>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div>
                  <label style={{
                    display: 'block', fontSize: '.78rem', fontWeight: 600,
                    color: 'var(--text-muted)', marginBottom: 6,
                  }}>
                    Equity %
                  </label>
                  <input
                    className="input"
                    placeholder="70"
                    type="number"
                    min="0"
                    max="100"
                    value={form.targetEquityPct}
                    onChange={e => setForm(f => ({ ...f, targetEquityPct: e.target.value }))}
                  />
                </div>
                <div>
                  <label style={{
                    display: 'block', fontSize: '.78rem', fontWeight: 600,
                    color: 'var(--text-muted)', marginBottom: 6,
                  }}>
                    Fixed Income %
                  </label>
                  <input
                    className="input"
                    placeholder="25"
                    type="number"
                    min="0"
                    max="100"
                    value={form.targetFixedIncomePct}
                    onChange={e => setForm(f => ({ ...f, targetFixedIncomePct: e.target.value }))}
                  />
                </div>
              </div>

              <div style={{
                marginTop: 14, padding: '10px 14px',
                background: 'var(--surface)', border: '1px solid var(--border)',
                borderRadius: 'var(--radius-sm)', fontSize: '.78rem', color: 'var(--text-muted)',
              }}>
                Cash target: <strong style={{ color: 'var(--text)' }}>{cashPctCalc}%</strong>
                <span style={{ color: 'var(--text-light)' }}> (100% &minus; equity &minus; fixed income)</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════
         STEP 4 – Goal
         ═══════════════════════════════════════════════════════════════ */}
      {step === 4 && (
        <div className="fade-up">
          <div style={{ textAlign: 'center', marginBottom: 32 }}>
            <h2 style={{
              fontSize: '1.5rem', fontWeight: 800, letterSpacing: '-.02em',
              color: 'var(--text)', marginBottom: 6,
            }}>
              Your Investment Goal
            </h2>
            <p style={{ fontSize: '.88rem', color: 'var(--text-muted)' }}>
              What are you working towards?
            </p>
          </div>

          {/* Goal Purpose Selector */}
          <div className="card" style={{ padding: '28px 28px 32px', marginBottom: 20 }}>
            <label style={{
              display: 'block', fontSize: '.78rem', fontWeight: 700,
              color: 'var(--text-muted)', textTransform: 'uppercase',
              letterSpacing: '.05em', marginBottom: 16,
            }}>
              Goal Purpose
            </label>
            <div className="card-selector" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
              {GOAL_PURPOSE_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  className={`sel-card${form.goalPurpose === opt.value ? ' selected' : ''}`}
                  onClick={() => setForm(f => ({ ...f, goalPurpose: opt.value }))}
                >
                  <span className="sel-icon">{opt.icon}</span>
                  <span className="sel-label">{opt.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Goal Details */}
          <div className="card" style={{ padding: '28px 28px 32px' }}>
            <div style={{
              display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24,
            }}>
              <div>
                <label style={{
                  display: 'block', fontSize: '.78rem', fontWeight: 600,
                  color: 'var(--text-muted)', textTransform: 'uppercase',
                  letterSpacing: '.05em', marginBottom: 8,
                }}>
                  Target Amount
                </label>
                <div style={{ position: 'relative' }}>
                  <span style={{
                    position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)',
                    color: 'var(--text-light)', fontSize: '.92rem', fontWeight: 600, pointerEvents: 'none',
                  }}>$</span>
                  <input
                    className="input"
                    style={{ paddingLeft: 30 }}
                    placeholder="800,000"
                    type="number"
                    min="1"
                    value={form.goalAmount}
                    onChange={e => setForm(f => ({ ...f, goalAmount: e.target.value }))}
                  />
                </div>
              </div>

              <div>
                <label style={{
                  display: 'block', fontSize: '.78rem', fontWeight: 600,
                  color: 'var(--text-muted)', textTransform: 'uppercase',
                  letterSpacing: '.05em', marginBottom: 8,
                }}>
                  Years to Goal
                </label>
                <input
                  className="input"
                  placeholder="18"
                  type="number"
                  min="1"
                  max="50"
                  value={form.goalYears}
                  onChange={e => setForm(f => ({ ...f, goalYears: e.target.value }))}
                />
              </div>
            </div>

            <div style={{ marginTop: 24 }}>
              <label style={{
                display: 'block', fontSize: '.78rem', fontWeight: 600,
                color: 'var(--text-muted)', textTransform: 'uppercase',
                letterSpacing: '.05em', marginBottom: 8,
              }}>
                Description <span style={{ color: 'var(--text-light)', textTransform: 'none', fontWeight: 400 }}>(optional)</span>
              </label>
              <input
                className="input"
                placeholder="e.g. Financial independence fund"
                value={form.goalDescription}
                onChange={e => setForm(f => ({ ...f, goalDescription: e.target.value }))}
              />
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════
         Navigation Buttons
         ═══════════════════════════════════════════════════════════════ */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        marginTop: 40, gap: 16,
      }}>
        {step > 0 ? (
          <button
            type="button"
            className="btn-ghost"
            onClick={goBack}
          >
            &larr; Back
          </button>
        ) : (
          <div />
        )}

        <button
          type="button"
          className="btn-primary"
          onClick={goNext}
          style={{
            padding: isLastStep ? '12px 36px' : '10px 28px',
            fontSize: isLastStep ? '.95rem' : '.88rem',
          }}
        >
          {isLastStep ? 'Start Analysis  \u2192' : 'Continue  \u2192'}
        </button>
      </div>
    </div>
  );
}
