import { NextResponse } from 'next/server';

interface CnnFearGreed {
  fear_and_greed: {
    score: number;
    rating: string;
    timestamp: string;
    previous_close: number;
    previous_1_week: number;
    previous_1_month: number;
    previous_1_year: number;
  };
}

export async function GET() {
  try {
    const res = await fetch('https://production.dataviz.cnn.io/index/fearandgreed/graphdata', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': 'https://edition.cnn.com/',
        'Origin': 'https://edition.cnn.com',
      },
      next: { revalidate: 300 },
    });

    if (!res.ok) {
      return NextResponse.json({ error: '데이터를 가져올 수 없습니다' }, { status: 502 });
    }

    const data = (await res.json()) as CnnFearGreed;
    const fg = data.fear_and_greed;

    return NextResponse.json({
      score: fg.score,
      rating: fg.rating,
      timestamp: fg.timestamp,
      previousClose: fg.previous_close,
      previous1Week: fg.previous_1_week,
      previous1Month: fg.previous_1_month,
      previous1Year: fg.previous_1_year,
    });
  } catch {
    return NextResponse.json({ error: '데이터를 가져올 수 없습니다' }, { status: 502 });
  }
}
