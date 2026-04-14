import { NextRequest, NextResponse } from 'next/server';

const NAVER_SUFFIXES = ['', '.O', '.N', '.K', '.A'];

// GET /api/stock/naver-code?ticker=AAPL → 네이버 증권 코드 조회
export async function GET(request: NextRequest) {
  const ticker = request.nextUrl.searchParams.get('ticker')?.trim();

  if (!ticker) {
    return NextResponse.json({ error: '티커가 필요합니다.' }, { status: 400 });
  }

  for (const suffix of NAVER_SUFFIXES) {
    const code = `${ticker}${suffix}`;
    try {
      const res = await fetch(`https://api.stock.naver.com/stock/${code}/basic`, {
        headers: { 'User-Agent': 'Mozilla/5.0', Accept: 'application/json' },
      });
      if (res.ok) {
        const data = await res.json();
        return NextResponse.json({
          reutersCode: data.reutersCode,
          stockEndType: data.stockEndType,
        });
      }
    } catch {
      continue;
    }
  }

  return NextResponse.json({ error: '네이버 코드를 찾을 수 없습니다.' }, { status: 404 });
}
