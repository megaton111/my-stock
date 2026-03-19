import { NextRequest, NextResponse } from 'next/server';
import supabase from '@/lib/supabase';

function toEntry(row: Record<string, unknown>) {
  return {
    id: String(row.id),
    stockName: row.stock_name,
    ticker: row.ticker,
    targetQuantity: Number(row.target_quantity),
    date: row.purchase_date,
    amount: Number(row.amount),
    quantity: Number(row.quantity),
  };
}

// PUT /api/dca/entries/[id] → 매수 기록 수정
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = await request.json();
  const { date, amount, quantity } = body;

  if (!date || amount == null || quantity == null) {
    return NextResponse.json({ error: '필수 항목이 누락되었습니다.' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('dca_entries')
    .update({
      purchase_date: date,
      amount,
      quantity,
    })
    .eq('id', id)
    .select()
    .single();

  if (error || !data) {
    return NextResponse.json({ error: '기록을 찾을 수 없습니다.' }, { status: 404 });
  }

  return NextResponse.json(toEntry(data));
}

// DELETE /api/dca/entries/[id] → 매수 기록 삭제
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const { error } = await supabase
    .from('dca_entries')
    .delete()
    .eq('id', id);

  if (error) {
    return NextResponse.json({ error: '기록을 찾을 수 없습니다.' }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
