import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { ChatRequest } from '@/lib/types';

function buildSystemPrompt(req: ChatRequest): string {
  const { analysis, portfolio } = req;
  const m = analysis.metrics;
  const top = analysis.topAction;

  const holdingsSummary = portfolio.holdings
    .map(h => `${h.symbol} (${h.assetClass}): ${h.shares} shares @ $${h.currentPrice}`)
    .join(', ');

  const actionsSummary = analysis.allActions
    .map((a, i) => `${i + 1}. ${a.title} (score ${a.score}/100)`)
    .join('\n');

  const scenariosSummary = analysis.scenarios
    .map(s => `${s.label}: ${s.goalProbability}% probability, $${Math.round(s.finalValue).toLocaleString()} projected`)
    .join('\n');

  const savingsLine = m.savingsRate !== null
    ? `\nSavings rate: ${(m.savingsRate * 100).toFixed(1)}%`
    : '';
  const liquidityLine = m.liquidityRatio !== null
    ? `\nEmergency fund: ${m.liquidityRatio.toFixed(1)} months of expenses`
    : '';

  return `You are a financial advisor assistant for Nexus Edge, helping a CIBC Investor's Edge user understand their portfolio analysis.

PORTFOLIO SNAPSHOT:
Total value: $${Math.round(m.totalValue).toLocaleString()}
Equity: ${m.currentAllocation.equityPct.toFixed(1)}% | Fixed income: ${m.currentAllocation.fixedIncomePct.toFixed(1)}% | Cash: ${m.currentAllocation.cashPct.toFixed(1)}%
Unrealised gain/loss: $${Math.round(m.unrealizedGainLoss).toLocaleString()} (${m.unrealizedGainLossPct.toFixed(1)}%)
Weighted annual return: ${(m.weightedAnnualReturn * 100).toFixed(1)}%
TFSA room: $${portfolio.tfsaRoomRemaining.toLocaleString()} | RRSP room: $${portfolio.rrspRoomRemaining.toLocaleString()}
Annual contribution: $${portfolio.annualContribution.toLocaleString()}${savingsLine}${liquidityLine}

HOLDINGS: ${holdingsSummary}

TOP RECOMMENDATION: ${top.title} (score ${top.score}/100)
Rationale: ${top.rationale}
${top.estimatedAnnualBenefit > 0 ? `Estimated annual benefit: $${top.estimatedAnnualBenefit.toLocaleString()}` : ''}

ALL SCORED ACTIONS:
${actionsSummary}

SCENARIO PROJECTIONS (goal: $${portfolio.goal.targetAmount.toLocaleString()} in ${portfolio.goal.yearsToGoal} years):
${scenariosSummary}

STRICT RULES:
- Never invent numbers. Only reference data provided above.
- Be concise and direct — 2-4 sentences per answer unless more detail is clearly needed.
- Always add a brief disclaimer if giving forward-looking statements.
- Do not execute trades or provide personalised regulated advice.`;
}

function mockReply(question: string): string {
  return `I can see your portfolio details, but chat responses require an OpenAI API key. Configure OPENAI_API_KEY in your environment to enable AI-powered follow-up questions.\n\nYou asked: "${question}"`;
}

export async function POST(request: NextRequest) {
  try {
    const body: ChatRequest = await request.json();
    const { messages } = body;

    if (!messages?.length) {
      return NextResponse.json({ error: 'No messages provided.' }, { status: 400 });
    }

    const lastMessage = messages[messages.length - 1];
    if (lastMessage.role !== 'user') {
      return NextResponse.json({ error: 'Last message must be from user.' }, { status: 400 });
    }

    if (!process.env.OPENAI_API_KEY || process.env.MOCK_AI === 'true') {
      return NextResponse.json({ reply: mockReply(lastMessage.content) });
    }

    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const systemPrompt = buildSystemPrompt(body);

    const response = await client.chat.completions.create({
      model:       'gpt-4o-mini',
      max_tokens:  400,
      temperature: 0.2,
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages.map(m => ({ role: m.role as 'user' | 'assistant', content: m.content })),
      ],
    });

    const reply = response.choices[0]?.message?.content?.trim() ?? 'No response generated.';
    return NextResponse.json({ reply });

  } catch (error) {
    console.error('[/api/chat]', error);
    return NextResponse.json(
      { error: 'Chat failed. Please try again.' },
      { status: 500 },
    );
  }
}
