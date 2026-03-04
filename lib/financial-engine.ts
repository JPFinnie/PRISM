import {
  PortfolioInput,
  PortfolioMetrics,
  ScoredAction,
  ScenarioProjection,
  RebalanceTrade,
  MonteCarloResult,
  ContributionGap,
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

  // 7. ADD_TO_POSITION — strong performer with room to grow
  {
    let bestCandidate: {
      symbol: string;
      gainPct: number;
      expectedReturn: number;
      weight: number;
      addAmount: number;
    } | null = null;

    for (const h of portfolio.holdings) {
      const mv = h.shares * h.currentPrice;
      const gainPct = h.costBasis > 0 ? ((h.currentPrice - h.costBasis) / h.costBasis) * 100 : 0;
      const weight = totalValue > 0 ? (mv / totalValue) * 100 : 0;
      const expectedReturn = securityReturn(h.symbol);

      if (
        gainPct > 15 &&
        weight < 15 &&
        expectedReturn > metrics.weightedAnnualReturn
      ) {
        if (!bestCandidate || expectedReturn > bestCandidate.expectedReturn) {
          const addAmount = Math.min(
            portfolio.cashBalance * 0.3,
            totalValue * 0.05,
          );
          bestCandidate = { symbol: h.symbol, gainPct, expectedReturn, weight, addAmount };
        }
      }
    }

    if (bestCandidate && bestCandidate.addAmount > 500) {
      const { symbol, gainPct, expectedReturn, weight, addAmount } = bestCandidate;
      const annualBenefit = addAmount * (expectedReturn - 0.045);
      const score = Math.min(
        100,
        (gainPct / 50) * 25 + (expectedReturn * 100) * 2 + (15 - weight) * 1.5,
      );
      actions.push({
        type: 'ADD_TO_POSITION',
        title: `Add to ${symbol}`,
        rationale: `${symbol} has gained ${gainPct.toFixed(1)}% and is expected to return ${(expectedReturn * 100).toFixed(1)}%/yr — above your portfolio average. At ${weight.toFixed(1)}% weight, there's room to increase exposure.`,
        score: Math.round(score),
        estimatedAnnualBenefit: Math.round(annualBenefit),
        urgency: 'low',
        actionDetails: {
          symbol,
          gainPercent: Math.round(gainPct * 10) / 10,
          currentWeight: Math.round(weight * 10) / 10,
          suggestedAmount: Math.round(addAmount),
          expectedReturn: Math.round(expectedReturn * 1000) / 10,
        },
      });
    }
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

// ─── Project a custom scenario ──────────────────────────────────────────────
export function projectCustomScenario(
  portfolio: PortfolioInput,
  metrics:   PortfolioMetrics,
  params:    { annualReturn: number; year1Shock: number; label: string },
): ScenarioProjection {
  const years  = portfolio.goal.yearsToGoal;
  const target = portfolio.goal.targetAmount;
  const pv     = metrics.totalValue;
  const pmt    = portfolio.annualContribution;

  const values: number[] = [Math.round(pv)];
  let v = pv;
  for (let y = 1; y <= years; y++) {
    const r = y === 1 ? params.year1Shock : params.annualReturn;
    v = v * (1 + r) + pmt;
    values.push(Math.round(Math.max(0, v)));
  }

  const ratio = values[years] / target;
  let prob: number;
  if (ratio >= 1.5) prob = 97;
  else if (ratio >= 1.2) prob = 90 + (ratio - 1.2) * 23;
  else if (ratio >= 1.0) prob = 72 + (ratio - 1.0) * 90;
  else if (ratio >= 0.8) prob = 45 + (ratio - 0.8) * 135;
  else if (ratio >= 0.5) prob = 15 + (ratio - 0.5) * 100;
  else prob = Math.max(3, ratio * 30);

  return {
    name:             'custom',
    label:            params.label,
    annualReturn:     params.annualReturn,
    finalValue:       values[years],
    goalProbability:  Math.round(Math.min(97, Math.max(3, prob))),
    yearByYearValues: values,
  };
}

// ─── Compute tradeoffs for a scored action ──────────────────────────────────
export function computeTradeoffs(
  action: ScoredAction,
  metrics: PortfolioMetrics,
  portfolio: PortfolioInput,
): string[] {
  const tradeoffs: string[] = [];

  switch (action.type) {
    case 'DEPLOY_CASH': {
      const currentMonths = metrics.liquidityRatio ?? 0;
      const excessCash = metrics.totalValue * ((metrics.currentAllocation.cashPct - portfolio.targetAllocation.cashPct) / 100);
      const newCash = Math.max(0, portfolio.cashBalance - excessCash);
      const newMonths = portfolio.monthlyExpenses && portfolio.monthlyExpenses > 0 ? newCash / portfolio.monthlyExpenses : 0;
      tradeoffs.push(`Reduces liquidity ratio from ${currentMonths.toFixed(1)} to ${newMonths.toFixed(1)} months`);
      tradeoffs.push('Deployed cash is subject to market volatility');
      break;
    }
    case 'TFSA_OPTIMIZE':
      tradeoffs.push('May trigger capital gains on transfer from taxable account');
      tradeoffs.push('TFSA withdrawals add back room only the following January');
      break;
    case 'RRSP_OPTIMIZE':
      tradeoffs.push('Reduces early-access flexibility compared to TFSA');
      tradeoffs.push('Withdrawals are taxed as income in retirement');
      break;
    case 'REBALANCE': {
      const crystallized = metrics.unrealizedGainLoss;
      if (crystallized > 0) {
        tradeoffs.push(`Selling overweight positions may crystallize gains of ~$${Math.round(crystallized * 0.3).toLocaleString()}`);
      }
      tradeoffs.push('Transaction costs apply to each trade');
      break;
    }
    case 'TAX_LOSS_HARVEST':
      tradeoffs.push('30-day superficial loss rule applies — cannot repurchase identical securities');
      tradeoffs.push('Reduces cost basis, increasing future capital gains');
      break;
    case 'REDUCE_CONCENTRATION': {
      const holding = portfolio.holdings.find(h => h.symbol === metrics.mostConcentratedHolding);
      if (holding) {
        const gl = (holding.currentPrice - holding.costBasis) * holding.shares;
        tradeoffs.push(`Locks in unrealized ${gl >= 0 ? 'gain' : 'loss'} of $${Math.abs(Math.round(gl)).toLocaleString()}`);
      }
      tradeoffs.push('Reduces exposure to a potentially strong individual performer');
      break;
    }
    case 'ADD_TO_POSITION':
      tradeoffs.push('Increases concentration in a single security');
      tradeoffs.push('Past performance does not guarantee future returns');
      break;
  }

  return tradeoffs;
}

// ─── Generate rebalancing trades ────────────────────────────────────────────
export function generateRebalanceTrades(
  portfolio: PortfolioInput,
  metrics: PortfolioMetrics,
): RebalanceTrade[] {
  const trades: RebalanceTrade[] = [];
  const { totalValue } = metrics;

  // Target values per asset class
  const targetEquity = totalValue * (portfolio.targetAllocation.equityPct / 100);
  const targetFI = totalValue * (portfolio.targetAllocation.fixedIncomePct / 100);

  // Current values per asset class
  const equityHoldings = portfolio.holdings.filter(h => h.assetClass === 'equity');
  const fiHoldings = portfolio.holdings.filter(h => h.assetClass === 'fixed_income');

  const currentEquity = equityHoldings.reduce((s, h) => s + h.shares * h.currentPrice, 0);
  const currentFI = fiHoldings.reduce((s, h) => s + h.shares * h.currentPrice, 0);

  const equityDelta = targetEquity - currentEquity;
  const fiDelta = targetFI - currentFI;

  // Overweight equity → sell from most concentrated first
  if (equityDelta < -100) {
    const sorted = [...equityHoldings].sort(
      (a, b) => (b.shares * b.currentPrice) - (a.shares * a.currentPrice),
    );
    let remaining = Math.abs(equityDelta);
    for (const h of sorted) {
      if (remaining <= 0) break;
      const mv = h.shares * h.currentPrice;
      const sellValue = Math.min(remaining, mv * 0.5); // sell up to 50% of any single holding
      const sellShares = Math.floor(sellValue / h.currentPrice);
      if (sellShares > 0) {
        trades.push({
          symbol: h.symbol,
          action: 'SELL',
          currentValue: mv,
          targetValue: mv - sellShares * h.currentPrice,
          deltaValue: -(sellShares * h.currentPrice),
          deltaShares: -sellShares,
          reason: 'Overweight equity — reduce to target allocation',
        });
        remaining -= sellShares * h.currentPrice;
      }
    }
  } else if (equityDelta > 100) {
    // Underweight equity → buy proportionally into existing holdings
    const total = currentEquity || 1;
    for (const h of equityHoldings) {
      const mv = h.shares * h.currentPrice;
      const proportion = mv / total;
      const buyValue = equityDelta * proportion;
      const buyShares = Math.floor(buyValue / h.currentPrice);
      if (buyShares > 0) {
        trades.push({
          symbol: h.symbol,
          action: 'BUY',
          currentValue: mv,
          targetValue: mv + buyShares * h.currentPrice,
          deltaValue: buyShares * h.currentPrice,
          deltaShares: buyShares,
          reason: 'Underweight equity — increase to target allocation',
        });
      }
    }
  }

  // Underweight fixed income → buy proportionally
  if (fiDelta > 100 && fiHoldings.length > 0) {
    const total = currentFI || 1;
    for (const h of fiHoldings) {
      const mv = h.shares * h.currentPrice;
      const proportion = mv / total;
      const buyValue = fiDelta * proportion;
      const buyShares = Math.floor(buyValue / h.currentPrice);
      if (buyShares > 0) {
        trades.push({
          symbol: h.symbol,
          action: 'BUY',
          currentValue: mv,
          targetValue: mv + buyShares * h.currentPrice,
          deltaValue: buyShares * h.currentPrice,
          deltaShares: buyShares,
          reason: 'Underweight fixed income — increase to target allocation',
        });
      }
    }
  } else if (fiDelta < -100 && fiHoldings.length > 0) {
    // Overweight fixed income → sell
    let remaining = Math.abs(fiDelta);
    for (const h of fiHoldings) {
      if (remaining <= 0) break;
      const mv = h.shares * h.currentPrice;
      const sellValue = Math.min(remaining, mv * 0.5);
      const sellShares = Math.floor(sellValue / h.currentPrice);
      if (sellShares > 0) {
        trades.push({
          symbol: h.symbol,
          action: 'SELL',
          currentValue: mv,
          targetValue: mv - sellShares * h.currentPrice,
          deltaValue: -(sellShares * h.currentPrice),
          deltaShares: -sellShares,
          reason: 'Overweight fixed income — reduce to target allocation',
        });
        remaining -= sellShares * h.currentPrice;
      }
    }
  }

  // Mark holds for any equity/FI holdings not traded
  for (const h of [...equityHoldings, ...fiHoldings]) {
    const mv = h.shares * h.currentPrice;
    if (!trades.find(t => t.symbol === h.symbol)) {
      trades.push({
        symbol: h.symbol,
        action: 'HOLD',
        currentValue: mv,
        targetValue: mv,
        deltaValue: 0,
        deltaShares: 0,
        reason: 'Position is within target range',
      });
    }
  }

  // Sort: SELL first, then BUY, then HOLD
  const order = { SELL: 0, BUY: 1, HOLD: 2 };
  return trades.sort((a, b) => order[a.action] - order[b.action]);
}

// ─── Monte Carlo simulation ────────────────────────────────────────────────
const VOLATILITY: Record<string, number> = {
  conservative: 0.06,
  balanced: 0.10,
  growth: 0.14,
  aggressive: 0.18,
};

export function runMonteCarlo(
  portfolio: PortfolioInput,
  metrics: PortfolioMetrics,
  runs: number = 500,
): MonteCarloResult {
  const years = portfolio.goal.yearsToGoal;
  const pv = metrics.totalValue;
  const pmt = portfolio.annualContribution;
  const target = portfolio.goal.targetAmount;
  const baseReturn = RETURN_ASSUMPTIONS[portfolio.riskTolerance].base;
  const vol = VOLATILITY[portfolio.riskTolerance] ?? 0.10;

  // Box-Muller transform for normal random variates
  function randn(): number {
    let u1 = 0, u2 = 0;
    while (u1 === 0) u1 = Math.random();
    while (u2 === 0) u2 = Math.random();
    return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  }

  // Collect all path values: paths[run][year]
  const finalValues: number[] = [];
  const allPaths: number[][] = [];
  let goalHits = 0;

  for (let r = 0; r < runs; r++) {
    const path: number[] = [pv];
    let v = pv;
    for (let y = 1; y <= years; y++) {
      const ret = baseReturn + vol * randn();
      v = v * (1 + ret) + pmt;
      v = Math.max(0, v);
      path.push(Math.round(v));
    }
    allPaths.push(path);
    finalValues.push(path[years]);
    if (path[years] >= target) goalHits++;
  }

  // Extract percentiles year by year
  const p10: number[] = [];
  const p25: number[] = [];
  const p50: number[] = [];
  const p75: number[] = [];
  const p90: number[] = [];

  for (let y = 0; y <= years; y++) {
    const vals = allPaths.map(p => p[y]).sort((a, b) => a - b);
    const pctile = (p: number) => vals[Math.floor(p * vals.length)] ?? 0;
    p10.push(pctile(0.10));
    p25.push(pctile(0.25));
    p50.push(pctile(0.50));
    p75.push(pctile(0.75));
    p90.push(pctile(0.90));
  }

  const sortedFinal = [...finalValues].sort((a, b) => a - b);

  return {
    runs,
    percentiles: { p10, p25, p50, p75, p90 },
    medianFinal: sortedFinal[Math.floor(runs / 2)],
    goalHitRate: Math.round((goalHits / runs) * 100),
    worstCase: sortedFinal[Math.floor(runs * 0.05)],
    bestCase: sortedFinal[Math.floor(runs * 0.95)],
  };
}

// ─── Contribution gap calculator ────────────────────────────────────────────
export function computeContributionGap(
  portfolio: PortfolioInput,
  metrics: PortfolioMetrics,
  targetProb: number = 75,
): ContributionGap {
  const baseReturn = RETURN_ASSUMPTIONS[portfolio.riskTolerance].base;
  // Adjust return conservatively for higher probability targets
  const adjReturn = targetProb >= 90 ? baseReturn * 0.6
    : targetProb >= 75 ? baseReturn * 0.8
      : baseReturn;

  const n = portfolio.goal.yearsToGoal;
  const fv = portfolio.goal.targetAmount;
  const pv = metrics.totalValue;
  const r = adjReturn;

  // PMT = (FV - PV × (1+r)^n) × r / ((1+r)^n - 1)
  const compoundFactor = Math.pow(1 + r, n);
  let requiredAnnual: number;
  if (compoundFactor <= 1 || r === 0) {
    requiredAnnual = n > 0 ? (fv - pv) / n : 0;
  } else {
    requiredAnnual = (fv - pv * compoundFactor) * r / (compoundFactor - 1);
  }

  const requiredMonthly = Math.max(0, requiredAnnual / 12);
  const currentMonthly = portfolio.annualContribution / 12;
  const gap = requiredMonthly - currentMonthly;

  return {
    requiredMonthly: Math.round(requiredMonthly),
    currentMonthly: Math.round(currentMonthly),
    gap: Math.round(gap),
    isOnTrack: gap <= 0,
    targetProbability: targetProb,
  };
}
