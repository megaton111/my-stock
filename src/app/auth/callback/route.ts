import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import supabase from '@/lib/supabase';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');

  if (code) {
    const supabaseAuth = await createClient();
    const { data, error } = await supabaseAuth.auth.exchangeCodeForSession(code);

    if (!error && data.user) {
      // Supabase Auth 사용자의 이메일로 우리 users 테이블에서 조회/생성
      const email = data.user.email;
      if (email) {
        const { data: existing } = await supabase
          .from('users')
          .select('*')
          .eq('email', email)
          .single();

        if (!existing) {
          await supabase.from('users').insert({ email });
        }
      }

      return NextResponse.redirect(origin);
    }
  }

  // 에러 시 로그인 페이지로
  return NextResponse.redirect(`${origin}/login?error=auth`);
}
