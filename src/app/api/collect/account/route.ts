import { NextRequest, NextResponse } from 'next/server';
import supabase from '@/lib/supabase';

// PATCH /api/collect/account → 특정 종목의 계좌 정보 일괄 변경
export async function PATCH(request: NextRequest) {
  const body = await request.json();
  const { userId, ticker, broker, accountName, accountNumber } = body;

  if (!userId || !ticker) {
    return NextResponse.json({ error: 'userId, ticker가 필요합니다.' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('collect_entries')
    .update({
      broker: broker || null,
      account_name: accountName || null,
      account_number: accountNumber || null,
    })
    .eq('user_id', userId)
    .eq('ticker', ticker)
    .select('id');

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!data || data.length === 0) {
    return NextResponse.json({ error: '해당 종목을 찾을 수 없습니다.' }, { status: 404 });
  }

  return NextResponse.json({ success: true, updatedCount: data.length });
}
