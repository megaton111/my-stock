import { NextRequest, NextResponse } from 'next/server';
import supabase from '@/lib/supabase';

// GET /api/dca?userId=X → 종목별 카드 목록
export async function GET(request: NextRequest) {
  const userId = request.nextUrl.searchParams.get('userId');

  if (!userId) {
    return NextResponse.json({ error: 'userId가 필요합니다.' }, { status: 400 });
  }

  // RPC 대신 직접 조회 후 JS에서 집계
  const { data, error } = await supabase
    .from('dca_entries')
    .select('id, stock_name, ticker, target_quantity, quantity, purchase_date, schedule_type, schedule_value, schedule_quantity')
    .eq('user_id', Number(userId))
    .order('id', { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // ticker 기준 집계
  const groupMap = new Map<string, {
    stockName: string;
    ticker: string;
    targetQuantity: number;
    currentQuantity: number;
    entryCount: number;
    scheduleType: string | null;
    scheduleValue: number | null;
    scheduleQuantity: number | null;
    lastEntryDate: string | null;
  }>();

  for (const r of data ?? []) {
    const existing = groupMap.get(r.ticker);
    if (existing) {
      existing.currentQuantity += Number(r.quantity);
      existing.entryCount += 1;
      if (r.purchase_date > (existing.lastEntryDate ?? '')) {
        existing.lastEntryDate = r.purchase_date;
      }
    } else {
      groupMap.set(r.ticker, {
        stockName: r.stock_name,
        ticker: r.ticker,
        targetQuantity: Number(r.target_quantity),
        currentQuantity: Number(r.quantity),
        entryCount: 1,
        scheduleType: r.schedule_type ?? null,
        scheduleValue: r.schedule_value != null ? Number(r.schedule_value) : null,
        scheduleQuantity: r.schedule_quantity != null ? Number(r.schedule_quantity) : null,
        lastEntryDate: r.purchase_date ?? null,
      });
    }
  }

  return NextResponse.json([...groupMap.values()]);
}

// DELETE /api/dca?userId=X&ticker=Y → 특정 종목의 모든 매수 기록 삭제
export async function DELETE(request: NextRequest) {
  const userId = request.nextUrl.searchParams.get('userId');
  const ticker = request.nextUrl.searchParams.get('ticker');

  if (!userId || !ticker) {
    return NextResponse.json({ error: 'userId와 ticker가 필요합니다.' }, { status: 400 });
  }

  const { error } = await supabase
    .from('dca_entries')
    .delete()
    .eq('user_id', userId)
    .eq('ticker', ticker);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
