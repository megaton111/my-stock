import yahooFinance from 'yahoo-finance2';

async function test() {
  try {
    const result = await yahooFinance.quote('AAPL');
    console.log('SUCCESS:', result.regularMarketPrice);
  } catch (err) {
    console.error('FAILURE_NAME:', err.name);
    console.error('FAILURE_MESSAGE:', err.message);
    if (err.errors) console.error('SUB_ERRORS:', JSON.stringify(err.errors, null, 2));
    console.error('FULL_ERROR:', err);
  }
}

test();
