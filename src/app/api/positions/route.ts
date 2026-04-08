import { NextRequest, NextResponse } from 'next/server';
import supabase from '@/lib/supabase';

export interface ClosedPositionItem {
  id: number;
  ticker: string;
  stockName: string;
  category: string;
  currency: string;
  broker: string;
  openedAt: string;
  closedAt: string;
  totalBuyQuantity: number;
  totalSellQuantity: number;
  totalRealizedPlKrw: number;
}

// 포지션 목록 조회 (status=closed 지원)
export async function GET(request: NextRequest) {
  const userId = request.nextUrl.searchParams.get('userId');
  const status = request.nextUrl.searchParams.get('status');

  if (!userId) {
    return NextResponse.json({ error: 'userId가 필요합니다.' }, { status: 400 });
  }

  let query = supabase
    .from('positions')
    .select('*')
    .eq('user_id', userId);

  if (status === 'closed') {
    query = query.not('closed_at', 'is', null);
  } else if (status === 'open') {
    query = query.is('closed_at', null);
  }

  const { data: positions, error } = await query.order('closed_at', { ascending: false, nullsFirst: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const positionIds = (positions ?? []).map((p) => p.id);
  if (positionIds.length === 0) {
    return NextResponse.json([]);
  }

  // 매수/매도 수량 집계를 위해 전체 거래 조회
  const [buysRes, sellsRes] = await Promise.all([
    supabase
      .from('buy_transactions')
      .select('position_id, buy_quantity')
      .in('position_id', positionIds),
    supabase
      .from('sell_transactions')
      .select('position_id, sell_quantity, realized_pl_krw')
      .in('position_id', positionIds),
  ]);

  const buyMap = new Map<number, number>();
  for (const row of buysRes.data ?? []) {
    const pid = Number(row.position_id);
    buyMap.set(pid, (buyMap.get(pid) ?? 0) + Number(row.buy_quantity));
  }

  const sellMap = new Map<number, { qty: number; plKrw: number }>();
  for (const row of sellsRes.data ?? []) {
    const pid = Number(row.position_id);
    const cur = sellMap.get(pid) ?? { qty: 0, plKrw: 0 };
    cur.qty += Number(row.sell_quantity);
    cur.plKrw += Number(row.realized_pl_krw);
    sellMap.set(pid, cur);
  }

  const items: ClosedPositionItem[] = (positions ?? []).map((p) => {
    const sellAgg = sellMap.get(p.id) ?? { qty: 0, plKrw: 0 };
    // 캐시된 total_realized_pl_krw가 있으면 우선, 없으면 실시간 집계
    const totalPlKrw = p.total_realized_pl_krw != null
      ? Number(p.total_realized_pl_krw)
      : sellAgg.plKrw;
    return {
      id: p.id,
      ticker: p.ticker,
      stockName: p.stock_name,
      category: p.category,
      currency: p.currency,
      broker: p.broker || '',
      openedAt: p.opened_at,
      closedAt: p.closed_at,
      totalBuyQuantity: buyMap.get(p.id) ?? 0,
      totalSellQuantity: sellAgg.qty,
      totalRealizedPlKrw: Math.round(totalPlKrw * 100) / 100,
    };
  });

  return NextResponse.json(items);
}
