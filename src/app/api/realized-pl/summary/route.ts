import { NextRequest, NextResponse } from 'next/server';
import supabase from '@/lib/supabase';

export interface TickerBreakdown {
  ticker: string;
  stockName: string;
  realizedPlKrw: number;
  tradeCount: number;
}

export interface RealizedPlSummaryResponse {
  year: number;
  totalRealizedPlKrw: number;
  tradeCount: number;
  tickerCount: number;
  availableYears: number[];
  breakdown: TickerBreakdown[];
}

// 연도별 실현손익 요약 조회
export async function GET(request: NextRequest) {
  const userId = request.nextUrl.searchParams.get('userId');
  const yearParam = request.nextUrl.searchParams.get('year');

  if (!userId) {
    return NextResponse.json({ error: 'userId가 필요합니다.' }, { status: 400 });
  }

  const year = yearParam ? Number(yearParam) : new Date().getFullYear();
  if (!Number.isFinite(year)) {
    return NextResponse.json({ error: '잘못된 year 파라미터입니다.' }, { status: 400 });
  }

  // 전체 sell_transactions 조회 (연도 집계는 서버에서)
  const { data, error } = await supabase
    .from('sell_transactions')
    .select('ticker, stock_name, sell_date, realized_pl_krw')
    .eq('user_id', userId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const rows = data ?? [];

  // 가용 연도 목록
  const yearSet = new Set<number>();
  for (const row of rows) {
    const y = Number((row.sell_date as string).slice(0, 4));
    if (Number.isFinite(y)) yearSet.add(y);
  }
  const availableYears = Array.from(yearSet).sort((a, b) => b - a);

  // 해당 연도 필터링 + 티커별 집계
  const yearStr = String(year);
  const tickerMap = new Map<string, TickerBreakdown>();
  let totalRealizedPlKrw = 0;
  let tradeCount = 0;

  for (const row of rows) {
    if (!(row.sell_date as string).startsWith(yearStr)) continue;
    const pl = Number(row.realized_pl_krw);
    totalRealizedPlKrw += pl;
    tradeCount += 1;

    const ticker = String(row.ticker);
    const existing = tickerMap.get(ticker);
    if (existing) {
      existing.realizedPlKrw += pl;
      existing.tradeCount += 1;
    } else {
      tickerMap.set(ticker, {
        ticker,
        stockName: String(row.stock_name),
        realizedPlKrw: pl,
        tradeCount: 1,
      });
    }
  }

  const breakdown = Array.from(tickerMap.values())
    .map((b) => ({ ...b, realizedPlKrw: Math.round(b.realizedPlKrw * 100) / 100 }))
    .sort((a, b) => b.realizedPlKrw - a.realizedPlKrw);

  const response: RealizedPlSummaryResponse = {
    year,
    totalRealizedPlKrw: Math.round(totalRealizedPlKrw * 100) / 100,
    tradeCount,
    tickerCount: tickerMap.size,
    availableYears,
    breakdown,
  };

  return NextResponse.json(response);
}
