import { NextResponse } from 'next/server';
import supabase from '@/lib/supabase';
import { encryptEmail, hashEmail } from '@/lib/crypto';

// 기존 평문 이메일을 암호화된 형태로 마이그레이션
// 한 번만 실행하면 됩니다
export async function POST() {
  const { data: users, error } = await supabase
    .from('users')
    .select('*')
    .is('email_hash', null); // email_hash가 없는 = 아직 마이그레이션 안 된 사용자

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!users || users.length === 0) {
    return NextResponse.json({ message: '마이그레이션할 사용자가 없습니다.', migrated: 0 });
  }

  let migrated = 0;

  for (const user of users) {
    const plainEmail = user.email;

    // 이미 암호화된 이메일인지 간단히 체크 (@ 포함 여부)
    if (!plainEmail.includes('@')) continue;

    const { error: updateError } = await supabase
      .from('users')
      .update({
        email: encryptEmail(plainEmail),
        email_hash: hashEmail(plainEmail),
      })
      .eq('id', user.id);

    if (!updateError) migrated++;
  }

  return NextResponse.json({
    message: `${migrated}명의 이메일을 암호화했습니다.`,
    migrated,
  });
}
