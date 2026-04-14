import { NextRequest, NextResponse } from 'next/server';
import supabase from '@/lib/supabase';

interface SnapshotItem {
  ticker: string;
  name: string;
  quantity: number;
  price: number;
  currency: string;
  value_krw: number;
  invested_krw: number;
}

export async function GET(request: NextRequest) {
  const userId = request.nextUrl.searchParams.get('userId');

  if (!userId) {
    return NextResponse.json({ error: 'userId는 필수입니다.' }, { status: 400 });
  }

  // 최근 2일치 날짜 조회
  const { data: dates, error: dateError } = await supabase
    .from('portfolio_snapshot_items')
    .select('date')
    .eq('user_id', userId)
    .order('date', { ascending: false })
    .limit(1);

  if (dateError || !dates?.length) {
    return NextResponse.json({ latestDate: null, prevDate: null, items: [] });
  }

  const latestDate = dates[0].date;

  // 최신 날짜 이전의 가장 최근 날짜 조회
  const { data: prevDates } = await supabase
    .from('portfolio_snapshot_items')
    .select('date')
    .eq('user_id', userId)
    .lt('date', latestDate)
    .order('date', { ascending: false })
    .limit(1);

  const prevDate = prevDates?.[0]?.date;

  // 최신 날짜 종목 데이터
  const { data: todayItems } = await supabase
    .from('portfolio_snapshot_items')
    .select('ticker, name, quantity, price, currency, value_krw, invested_krw')
    .eq('user_id', userId)
    .eq('date', latestDate);

  // 이전 날짜 종목 데이터
  let prevMap = new Map<string, SnapshotItem>();
  if (prevDate) {
    const { data: prevItems } = await supabase
      .from('portfolio_snapshot_items')
      .select('ticker, name, quantity, price, currency, value_krw, invested_krw')
      .eq('user_id', userId)
      .eq('date', prevDate);

    if (prevItems) {
      prevMap = new Map(prevItems.map((item) => [item.ticker, item]));
    }
  }

  const result = (todayItems ?? []).map((item) => {
    const prev = prevMap.get(item.ticker);
    const prevValue = prev?.value_krw ?? 0;
    const change = item.value_krw - prevValue;
    const changeRate = prevValue > 0 ? (change / prevValue) * 100 : 0;

    return {
      ticker: item.ticker,
      name: item.name,
      currency: item.currency,
      todayValue: Math.round(item.value_krw),
      prevValue: Math.round(prevValue),
      change: Math.round(change),
      changeRate: Math.round(changeRate * 100) / 100,
      isNew: !prev,
    };
  });

  // 변동액 절대값 기준 내림차순 정렬
  result.sort((a, b) => Math.abs(b.change) - Math.abs(a.change));

  return NextResponse.json({
    latestDate,
    prevDate: prevDate || null,
    items: result,
  });
}
