import { NextRequest, NextResponse } from 'next/server';
import supabase from '@/lib/supabase';

const PERIOD_DAYS: Record<string, number> = {
  '1w': 7,
  '1m': 30,
  '3m': 90,
  '1y': 365,
  all: 3650,
};

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const userId = searchParams.get('userId');
  const period = searchParams.get('period') || '1m';

  if (!userId) {
    return NextResponse.json({ error: 'userId는 필수입니다.' }, { status: 400 });
  }

  const days = PERIOD_DAYS[period] ?? 30;
  const since = new Date();
  since.setDate(since.getDate() - days);
  const sinceStr = since.toISOString().slice(0, 10);

  const { data, error } = await supabase
    .from('portfolio_snapshots')
    .select('date, total_invested, total_value, exchange_rate')
    .eq('user_id', userId)
    .gte('date', sinceStr)
    .order('date', { ascending: true });

  if (error) {
    return NextResponse.json({ error: '스냅샷 조회 실패' }, { status: 500 });
  }

  return NextResponse.json(data ?? []);
}
