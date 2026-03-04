import { NextRequest, NextResponse } from 'next/server';

const API_KEY = process.env.ALPHA_VANTAGE_API_KEY;
const BASE_URL = 'https://www.alphavantage.co/query';

// Simple in-memory cache (survives across requests within same serverless instance)
const cache = new Map<string, { price: number; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export async function GET(req: NextRequest) {
  const symbol = req.nextUrl.searchParams.get('symbol')?.trim().toUpperCase();

  if (!symbol) {
    return NextResponse.json({ error: 'Missing symbol parameter' }, { status: 400 });
  }

  if (!API_KEY || API_KEY === 'your-key-here') {
    return NextResponse.json(
      { error: 'Alpha Vantage API key not configured' },
      { status: 503 },
    );
  }

  // Check cache
  const cached = cache.get(symbol);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return NextResponse.json({
      symbol,
      price: cached.price,
      cached: true,
    });
  }

  try {
    const url = `${BASE_URL}?function=GLOBAL_QUOTE&symbol=${encodeURIComponent(symbol)}&apikey=${API_KEY}`;
    const res = await fetch(url, { next: { revalidate: 300 } });
    const data = await res.json();

    // Check for rate limit
    if (data['Note'] || data['Information']) {
      return NextResponse.json(
        { error: 'API rate limit reached. Alpha Vantage allows 25 requests/day on free tier.' },
        { status: 429 },
      );
    }

    const quote = data['Global Quote'];
    if (!quote || !quote['05. price']) {
      return NextResponse.json(
        { error: `No quote data found for ${symbol}` },
        { status: 404 },
      );
    }

    const price = parseFloat(quote['05. price']);
    const previousClose = parseFloat(quote['08. previous close'] || '0');
    const changePercent = quote['10. change percent']?.replace('%', '') || '0';

    // Cache it
    cache.set(symbol, { price, timestamp: Date.now() });

    return NextResponse.json({
      symbol,
      price: Math.round(price * 100) / 100,
      previousClose: Math.round(previousClose * 100) / 100,
      changePercent: parseFloat(changePercent),
      cached: false,
    });
  } catch (err) {
    console.error('Alpha Vantage error:', err);
    return NextResponse.json(
      { error: 'Failed to fetch quote' },
      { status: 500 },
    );
  }
}

// Batch endpoint: POST with { symbols: ["TD.TO", "RY.TO", ...] }
export async function POST(req: NextRequest) {
  if (!API_KEY || API_KEY === 'your-key-here') {
    return NextResponse.json(
      { error: 'Alpha Vantage API key not configured' },
      { status: 503 },
    );
  }

  const body = await req.json();
  const symbols: string[] = body.symbols?.map((s: string) => s.trim().toUpperCase()) ?? [];

  if (symbols.length === 0) {
    return NextResponse.json({ error: 'No symbols provided' }, { status: 400 });
  }

  if (symbols.length > 10) {
    return NextResponse.json({ error: 'Maximum 10 symbols per batch request' }, { status: 400 });
  }

  const results: Record<string, { price: number; error?: string }> = {};

  // Process sequentially to respect rate limits (5 calls/min on free tier)
  for (const symbol of symbols) {
    // Check cache first
    const cached = cache.get(symbol);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      results[symbol] = { price: cached.price };
      continue;
    }

    try {
      const url = `${BASE_URL}?function=GLOBAL_QUOTE&symbol=${encodeURIComponent(symbol)}&apikey=${API_KEY}`;
      const res = await fetch(url);
      const data = await res.json();

      if (data['Note'] || data['Information']) {
        // Rate limited — fill remaining with errors
        for (const remaining of symbols.filter(s => !results[s])) {
          results[remaining] = { price: 0, error: 'Rate limited' };
        }
        break;
      }

      const quote = data['Global Quote'];
      if (quote && quote['05. price']) {
        const price = Math.round(parseFloat(quote['05. price']) * 100) / 100;
        cache.set(symbol, { price, timestamp: Date.now() });
        results[symbol] = { price };
      } else {
        results[symbol] = { price: 0, error: `No data for ${symbol}` };
      }

      // Small delay between requests to be nice to the API
      if (symbols.indexOf(symbol) < symbols.length - 1) {
        await new Promise(r => setTimeout(r, 250));
      }
    } catch {
      results[symbol] = { price: 0, error: 'Fetch failed' };
    }
  }

  return NextResponse.json({ quotes: results });
}
