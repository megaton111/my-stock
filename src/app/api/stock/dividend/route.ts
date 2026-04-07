import { NextRequest, NextResponse } from 'next/server';

const FETCH_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'application/json',
  'Referer': 'https://finance.yahoo.com/',
};

interface DividendEvent {
  amount: number;
  date: number; // unix timestamp (seconds)
}

interface YahooChartResponse {
  chart: {
    result: Array<{
      meta: {
        currency: string;
        regularMarketPrice: number;
      };
      events?: {
        dividends?: Record<string, DividendEvent>;
      };
    }>;
  };
}

interface DividendPayment {
  month: number; // 1~12
  amount: number; // per share
  date: string; // ISO date
}

interface DividendResult {
  symbol: string;
  currency: string;
  annualRate: number; // 최근 1년 주당 배당금 합계
  yield: number; // 연간 수익률 (%)
  payments: DividendPayment[]; // 과거 1년 배당 지급 내역
  error?: string;
}

async function fetchDividend(symbol: string): Promise<DividendResult> {
  try {
    // events=div + range=1y 로 과거 1년 배당 이벤트 조회
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=1y&events=div`;
    const res = await fetch(url, { headers: FETCH_HEADERS });
    if (!res.ok) {
      return { symbol, currency: 'USD', annualRate: 0, yield: 0, payments: [], error: `Status ${res.status}` };
    }
    const data = (await res.json()) as YahooChartResponse;
    const result = data.chart?.result?.[0];
    if (!result) {
      return { symbol, currency: 'USD', annualRate: 0, yield: 0, payments: [], error: 'No data' };
    }

    const currency = result.meta?.currency || 'USD';
    const price = result.meta?.regularMarketPrice || 0;
    const divs = result.events?.dividends || {};

    const payments: DividendPayment[] = Object.values(divs)
      .map((d) => {
        const dateObj = new Date(d.date * 1000);
        return {
          month: dateObj.getMonth() + 1,
          amount: d.amount,
          date: dateObj.toISOString().slice(0, 10),
        };
      })
      .sort((a, b) => a.date.localeCompare(b.date));

    const annualRate = payments.reduce((sum, p) => sum + p.amount, 0);
    const divYield = price > 0 ? (annualRate / price) * 100 : 0;

    return { symbol, currency, annualRate, yield: divYield, payments };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return { symbol, currency: 'USD', annualRate: 0, yield: 0, payments: [], error: msg };
  }
}

export async function GET(request: NextRequest) {
  const symbols = request.nextUrl.searchParams.get('symbols');
  if (!symbols) {
    return NextResponse.json({ error: 'symbols는 필수입니다.' }, { status: 400 });
  }

  const symbolList = symbols.split(',').map((s) => s.trim()).filter(Boolean);
  const results = await Promise.all(symbolList.map(fetchDividend));
  return NextResponse.json(results);
}
