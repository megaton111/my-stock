import { NextRequest, NextResponse } from 'next/server';
import supabase from '@/lib/supabase';

const EXCHANGE_RATE_SYMBOL = 'USDKRW=X';
const DEFAULT_EXCHANGE_RATE = 1410;

const FETCH_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'application/json',
  'Referer': 'https://finance.yahoo.com/',
};

async function fetchPrice(symbol: string): Promise<number | null> {
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1m&range=1d`;
    const res = await fetch(url, { headers: FETCH_HEADERS });
    if (!res.ok) return null;
    const data = await res.json();
    return data.chart?.result?.[0]?.meta?.regularMarketPrice ?? null;
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: '인증되지 않은 요청입니다.' }, { status: 401 });
  }

  // 오늘 날짜 (KST 기준)
  const now = new Date();
  const kstDate = new Date(now.getTime() + 9 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);

  // 모든 투자 항목 조회
  const { data: investments, error: invError } = await supabase
    .from('investments')
    .select('user_id, ticker, name, avg_price, quantity, currency');

  if (invError || !investments?.length) {
    return NextResponse.json({
      message: investments?.length === 0 ? '투자 항목이 없습니다.' : '투자 항목 조회 실패',
      error: invError?.message,
    }, { status: invError ? 500 : 200 });
  }

  // 고유 티커 + 환율 심볼 수집
  const tickers = new Set<string>();
  for (const inv of investments) {
    tickers.add(inv.ticker);
  }
  tickers.add(EXCHANGE_RATE_SYMBOL);

  // 시세 일괄 조회
  const priceMap: Record<string, number> = {};
  const tickerArr = [...tickers];

  // 10개씩 배치로 나눠서 호출 (Yahoo API 부하 분산)
  for (let i = 0; i < tickerArr.length; i += 10) {
    const batch = tickerArr.slice(i, i + 10);
    const results = await Promise.all(batch.map(fetchPrice));
    batch.forEach((symbol, idx) => {
      if (results[idx] !== null) priceMap[symbol] = results[idx]!;
    });
  }

  const exchangeRate = priceMap[EXCHANGE_RATE_SYMBOL] || DEFAULT_EXCHANGE_RATE;

  // 사용자별 포트폴리오 계산
  const userSummary = new Map<number, {
    totalInvested: number; totalValue: number;
    financialValue: number; cashValue: number;
  }>();

  for (const inv of investments) {
    const factor = inv.currency === 'USD' ? exchangeRate : 1;
    const invested = inv.avg_price * inv.quantity * factor;
    const price = priceMap[inv.ticker] ?? inv.avg_price;
    const value = price * inv.quantity * factor;
    const isCashItem = inv.ticker.startsWith('CASH-');

    const prev = userSummary.get(inv.user_id) ?? {
      totalInvested: 0, totalValue: 0, financialValue: 0, cashValue: 0,
    };
    prev.totalInvested += invested;
    prev.totalValue += value;
    if (isCashItem) {
      prev.cashValue += value;
    } else {
      prev.financialValue += value;
    }
    userSummary.set(inv.user_id, prev);
  }

  // 스냅샷 upsert
  const rows = [...userSummary.entries()].map(([userId, s]) => ({
    user_id: userId,
    date: kstDate,
    total_invested: Math.round(s.totalInvested * 100) / 100,
    total_value: Math.round(s.totalValue * 100) / 100,
    financial_value: Math.round(s.financialValue * 100) / 100,
    cash_value: Math.round(s.cashValue * 100) / 100,
    exchange_rate: Math.round(exchangeRate * 100) / 100,
    profit_rate: s.totalInvested > 0
      ? Math.round((s.totalValue - s.totalInvested) / s.totalInvested * 10000) / 100
      : 0,
  }));

  const { error: upsertError } = await supabase
    .from('portfolio_snapshots')
    .upsert(rows, { onConflict: 'user_id,date' });

  if (upsertError) {
    return NextResponse.json({ error: '스냅샷 저장 실패', detail: upsertError.message }, { status: 500 });
  }

  // 종목별 스냅샷 저장
  const itemRows = investments.map((inv) => {
    const factor = inv.currency === 'USD' ? exchangeRate : 1;
    const price = priceMap[inv.ticker] ?? inv.avg_price;
    return {
      user_id: inv.user_id,
      date: kstDate,
      ticker: inv.ticker,
      name: inv.name,
      quantity: inv.quantity,
      price,
      currency: inv.currency,
      value_krw: Math.round(price * inv.quantity * factor * 100) / 100,
      invested_krw: Math.round(inv.avg_price * inv.quantity * factor * 100) / 100,
    };
  });

  if (itemRows.length > 0) {
    await supabase
      .from('portfolio_snapshot_items')
      .upsert(itemRows, { onConflict: 'user_id,date,ticker' });
  }

  return NextResponse.json({
    message: '포트폴리오 스냅샷 저장 완료',
    date: kstDate,
    users: rows.length,
    items: itemRows.length,
    exchangeRate,
  });
}
