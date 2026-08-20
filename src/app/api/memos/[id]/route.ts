import { NextRequest, NextResponse } from 'next/server';
import supabase from '@/lib/supabase';

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { userId, content } = await request.json();
  if (!userId) return NextResponse.json({ error: 'userId가 필요합니다' }, { status: 400 });
  if (!content?.trim()) return NextResponse.json({ error: '내용을 입력해주세요' }, { status: 400 });

  const { data, error } = await supabase
    .from('memos')
    .update({ content: content.trim() })
    .eq('id', id)
    .eq('user_id', userId)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const userId = request.nextUrl.searchParams.get('userId');
  if (!userId) return NextResponse.json({ error: 'userId가 필요합니다' }, { status: 400 });

  const { error } = await supabase
    .from('memos')
    .delete()
    .eq('id', id)
    .eq('user_id', userId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
