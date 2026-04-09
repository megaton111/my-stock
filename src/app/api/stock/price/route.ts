import { NextRequest, NextResponse } from 'next/server';

// Yahoo Finance can be extremely picky about headers.
// Sometimes direct fetch with browser headers works better than libraries that handle cookies/crumbs.
const FETCH_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'application/json',
  'Referer': 'https://finance.yahoo.com/',
};

interface YahooChartResponse {
  chart: {
    result: Array<{
      meta: {
        regularMarketPrice: number;
        currency: string;
        chartPreviousClose?: number;
        previousClose?: number;
      };
    }>;
  };
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const symbols = searchParams.get('symbols');

  if (!symbols) {
    return NextResponse.json({ error: 'Symbols are required' }, { status: 400 });
  }

  const symbolList = symbols.split(',').map(s => s.trim());

  try {
    const results = await Promise.all(
      symbolList.map(async (symbol) => {
        try {
          // Using Yahoo Finance Chart API (v8) which is more stable and doesn't require crumbs
          const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1m&range=1d`;
          const response = await fetch(url, { headers: FETCH_HEADERS });
          
          if (!response.ok) {
            console.error(`Chart API error for ${symbol}: ${response.status}`);
            return { symbol, error: `Status ${response.status}` };
          }

          const data = (await response.json()) as YahooChartResponse;
          const result = data.chart?.result?.[0];
          
          if (result && result.meta?.regularMarketPrice) {
            const price = result.meta.regularMarketPrice;
            const previousClose =
              result.meta.chartPreviousClose ?? result.meta.previousClose;
            const changePercent =
              previousClose && previousClose > 0
                ? ((price - previousClose) / previousClose) * 100
                : undefined;
            return {
              symbol,
              price,
              currency: result.meta.currency,
              previousClose,
              changePercent,
            };
          }
          return { symbol, error: 'Price metadata missing' };
        } catch (error: unknown) {
          const msg = error instanceof Error ? error.message : 'Fetch failed';
          console.error(`Error fetching chart for ${symbol}:`, msg);
          return { symbol, error: msg };
        }
      })
    );

    return NextResponse.json(results);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'General API error';
    console.error('General API error:', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
