import { NextRequest, NextResponse } from 'next/server';
import supabase from '@/lib/supabase';

type Params = { params: Promise<{ id: string; txId: string }> };

// PUT /api/trading-journal/[id]/transactions/[txId] → 거래 수정
export async function PUT(request: NextRequest, { params }: Params) {
  const { txId } = await params;
  const body = await request.json();
  const { userId, price, quantity, amount, tradeDate } = body;

  if (!userId) {
    return NextResponse.json({ error: 'userId가 필요합니다.' }, { status: 400 });
  }

  const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (price !== undefined) updateData.price = price;
  if (quantity !== undefined) updateData.quantity = quantity;
  if (amount !== undefined) updateData.amount = amount;
  if (tradeDate !== undefined) updateData.trade_date = tradeDate;

  const { data, error } = await supabase
    .from('trading_journal_transactions')
    .update(updateData)
    .eq('id', txId)
    .eq('user_id', userId)
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
  });
}

// DELETE /api/trading-journal/[id]/transactions/[txId]?userId=X → 거래 삭제
export async function DELETE(request: NextRequest, { params }: Params) {
  const { id: journalId, txId } = await params;
  const userId = request.nextUrl.searchParams.get('userId');

  if (!userId) {
    return NextResponse.json({ error: 'userId가 필요합니다.' }, { status: 400 });
  }

  // 마지막 남은 거래인지 확인
  const { count } = await supabase
    .from('trading_journal_transactions')
    .select('id', { count: 'exact', head: true })
    .eq('journal_id', journalId);

  if ((count ?? 0) <= 1) {
    return NextResponse.json({ error: '최소 1건의 거래가 있어야 합니다. 일지 자체를 삭제해주세요.' }, { status: 400 });
  }

  const { error } = await supabase
    .from('trading_journal_transactions')
    .delete()
    .eq('id', txId)
    .eq('user_id', userId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
