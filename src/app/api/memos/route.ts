import { NextRequest, NextResponse } from 'next/server';
import supabase from '@/lib/supabase';

export async function GET(request: NextRequest) {
  const userId = request.nextUrl.searchParams.get('userId');
  if (!userId) return NextResponse.json({ error: 'userId가 필요합니다' }, { status: 400 });

  const { data, error } = await supabase
    .from('memos')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[GET /api/memos]', error);
    return NextResponse.json({ error: error.message, details: error }, { status: 500 });
  }
  return NextResponse.json(data ?? []);
}

export async function POST(request: NextRequest) {
  const { userId, content } = await request.json();
  if (!userId) return NextResponse.json({ error: 'userId가 필요합니다' }, { status: 400 });
  if (!content?.trim()) return NextResponse.json({ error: '내용을 입력해주세요' }, { status: 400 });

  const { data, error } = await supabase
    .from('memos')
    .insert({ user_id: userId, content: content.trim() })
    .select()
    .single();

  if (error) {
    console.error('[POST /api/memos]', error);
    return NextResponse.json({ error: error.message, details: error }, { status: 500 });
  }
  return NextResponse.json(data);
}
