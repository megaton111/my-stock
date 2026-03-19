async function testNewEndpoint() {
  const symbol = 'AAPL';
  const url = `https://query2.finance.yahoo.com/v10/finance/quoteSummary/${symbol}?modules=price`;
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });
    console.log('STATUS:', response.status);
    const data = await response.json();
    console.log('DATA:', JSON.stringify(data, null, 2));
  } catch (err) {
    console.error('FETCH_FAILURE:', err);
  }
}

testNewEndpoint();
