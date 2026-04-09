import { NextRequest, NextResponse } from 'next/server';

/**
 * 통합 일일 크론 라우트
 * Vercel Hobby 플랜 cron 2개 제한으로 dca-reminder + krx-sync를 하나로 합침
 * 스케줄: UTC 00:00 (KST 09:00)
 */
export const maxDuration = 60;

async function runDcaReminder(request: NextRequest): Promise<{ task: string; result: unknown }> {
  try {
    const { GET } = await import('../dca-reminder/route');
    const response = await GET(request);
    const data = await response.json();
    return { task: 'dca-reminder', result: data };
  } catch (error) {
    return { task: 'dca-reminder', result: { error: error instanceof Error ? error.message : String(error) } };
  }
}

async function runKrxSync(request: NextRequest): Promise<{ task: string; result: unknown }> {
  try {
    const { GET } = await import('../krx-sync/route');
    const response = await GET(request);
    const data = await response.json();
    return { task: 'krx-sync', result: data };
  } catch (error) {
    return { task: 'krx-sync', result: { error: error instanceof Error ? error.message : String(error) } };
  }
}

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: '인증되지 않은 요청입니다.' }, { status: 401 });
  }

  const [dcaResult, krxResult] = await Promise.all([
    runDcaReminder(request),
    runKrxSync(request),
  ]);

  return NextResponse.json({
    message: '일일 작업 완료',
    results: [dcaResult, krxResult],
  });
}
