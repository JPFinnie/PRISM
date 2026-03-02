import {
  PortfolioInput,
  PortfolioMetrics,
  ScoredAction,
  ScenarioProjection,
} from './types';

// ─── Return assumptions by risk tolerance ───────────────────────────────────
const RETURN_ASSUMPTIONS: Record<
  string,
  { base: number; recessionShock: number; bull: number }
> = {
  conservative: { base: 0.05, recessionShock: -0.12, bull: 0.08 },
  balanced:     { base: 0.07, recessionShock: -0.22, bull: 0.12 },
  growth:       { base: 0.09, recessionShock: -0.32, bull: 0.16 },
  aggressive:   { base: 0.11, recessionShock: -0.42, bull: 0.20 },
};

// ─── Default annual returns for common Canadian securities ──────────────────
const KNOWN_RETURNS: Record<string, number> = {
  'TD.TO':   0.090, 'RY.TO':   0.100, 'BNS.TO':  0.070,
  'BMO.TO':  0.090, 'CM.TO':   0.080, 'NA.TO':   0.110,
  'XIU.TO':  0.090, 'XIC.TO':  0.090, 'VFV.TO':  0.145,
  'ZSP.TO':  0.145, 'XEQT.TO': 0.105, 'XGRO.TO': 0.095,
  'XBAL.TO': 0.080, 'VDY.TO':  0.085, 'ZAG.TO':  0.035,
  'XBB.TO':  0.030, 'VSB.TO':  0.030, 'ZCN.TO':  0.090,
  'HXT.TO':  0.092, 'CASH.TO': 0.050, 'PSA.TO':  0.050,
  'QQQ':     0.160, 'SPY':     0.145, 'VTI':     0.140,
};

function securityReturn(symbol: string): number {
  return KNOWN_RETURNS[symbol.toUpperCase()] ?? 0.08;
}

// ─── Compute portfolio metrics ───────────────────────────────────────────────
export function computeMetrics(portfolio: PortfolioInput): PortfolioMetrics {
  const { holdings, cashBalance, targetAllocation } = portfolio;

  const investedValue = holdings.reduce(
    (s, h) => s + h.shares * h.currentPrice, 0,
  );
  const totalValue = investedValue + cashBalance;
  const totalCostBasis = holdings.reduce(
    (s, h) => s + h.shares * h.costBasis, 0,
  );
  const unrealizedGainLoss = investedValue - totalCostBasis;
  const unrealizedGainLossPct =
    totalCostBasis > 0 ? (unrealizedGainLoss / totalCostBasis) * 100 : 0;

  // Asset-class breakdown
  const equityValue = holdings
    .filter(h => h.assetClass === 'equity')
    .reduce((s, h) => s + h.shares * h.currentPrice, 0);
  const fixedIncomeValue = holdings
    .filter(h => h.assetClass === 'fixed_income')
    .reduce((s, h) => s + h.shares * h.currentPrice, 0);

  const equityPct       = totalValue > 0 ? (equityValue / totalValue) * 100 : 0;
  const fixedIncomePct  = totalValue > 0 ? (fixedIncomeValue / totalValue) * 100 : 0;
  const cashPct         = totalValue > 0 ? (cashBalance / totalValue) * 100 : 0;

  const allocationDrift = {
    equityDrift:      equityPct - targetAllocation.equityPct,
    fixedIncomeDrift: fixedIncomePct - targetAllocation.fixedIncomePct,
  };

  // Weighted annual return
  const weightedAnnualReturn =
    totalValue > 0
      ? holdings.reduce((s, h) => {
          const w   = (h.shares * h.currentPrice) / totalValue;
          const ret = securityReturn(h.symbol);
          return s + w * ret;
        }, 0)
      : 0;

  // Concentration risk
  let concentrationRisk = 0;
  let mostConcentratedHolding = '';
  for (const h of holdings) {
    const pct = totalValue > 0 ? (h.shares * h.currentPrice) / totalValue * 100 : 0;
    if (pct > concentrationRisk) {
      concentrationRisk = pct;
      mostConcentratedHolding = h.symbol;
    }
  }

  // Positions in loss
  const positionsInLoss = holdings
    .filter(h => h.currentPrice < h.costBasis)
    .map(h => ({
      symbol:         h.symbol,
      unrealizedLoss: (h.costBasis - h.currentPrice) * h.shares,
      lossPercent:    ((h.costBasis - h.currentPrice) / h.costBasis) * 100,
    }))
    .sort((a, b) => b.unrealizedLoss - a.unrealizedLoss);

  const monthlyIncome = portfolio.annualIncome ? portfolio.annualIncome / 12 : null;
  const savingsRate =
    monthlyIncome && portfolio.monthlyExpenses
      ? Math.max(0, (monthlyIncome - portfolio.monthlyExpenses) / monthlyIncome)
      : null;
  const liquidityRatio =
    portfolio.monthlyExpenses && portfolio.monthlyExpenses > 0
      ? cashBalance / portfolio.monthlyExpenses
      : null;

  return {
    totalValue,
    investedValue,
    cashValue: cashBalance,
    totalCostBasis,
    unrealizedGainLoss,
    unrealizedGainLossPct,
    currentAllocation: { equityPct, fixedIncomePct, cashPct },
    allocationDrift,
    weightedAnnualReturn,
    concentrationRisk,
    mostConcentratedHolding,
    positionsInLoss,
    savingsRate,
    liquidityRatio,
  };
}

// ─── Score all possible actions ──────────────────────────────────────────────
export function scoreActions(
  portfolio: PortfolioInput,
  metrics: PortfolioMetrics,
): ScoredAction[] {
  const actions: ScoredAction[] = [];
  const { totalValue } = metrics;

  // 1. DEPLOY_CASH — idle cash above target
  const excessCashPct =
    metrics.currentAllocation.cashPct - portfolio.targetAllocation.cashPct;
  if (excessCashPct > 3) {
    const excessCash      = totalValue * (excessCashPct / 100);
    const cashRate        = 0.045;
    const annualBenefit   = excessCash * (metrics.weightedAnnualReturn - cashRate);
    const score           = Math.min(100, (excessCashPct / 20) * 75 + (annualBenefit / totalValue) * 300);
    actions.push({
      type:  'DEPLOY_CASH',
      title: 'Deploy Idle Cash',
      rationale: `$${Math.round(excessCash).toLocaleString()} is sitting in cash earning ~${(cashRate * 100).toFixed(1)}% while your target allocation calls for only ${portfolio.targetAllocation.cashPct}% cash.`,
      score:               Math.round(score),
      estimatedAnnualBenefit: Math.round(annualBenefit),
      urgency:             excessCashPct > 10 ? 'high' : 'medium',
      actionDetails: {
        excessCash:        Math.round(excessCash),
        currentCashPct:    Math.round(excessCashPct * 10) / 10,
        annualDrag:        Math.round(annualBenefit),
      },
    });
  }

  // 2. TFSA_OPTIMIZE — unused TFSA room
  if (portfolio.tfsaRoomRemaining > 1000) {
    const room          = portfolio.tfsaRoomRemaining;
    const taxDragRate   = 0.20;
    const annualBenefit = Math.min(room, totalValue) * metrics.weightedAnnualReturn * taxDragRate;
    const score         = Math.min(100, (room / 50000) * 55 + (annualBenefit / totalValue) * 600);
    actions.push({
      type:  'TFSA_OPTIMIZE',
      title: 'Maximize TFSA Room',
      rationale: `$${room.toLocaleString()} of TFSA contribution room is unused. Shifting taxable holdings inside your TFSA shelters returns from tax permanently.`,
      score:               Math.round(score),
      estimatedAnnualBenefit: Math.round(annualBenefit),
      urgency:             room > 20000 ? 'high' : 'medium',
      actionDetails: {
        tfsaRoom:            room,
        estimatedTaxSaving:  Math.round(annualBenefit),
      },
    });
  }

  // 3. RRSP_OPTIMIZE — unused RRSP room
  if (portfolio.rrspRoomRemaining > 5000) {
    const room          = portfolio.rrspRoomRemaining;
    const marginalRate  = 0.33;
    const annualBenefit = Math.min(room * 0.15, 25000) * marginalRate;
    const score         = Math.min(100, (room / 100000) * 45 + 15);
    actions.push({
      type:  'RRSP_OPTIMIZE',
      title: 'Use RRSP Contribution Room',
      rationale: `$${room.toLocaleString()} of RRSP room is available. Contributions reduce your taxable income this year and defer tax on compound growth.`,
      score:               Math.round(score),
      estimatedAnnualBenefit: Math.round(annualBenefit),
      urgency:             'medium',
      actionDetails: {
        rrspRoom:           room,
        estimatedTaxRefund: Math.round(Math.min(room * 0.15, 25000) * marginalRate),
      },
    });
  }

  // 4. REBALANCE — allocation drift > 5%
  const totalDrift =
    Math.abs(metrics.allocationDrift.equityDrift) +
    Math.abs(metrics.allocationDrift.fixedIncomeDrift);
  if (totalDrift > 5) {
    const score         = Math.min(100, totalDrift * 4);
    const annualBenefit = totalValue * 0.003 * (totalDrift / 10);
    actions.push({
      type:  'REBALANCE',
      title: 'Rebalance Portfolio',
      rationale: `Your portfolio has drifted ${Math.round(totalDrift)}% from target. Equity is ${metrics.allocationDrift.equityDrift > 0 ? 'over' : 'under'}weight by ${Math.abs(Math.round(metrics.allocationDrift.equityDrift))}%. Rebalancing restores your intended risk exposure.`,
      score:               Math.round(score),
      estimatedAnnualBenefit: Math.round(annualBenefit),
      urgency:             totalDrift > 15 ? 'high' : 'medium',
      actionDetails: {
        equityDrift:      Math.round(metrics.allocationDrift.equityDrift * 10) / 10,
        fixedIncomeDrift: Math.round(metrics.allocationDrift.fixedIncomeDrift * 10) / 10,
        totalDrift:       Math.round(totalDrift * 10) / 10,
      },
    });
  }

  // 5. TAX_LOSS_HARVEST — positions down > 8%
  const candidates = metrics.positionsInLoss.filter(p => p.lossPercent > 8);
  if (candidates.length > 0) {
    const totalHarvestable = candidates.reduce((s, p) => s + p.unrealizedLoss, 0);
    const taxSaving        = totalHarvestable * 0.267; // 53.5% marginal × 50% inclusion
    const score            = Math.min(100, (taxSaving / totalValue) * 500 + 20);
    actions.push({
      type:  'TAX_LOSS_HARVEST',
      title: 'Tax-Loss Harvest',
      rationale: `${candidates.map(p => p.symbol).join(', ')} ${candidates.length === 1 ? 'is' : 'are'} in a loss position. Crystallizing these losses offsets capital gains elsewhere in your portfolio.`,
      score:               Math.round(score),
      estimatedAnnualBenefit: Math.round(taxSaving),
      urgency:             taxSaving > 2000 ? 'high' : 'medium',
      actionDetails: {
        positions:              candidates.map(p => p.symbol).join(', '),
        totalUnrealizedLoss:    Math.round(totalHarvestable),
        estimatedTaxSaving:     Math.round(taxSaving),
      },
    });
  }

  // 6. REDUCE_CONCENTRATION — single holding > 25%
  if (metrics.concentrationRisk > 25) {
    const score = Math.min(100, (metrics.concentrationRisk - 20) * 3);
    actions.push({
      type:  'REDUCE_CONCENTRATION',
      title: 'Reduce Concentration Risk',
      rationale: `${metrics.mostConcentratedHolding} is ${Math.round(metrics.concentrationRisk)}% of your portfolio. Single-stock concentration adds unsystematic risk that diversification can eliminate.`,
      score:               Math.round(score),
      estimatedAnnualBenefit: 0,
      urgency:             metrics.concentrationRisk > 40 ? 'high' : 'medium',
      actionDetails: {
        holding:       metrics.mostConcentratedHolding,
        concentration: Math.round(metrics.concentrationRisk),
        targetMax:     20,
      },
    });
  }

  return actions.sort((a, b) => b.score - a.score);
}

// ─── Project three scenarios ─────────────────────────────────────────────────
export function projectScenarios(
  portfolio: PortfolioInput,
  metrics:   PortfolioMetrics,
): ScenarioProjection[] {
  const assumptions = RETURN_ASSUMPTIONS[portfolio.riskTolerance];
  const years       = portfolio.goal.yearsToGoal;
  const target      = portfolio.goal.targetAmount;
  const pv          = metrics.totalValue;
  const pmt         = portfolio.annualContribution;

  function projectYears(
    annualReturn:    number,
    recessionShock?: number,
  ): number[] {
    const values: number[] = [Math.round(pv)];
    let v = pv;
    for (let y = 1; y <= years; y++) {
      const r = recessionShock !== undefined && y === 1 ? recessionShock : annualReturn;
      v = v * (1 + r) + pmt;
      values.push(Math.round(Math.max(0, v)));
    }
    return values;
  }

  function fvToProb(fv: number): number {
    const ratio = fv / target;
    if (ratio >= 1.5) return 97;
    if (ratio >= 1.2) return 90 + (ratio - 1.2) * 23;
    if (ratio >= 1.0) return 72 + (ratio - 1.0) * 90;
    if (ratio >= 0.8) return 45 + (ratio - 0.8) * 135;
    if (ratio >= 0.5) return 15 + (ratio - 0.5) * 100;
    return Math.max(3, ratio * 30);
  }

  const baseValues      = projectYears(assumptions.base);
  const recessionValues = projectYears(assumptions.base, assumptions.recessionShock);
  const bullValues      = projectYears(assumptions.bull);

  const clamp = (n: number) => Math.round(Math.min(97, Math.max(3, n)));

  return [
    {
      name:               'base',
      label:              'Base Case',
      annualReturn:       assumptions.base,
      finalValue:         baseValues[years],
      goalProbability:    clamp(fvToProb(baseValues[years])),
      yearByYearValues:   baseValues,
    },
    {
      name:               'recession',
      label:              'Recession',
      annualReturn:       assumptions.base,
      finalValue:         recessionValues[years],
      goalProbability:    clamp(fvToProb(recessionValues[years])),
      yearByYearValues:   recessionValues,
    },
    {
      name:               'bull',
      label:              'Bull Market',
      annualReturn:       assumptions.bull,
      finalValue:         bullValues[years],
      goalProbability:    clamp(fvToProb(bullValues[years])),
      yearByYearValues:   bullValues,
    },
  ];
}
