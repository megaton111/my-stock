import { NextRequest, NextResponse } from 'next/server';
import supabase from '@/lib/supabase';

function toItem(row: Record<string, unknown>) {
  return {
    id: String(row.id),
    ticker: row.ticker as string,
    stockName: row.stock_name as string,
  };
}

// GET /api/watchlist?userId=X → 관심종목 목록
export async function GET(request: NextRequest) {
  const userId = request.nextUrl.searchParams.get('userId');

  if (!userId) {
    return NextResponse.json({ error: 'userId가 필요합니다.' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('watchlist')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json((data ?? []).map(toItem));
}

// POST /api/watchlist → 관심종목 추가
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { userId, ticker, stockName } = body;

  if (!userId || !ticker || !stockName) {
    return NextResponse.json({ error: '필수 항목이 누락되었습니다.' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('watchlist')
    .insert({
      user_id: userId,
      ticker,
      stock_name: stockName,
    })
    .select()
    .single();

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ error: '이미 등록된 종목입니다.' }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(toItem(data), { status: 201 });
}
