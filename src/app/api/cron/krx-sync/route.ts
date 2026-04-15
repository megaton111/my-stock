import { NextRequest, NextResponse } from 'next/server';
import supabase from '@/lib/supabase';

// 공공데이터포털 금융위원회 API
const STOCK_URL =
  'https://apis.data.go.kr/1160100/service/GetStockSecuritiesInfoService/getStockPriceInfo';
const ETF_URL =
  'https://apis.data.go.kr/1160100/service/GetETFSecuritiesInfoService/getETFPriceInfo';

// Vercel 함수 타임아웃 연장 (기본 10초 → 60초)
export const maxDuration = 60;

interface KrxItem {
  basDt: string;
  srtnCd: string;
  isinCd: string;
  mrktCtg: string;
  itmsNm: string;
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

// KST 기준 YYYYMMDD로부터 N일 전 날짜 (주말 제외)
function getRecentBusinessDays(count: number): string[] {
  const result: string[] = [];
  const now = new Date();
  const kstNow = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  // eslint-disable-next-line @typescript-eslint/prefer-for-of
  for (let i = 0; result.length < count && i < count * 2 + 10; i++) {
    const d = new Date(kstNow);
    d.setUTCDate(d.getUTCDate() - i);
    const day = d.getUTCDay();
    if (day === 0 || day === 6) continue; // 일/토 제외
    const yyyy = d.getUTCFullYear();
    const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
    const dd = String(d.getUTCDate()).padStart(2, '0');
    result.push(`${yyyy}${mm}${dd}`);
  }
  return result;
}

async function fetchByBasDt(serviceKey: string, basDt: string, baseUrl: string = STOCK_URL): Promise<KrxItem[]> {
  const params = new URLSearchParams({
    serviceKey,
    resultType: 'json',
    numOfRows: '10000',
    pageNo: '1',
    basDt,
  });
  const res = await fetch(`${baseUrl}?${params}`, { cache: 'no-store' });
  if (!res.ok) {
    const bodyText = await res.text().catch(() => '');
    throw new Error(`API ${res.status}: ${bodyText.slice(0, 200)}`);
  }
  const text = await res.text();
  let data: KrxResponse;
  try {
    data = JSON.parse(text) as KrxResponse;
  } catch {
    throw new Error(`응답 JSON 파싱 실패: ${text.slice(0, 200)}`);
  }
  const items = data.response?.body?.items?.item;
  if (Array.isArray(items)) return items;
  if (items) return [items];
  return [];
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

  try {
    // 최근 영업일 7개를 순서대로 시도해서 데이터가 있는 가장 최신일 사용
    const candidates = getRecentBusinessDays(7);
    let stockItems: KrxItem[] = [];
    let etfItems: KrxItem[] = [];
    let usedBasDt = '';

    for (const basDt of candidates) {
      const result = await fetchByBasDt(serviceKey, basDt, STOCK_URL);
      if (result.length > 0) {
        stockItems = result;
        usedBasDt = basDt;
        // 같은 날짜로 ETF도 조회
        etfItems = await fetchByBasDt(serviceKey, basDt, ETF_URL);
        break;
      }
    }

    const items = [...stockItems, ...etfItems];

    if (items.length === 0) {
      return NextResponse.json(
        { error: '최근 영업일 내 종목 데이터가 없습니다.', tried: candidates },
        { status: 500 },
      );
    }

    const rows = items
      .filter((it) => it.srtnCd && it.itmsNm)
      .map((it) => ({
        ticker: it.srtnCd.trim(),
        name: it.itmsNm.trim(),
        market: it.mrktCtg?.trim() || 'UNKNOWN',
        isin: it.isinCd?.trim() || null,
        updated_at: new Date().toISOString(),
      }));

    // 배치 upsert
    const batchSize = 500;
    let upserted = 0;
    for (let i = 0; i < rows.length; i += batchSize) {
      const batch = rows.slice(i, i + batchSize);
      const { error } = await supabase.from('krx_stocks').upsert(batch, { onConflict: 'ticker' });
      if (error) {
        return NextResponse.json(
          { error: `Supabase upsert 실패: ${error.message}` },
          { status: 500 },
        );
      }
      upserted += batch.length;
    }

    return NextResponse.json({
      message: 'KRX 종목 마스터 동기화 완료',
      basDt: usedBasDt,
      stocks: stockItems.length,
      etfs: etfItems.length,
      upserted,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : '알 수 없는 오류';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
