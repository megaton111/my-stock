const yahooFinance = require('yahoo-finance2').default;

async function test() {
  try {
    const result = await yahooFinance.quote('AAPL');
    console.log('SUCCESS:', result.regularMarketPrice);
  } catch (err) {
    console.error('FAILURE:', err);
  }
}

test();
