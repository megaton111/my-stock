import { NextRequest, NextResponse } from 'next/server';
import supabase from '@/lib/supabase';

// GET /api/account-sort?userId=X
export async function GET(request: NextRequest) {
  const userId = request.nextUrl.searchParams.get('userId');
  if (!userId) {
    return NextResponse.json({ error: 'userId가 필요합니다.' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('account_sort_orders')
    .select('broker, account_name, account_number, sort_order')
    .eq('user_id', userId)
    .order('sort_order', { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data ?? []);
}

// PUT /api/account-sort → 전체 정렬 순서 저장
export async function PUT(request: NextRequest) {
  const body = await request.json();
  const { userId, orders } = body as {
    userId: string;
    orders: { broker: string; accountName: string; accountNumber: string; sortOrder: number }[];
  };

  if (!userId || !Array.isArray(orders)) {
    return NextResponse.json({ error: '필수 항목이 누락되었습니다.' }, { status: 400 });
  }

  const rows = orders.map((o) => ({
    user_id: userId,
    broker: o.broker,
    account_name: o.accountName,
    account_number: o.accountNumber || '',
    sort_order: o.sortOrder,
  }));

  const { error } = await supabase
    .from('account_sort_orders')
    .upsert(rows, { onConflict: 'user_id,broker,account_name,account_number' });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
