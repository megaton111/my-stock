import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import supabase from '@/lib/supabase';
import { encryptEmail, hashEmail } from '@/lib/crypto';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');

  if (code) {
    const supabaseAuth = await createClient();
    const { data, error } = await supabaseAuth.auth.exchangeCodeForSession(code);

    if (!error && data.user) {
      const email = data.user.email;
      if (email) {
        const hash = hashEmail(email);

        // email_hash로 기존 사용자 조회
        const { data: existing } = await supabase
          .from('users')
          .select('*')
          .eq('email_hash', hash)
          .single();

        if (!existing) {
          await supabase.from('users').insert({
            email: encryptEmail(email),
            email_hash: hash,
          });
        }
      }

      return NextResponse.redirect(origin);
    }
  }

  // 에러 시 로그인 페이지로
  return NextResponse.redirect(`${origin}/login?error=auth`);
}
