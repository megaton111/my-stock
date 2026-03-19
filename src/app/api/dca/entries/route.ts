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

// GET /api/dca/entries?userId=X&ticker=Y → 특정 종목의 매수 기록
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const userId = searchParams.get('userId');
  const ticker = searchParams.get('ticker');

  if (!userId || !ticker) {
    return NextResponse.json({ error: 'userId와 ticker가 필요합니다.' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('dca_entries')
    .select('*')
    .eq('user_id', userId)
    .eq('ticker', ticker)
    .order('purchase_date', { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json((data ?? []).map(toEntry));
}

// POST /api/dca/entries → 매수 기록 추가
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { userId, stockName, ticker, targetQuantity, date, amount, quantity } = body;

  if (!userId || !stockName || !ticker || !date || amount == null || quantity == null) {
    return NextResponse.json({ error: '필수 항목이 누락되었습니다.' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('dca_entries')
    .insert({
      user_id: userId,
      stock_name: stockName,
      ticker,
      target_quantity: targetQuantity || 0,
      purchase_date: date,
      amount,
      quantity,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(toEntry(data), { status: 201 });
}
