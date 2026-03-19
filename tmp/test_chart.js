async function testChartAPI() {
  const symbol = 'AAPL';
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1m&range=1d`;
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });
    console.log('STATUS:', response.status);
    const data = await response.json();
    const result = data.chart.result[0];
    const currentPrice = result.meta.regularMarketPrice;
    console.log('CURRENT_PRICE:', currentPrice);
  } catch (err) {
    console.error('FETCH_FAILURE:', err);
  }
}

testChartAPI();
