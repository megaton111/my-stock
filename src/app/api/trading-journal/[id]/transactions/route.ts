import { NextRequest, NextResponse } from 'next/server';
import supabase from '@/lib/supabase';

type Params = { params: Promise<{ id: string }> };

// POST /api/trading-journal/[id]/transactions → 추가 매수/매도 거래 등록
export async function POST(request: NextRequest, { params }: Params) {
  const { id: journalId } = await params;
  const body = await request.json();
  const { userId, type, price, quantity, amount, tradeDate } = body;

  if (!userId || !type || price == null || quantity == null || !tradeDate) {
    return NextResponse.json({ error: '필수 항목이 누락되었습니다.' }, { status: 400 });
  }

  if (type !== 'buy' && type !== 'sell') {
    return NextResponse.json({ error: '구분은 buy 또는 sell이어야 합니다.' }, { status: 400 });
  }

  // 매도 시 보유수량 초과 검증
  if (type === 'sell') {
    const { data: txList } = await supabase
      .from('trading_journal_transactions')
      .select('type, quantity')
      .eq('journal_id', journalId);

    const totalBuy = (txList ?? []).filter((t) => t.type === 'buy').reduce((s, t) => s + Number(t.quantity), 0);
    const totalSell = (txList ?? []).filter((t) => t.type === 'sell').reduce((s, t) => s + Number(t.quantity), 0);
    const holdingQty = totalBuy - totalSell;

    if (quantity > holdingQty) {
      return NextResponse.json({ error: `보유수량(${holdingQty})을 초과하여 매도할 수 없습니다.` }, { status: 400 });
    }
  }

  const { data, error } = await supabase
    .from('trading_journal_transactions')
    .insert({
      journal_id: Number(journalId),
      user_id: userId,
      type,
      price,
      quantity,
      amount: amount || price * quantity,
      trade_date: tradeDate,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    id: String(data.id),
    type: data.type,
    price: Number(data.price),
    quantity: Number(data.quantity),
    amount: Number(data.amount),
    tradeDate: data.trade_date,
  }, { status: 201 });
}
