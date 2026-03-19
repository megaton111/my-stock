import { NextRequest, NextResponse } from 'next/server';
import supabase from '@/lib/supabase';
import { createClient } from '@/lib/supabase-server';

// POST /api/users/delete — 회원 탈퇴
export async function POST(request: NextRequest) {
  const { userId } = await request.json();

  if (!userId) {
    return NextResponse.json({ error: 'userId가 필요합니다.' }, { status: 400 });
  }

  // 1. 관련 데이터 삭제 (FK 순서)
  await supabase.from('dca_entries').delete().eq('user_id', userId);
  await supabase.from('investments').delete().eq('user_id', userId);
  await supabase.from('users').delete().eq('id', userId);

  // 2. Supabase Auth 사용자 삭제
  const supabaseAuth = await createClient();
  const { data: { user: authUser } } = await supabaseAuth.auth.getUser();

  if (authUser) {
    await supabase.auth.admin.deleteUser(authUser.id);
  }

  return NextResponse.json({ success: true });
}
