import { NextResponse } from 'next/server';
import supabase from '@/lib/supabase';

export async function GET() {
  const { data, error } = await supabase
    .from('ipo_schedules')
    .select('*')
    .not('subscription_date', 'is', null)
    .order('subscription_date', { ascending: false });

  if (error) {
    return NextResponse.json({ error: '공모주 일정 조회 실패' }, { status: 500 });
  }

  return NextResponse.json(data ?? []);
}
