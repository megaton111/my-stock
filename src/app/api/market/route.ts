import { NextResponse } from 'next/server';

const FETCH_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'application/json',
  'Referer': 'https://finance.yahoo.com/',
};

interface MarketIndex {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  currency: string;
  error?: string;
}

const INDICES = [
  { symbol: '^KS11', name: '코스피' },
  { symbol: '^KQ11', name: '코스닥' },
  { symbol: '^DJI', name: '다우존스' },
  { symbol: '^IXIC', name: '나스닥 종합' },
  { symbol: '^GSPC', name: 'S&P 500' },
  { symbol: 'USDKRW=X', name: '달러/원 환율' },
];

interface YahooChartResponse {
  chart: {
    result: Array<{
      meta: {
        regularMarketPrice: number;
        chartPreviousClose: number;
        currency: string;
      };
    }>;
  };
}

export async function GET() {
  const results = await Promise.all(
    INDICES.map(async ({ symbol, name }): Promise<MarketIndex> => {
      try {
        const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1m&range=1d`;
        const response = await fetch(url, { headers: FETCH_HEADERS });

        if (!response.ok) {
          return { symbol, name, price: 0, change: 0, changePercent: 0, currency: '', error: `Status ${response.status}` };
        }

        const data = (await response.json()) as YahooChartResponse;
        const meta = data.chart?.result?.[0]?.meta;

        if (meta?.regularMarketPrice) {
          const price = meta.regularMarketPrice;
          const prevClose = meta.chartPreviousClose || price;
          const change = price - prevClose;
          const changePercent = prevClose > 0 ? (change / prevClose) * 100 : 0;

          return {
            symbol,
            name,
            price,
            change,
            changePercent,
            currency: meta.currency || '',
          };
        }

        return { symbol, name, price: 0, change: 0, changePercent: 0, currency: '', error: 'No data' };
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Fetch failed';
        return { symbol, name, price: 0, change: 0, changePercent: 0, currency: '', error: msg };
      }
    })
  );

  return NextResponse.json(results);
}
