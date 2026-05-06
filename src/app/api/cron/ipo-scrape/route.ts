import { NextRequest, NextResponse } from 'next/server';
import supabase from '@/lib/supabase';
import { scrapeListOnly, scrapeDetailsForIds } from '@/utils/ipo-scraper';

export const maxDuration = 30;

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: '인증되지 않은 요청입니다.' }, { status: 401 });
  }

  try {
    // 1단계: 목록 스크래핑 후 즉시 upsert (빠름, ~2초)
    const listItems = await scrapeListOnly(2);

    if (listItems.length === 0) {
      return NextResponse.json({ message: '크롤링된 데이터가 없습니다.', upserted: 0 });
    }

    const seen = new Set<number>();
    const uniqueItems = listItems.filter((item) => {
      if (seen.has(item.externalId)) return false;
      seen.add(item.externalId);
      return true;
    });

    const listRows = uniqueItems.map((item) => ({
      external_id: item.externalId,
      stock_name: item.stockName,
      subscription_date: item.subscriptionDate,
      offering_price: item.offeringPrice,
      offering_price_range: item.offeringPriceRange,
      lead_underwriter: item.leadUnderwriter,
      updated_at: new Date().toISOString(),
    }));

    const { error: upsertError } = await supabase
      .from('ipo_schedules')
      .upsert(listRows, { onConflict: 'external_id', ignoreDuplicates: false });

    if (upsertError) {
      return NextResponse.json({ error: `목록 저장 실패: ${upsertError.message}` }, { status: 500 });
    }

    // 2단계: 상세 정보가 비어있거나 플레이스홀더인 종목만 조회
    const { data: incomplete, error: queryError } = await supabase
      .from('ipo_schedules')
      .select('external_id, confirmed_price')
      .in('external_id', uniqueItems.map((i) => i.externalId))
      .or('confirmed_price.is.null,confirmed_price.eq.- 원,confirmed_price.eq.-');

    if (queryError) {
      return NextResponse.json({ error: `조회 실패: ${queryError.message}` }, { status: 500 });
    }

    const idsToFetch = (incomplete ?? []).map((row) => row.external_id);

    let detailCount = 0;
    if (idsToFetch.length > 0) {
      // 최대 15개만 상세 스크래핑 (타임아웃 방지)
      const limitedIds = idsToFetch.slice(0, 15);
      const details = await scrapeDetailsForIds(limitedIds);

      for (const [externalId, detail] of details) {
        const { error } = await supabase
          .from('ipo_schedules')
          .update({
            stock_code: detail.stockCode,
            category: detail.category,
            total_shares: detail.totalShares,
            confirmed_price: detail.confirmedPrice,
            institutional_competition_rate: detail.institutionalCompetitionRate,
            lock_up_rate: detail.lockUpRate,
            subscription_competition_rate: detail.subscriptionCompetitionRate,
            ir_date: detail.irDate,
            listing_date: detail.listingDate,
            refund_date: detail.refundDate,
            updated_at: new Date().toISOString(),
          })
          .eq('external_id', externalId);

        if (!error) detailCount++;
      }
    }

    return NextResponse.json({
      message: '공모주 일정 업데이트 완료',
      list_upserted: listRows.length,
      details_updated: detailCount,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const stack = err instanceof Error ? err.stack : undefined;
    return NextResponse.json(
      { error: `크롤링 실패: ${message}`, stack },
      { status: 500 },
    );
  }
}
