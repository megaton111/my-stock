import { createClient } from '@supabase/supabase-js';
import { scrapeListOnly, scrapeDetailsForIds } from '../src/utils/ipo-scraper';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('환경변수 누락: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  // 1단계: 목록 스크래핑 (2페이지)
  const listItems = await scrapeListOnly(2);
  console.log(`목록 스크래핑 완료: ${listItems.length}건`);

  if (listItems.length === 0) {
    console.log('크롤링된 데이터가 없습니다.');
    return;
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
    console.error(`목록 저장 실패: ${upsertError.message}`);
    process.exit(1);
  }
  console.log(`목록 저장 완료: ${listRows.length}건`);

  // 2단계: 상세 정보가 비어있는 종목만 조회
  const { data: incomplete, error: queryError } = await supabase
    .from('ipo_schedules')
    .select('external_id, confirmed_price')
    .in('external_id', uniqueItems.map((i) => i.externalId))
    .or('confirmed_price.is.null,confirmed_price.eq.- 원,confirmed_price.eq.-');

  if (queryError) {
    console.error(`조회 실패: ${queryError.message}`);
    process.exit(1);
  }

  const idsToFetch = (incomplete ?? []).map((row) => row.external_id);
  console.log(`상세 스크래핑 대상: ${idsToFetch.length}건`);

  let detailCount = 0;
  if (idsToFetch.length > 0) {
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

  console.log(`공모주 일정 업데이트 완료 - 목록: ${listRows.length}건, 상세: ${detailCount}건`);
}

main().catch((err) => {
  console.error('크롤링 실패:', err);
  process.exit(1);
});
