import { NextRequest, NextResponse } from 'next/server';
import supabase from '@/lib/supabase';

const FETCH_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  Accept: 'application/json',
  Referer: 'https://finance.yahoo.com/',
};

interface SearchItem {
  symbol: string;
  name: string;
  exchange?: string;
  type?: string;
}

interface YahooSearchQuote {
  symbol?: string;
  shortname?: string;
  longname?: string;
  quoteType?: string;
  exchDisp?: string;
  typeDisp?: string;
}

interface YahooSearchResponse {
  quotes?: YahooSearchQuote[];
}

function toYahooKrSuffix(market: string): string {
  if (market === 'KOSPI') return '.KS';
  if (market === 'KOSDAQ') return '.KQ';
  return '.KS';
}

async function searchKR(q: string): Promise<SearchItem[]> {
  // 단축코드 (숫자) 또는 한글/영문 이름 모두 ILIKE 검색
  const isTicker = /^\d+$/.test(q);
  const query = supabase
    .from('krx_stocks')
    .select('ticker, name, market')
    .limit(10);

  const { data, error } = isTicker
    ? await query.ilike('ticker', `${q}%`)
    : await query.ilike('name', `%${q}%`);

  if (error) throw new Error(error.message);

  const dbResults = (data ?? []).map((row) => ({
    symbol: `${row.ticker}${toYahooKrSuffix(row.market)}`,
    name: row.name,
    exchange: row.market,
    type: '주식',
  }));

  // DB에 결과가 없으면 네이버 증권 자동완성으로 폴백 (ETF 등 누락 종목 대응)
  if (dbResults.length === 0) {
    return searchNaverKR(q);
  }
  return dbResults;
}

interface NaverAcItem {
  code?: string;
  name?: string;
  typeCode?: string;
  reutersCode?: string;
}

async function searchNaverKR(q: string): Promise<SearchItem[]> {
  const url = `https://ac.stock.naver.com/ac?q=${encodeURIComponent(q)}&target=stock`;
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0', Accept: 'application/json' },
  });
  if (!res.ok) return [];
  const data = (await res.json()) as { items?: NaverAcItem[] };

  return (data.items ?? [])
    .filter((item) => item.code && item.name)
    .slice(0, 10)
    .map((item) => {
      const suffix = item.typeCode === 'KOSDAQ' ? '.KQ' : '.KS';
      return {
        symbol: `${item.code}${suffix}`,
        name: item.name!,
        exchange: item.typeCode || 'KOSPI',
        type: 'ETF',
      };
    });
}

async function searchYahoo(q: string, typeFilter?: 'CRYPTO'): Promise<SearchItem[]> {
  const url = `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(
    q,
  )}&quotesCount=20&newsCount=0`;
  const res = await fetch(url, { headers: FETCH_HEADERS });
  if (!res.ok) throw new Error(`Yahoo 검색 실패 (${res.status})`);
  const data = (await res.json()) as YahooSearchResponse;

  let quotes = (data.quotes ?? []).filter((q) => q.symbol);

  if (typeFilter === 'CRYPTO') {
    quotes = quotes.filter((q) => q.quoteType === 'CRYPTOCURRENCY');
  } else {
    // US 검색: 한국 거래소 결과 제외 (KSC, KOE 등)
    quotes = quotes.filter((q) => !q.symbol!.endsWith('.KS') && !q.symbol!.endsWith('.KQ'));
  }

  return quotes.slice(0, 10).map((q) => ({
    symbol: q.symbol!,
    name: q.shortname || q.longname || q.symbol!,
    exchange: q.exchDisp,
    type: q.typeDisp || q.quoteType,
  }));
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const q = searchParams.get('q')?.trim();
  const market = (searchParams.get('market') || 'US').toUpperCase();

  if (!q) {
    return NextResponse.json({ error: '검색어를 입력해주세요' }, { status: 400 });
  }

  try {
    let results: SearchItem[];
    if (market === 'KR') {
      results = await searchKR(q);
    } else if (market === 'CRYPTO') {
      results = await searchYahoo(q, 'CRYPTO');
    } else {
      results = await searchYahoo(q);
    }
    return NextResponse.json(results);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : '검색 오류';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
