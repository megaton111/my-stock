import { NextRequest, NextResponse } from 'next/server';
import supabase from '@/lib/supabase';

// 매도 취소 — sell_transaction 삭제 + investments/position 상태 복원
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  // 1) 매도 거래 조회
  const { data: sellTx, error: sellError } = await supabase
    .from('sell_transactions')
    .select('*')
    .eq('id', id)
    .single();

  if (sellError || !sellTx) {
    return NextResponse.json({ error: '매도 내역을 찾을 수 없습니다.' }, { status: 404 });
  }

  const positionId = sellTx.position_id as number;

  // 2) position 조회
  const { data: position, error: posError } = await supabase
    .from('positions')
    .select('*')
    .eq('id', positionId)
    .single();

  if (posError || !position) {
    return NextResponse.json({ error: '포지션을 찾을 수 없습니다.' }, { status: 404 });
  }

  // 3) position이 closed 상태인 경우 — 재오픈 가능 여부 확인
  //    같은 user + ticker로 이미 새로운 활성 investments 행이 있으면 재오픈 불가
  if (position.closed_at) {
    const { data: existingActive } = await supabase
      .from('investments')
      .select('id')
      .eq('user_id', position.user_id)
      .eq('ticker', position.ticker);

    if (existingActive && existingActive.length > 0) {
      return NextResponse.json(
        { error: '같은 종목의 신규 보유 내역이 있어 매도 취소가 불가능합니다.' },
        { status: 400 },
      );
    }
  }

  // 4) sell_transaction 삭제
  const { error: deleteError } = await supabase
    .from('sell_transactions')
    .delete()
    .eq('id', id);

  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 500 });
  }

  // 5) position의 현재 상태 재계산 (buys 합계 - 남은 sells 합계)
  const [{ data: buys }, { data: remainingSells }] = await Promise.all([
    supabase
      .from('buy_transactions')
      .select('buy_quantity, buy_price')
      .eq('position_id', positionId),
    supabase
      .from('sell_transactions')
      .select('sell_quantity, realized_pl_krw')
      .eq('position_id', positionId),
  ]);

  const totalBuyQty = (buys ?? []).reduce((s, b) => s + Number(b.buy_quantity), 0);
  const totalBuyCost = (buys ?? []).reduce(
    (s, b) => s + Number(b.buy_quantity) * Number(b.buy_price),
    0,
  );
  const avgBuyPrice = totalBuyQty > 0 ? totalBuyCost / totalBuyQty : 0;
  const totalSellQty = (remainingSells ?? []).reduce((s, v) => s + Number(v.sell_quantity), 0);
  const currentQty = totalBuyQty - totalSellQty;

  // 6) investments 복원/갱신
  const { data: existingInv } = await supabase
    .from('investments')
    .select('id')
    .eq('position_id', positionId)
    .maybeSingle();

  if (currentQty > 0) {
    if (existingInv) {
      // 활성 상태: 수량만 갱신 (avg_price는 평균법이므로 유지)
      await supabase
        .from('investments')
        .update({ quantity: currentQty })
        .eq('id', existingInv.id);
    } else {
      // 전량매도되었던 상태에서 재오픈: investments 행 복원
      await supabase.from('investments').insert({
        user_id: position.user_id,
        name: position.stock_name,
        ticker: position.ticker,
        category: position.category,
        quantity: currentQty,
        avg_price: Math.round(avgBuyPrice * 100) / 100,
        currency: position.currency,
        broker: position.broker,
        position_id: positionId,
      });
    }

    // position도 활성 상태로 되돌림
    if (position.closed_at) {
      await supabase
        .from('positions')
        .update({ closed_at: null, total_realized_pl_krw: null })
        .eq('id', positionId);
    }
  } else {
    // currentQty === 0: 여전히 전량매도 상태. position의 누적 실현손익 캐시만 갱신
    const totalRealizedPlKrw = (remainingSells ?? []).reduce(
      (s, v) => s + Number(v.realized_pl_krw),
      0,
    );
    await supabase
      .from('positions')
      .update({ total_realized_pl_krw: Math.round(totalRealizedPlKrw * 100) / 100 })
      .eq('id', positionId);
  }

  return NextResponse.json({ success: true, currentQuantity: currentQty });
}
