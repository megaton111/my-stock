import { NextRequest, NextResponse } from 'next/server';
import supabase from '@/lib/supabase';

// GET /api/collect?userId=X → 종목별 카드 목록
export async function GET(request: NextRequest) {
  const userId = request.nextUrl.searchParams.get('userId');

  if (!userId) {
    return NextResponse.json({ error: 'userId가 필요합니다.' }, { status: 400 });
  }

  // Supabase RPC로 GROUP BY 집계 수행
  const { data, error } = await supabase.rpc('get_collect_summary', {
    p_user_id: Number(userId),
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(
    (data ?? []).map((r: Record<string, unknown>) => ({
      stockName: r.stock_name,
      ticker: r.ticker,
      targetQuantity: Number(r.target_quantity),
      currentQuantity: Number(r.current_quantity),
      entryCount: Number(r.entry_count),
    })),
  );
}

// DELETE /api/collect?userId=X&ticker=Y → 특정 종목의 모든 매수 기록 삭제
export async function DELETE(request: NextRequest) {
  const userId = request.nextUrl.searchParams.get('userId');
  const ticker = request.nextUrl.searchParams.get('ticker');

  if (!userId || !ticker) {
    return NextResponse.json({ error: 'userId와 ticker가 필요합니다.' }, { status: 400 });
  }

  const { error } = await supabase
    .from('collect_entries')
    .delete()
    .eq('user_id', userId)
    .eq('ticker', ticker);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
