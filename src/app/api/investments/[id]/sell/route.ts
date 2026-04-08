import { NextRequest, NextResponse } from 'next/server';
import supabase from '@/lib/supabase';

// 종목 매도 — 실현손익 기록 + 수량 차감 + 전량매도 시 investments 삭제 및 position closed
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = await request.json();

  const sellDate: string | undefined = body.sellDate;
  const sellQuantity = Number(body.sellQuantity);
  const sellPrice = Number(body.sellPrice);
  const exchangeRate = Number(body.exchangeRate);

  if (!sellDate || !sellQuantity || !sellPrice || !exchangeRate) {
    return NextResponse.json({ error: '필수 항목이 누락되었습니다.' }, { status: 400 });
  }
  if (sellQuantity <= 0 || sellPrice <= 0 || exchangeRate <= 0) {
    return NextResponse.json({ error: '수량/가격/환율은 0보다 커야 합니다.' }, { status: 400 });
  }

  // 1) investments 조회
  const { data: inv, error: invError } = await supabase
    .from('investments')
    .select('*')
    .eq('id', id)
    .single();

  if (invError || !inv) {
    return NextResponse.json({ error: '종목을 찾을 수 없습니다.' }, { status: 404 });
  }

  if (!inv.position_id) {
    return NextResponse.json({ error: '해당 종목은 매도 기능을 사용할 수 없습니다.' }, { status: 400 });
  }

  const heldQty = Number(inv.quantity);
  if (sellQuantity > heldQty) {
    return NextResponse.json({ error: '매도 수량이 보유 수량을 초과합니다.' }, { status: 400 });
  }

  // 2) 실현손익 계산 (이동평균법: 현재 평균매입가 기준)
  const avgBuyPrice = Number(inv.avg_price);
  const realizedPl = (sellPrice - avgBuyPrice) * sellQuantity;
  const currency = String(inv.currency);
  const realizedPlKrw = currency === 'USD' ? realizedPl * exchangeRate : realizedPl;

  // 3) sell_transactions INSERT (스냅샷 박제)
  const { data: sellRow, error: sellError } = await supabase
    .from('sell_transactions')
    .insert({
      user_id: inv.user_id,
      position_id: inv.position_id,
      ticker: inv.ticker,
      stock_name: inv.name,
      category: inv.category,
      currency,
      sell_date: sellDate,
      sell_quantity: sellQuantity,
      sell_price: sellPrice,
      avg_buy_price: avgBuyPrice,
      exchange_rate: currency === 'USD' ? exchangeRate : 1,
      realized_pl: Math.round(realizedPl * 100) / 100,
      realized_pl_krw: Math.round(realizedPlKrw * 100) / 100,
    })
    .select()
    .single();

  if (sellError || !sellRow) {
    return NextResponse.json({ error: sellError?.message || '매도 기록 실패' }, { status: 500 });
  }

  // 4) 수량 차감 또는 전량매도 처리
  const remainingQty = heldQty - sellQuantity;
  const isFullSell = remainingQty === 0;

  if (isFullSell) {
    // 4-a) investments 삭제
    await supabase.from('investments').delete().eq('id', id);

    // 4-b) position closed 처리 + 누적 실현손익 캐시
    const { data: allSells } = await supabase
      .from('sell_transactions')
      .select('realized_pl_krw')
      .eq('position_id', inv.position_id);

    const totalRealizedPlKrw = (allSells ?? []).reduce(
      (sum, row) => sum + Number(row.realized_pl_krw),
      0,
    );

    await supabase
      .from('positions')
      .update({
        closed_at: sellDate,
        total_realized_pl_krw: Math.round(totalRealizedPlKrw * 100) / 100,
      })
      .eq('id', inv.position_id);
  } else {
    // 부분매도: investments.quantity만 갱신 (평균법이므로 avg_price 유지)
    await supabase
      .from('investments')
      .update({ quantity: remainingQty })
      .eq('id', id);
  }

  return NextResponse.json({
    sellTransactionId: sellRow.id,
    realizedPl,
    realizedPlKrw,
    isFullSell,
    remainingQuantity: remainingQty,
  });
}
