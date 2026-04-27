import { NextRequest, NextResponse } from 'next/server';
import supabase from '@/lib/supabase';
import { scrapeAll } from '@/utils/ipo-scraper';

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: '인증되지 않은 요청입니다.' }, { status: 401 });
  }

  try {
    const items = await scrapeAll(2);

    if (items.length === 0) {
      return NextResponse.json({ message: '크롤링된 데이터가 없습니다.', upserted: 0 });
    }

    const seen = new Set<number>();
    const uniqueItems = items.filter((item) => {
      if (seen.has(item.externalId)) return false;
      seen.add(item.externalId);
      return true;
    });

    const rows = uniqueItems.map((item) => ({
      external_id: item.externalId,
      stock_name: item.stockName,
      subscription_date: item.subscriptionDate,
      offering_price: item.offeringPrice,
      offering_price_range: item.offeringPriceRange,
      lead_underwriter: item.leadUnderwriter,
      stock_code: item.stockCode,
      category: item.category,
      total_shares: item.totalShares,
      confirmed_price: item.confirmedPrice,
      institutional_competition_rate: item.institutionalCompetitionRate,
      lock_up_rate: item.lockUpRate,
      subscription_competition_rate: item.subscriptionCompetitionRate,
      ir_date: item.irDate,
      listing_date: item.listingDate,
      refund_date: item.refundDate,
      updated_at: new Date().toISOString(),
    }));

    const { error } = await supabase
      .from('ipo_schedules')
      .upsert(rows, { onConflict: 'external_id' });

    if (error) {
      return NextResponse.json({ error: `DB 저장 실패: ${error.message}` }, { status: 500 });
    }

    return NextResponse.json({
      message: '공모주 일정 업데이트 완료',
      upserted: rows.length,
    });
  } catch (err) {
    return NextResponse.json(
      { error: `크롤링 실패: ${err instanceof Error ? err.message : String(err)}` },
      { status: 500 },
    );
  }
}
