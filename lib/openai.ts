import OpenAI from 'openai';
import { PortfolioMetrics, ScoredAction, ScenarioProjection, AIInsight } from './types';

// ─── Mock fallback (no API key required) ────────────────────────────────────
function buildMockInsight(topAction: ScoredAction, metrics: PortfolioMetrics): AIInsight {
  const benefit = topAction.estimatedAnnualBenefit > 0
    ? ` Estimated annual benefit: $${topAction.estimatedAnnualBenefit.toLocaleString()}.`
    : '';

  return {
    headline:    `${topAction.title}: Your Highest-Leverage Action Right Now`,
    explanation: `${topAction.rationale}${benefit}\n\nThe Nexus Edge scoring engine evaluated every actionable move across your portfolio and ranked this highest based on expected financial impact and time-sensitivity. Acting on this recommendation moves you meaningfully closer to your investment goal without requiring major changes to your strategy.\n\nReview the scenario projections below to see how this action affects your goal probability across market conditions.`,
    keyNumbers:  Object.entries(topAction.actionDetails)
      .slice(0, 3)
      .map(([k, v]) => `${k.replace(/([A-Z])/g, ' $1').trim()}: ${typeof v === 'number' && v > 999 ? '$' + Number(v).toLocaleString() : v}`),
    confidence:  Math.min(88, Math.max(52, topAction.score)),
    disclaimer:  'This analysis is for informational purposes only and does not constitute personalized financial advice. Past performance does not guarantee future results. Consult a registered financial advisor (CFP/CFA) before making investment decisions.',
  };
}

// ─── Live OpenAI insight ─────────────────────────────────────────────────────
export async function generateInsight(
  metrics:    PortfolioMetrics,
  topAction:  ScoredAction,
  allActions: ScoredAction[],
  scenarios:  ScenarioProjection[],
): Promise<AIInsight> {
  if (!process.env.OPENAI_API_KEY || process.env.MOCK_AI === 'true') {
    return buildMockInsight(topAction, metrics);
  }

  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const confidenceMin = Math.max(52, topAction.score - 15);
  const confidenceMax = Math.min(91, topAction.score + 5);

  const systemPrompt = `You are a financial analysis assistant for Nexus Edge, a self-directed investing tool for CIBC Nexus Edge users. You receive pre-calculated outputs from a deterministic financial engine. Your only job is to explain the top recommendation in clear, professional language.

STRICT RULES:
- Do NOT invent numbers. Use ONLY the data provided.
- Be direct and professional. Zero fluff or marketing language.
- The confidence score MUST be between ${confidenceMin} and ${confidenceMax}.
- Maximum 200 words for the explanation field.
- Always include a clear disclaimer.
- Respond with ONLY valid JSON, no markdown, no code fences.`;

  const userPrompt = `PORTFOLIO METRICS:
${JSON.stringify(metrics, null, 2)}

TOP RECOMMENDED ACTION:
${JSON.stringify(topAction, null, 2)}

ALL SCORED ACTIONS (context only):
${JSON.stringify(allActions.slice(0, 4).map(a => ({ type: a.type, score: a.score, title: a.title })), null, 2)}

SCENARIO PROJECTIONS:
${JSON.stringify(scenarios.map(s => ({
  scenario:        s.label,
  finalValue:      '$' + s.finalValue.toLocaleString(),
  goalProbability: s.goalProbability + '%',
})), null, 2)}

Respond in this exact JSON format:
{
  "headline":    "<one punchy sentence — the #1 action>",
  "explanation": "<2-3 paragraphs explaining why this is the highest-leverage action right now>",
  "keyNumbers":  ["<stat 1>", "<stat 2>", "<stat 3>"],
  "confidence":  <integer between ${confidenceMin} and ${confidenceMax}>,
  "disclaimer":  "This analysis is for informational purposes only and does not constitute personalized financial advice. Past performance does not guarantee future results. Consult a registered financial advisor before making investment decisions."
}`;

  const response = await client.chat.completions.create({
    model:       'gpt-4o-mini',
    max_tokens:  800,
    temperature: 0.15,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user',   content: userPrompt },
    ],
  });

  const raw = response.choices[0]?.message?.content ?? '';

  // Strip any accidental markdown fences
  const jsonStr = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
  const parsed  = JSON.parse(jsonStr);

  return {
    headline:    String(parsed.headline   ?? topAction.title),
    explanation: String(parsed.explanation ?? ''),
    keyNumbers:  Array.isArray(parsed.keyNumbers) ? parsed.keyNumbers.slice(0, 3).map(String) : [],
    confidence:  Math.max(confidenceMin, Math.min(confidenceMax, Number(parsed.confidence) || 70)),
    disclaimer:  String(parsed.disclaimer ?? 'This is not personalized financial advice.'),
  };
}
