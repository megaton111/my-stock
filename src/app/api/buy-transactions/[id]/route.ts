import { NextRequest, NextResponse } from 'next/server';
import supabase from '@/lib/supabase';

// 매수 거래 수정 — buy_transaction 업데이트 + investments/position 재계산
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = await request.json();

  const buyDate: string | undefined = body.buyDate;
  const buyQuantity = Number(body.buyQuantity);
  const buyPrice = Number(body.buyPrice);
  const exchangeRate = Number(body.exchangeRate);

  if (!buyDate || !buyQuantity || !buyPrice) {
    return NextResponse.json({ error: '필수 항목이 누락되었습니다.' }, { status: 400 });
  }
  if (buyQuantity <= 0 || buyPrice <= 0) {
    return NextResponse.json({ error: '수량/가격은 0보다 커야 합니다.' }, { status: 400 });
  }

  // 1) 기존 매수 거래 조회
  const { data: buyTx, error: buyError } = await supabase
    .from('buy_transactions')
    .select('*')
    .eq('id', id)
    .single();

  if (buyError || !buyTx) {
    return NextResponse.json({ error: '매수 내역을 찾을 수 없습니다.' }, { status: 404 });
  }

  const positionId = buyTx.position_id as number;
  const currency = String(buyTx.currency);

  if (currency === 'USD' && (!exchangeRate || exchangeRate <= 0)) {
    return NextResponse.json({ error: '환율을 입력해주세요.' }, { status: 400 });
  }

  // 2) position 조회
  const { data: position, error: posError } = await supabase
    .from('positions')
    .select('*')
    .eq('id', positionId)
    .single();

  if (posError || !position) {
    return NextResponse.json({ error: '포지션을 찾을 수 없습니다.' }, { status: 404 });
  }

  // 3) 수정 후 수량 검증 (전체 매수 - 매도 ≥ 0)
  const [{ data: otherBuys }, { data: sells }] = await Promise.all([
    supabase
      .from('buy_transactions')
      .select('buy_quantity, buy_price')
      .eq('position_id', positionId)
      .neq('id', id),
    supabase
      .from('sell_transactions')
      .select('sell_quantity')
      .eq('position_id', positionId),
  ]);

  const otherBuyQty = (otherBuys ?? []).reduce((s, b) => s + Number(b.buy_quantity), 0);
  const otherBuyCost = (otherBuys ?? []).reduce(
    (s, b) => s + Number(b.buy_quantity) * Number(b.buy_price),
    0,
  );
  const totalSellQty = (sells ?? []).reduce((s, v) => s + Number(v.sell_quantity), 0);

  const newTotalBuyQty = otherBuyQty + buyQuantity;
  const newCurrentQty = newTotalBuyQty - totalSellQty;

  if (newCurrentQty < 0) {
    return NextResponse.json(
      { error: '수정 후 매수 수량이 매도 수량보다 적어집니다. 매도 수량을 먼저 조정해주세요.' },
      { status: 400 },
    );
  }

  // 4) buy_transaction 업데이트
  const { error: updateBuyError } = await supabase
    .from('buy_transactions')
    .update({
      buy_date: buyDate,
      buy_quantity: buyQuantity,
      buy_price: buyPrice,
      exchange_rate: currency === 'USD' ? exchangeRate : null,
    })
    .eq('id', id);

  if (updateBuyError) {
    return NextResponse.json({ error: updateBuyError.message }, { status: 500 });
  }

  // 5) 새 평균 매수가 계산
  const newTotalBuyCost = otherBuyCost + buyQuantity * buyPrice;
  const newAvgBuyPrice = newTotalBuyQty > 0
    ? Math.round((newTotalBuyCost / newTotalBuyQty) * 100) / 100
    : 0;

  // 6) investments / position 상태 조정
  const { data: existingInv } = await supabase
    .from('investments')
    .select('id')
    .eq('position_id', positionId)
    .maybeSingle();

  if (newCurrentQty > 0) {
    if (existingInv) {
      // 활성 상태 유지 — 수량/평균가 갱신
      await supabase
        .from('investments')
        .update({ quantity: newCurrentQty, avg_price: newAvgBuyPrice })
        .eq('id', existingInv.id);
    } else {
      // 전량매도 상태였는데 매수 수정으로 재오픈
      await supabase.from('investments').insert({
        user_id: position.user_id,
        name: position.stock_name,
        ticker: position.ticker,
        category: position.category,
        quantity: newCurrentQty,
        avg_price: newAvgBuyPrice,
        currency: position.currency,
        broker: position.broker,
        position_id: positionId,
      });
    }
    // position이 closed였으면 재오픈
    if (position.closed_at) {
      await supabase
        .from('positions')
        .update({ closed_at: null, total_realized_pl_krw: null })
        .eq('id', positionId);
    }
  } else {
    // currentQty === 0 — 전량매도 상태로 전환
    if (existingInv) {
      await supabase.from('investments').delete().eq('id', existingInv.id);
    }
    if (!position.closed_at) {
      // 가장 최근 매도일을 closed_at으로 사용
      const { data: lastSell } = await supabase
        .from('sell_transactions')
        .select('sell_date, realized_pl_krw')
        .eq('position_id', positionId)
        .order('sell_date', { ascending: false })
        .limit(1)
        .maybeSingle();

      const { data: allSells } = await supabase
        .from('sell_transactions')
        .select('realized_pl_krw')
        .eq('position_id', positionId);

      const totalRealizedPlKrw = (allSells ?? []).reduce(
        (s, v) => s + Number(v.realized_pl_krw),
        0,
      );

      await supabase
        .from('positions')
        .update({
          closed_at: lastSell?.sell_date ?? buyDate,
          total_realized_pl_krw: Math.round(totalRealizedPlKrw * 100) / 100,
        })
        .eq('id', positionId);
    }
  }

  return NextResponse.json({
    success: true,
    newQuantity: newCurrentQty,
    newAvgPrice: newAvgBuyPrice,
  });
}
