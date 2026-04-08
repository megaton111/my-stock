import { NextRequest, NextResponse } from 'next/server';
import supabase from '@/lib/supabase';

// 추가매수 — buy_transactions INSERT + investments 이동평균/수량 재계산
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = await request.json();

  const buyDate: string | undefined = body.buyDate;
  const buyQuantity = Number(body.buyQuantity);
  const buyPrice = Number(body.buyPrice);
  const exchangeRate = Number(body.exchangeRate);

  if (!buyDate || !buyQuantity || !buyPrice || !exchangeRate) {
    return NextResponse.json({ error: '필수 항목이 누락되었습니다.' }, { status: 400 });
  }
  if (buyQuantity <= 0 || buyPrice <= 0 || exchangeRate <= 0) {
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
    return NextResponse.json({ error: '해당 종목은 추가매수 기능을 사용할 수 없습니다.' }, { status: 400 });
  }

  const currency = String(inv.currency);

  // 2) buy_transactions INSERT
  const { data: buyRow, error: buyError } = await supabase
    .from('buy_transactions')
    .insert({
      user_id: inv.user_id,
      position_id: inv.position_id,
      ticker: inv.ticker,
      stock_name: inv.name,
      category: inv.category,
      currency,
      broker: inv.broker,
      buy_date: buyDate,
      buy_quantity: buyQuantity,
      buy_price: buyPrice,
      exchange_rate: currency === 'USD' ? exchangeRate : null,
    })
    .select()
    .single();

  if (buyError || !buyRow) {
    return NextResponse.json({ error: buyError?.message || '매수 기록 실패' }, { status: 500 });
  }

  // 3) investments 평균가/수량 재계산 (이동평균법)
  const oldQty = Number(inv.quantity);
  const oldAvg = Number(inv.avg_price);
  const newQty = oldQty + buyQuantity;
  const newAvg = (oldAvg * oldQty + buyPrice * buyQuantity) / newQty;

  const { error: updateError } = await supabase
    .from('investments')
    .update({
      quantity: newQty,
      avg_price: Math.round(newAvg * 100) / 100,
    })
    .eq('id', id);

  if (updateError) {
    // 롤백: 방금 넣은 buy_transaction 제거
    await supabase.from('buy_transactions').delete().eq('id', buyRow.id);
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({
    buyTransactionId: buyRow.id,
    newQuantity: newQty,
    newAvgPrice: Math.round(newAvg * 100) / 100,
  });
}
