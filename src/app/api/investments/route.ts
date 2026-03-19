import { NextRequest, NextResponse } from 'next/server';
import supabase from '@/lib/supabase';

function toInvestment(row: Record<string, unknown>) {
  return {
    id: String(row.id),
    name: row.name,
    ticker: row.ticker,
    category: row.category,
    quantity: Number(row.quantity),
    avgPrice: Number(row.avg_price),
    currency: row.currency,
  };
}

// 전체 목록 조회 (user_id 필터)
export async function GET(request: NextRequest) {
  const userId = request.nextUrl.searchParams.get('userId');

  if (!userId) {
    return NextResponse.json({ error: 'userId가 필요합니다.' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('investments')
    .select('*')
    .eq('user_id', userId)
    .order('id');

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json((data ?? []).map(toInvestment));
}

// 새 종목 추가
export async function POST(request: NextRequest) {
  const body = await request.json();

  if (!body.userId || !body.name || !body.ticker || !body.quantity || !body.avgPrice || !body.currency) {
    return NextResponse.json({ error: '필수 항목이 누락되었습니다.' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('investments')
    .insert({
      user_id: body.userId,
      name: body.name,
      ticker: body.ticker,
      category: body.category || '미국주식',
      quantity: body.quantity,
      avg_price: body.avgPrice,
      currency: body.currency,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(toInvestment(data), { status: 201 });
}
