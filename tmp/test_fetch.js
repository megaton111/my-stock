async function testFetch() {
  const url = 'https://query1.finance.yahoo.com/v7/finance/quote?symbols=AAPL';
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });
    console.log('STATUS:', response.status);
    const text = await response.text();
    console.log('RESPONSE_START:', text.substring(0, 100));
  } catch (err) {
    console.error('FETCH_FAILURE:', err);
  }
}

testFetch();
