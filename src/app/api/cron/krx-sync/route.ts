import { NextRequest, NextResponse } from 'next/server';
import supabase from '@/lib/supabase';

// 공공데이터포털 금융위원회_KRX상장종목정보 API
// https://www.data.go.kr/data/15094775/openapi.do
const BASE_URL = 'https://apis.data.go.kr/1160100/service/GetKrxListedInfoService/getItemInfo';

interface KrxItem {
  basDt: string;
  srtnCd: string;      // 단축코드
  isinCd: string;      // ISIN
  mrktCtg: string;     // 시장구분 (KOSPI, KOSDAQ, KONEX)
  itmsNm: string;      // 종목명
  crno?: string;
  corpNm?: string;
}

interface KrxResponse {
  response?: {
    header?: { resultCode?: string; resultMsg?: string };
    body?: {
      numOfRows?: number;
      pageNo?: number;
      totalCount?: number;
      items?: { item?: KrxItem[] | KrxItem };
    };
  };
}

async function fetchPage(serviceKey: string, pageNo: number, numOfRows: number): Promise<KrxResponse> {
  const params = new URLSearchParams({
    serviceKey,
    resultType: 'json',
    pageNo: String(pageNo),
    numOfRows: String(numOfRows),
  });
  const res = await fetch(`${BASE_URL}?${params}`, { cache: 'no-store' });
  if (!res.ok) {
    throw new Error(`공공데이터 API 호출 실패: ${res.status}`);
  }
  return (await res.json()) as KrxResponse;
}

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: '인증되지 않은 요청입니다.' }, { status: 401 });
  }

  const serviceKey = process.env.DATA_GO_KR_API_KEY;
  if (!serviceKey) {
    return NextResponse.json({ error: 'DATA_GO_KR_API_KEY 누락' }, { status: 500 });
  }

  const numOfRows = 1000;
  const allItems: KrxItem[] = [];

  try {
    // 1페이지 호출로 totalCount 확인 후 전체 수집
    const first = await fetchPage(serviceKey, 1, numOfRows);
    const body = first.response?.body;
    const totalCount = body?.totalCount ?? 0;

    const firstItems = body?.items?.item;
    if (Array.isArray(firstItems)) allItems.push(...firstItems);
    else if (firstItems) allItems.push(firstItems);

    const totalPages = Math.ceil(totalCount / numOfRows);
    for (let p = 2; p <= totalPages; p++) {
      const page = await fetchPage(serviceKey, p, numOfRows);
      const items = page.response?.body?.items?.item;
      if (Array.isArray(items)) allItems.push(...items);
      else if (items) allItems.push(items);
    }

    if (allItems.length === 0) {
      return NextResponse.json({ error: '수집된 종목이 없습니다.' }, { status: 500 });
    }

    // 최신 basDt 기준으로만 유지 (응답이 날짜별 중복을 포함할 수 있음)
    const latestByTicker = new Map<string, KrxItem>();
    for (const item of allItems) {
      if (!item.srtnCd || !item.itmsNm) continue;
      const existing = latestByTicker.get(item.srtnCd);
      if (!existing || (item.basDt ?? '') > (existing.basDt ?? '')) {
        latestByTicker.set(item.srtnCd, item);
      }
    }

    const rows = [...latestByTicker.values()].map((item) => ({
      ticker: item.srtnCd.trim(),
      name: item.itmsNm.trim(),
      market: item.mrktCtg?.trim() || 'UNKNOWN',
      isin: item.isinCd?.trim() || null,
      updated_at: new Date().toISOString(),
    }));

    // Supabase는 한 번에 너무 많은 row를 upsert하면 실패할 수 있어 배치 처리
    const batchSize = 500;
    let upserted = 0;
    for (let i = 0; i < rows.length; i += batchSize) {
      const batch = rows.slice(i, i + batchSize);
      const { error } = await supabase.from('krx_stocks').upsert(batch, { onConflict: 'ticker' });
      if (error) {
        return NextResponse.json({ error: `Supabase upsert 실패: ${error.message}` }, { status: 500 });
      }
      upserted += batch.length;
    }

    return NextResponse.json({
      message: 'KRX 종목 마스터 동기화 완료',
      totalFetched: allItems.length,
      unique: rows.length,
      upserted,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : '알 수 없는 오류';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
