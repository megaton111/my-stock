import { NextRequest, NextResponse } from 'next/server';
import supabase from '@/lib/supabase';

// GET /api/account-memos?userId=X
export async function GET(request: NextRequest) {
  const userId = request.nextUrl.searchParams.get('userId');
  if (!userId) {
    return NextResponse.json({ error: 'userId가 필요합니다.' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('account_memos')
    .select('broker, account_name, account_number, memo')
    .eq('user_id', userId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const memos: Record<string, string> = {};
  for (const row of data ?? []) {
    const key = `${row.broker}||${row.account_name}||${row.account_number || ''}`;
    memos[key] = row.memo;
  }

  return NextResponse.json(memos);
}

// PUT /api/account-memos
export async function PUT(request: NextRequest) {
  const body = await request.json();
  const { userId, broker, accountName, accountNumber, memo } = body;

  if (!userId || !broker || accountName == null) {
    return NextResponse.json({ error: '필수 항목이 누락되었습니다.' }, { status: 400 });
  }

  const { error } = await supabase
    .from('account_memos')
    .upsert(
      {
        user_id: userId,
        broker,
        account_name: accountName,
        account_number: accountNumber || '',
        memo: memo || '',
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,broker,account_name,account_number' },
    );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
