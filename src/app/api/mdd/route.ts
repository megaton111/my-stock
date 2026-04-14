import { NextRequest, NextResponse } from 'next/server';
import supabase from '@/lib/supabase';

interface MddWatchlistRow {
  id: string;
  symbol: string;
  name: string;
  currency: string;
}

const MAX_ITEMS = 5;

// GET /api/mdd?userId=X → 저장된 MDD 종목 목록
export async function GET(request: NextRequest) {
  const userId = request.nextUrl.searchParams.get('userId');

  if (!userId) {
    return NextResponse.json({ error: 'userId가 필요합니다.' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('mdd_watchlist')
    .select('id, symbol, name, currency')
    .eq('user_id', userId)
    .order('created_at', { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data as MddWatchlistRow[]);
}

// POST /api/mdd → 종목 추가 (최대 5개)
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { userId, symbol, name, currency } = body;

  if (!userId || !symbol || !name) {
    return NextResponse.json({ error: 'userId, symbol, name이 필요합니다.' }, { status: 400 });
  }

  // 현재 등록 수 확인
  const { count, error: countError } = await supabase
    .from('mdd_watchlist')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId);

  if (countError) {
    return NextResponse.json({ error: countError.message }, { status: 500 });
  }

  if ((count ?? 0) >= MAX_ITEMS) {
    return NextResponse.json(
      { error: `최대 ${MAX_ITEMS}개까지 등록이 가능합니다.` },
      { status: 400 },
    );
  }

  const { data, error } = await supabase
    .from('mdd_watchlist')
    .insert({ user_id: userId, symbol, name, currency: currency || 'USD' })
    .select('id, symbol, name, currency')
    .single();

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ error: '이미 등록된 종목입니다.' }, { status: 400 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

// DELETE /api/mdd?id=X&userId=Y → 종목 삭제
export async function DELETE(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const id = searchParams.get('id');
  const userId = searchParams.get('userId');

  if (!id || !userId) {
    return NextResponse.json({ error: 'id와 userId가 필요합니다.' }, { status: 400 });
  }

  const { error } = await supabase
    .from('mdd_watchlist')
    .delete()
    .eq('id', id)
    .eq('user_id', userId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
