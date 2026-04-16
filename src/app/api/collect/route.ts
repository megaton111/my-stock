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

// PATCH /api/collect → 특정 종목의 목표수량 변경 (해당 ticker의 모든 entries에 적용)
export async function PATCH(request: NextRequest) {
  const body = await request.json();
  const { userId, ticker, targetQuantity } = body;

  if (!userId || !ticker || targetQuantity == null) {
    return NextResponse.json(
      { error: 'userId, ticker, targetQuantity가 필요합니다.' },
      { status: 400 },
    );
  }

  const target = Number(targetQuantity);
  if (!Number.isInteger(target) || target <= 0) {
    return NextResponse.json(
      { error: '목표수량은 1 이상의 정수여야 합니다.' },
      { status: 400 },
    );
  }

  const { data, error } = await supabase
    .from('collect_entries')
    .update({ target_quantity: target })
    .eq('user_id', userId)
    .eq('ticker', ticker)
    .select('id');

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!data || data.length === 0) {
    return NextResponse.json(
      { error: '해당 종목을 찾을 수 없습니다.' },
      { status: 404 },
    );
  }

  return NextResponse.json({ success: true, updatedCount: data.length });
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
