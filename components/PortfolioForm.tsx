'use client';

import { useState } from 'react';
import { PortfolioInput, Holding, RiskTolerance, AssetClass } from '@/lib/types';

interface HoldingRow {
  id:           string;
  symbol:       string;
  shares:       string;
  currentPrice: string;
  costBasis:    string;
  assetClass:   AssetClass;
  sector:       string;
}

interface FormState {
  holdings:            HoldingRow[];
  cashBalance:         string;
  tfsaRoom:            string;
  rrspRoom:            string;
  riskTolerance:       RiskTolerance;
  annualContribution:  string;
  annualIncome:        string;
  monthlyExpenses:     string;
  goalAmount:          string;
  goalYears:           string;
  goalDescription:     string;
  targetEquityPct:     string;
  targetFixedIncomePct: string;
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
  holdings: [
    { id: '1', symbol: 'TD.TO',  shares: '100', currentPrice: '83.50',  costBasis: '79.00',  assetClass: 'equity',       sector: 'Financial Services' },
    { id: '2', symbol: 'XIU.TO', shares: '250', currentPrice: '33.20',  costBasis: '31.00',  assetClass: 'equity',       sector: 'Other'              },
    { id: '3', symbol: 'VFV.TO', shares: '75',  currentPrice: '132.80', costBasis: '128.00', assetClass: 'equity',       sector: 'Technology'         },
    { id: '4', symbol: 'ZAG.TO', shares: '200', currentPrice: '13.40',  costBasis: '14.80',  assetClass: 'fixed_income', sector: 'Fixed Income'       },
    { id: '5', symbol: 'RY.TO',  shares: '60',  currentPrice: '149.50', costBasis: '135.00', assetClass: 'equity',       sector: 'Financial Services' },
  ],
  cashBalance:          '12400',
  tfsaRoom:             '18500',
  rrspRoom:             '32000',
  riskTolerance:        'growth',
  annualContribution:   '12000',
  annualIncome:         '85000',
  monthlyExpenses:      '5200',
  goalAmount:           '800000',
  goalYears:            '18',
  goalDescription:      'Financial independence fund',
  targetEquityPct:      '75',
  targetFixedIncomePct: '20',
};

const BLANK_FORM: FormState = {
  holdings:             [BLANK_HOLDING()],
  cashBalance:          '',
  tfsaRoom:             '',
  rrspRoom:             '',
  riskTolerance:        'balanced',
  annualContribution:   '',
  annualIncome:         '',
  monthlyExpenses:      '',
  goalAmount:           '',
  goalYears:            '',
  goalDescription:      '',
  targetEquityPct:      '70',
  targetFixedIncomePct: '25',
};

interface Props {
  onAnalyze: (portfolio: PortfolioInput) => void;
}

export default function PortfolioForm({ onAnalyze }: Props) {
  const [form,  setForm]  = useState<FormState>(BLANK_FORM);
  const [error, setError] = useState<string | null>(null);

  // ── Holdings helpers ─────────────────────────────────────────────────────
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

  // ── Parse & submit ───────────────────────────────────────────────────────
  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const validHoldings = form.holdings.filter(
      h => h.symbol.trim() && h.shares && h.currentPrice && h.costBasis,
    );

    if (validHoldings.length === 0) {
      setError('Add at least one complete holding (symbol, shares, prices).');
      return;
    }

    const goalAmount = parseFloat(form.goalAmount);
    const goalYears  = parseInt(form.goalYears);

    if (!goalAmount || goalAmount <= 0) { setError('Enter a valid goal amount.'); return; }
    if (!goalYears  || goalYears  <= 0) { setError('Enter a valid number of years.'); return; }

    const equityPct     = parseFloat(form.targetEquityPct)     || 70;
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

  const inputClass =
    'w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white';

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-5xl mx-auto px-4 py-8">

      {/* ── Header ─────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-gray-800">Enter Your Portfolio</h2>
          <p className="text-sm text-gray-500">
            Use data from your CIBC Investor's Edge account
          </p>
        </div>
        <button
          type="button"
          onClick={() => setForm(DEMO)}
          className="text-sm text-blue-600 hover:text-blue-800 font-medium underline underline-offset-2"
        >
          Load demo portfolio
        </button>
      </div>

      {/* ── Holdings ───────────────────────────────────────────────── */}
      <div className="card p-5">
        <h3 className="font-semibold text-gray-700 mb-4">Holdings</h3>

        {/* Table header */}
        <div className="hidden sm:grid grid-cols-[2fr_1fr_1.2fr_1.2fr_1.5fr_1.5fr_auto] gap-2 text-xs font-medium text-gray-400 uppercase tracking-wide mb-2 px-1">
          <span>Symbol</span>
          <span>Shares</span>
          <span>Current $</span>
          <span>Cost Basis $</span>
          <span>Asset Class</span>
          <span>Sector</span>
          <span />
        </div>

        <div className="space-y-2">
          {form.holdings.map(h => (
            <div
              key={h.id}
              className="grid grid-cols-2 sm:grid-cols-[2fr_1fr_1.2fr_1.2fr_1.5fr_1.5fr_auto] gap-2 items-center"
            >
              <input
                placeholder="TD.TO"
                value={h.symbol}
                onChange={e => updateHolding(h.id, 'symbol', e.target.value)}
                className={inputClass + ' uppercase'}
              />
              <input
                placeholder="100"
                type="number"
                min="0"
                value={h.shares}
                onChange={e => updateHolding(h.id, 'shares', e.target.value)}
                className={inputClass}
              />
              <input
                placeholder="83.50"
                type="number"
                min="0"
                step="0.01"
                value={h.currentPrice}
                onChange={e => updateHolding(h.id, 'currentPrice', e.target.value)}
                className={inputClass}
              />
              <input
                placeholder="79.00"
                type="number"
                min="0"
                step="0.01"
                value={h.costBasis}
                onChange={e => updateHolding(h.id, 'costBasis', e.target.value)}
                className={inputClass}
              />
              <select
                value={h.assetClass}
                onChange={e => updateHolding(h.id, 'assetClass', e.target.value as AssetClass)}
                className={inputClass}
              >
                <option value="equity">Equity</option>
                <option value="fixed_income">Fixed Income</option>
                <option value="cash">Cash</option>
                <option value="alternative">Alternative</option>
              </select>
              <select
                value={h.sector}
                onChange={e => updateHolding(h.id, 'sector', e.target.value)}
                className={inputClass}
              >
                {SECTORS.map(s => <option key={s}>{s}</option>)}
              </select>
              <button
                type="button"
                onClick={() => removeHolding(h.id)}
                disabled={form.holdings.length === 1}
                className="text-gray-300 hover:text-red-400 disabled:opacity-20 transition-colors text-lg leading-none px-1"
                aria-label="Remove holding"
              >
                ×
              </button>
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={addHolding}
          className="mt-3 text-sm text-blue-600 hover:text-blue-800 font-medium"
        >
          + Add holding
        </button>
      </div>

      {/* ── Financial details ───────────────────────────────────────── */}
      <div className="grid md:grid-cols-2 gap-4">

        {/* Cash & Tax */}
        <div className="card p-5 space-y-4">
          <h3 className="font-semibold text-gray-700">Cash &amp; Tax Room</h3>
          <div>
            <label className="text-xs text-gray-500 block mb-1">Cash Balance ($)</label>
            <input
              placeholder="12,400"
              type="number"
              min="0"
              value={form.cashBalance}
              onChange={e => setForm(f => ({ ...f, cashBalance: e.target.value }))}
              className={inputClass}
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1">Remaining TFSA Room ($)</label>
            <input
              placeholder="18,500"
              type="number"
              min="0"
              value={form.tfsaRoom}
              onChange={e => setForm(f => ({ ...f, tfsaRoom: e.target.value }))}
              className={inputClass}
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1">Remaining RRSP Room ($)</label>
            <input
              placeholder="32,000"
              type="number"
              min="0"
              value={form.rrspRoom}
              onChange={e => setForm(f => ({ ...f, rrspRoom: e.target.value }))}
              className={inputClass}
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1">
              Gross Annual Income ($) <span className="text-gray-400">(optional)</span>
            </label>
            <input
              placeholder="85,000"
              type="number"
              min="0"
              value={form.annualIncome}
              onChange={e => setForm(f => ({ ...f, annualIncome: e.target.value }))}
              className={inputClass}
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1">
              Monthly Expenses ($) <span className="text-gray-400">(optional)</span>
            </label>
            <input
              placeholder="5,200"
              type="number"
              min="0"
              value={form.monthlyExpenses}
              onChange={e => setForm(f => ({ ...f, monthlyExpenses: e.target.value }))}
              className={inputClass}
            />
          </div>
        </div>

        {/* Investment Goal */}
        <div className="card p-5 space-y-4">
          <h3 className="font-semibold text-gray-700">Investment Goal</h3>
          <div>
            <label className="text-xs text-gray-500 block mb-1">Target Amount ($)</label>
            <input
              placeholder="800,000"
              type="number"
              min="1"
              value={form.goalAmount}
              onChange={e => setForm(f => ({ ...f, goalAmount: e.target.value }))}
              className={inputClass}
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1">Years to Goal</label>
            <input
              placeholder="18"
              type="number"
              min="1"
              max="50"
              value={form.goalYears}
              onChange={e => setForm(f => ({ ...f, goalYears: e.target.value }))}
              className={inputClass}
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1">Description (optional)</label>
            <input
              placeholder="Financial independence"
              value={form.goalDescription}
              onChange={e => setForm(f => ({ ...f, goalDescription: e.target.value }))}
              className={inputClass}
            />
          </div>
        </div>
      </div>

      {/* ── Portfolio settings ──────────────────────────────────────── */}
      <div className="card p-5">
        <h3 className="font-semibold text-gray-700 mb-4">Portfolio Settings</h3>
        <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <label className="text-xs text-gray-500 block mb-1">Risk Tolerance</label>
            <select
              value={form.riskTolerance}
              onChange={e => setForm(f => ({ ...f, riskTolerance: e.target.value as RiskTolerance }))}
              className={inputClass}
            >
              <option value="conservative">Conservative</option>
              <option value="balanced">Balanced</option>
              <option value="growth">Growth</option>
              <option value="aggressive">Aggressive</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1">Annual Contribution ($)</label>
            <input
              placeholder="12,000"
              type="number"
              min="0"
              value={form.annualContribution}
              onChange={e => setForm(f => ({ ...f, annualContribution: e.target.value }))}
              className={inputClass}
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1">Target Equity (%)</label>
            <input
              placeholder="70"
              type="number"
              min="0"
              max="100"
              value={form.targetEquityPct}
              onChange={e => setForm(f => ({ ...f, targetEquityPct: e.target.value }))}
              className={inputClass}
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1">Target Fixed Income (%)</label>
            <input
              placeholder="25"
              type="number"
              min="0"
              max="100"
              value={form.targetFixedIncomePct}
              onChange={e => setForm(f => ({ ...f, targetFixedIncomePct: e.target.value }))}
              className={inputClass}
            />
          </div>
        </div>
        <p className="text-xs text-gray-400 mt-3">
          Cash target = 100% − equity% − fixed income%
          {' · '}current cash target:{' '}
          <strong>
            {Math.max(0, 100 - (parseFloat(form.targetEquityPct) || 0) - (parseFloat(form.targetFixedIncomePct) || 0))}%
          </strong>
        </p>
      </div>

      {/* ── Error & submit ──────────────────────────────────────────── */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">
          {error}
        </div>
      )}

      <button
        type="submit"
        className="w-full bg-navy-800 hover:bg-navy-900 text-white font-semibold py-3.5 px-6 rounded-xl transition-colors text-sm"
        style={{ backgroundColor: '#132558' }}
      >
        Analyse My Portfolio →
      </button>
    </form>
  );
}
