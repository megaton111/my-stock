import { NextRequest, NextResponse } from 'next/server';
import supabase from '@/lib/supabase';
import { encryptEmail, decryptEmail, hashEmail } from '@/lib/crypto';

// 이메일로 사용자 조회 또는 생성
export async function POST(request: NextRequest) {
  const { email } = await request.json();

  if (!email) {
    return NextResponse.json({ error: '이메일이 필요합니다.' }, { status: 400 });
  }

  const hash = hashEmail(email);

  // email_hash로 기존 사용자 조회
  const { data: existing } = await supabase
    .from('users')
    .select('*')
    .eq('email_hash', hash)
    .single();

  if (existing) {
    const decrypted = decryptEmail(existing.email);
    return NextResponse.json({ id: String(existing.id), email: decrypted });
  }

  // 없으면 새로 생성
  const { data: created, error } = await supabase
    .from('users')
    .insert({
      email: encryptEmail(email),
      email_hash: hash,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const decrypted = decryptEmail(created.email);
  return NextResponse.json({ id: String(created.id), email: decrypted }, { status: 201 });
}
