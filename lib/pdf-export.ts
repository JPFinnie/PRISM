import jsPDF from 'jspdf';
import { AnalysisResult, PortfolioInput } from './types';

/* ═══════════════════════════════════════════════════
   Color palette (matches dark theme)
   ═══════════════════════════════════════════════════ */
const C = {
  bg:       [9, 9, 11]       as [number, number, number],
  surface:  [24, 24, 27]     as [number, number, number],
  border:   [39, 39, 42]     as [number, number, number],
  accent:   [16, 185, 129]   as [number, number, number],
  blue:     [59, 130, 246]   as [number, number, number],
  gold:     [245, 158, 11]   as [number, number, number],
  red:      [239, 68, 68]    as [number, number, number],
  purple:   [168, 85, 247]   as [number, number, number],
  text:     [250, 250, 250]  as [number, number, number],
  textMuted:[161, 161, 170]  as [number, number, number],
  textLight:[113, 113, 122]  as [number, number, number],
};

/* ═══════════════════════════════════════════════════
   Helpers
   ═══════════════════════════════════════════════════ */
function fmt(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `$${Math.round(n / 1_000).toLocaleString()}K`;
  return `$${Math.round(n).toLocaleString()}`;
}

function pct(n: number): string {
  return `${(n * 100).toFixed(1)}%`;
}

/** Draw a dark rounded rectangle */
function drawCard(doc: jsPDF, x: number, y: number, w: number, h: number) {
  doc.setFillColor(...C.surface);
  doc.roundedRect(x, y, w, h, 3, 3, 'F');
  doc.setDrawColor(...C.border);
  doc.roundedRect(x, y, w, h, 3, 3, 'S');
}

/** Draw dark page background */
function drawBg(doc: jsPDF) {
  doc.setFillColor(...C.bg);
  doc.rect(0, 0, 210, 297, 'F');
}

/** Section header with accent color */
function sectionHeader(doc: jsPDF, y: number, text: string): number {
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(...C.accent);
  doc.text(text.toUpperCase(), 20, y);
  return y + 6;
}

/** Key-value row */
function kvRow(doc: jsPDF, y: number, label: string, value: string, indent = 24): number {
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...C.textMuted);
  doc.text(label, indent, y);
  doc.setTextColor(...C.text);
  doc.setFont('helvetica', 'bold');
  doc.text(value, indent + 80, y);
  doc.setFont('helvetica', 'normal');
  return y + 5.5;
}

/** Wrapped text block */
function wrappedText(doc: jsPDF, x: number, y: number, text: string, maxW: number, fontSize = 8.5): number {
  doc.setFontSize(fontSize);
  const lines = doc.splitTextToSize(text, maxW);
  doc.text(lines, x, y);
  return y + lines.length * (fontSize * 0.45) + 2;
}

/* ═══════════════════════════════════════════════════
   Main PDF generator
   ═══════════════════════════════════════════════════ */
export function generatePDF(result: AnalysisResult, portfolio: PortfolioInput | null) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pw = 170; // printable width (210 - 20 - 20 margins)

  /* ─────────────────────────────────────────────────
     PAGE 1 — Cover + Portfolio Summary
     ───────────────────────────────────────────────── */
  drawBg(doc);

  // Header bar
  doc.setFillColor(...C.accent);
  doc.rect(0, 0, 210, 2, 'F');

  // Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.setTextColor(...C.text);
  doc.text('Prism', 20, 22);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(...C.textMuted);
  doc.text('Portfolio Analysis Report', 20, 29);

  // Date
  doc.setFontSize(8);
  doc.setTextColor(...C.textLight);
  doc.text(new Date().toLocaleDateString('en-CA', { year: 'numeric', month: 'long', day: 'numeric' }), 20, 35);

  // Divider
  doc.setDrawColor(...C.border);
  doc.line(20, 39, 190, 39);

  // Portfolio Summary card
  let y = 44;
  y = sectionHeader(doc, y, 'Portfolio Summary');
  drawCard(doc, 18, y - 2, pw + 4, 52);

  y += 4;
  const m = result.metrics;
  y = kvRow(doc, y, 'Total Value', fmt(m.totalValue));
  y = kvRow(doc, y, 'Unrealized G/L', `${fmt(m.unrealizedGainLoss)} (${m.unrealizedGainLossPct.toFixed(1)}%)`);
  y = kvRow(doc, y, 'Equity', `${m.currentAllocation.equityPct.toFixed(1)}%`);
  y = kvRow(doc, y, 'Fixed Income', `${m.currentAllocation.fixedIncomePct.toFixed(1)}%`);
  y = kvRow(doc, y, 'Cash', `${m.currentAllocation.cashPct.toFixed(1)}%`);
  if (m.savingsRate !== null) y = kvRow(doc, y, 'Savings Rate', pct(m.savingsRate));
  if (m.liquidityRatio !== null) y = kvRow(doc, y, 'Liquidity Ratio', `${m.liquidityRatio.toFixed(1)} months`);
  y = kvRow(doc, y, 'Weighted Return', pct(m.weightedAnnualReturn));

  // Goal card
  y += 8;
  if (portfolio) {
    y = sectionHeader(doc, y, 'Investment Goal');
    drawCard(doc, 18, y - 2, pw + 4, 24);
    y += 4;
    y = kvRow(doc, y, 'Target', fmt(portfolio.goal.targetAmount));
    y = kvRow(doc, y, 'Timeline', `${portfolio.goal.yearsToGoal} years`);
    y = kvRow(doc, y, 'Description', portfolio.goal.description || 'Investment goal');
  }

  /* ─────────────────────────────────────────────────
     PAGE 2 — Top Recommendation
     ───────────────────────────────────────────────── */
  doc.addPage();
  drawBg(doc);

  y = 16;
  y = sectionHeader(doc, y, "This Month's Highest-Leverage Action");

  // Headline
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(...C.text);
  const headlineLines = doc.splitTextToSize(result.aiInsight.headline, pw);
  doc.text(headlineLines, 20, y + 2);
  y += headlineLines.length * 6 + 4;

  // Score + urgency row
  drawCard(doc, 18, y - 2, pw + 4, 14);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...C.accent);
  doc.text(`Score: ${result.topAction.score}/100`, 24, y + 4);
  doc.setTextColor(...C.gold);
  doc.text(`Urgency: ${result.topAction.urgency}`, 70, y + 4);
  doc.setTextColor(...C.blue);
  doc.text(`Confidence: ${result.aiInsight.confidence}%`, 120, y + 4);

  // Confidence bar
  const barY = y + 7;
  doc.setFillColor(...C.border);
  doc.roundedRect(24, barY, pw - 8, 2, 1, 1, 'F');
  doc.setFillColor(...C.accent);
  doc.roundedRect(24, barY, (pw - 8) * (result.aiInsight.confidence / 100), 2, 1, 1, 'F');

  y += 18;

  // Explanation
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...C.text);
  const explanationParas = result.aiInsight.explanation.split('\n\n').filter(Boolean);
  for (const para of explanationParas) {
    y = wrappedText(doc, 20, y, para, pw, 9);
    y += 2;
    if (y > 260) { doc.addPage(); drawBg(doc); y = 16; }
  }

  // Key numbers
  if (result.aiInsight.keyNumbers.length > 0) {
    y += 4;
    y = sectionHeader(doc, y, 'Key Numbers');
    const colW = pw / 3;
    drawCard(doc, 18, y - 2, pw + 4, 14);
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...C.text);
    result.aiInsight.keyNumbers.forEach((stat, i) => {
      const textLines = doc.splitTextToSize(stat, colW - 8);
      doc.text(textLines, 24 + i * colW, y + 4);
    });
    y += 18;
  }

  // Estimated benefit
  if (result.topAction.estimatedAnnualBenefit > 0) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...C.accent);
    doc.text(`Estimated annual benefit: ${fmt(result.topAction.estimatedAnnualBenefit)}`, 20, y);
    y += 6;
  }

  // Disclaimer
  y += 4;
  doc.setFontSize(7);
  doc.setTextColor(...C.textLight);
  y = wrappedText(doc, 20, y, result.aiInsight.disclaimer, pw, 7);

  /* ─────────────────────────────────────────────────
     PAGE 3 — All Scored Actions
     ───────────────────────────────────────────────── */
  doc.addPage();
  drawBg(doc);

  y = 16;
  y = sectionHeader(doc, y, 'Scored Actions');
  doc.setFontSize(8);
  doc.setTextColor(...C.textMuted);
  doc.text('All evaluated actions ranked by composite score', 20, y);
  y += 8;

  // Table header
  drawCard(doc, 18, y - 3, pw + 4, 8);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(...C.textMuted);
  doc.text('#', 24, y + 1);
  doc.text('ACTION', 32, y + 1);
  doc.text('SCORE', 110, y + 1);
  doc.text('URGENCY', 130, y + 1);
  doc.text('EST. BENEFIT', 155, y + 1);
  y += 10;

  // Action rows with bars
  result.allActions.forEach((action, i) => {
    const rowH = 16;
    drawCard(doc, 18, y - 3, pw + 4, rowH);

    // Rank
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    const rankColor = i === 0 ? C.accent : C.textMuted;
    doc.setTextColor(...rankColor);
    doc.text(`${i + 1}`, 24, y + 2);

    // Title
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(...C.text);
    doc.text(action.title, 32, y + 2);

    // Score number
    doc.setFontSize(9);
    doc.setTextColor(...C.accent);
    doc.text(`${action.score}`, 113, y + 2);

    // Urgency
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    const urgColor = action.urgency === 'high' ? C.gold : action.urgency === 'medium' ? C.blue : C.textMuted;
    doc.setTextColor(...urgColor);
    doc.text(action.urgency, 132, y + 2);

    // Benefit
    doc.setTextColor(...C.text);
    doc.text(action.estimatedAnnualBenefit > 0 ? fmt(action.estimatedAnnualBenefit) : '—', 158, y + 2);

    // Score bar
    const barTrackW = pw - 16;
    doc.setFillColor(...C.border);
    doc.roundedRect(24, y + 6, barTrackW, 2.5, 1, 1, 'F');
    const barColor = i === 0 ? C.accent : C.blue;
    doc.setFillColor(...barColor);
    doc.roundedRect(24, y + 6, barTrackW * (action.score / 100), 2.5, 1, 1, 'F');

    y += rowH + 2;
  });

  /* ─────────────────────────────────────────────────
     PAGE 4 — Scenario Projections
     ───────────────────────────────────────────────── */
  doc.addPage();
  drawBg(doc);

  y = 16;
  y = sectionHeader(doc, y, 'Scenario Projections');

  // Scenario summary cards (horizontal)
  const scenCardW = (pw - 8) / 3;
  const scenColors: Record<string, [number, number, number]> = {
    base: C.blue, recession: C.red, bull: C.accent,
  };

  result.scenarios.filter(s => s.name !== 'custom').forEach((s, i) => {
    const sx = 20 + i * (scenCardW + 4);
    drawCard(doc, sx, y - 2, scenCardW, 26);

    // Top color bar
    const topColor = scenColors[s.name] ?? C.purple;
    doc.setFillColor(...topColor);
    doc.rect(sx, y - 2, scenCardW, 2, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(...topColor);
    doc.text(s.label.toUpperCase(), sx + 4, y + 4);

    doc.setFontSize(16);
    doc.setTextColor(...C.text);
    doc.text(`${s.goalProbability}%`, sx + 4, y + 13);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(...C.textMuted);
    doc.text(`${fmt(s.finalValue)} projected`, sx + 4, y + 19);
  });

  y += 34;

  // Year-by-year table (sample every N years to fit)
  const years = result.scenarios[0]?.yearByYearValues.length ?? 0;
  if (years > 0) {
    const step = years <= 10 ? 1 : years <= 20 ? 2 : 5;
    const sampleYears: number[] = [0];
    for (let yr = step; yr < years - 1; yr += step) sampleYears.push(yr);
    if (!sampleYears.includes(years - 1)) sampleYears.push(years - 1);

    // Table header
    y = sectionHeader(doc, y, 'Year-by-Year Projections');
    drawCard(doc, 18, y - 3, pw + 4, 8);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(...C.textMuted);
    doc.text('YEAR', 24, y + 1);
    const scenarioList = result.scenarios.filter(s => s.name !== 'custom');
    scenarioList.forEach((s, i) => {
      doc.text(s.label.toUpperCase(), 50 + i * 45, y + 1);
    });
    y += 10;

    sampleYears.forEach(yr => {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(...C.textMuted);
      doc.text(`Yr ${yr}`, 24, y);
      doc.setTextColor(...C.text);
      scenarioList.forEach((s, i) => {
        doc.text(fmt(s.yearByYearValues[yr] ?? 0), 50 + i * 45, y);
      });
      y += 5;
      if (y > 270) { doc.addPage(); drawBg(doc); y = 16; }
    });
  }

  /* ─────────────────────────────────────────────────
     PAGE 5 — Holdings
     ───────────────────────────────────────────────── */
  if (portfolio && portfolio.holdings.length > 0) {
    doc.addPage();
    drawBg(doc);

    y = 16;
    y = sectionHeader(doc, y, 'Holdings');

    // Table header
    drawCard(doc, 18, y - 3, pw + 4, 8);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(...C.textMuted);
    const cols = [
      { label: 'SYMBOL', x: 24 },
      { label: 'SHARES', x: 55 },
      { label: 'PRICE', x: 78 },
      { label: 'COST BASIS', x: 100 },
      { label: 'CLASS', x: 130 },
      { label: 'SECTOR', x: 155 },
    ];
    cols.forEach(c => doc.text(c.label, c.x, y + 1));
    y += 10;

    portfolio.holdings.forEach(h => {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(...C.text);
      doc.text(h.symbol, 24, y);
      doc.text(String(h.shares), 55, y);
      doc.text(`$${h.currentPrice.toFixed(2)}`, 78, y);
      doc.text(`$${h.costBasis.toFixed(2)}`, 100, y);
      doc.setTextColor(...C.textMuted);
      doc.text(h.assetClass.replace('_', ' '), 130, y);
      doc.text(h.sector, 155, y);
      y += 5.5;
      if (y > 270) { doc.addPage(); drawBg(doc); y = 16; }
    });

    // Account room
    y += 6;
    y = sectionHeader(doc, y, 'Registered Account Room');
    drawCard(doc, 18, y - 2, pw + 4, 14);
    y += 4;
    y = kvRow(doc, y, 'TFSA Room', fmt(portfolio.tfsaRoomRemaining));
    y = kvRow(doc, y, 'RRSP Room', fmt(portfolio.rrspRoomRemaining));
  }

  /* ─────────────────────────────────────────────────
     Footer on last page
     ───────────────────────────────────────────────── */
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(...C.textLight);
  doc.text(
    'This analysis is for informational purposes only and does not constitute personalized financial advice.',
    20,
    282,
  );
  doc.text(
    `Generated by Prism · ${new Date().toISOString().slice(0, 19).replace('T', ' ')}`,
    20,
    286,
  );

  // Accent bar at bottom
  doc.setFillColor(...C.accent);
  doc.rect(0, 295, 210, 2, 'F');

  /* ─────────────────────────────────────────────────
     Save
     ───────────────────────────────────────────────── */
  doc.save(`prism-report-${new Date().toISOString().slice(0, 10)}.pdf`);
}
