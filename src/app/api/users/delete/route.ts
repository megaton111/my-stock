import { NextRequest, NextResponse } from 'next/server';
import supabase from '@/lib/supabase';
import { createClient } from '@/lib/supabase-server';

/** Google OAuth 토큰 revoke — 연결된 앱 목록에서 제거 */
async function revokeGoogle(providerToken?: string, providerRefreshToken?: string) {
  // refresh token이 있으면 우선 사용 (access token은 만료될 수 있음)
  const token = providerRefreshToken || providerToken;
  if (!token) {
    console.error('Google revoke: no token available');
    return;
  }
  try {
    const res = await fetch(`https://oauth2.googleapis.com/revoke?token=${token}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
    console.log('Google revoke status:', res.status);
  } catch (e) {
    console.error('Google revoke failed:', e);
  }
}

/** 카카오 연결 해제 (unlink) */
async function unlinkKakao(providerToken: string) {
  try {
    await fetch('https://kapi.kakao.com/v1/user/unlink', {
      method: 'POST',
      headers: { Authorization: `Bearer ${providerToken}` },
    });
  } catch (e) {
    console.error('Kakao unlink failed:', e);
  }
}

// POST /api/users/delete — 회원 탈퇴
export async function POST(request: NextRequest) {
  const { userId, provider, providerToken, providerRefreshToken } = await request.json();

  if (!userId) {
    return NextResponse.json({ error: 'userId가 필요합니다.' }, { status: 400 });
  }

  // 1. 소셜 로그인 연결 해제
  if (provider === 'google') {
    await revokeGoogle(providerToken, providerRefreshToken);
  } else if (provider === 'kakao' && providerToken) {
    await unlinkKakao(providerToken);
  }

  // 2. 관련 데이터 삭제 (FK 순서)
  await supabase.from('dca_entries').delete().eq('user_id', userId);
  await supabase.from('investments').delete().eq('user_id', userId);
  await supabase.from('users').delete().eq('id', userId);

  // 3. Supabase Auth 사용자 삭제
  const supabaseAuth = await createClient();
  const { data: { user: authUser } } = await supabaseAuth.auth.getUser();

  if (authUser) {
    await supabase.auth.admin.deleteUser(authUser.id);
  }

  return NextResponse.json({ success: true });
}
