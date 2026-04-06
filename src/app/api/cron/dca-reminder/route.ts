import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import supabase from '@/lib/supabase';
import { decryptEmail } from '@/lib/crypto';

const resend = new Resend(process.env.RESEND_API_KEY);

function buildEmailHtml(stocks: { stockName: string; ticker: string; quantity: number }[]): string {
  const rows = stocks.map((s) =>
    `<tr>
      <td style="padding:8px 12px;border-bottom:1px solid #eee">${s.stockName}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #eee;color:#888">${s.ticker}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:right">${s.quantity}주</td>
    </tr>`
  ).join('');

  return `
    <div style="font-family:'Pretendard','Apple SD Gothic Neo',sans-serif;max-width:480px;margin:0 auto;padding:24px">
      <h2 style="color:#1976d2;margin-bottom:4px">오늘의 적립식 매수 알림</h2>
      <p style="color:#666;margin-top:0">오늘 매수 예정인 종목입니다.</p>
      <table style="width:100%;border-collapse:collapse;margin:16px 0">
        <thead>
          <tr style="background:#f5f5f5">
            <th style="padding:8px 12px;text-align:left;font-weight:600">종목명</th>
            <th style="padding:8px 12px;text-align:left;font-weight:600">티커</th>
            <th style="padding:8px 12px;text-align:right;font-weight:600">수량</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
      <p style="margin-top:24px;color:#aaa;font-size:12px">
        My Stock에서 발송된 자동 알림입니다.
      </p>
    </div>
  `;
}

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: '인증되지 않은 요청입니다.' }, { status: 401 });
  }

  const now = new Date();
  const kstNow = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  const dayOfWeek = kstNow.getUTCDay(); // 0=일, 1=월, ..., 6=토
  const dayOfMonth = kstNow.getUTCDate(); // 1~31

  const { data: entries, error } = await supabase
    .from('dca_entries')
    .select('user_id, stock_name, ticker, schedule_type, schedule_value, schedule_quantity')
    .not('schedule_type', 'is', null)
    .not('schedule_value', 'is', null);

  if (error) {
    return NextResponse.json({ error: 'DCA 항목 조회 실패' }, { status: 500 });
  }

  // 오늘 매수 예정인 항목 필터링 (티커 기준 중복 제거)
  const seen = new Set<string>();
  const todayEntries = (entries ?? []).filter((e) => {
    const key = `${e.user_id}_${e.ticker}`;
    if (seen.has(key)) return false;

    let match = false;
    if (e.schedule_type === 'weekly') match = e.schedule_value % 7 === dayOfWeek;
    if (e.schedule_type === 'monthly') match = e.schedule_value === dayOfMonth;

    if (match) seen.add(key);
    return match;
  });

  // user_id별 그룹핑
  const userMap = new Map<number, { stockName: string; ticker: string; quantity: number }[]>();
  for (const e of todayEntries) {
    if (!userMap.has(e.user_id)) userMap.set(e.user_id, []);
    userMap.get(e.user_id)!.push({
      stockName: e.stock_name,
      ticker: e.ticker,
      quantity: e.schedule_quantity ?? 0,
    });
  }

  if (userMap.size === 0) {
    return NextResponse.json({ message: '오늘 매수 예정인 사용자가 없습니다.', sent: 0 });
  }

  // 해당 사용자들의 이메일 조회
  const userIds = [...userMap.keys()];
  const { data: users } = await supabase
    .from('users')
    .select('id, email')
    .in('id', userIds);

  let sentCount = 0;
  const errors: string[] = [];

  for (const user of users ?? []) {
    const stocks = userMap.get(user.id);
    if (!stocks?.length) continue;

    try {
      const email = decryptEmail(user.email);
      if (!email) continue;

      await resend.emails.send({
        from: 'My Stock <onboarding@resend.dev>',
        to: email,
        subject: `[My Stock] 오늘의 적립식 매수 알림 (${stocks.length}종목)`,
        html: buildEmailHtml(stocks),
      });
      sentCount++;
    } catch (err) {
      errors.push(`user ${user.id}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  return NextResponse.json({
    message: '알림 발송 완료',
    sent: sentCount,
    total: userMap.size,
    ...(errors.length > 0 && { errors }),
  });
}
