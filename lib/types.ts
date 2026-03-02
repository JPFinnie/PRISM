export type AssetClass = 'equity' | 'fixed_income' | 'cash' | 'alternative';

export type RiskTolerance = 'conservative' | 'balanced' | 'growth' | 'aggressive';

export type ActionType =
  | 'DEPLOY_CASH'
  | 'TFSA_OPTIMIZE'
  | 'RRSP_OPTIMIZE'
  | 'REBALANCE'
  | 'TAX_LOSS_HARVEST'
  | 'REDUCE_CONCENTRATION'
  | 'ADD_TO_POSITION';

export interface Holding {
  symbol: string;
  shares: number;
  currentPrice: number;
  costBasis: number;
  assetClass: AssetClass;
  sector: string;
}

export interface PortfolioInput {
  holdings: Holding[];
  cashBalance: number;
  tfsaRoomRemaining: number;
  rrspRoomRemaining: number;
  riskTolerance: RiskTolerance;
  annualContribution: number;
  annualIncome?: number;
  monthlyExpenses?: number;
  goal: {
    targetAmount: number;
    yearsToGoal: number;
    description: string;
  };
  targetAllocation: {
    equityPct: number;
    fixedIncomePct: number;
    cashPct: number;
  };
}

export interface PortfolioMetrics {
  totalValue: number;
  investedValue: number;
  cashValue: number;
  totalCostBasis: number;
  unrealizedGainLoss: number;
  unrealizedGainLossPct: number;
  currentAllocation: {
    equityPct: number;
    fixedIncomePct: number;
    cashPct: number;
  };
  allocationDrift: {
    equityDrift: number;
    fixedIncomeDrift: number;
  };
  weightedAnnualReturn: number;
  concentrationRisk: number;
  mostConcentratedHolding: string;
  positionsInLoss: Array<{
    symbol: string;
    unrealizedLoss: number;
    lossPercent: number;
  }>;
  savingsRate: number | null;
  liquidityRatio: number | null;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ChatRequest {
  analysis: AnalysisResult;
  portfolio: PortfolioInput;
  messages: ChatMessage[];
}

export interface ScoredAction {
  type: ActionType;
  title: string;
  rationale: string;
  score: number;
  estimatedAnnualBenefit: number;
  urgency: 'high' | 'medium' | 'low';
  actionDetails: Record<string, string | number>;
}

export interface ScenarioProjection {
  name: 'base' | 'recession' | 'bull';
  label: string;
  annualReturn: number;
  finalValue: number;
  goalProbability: number;
  yearByYearValues: number[];
}

export interface AIInsight {
  headline: string;
  explanation: string;
  keyNumbers: string[];
  confidence: number;
  disclaimer: string;
}

export interface AnalysisResult {
  metrics: PortfolioMetrics;
  topAction: ScoredAction;
  allActions: ScoredAction[];
  scenarios: ScenarioProjection[];
  aiInsight: AIInsight;
  analysisTimestamp: string;
}

export interface AnalyzeRequest {
  portfolio: PortfolioInput;
}
