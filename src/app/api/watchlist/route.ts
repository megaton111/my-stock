import { NextRequest, NextResponse } from 'next/server';
import supabase from '@/lib/supabase';

function toItem(row: Record<string, unknown>) {
  return {
    id: String(row.id),
    ticker: row.ticker as string,
    stockName: row.stock_name as string,
    exchange: (row.exchange as string) || undefined,
    stockType: (row.stock_type as string) || undefined,
    naverCode: (row.naver_code as string) || undefined,
  };
}

const NAVER_SUFFIXES = ['', '.O', '.N', '.K', '.A'];

async function resolveNaverCode(ticker: string): Promise<{ reutersCode: string; stockEndType: string } | null> {
  for (const suffix of NAVER_SUFFIXES) {
    const code = `${ticker}${suffix}`;
    try {
      const res = await fetch(`https://api.stock.naver.com/stock/${code}/basic`, {
        headers: { 'User-Agent': 'Mozilla/5.0', Accept: 'application/json' },
      });
      if (res.ok) {
        const data = await res.json();
        return { reutersCode: data.reutersCode, stockEndType: data.stockEndType };
      }
    } catch {
      continue;
    }
  }
  return null;
}

// GET /api/watchlist?userId=X → 관심종목 목록
export async function GET(request: NextRequest) {
  const userId = request.nextUrl.searchParams.get('userId');

  if (!userId) {
    return NextResponse.json({ error: 'userId가 필요합니다.' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('watchlist')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json((data ?? []).map(toItem));
}

// POST /api/watchlist → 관심종목 추가
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { userId, ticker, stockName, exchange, stockType } = body;

  if (!userId || !ticker || !stockName) {
    return NextResponse.json({ error: '필수 항목이 누락되었습니다.' }, { status: 400 });
  }

  // 해외주식: 네이버 증권 reutersCode 조회
  const isKorean = ticker.endsWith('.KS') || ticker.endsWith('.KQ');
  const isCrypto = ticker.endsWith('-USD');
  let naverCode: string | undefined;
  let naverStockType: string | undefined;

  if (!isKorean && !isCrypto) {
    const naver = await resolveNaverCode(ticker);
    if (naver) {
      naverCode = naver.reutersCode;
      naverStockType = naver.stockEndType;
    }
  }

  const { data, error } = await supabase
    .from('watchlist')
    .insert({
      user_id: userId,
      ticker,
      stock_name: stockName,
      ...(exchange ? { exchange } : {}),
      stock_type: naverStockType || stockType || null,
      ...(naverCode ? { naver_code: naverCode } : {}),
    })
    .select()
    .single();

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ error: '이미 등록된 종목입니다.' }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(toItem(data), { status: 201 });
}
