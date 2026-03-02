# Nexus Edge

AI-powered portfolio analysis for CIBC Investor's Edge users. Enter your holdings and Nexus Edge's deterministic scoring engine evaluates every possible action — TFSA optimisation, tax-loss harvesting, rebalancing, cash deployment — and surfaces the single highest-expected-value move. Then ask follow-up questions in plain English.

**Live:** [nexus-edge-tau.vercel.app](https://nexus-edge-tau.vercel.app)

---

## What it does

1. **Deterministic engine** — scores every actionable move across your portfolio using hard maths, not vibes. No AI hallucination on financial metrics.
2. **AI narrative** — GPT-4o-mini explains the top recommendation in plain English using only the engine's pre-calculated numbers.
3. **Three-scenario projections** — Base, Recession (−20% year 1), and Bull market trajectories across your goal timeline.
4. **Financial health metrics** — optional income and expenses unlock savings rate and emergency fund coverage alongside portfolio metrics.
5. **Portfolio chat** — ask follow-up questions after your analysis. "What happens if I increase contributions by $500?" "Why was tax-loss harvesting ranked so low?" The AI answers using your actual numbers as context.

## Scored actions

| Action | Trigger |
|---|---|
| Deploy Idle Cash | Cash % exceeds target allocation |
| Maximize TFSA Room | Unused TFSA contribution room > $1K |
| Use RRSP Room | Unused RRSP room > $5K |
| Rebalance Portfolio | Allocation drift > 5% from target |
| Tax-Loss Harvest | Positions down > 8% |
| Reduce Concentration Risk | Single holding > 25% of portfolio |

## Tech stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **AI**: OpenAI GPT-4o-mini (mock fallback if no key)
- **Deployment**: Vercel

## Running locally

```bash
# Install dependencies
cd investors-edge
npm install

# (Optional) Configure AI
cp .env.example .env.local
# Add OPENAI_API_KEY to .env.local

# Start dev server
npm run dev
# → http://localhost:3000
```

Without `OPENAI_API_KEY` the app runs fully with a deterministic mock narrative — no API key required to evaluate the engine.

## Environment variables

| Variable | Required | Description |
|---|---|---|
| `OPENAI_API_KEY` | No | Enables live AI narratives and portfolio chat |
| `MOCK_AI` | No | Set to `true` to force mock mode even with a key |

## Architecture

```
app/
  api/
    analyze/route.ts   ← deterministic engine + AI narrative
    chat/route.ts      ← contextual follow-up Q&A
  page.tsx             ← main UI
components/
  PortfolioForm.tsx    ← holdings + goal input form
  RecommendationCard.tsx
  ScenarioChart.tsx
  ChatPanel.tsx        ← portfolio chat UI
  LoadingState.tsx
lib/
  financial-engine.ts  ← scoring, metrics, scenario projections
  openai.ts            ← AI narrative generation
  types.ts
```

## Inspired by

[WealthSimple Pulse](https://github.com/Chimppppy/WealthSimple-AI-Submission) — adapted and extended for CIBC Investor's Edge with Canadian tax-sheltered account optimisation (TFSA/RRSP) and a portfolio chat interface.

---

*This tool is for informational purposes only and does not constitute personalised financial advice. Consult a registered financial advisor (CFP/CFA) before making investment decisions.*
