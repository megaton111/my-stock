export interface MddResult {
  mdd: number;         // 최대낙폭 (음수, 예: -0.254 = -25.4%)
  peakDate: string;    // 고점일 YYYY-MM-DD
  peakPrice: number;   // 고점가
  troughDate: string;  // 저점일 YYYY-MM-DD
  troughPrice: number; // 저점가
  ytdStart: number;    // 연초가
  ytdStartDate: string;// 연초 거래일
  latest: number;      // 최신 종가
  latestDate: string;  // 최신 거래일
  ytdReturn: number;   // 연초대비 수익률 (예: -0.1397 = -13.97%)
}

export interface Point {
  date: string;
  close: number;
}

export interface DrawdownPoint {
  date: string;
  label: string; // MM.DD
  drawdown: number; // % (예: -25.4)
}

export function calculateMdd(history: Point[]): MddResult | null {
  if (history.length < 2) return null;

  // MDD 계산
  let runningMax = history[0].close;
  let runningMaxIdx = 0;
  let mdd = 0;
  let peakIdx = 0;
  let troughIdx = 0;

  for (let i = 1; i < history.length; i++) {
    if (history[i].close > runningMax) {
      runningMax = history[i].close;
      runningMaxIdx = i;
    }
    const drawdown = (history[i].close - runningMax) / runningMax;
    if (drawdown < mdd) {
      mdd = drawdown;
      peakIdx = runningMaxIdx;
      troughIdx = i;
    }
  }

  // YTD 계산: 올해 첫 거래일 찾기
  const currentYear = new Date().getFullYear().toString();
  const ytdPoint = history.find((p) => p.date.startsWith(currentYear));
  const latest = history[history.length - 1];

  // 올해 데이터가 없으면 전체 기간의 첫날/마지막을 사용
  const ytdStart = ytdPoint || history[0];
  const ytdReturn = (latest.close - ytdStart.close) / ytdStart.close;

  return {
    mdd,
    peakDate: history[peakIdx].date,
    peakPrice: history[peakIdx].close,
    troughDate: history[troughIdx].date,
    troughPrice: history[troughIdx].close,
    ytdStart: ytdStart.close,
    ytdStartDate: ytdStart.date,
    latest: latest.close,
    latestDate: latest.date,
    ytdReturn,
  };
}

export interface AthResult {
  allTimeHigh: number;
  athDate: string;
}

export function calculateAth(history: Point[]): AthResult | null {
  if (history.length === 0) return null;
  let maxPrice = history[0].close;
  let maxIdx = 0;
  for (let i = 1; i < history.length; i++) {
    if (history[i].close > maxPrice) {
      maxPrice = history[i].close;
      maxIdx = i;
    }
  }
  return { allTimeHigh: maxPrice, athDate: history[maxIdx].date };
}

export function calculateDrawdownSeries(history: Point[]): DrawdownPoint[] {
  if (history.length < 2) return [];

  let runningMax = history[0].close;
  const series: DrawdownPoint[] = [];

  for (let i = 0; i < history.length; i++) {
    if (history[i].close > runningMax) {
      runningMax = history[i].close;
    }
    const dd = ((history[i].close - runningMax) / runningMax) * 100;
    const [, m, d] = history[i].date.split('-');
    series.push({ date: history[i].date, label: `${m}.${d}`, drawdown: Math.round(dd * 100) / 100 });
  }

  return series;
}
