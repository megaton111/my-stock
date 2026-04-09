import { NextRequest, NextResponse } from 'next/server';
import supabase from '@/lib/supabase';

// DELETE /api/watchlist/[id] → 관심종목 삭제
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const { error } = await supabase.from('watchlist').delete().eq('id', id);

  if (error) {
    return NextResponse.json({ error: '관심종목을 찾을 수 없습니다.' }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
