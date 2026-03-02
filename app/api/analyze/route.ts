import { NextRequest, NextResponse } from 'next/server';
import { computeMetrics, scoreActions, projectScenarios } from '@/lib/financial-engine';
import { generateInsight } from '@/lib/openai';
import { AnalyzeRequest } from '@/lib/types';

export async function POST(request: NextRequest) {
  try {
    const body: AnalyzeRequest = await request.json();
    const { portfolio } = body;

    if (!portfolio?.holdings?.length) {
      return NextResponse.json(
        { error: 'Portfolio data with at least one holding is required.' },
        { status: 400 },
      );
    }

    // ── 1. Deterministic metrics ─────────────────────────────────────────────
    const metrics = computeMetrics(portfolio);

    // ── 2. Score every possible action ───────────────────────────────────────
    const allActions = scoreActions(portfolio, metrics);

    if (allActions.length === 0) {
      return NextResponse.json(
        { error: 'No actionable recommendations found. Your portfolio looks well-optimised.' },
        { status: 422 },
      );
    }

    const topAction = allActions[0];

    // ── 3. Scenario projections ───────────────────────────────────────────────
    const scenarios = projectScenarios(portfolio, metrics);

    // ── 4. AI narrative (GPT-4o-mini or mock fallback) ───────────────────────
    const aiInsight = await generateInsight(metrics, topAction, allActions, scenarios);

    return NextResponse.json({
      metrics,
      topAction,
      allActions,
      scenarios,
      aiInsight,
      analysisTimestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[/api/analyze]', error);
    return NextResponse.json(
      { error: 'Analysis failed. Please check your inputs and try again.' },
      { status: 500 },
    );
  }
}
