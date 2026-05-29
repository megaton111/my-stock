import { NextRequest, NextResponse } from 'next/server';
import supabase from '@/lib/supabase';

// POST /api/trading-journal/upload → 이미지 업로드 (Supabase Storage)
export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const file = formData.get('file') as File | null;
  const userId = formData.get('userId') as string | null;

  if (!file || !userId) {
    return NextResponse.json({ error: '파일과 userId가 필요합니다.' }, { status: 400 });
  }

  const maxSize = 5 * 1024 * 1024; // 5MB
  if (file.size > maxSize) {
    return NextResponse.json({ error: '파일 크기는 5MB 이하만 가능합니다.' }, { status: 400 });
  }

  const allowed = ['image/png', 'image/jpeg', 'image/gif', 'image/webp'];
  if (!allowed.includes(file.type)) {
    return NextResponse.json({ error: '지원하지 않는 이미지 형식입니다.' }, { status: 400 });
  }

  const ext = file.name.split('.').pop() || 'png';
  const fileName = `${userId}/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;

  const buffer = Buffer.from(await file.arrayBuffer());

  const { error } = await supabase.storage
    .from('journal-images')
    .upload(fileName, buffer, {
      contentType: file.type,
      upsert: false,
    });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const { data: urlData } = supabase.storage
    .from('journal-images')
    .getPublicUrl(fileName);

  return NextResponse.json({ url: urlData.publicUrl });
}
