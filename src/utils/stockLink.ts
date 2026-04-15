export async function openStockPage(ticker: string, stockType?: string, naverCode?: string) {
  // 국내주식
  if (ticker.endsWith('.KS') || ticker.endsWith('.KQ')) {
    const code = ticker.replace(/\.(KS|KQ)$/, '');
    window.open(`https://stock.naver.com/domestic/stock/${code}/price`, '_blank');
    return;
  }
  // 코인
  if (ticker.endsWith('-USD')) {
    const symbol = ticker.replace(/-USD$/, '');
    window.open(`https://stock.naver.com/crypto/UPBIT/${symbol}`, '_blank');
    return;
  }
  // 해외주식: 네이버 코드가 있으면 바로 사용
  if (naverCode) {
    const pathType = stockType === 'etf' ? 'etf' : 'stock';
    window.open(`https://stock.naver.com/worldstock/${pathType}/${naverCode}/price`, '_blank');
    return;
  }
  // 해외주식: 네이버 코드 조회 후 이동
  try {
    const res = await fetch(`/api/stock/naver-code?ticker=${encodeURIComponent(ticker)}`);
    if (res.ok) {
      const data = await res.json();
      const pathType = data.stockEndType === 'etf' ? 'etf' : 'stock';
      window.open(`https://stock.naver.com/worldstock/${pathType}/${data.reutersCode}/price`, '_blank');
      return;
    }
  } catch {
    // 실패 시 Yahoo Finance 폴백
  }
  window.open(`https://finance.yahoo.com/quote/${ticker}`, '_blank');
}
