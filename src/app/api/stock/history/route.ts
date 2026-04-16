import { NextRequest, NextResponse } from 'next/server';

const FETCH_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  Accept: 'application/json',
  Referer: 'https://finance.yahoo.com/',
};

interface YahooChartResult {
  meta: {
    currency: string;
    shortName?: string;
    longName?: string;
    symbol: string;
    exchangeTimezoneName?: string;
  };
  timestamp: number[];
  indicators: {
    quote: Array<{ close: (number | null)[] }>;
  };
}

interface YahooChartResponse {
  chart: { result: YahooChartResult[] | null; error: unknown };
}

export interface HistoryPoint {
  date: string; // YYYY-MM-DD
  close: number;
}

export interface HistoryResult {
  symbol: string;
  name: string;
  currency: string;
  history: HistoryPoint[];
  error?: string;
}

// GET /api/stock/history?symbol=AAPL&range=1y
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const symbol = searchParams.get('symbol')?.trim();
  const range = searchParams.get('range') || '1y';

  if (!symbol) {
    return NextResponse.json({ error: '종목 심볼을 입력해주세요.' }, { status: 400 });
  }

  const validRanges = ['1y', '2y', '3y', '5y', '10y', 'max'];
  if (!validRanges.includes(range)) {
    return NextResponse.json({ error: '유효하지 않은 기간입니다.' }, { status: 400 });
  }

  try {
    // range=max일 때 Yahoo가 interval=1d를 무시하고 월봉으로 집계하는 버그 회피.
    // period1/period2로 명시해야 일봉이 유지됨.
    const base = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}`;
    const url = range === 'max'
      ? `${base}?interval=1d&period1=0&period2=${Math.floor(Date.now() / 1000)}`
      : `${base}?interval=1d&range=${range}`;
    const res = await fetch(url, { headers: FETCH_HEADERS });

    if (!res.ok) {
      return NextResponse.json({ error: `Yahoo API 오류 (${res.status})` }, { status: 502 });
    }

    const data = (await res.json()) as YahooChartResponse;
    const result = data.chart?.result?.[0];

    if (!result || !result.timestamp) {
      return NextResponse.json({ error: '데이터를 찾을 수 없습니다.' }, { status: 404 });
    }

    const closes = result.indicators.quote[0].close;
    const timeZone = result.meta.exchangeTimezoneName || 'UTC';
    const dateFormatter = new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    const history: HistoryPoint[] = [];

    for (let i = 0; i < result.timestamp.length; i++) {
      const close = closes[i];
      if (close == null) continue;
      // 거래소 현지 시각 기준 날짜 추출 (서버 타임존 영향 제거)
      const date = dateFormatter.format(new Date(result.timestamp[i] * 1000));
      history.push({ date, close });
    }

    const name =
      result.meta.shortName || result.meta.longName || result.meta.symbol;

    return NextResponse.json({
      symbol: result.meta.symbol,
      name,
      currency: result.meta.currency,
      history,
    } satisfies HistoryResult);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : '알 수 없는 오류';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
