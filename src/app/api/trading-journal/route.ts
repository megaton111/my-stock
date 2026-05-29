import { NextRequest, NextResponse } from 'next/server';
import supabase from '@/lib/supabase';

// GET /api/trading-journal?userId=X → 매매일지 목록 (거래 요약 포함)
export async function GET(request: NextRequest) {
  const userId = request.nextUrl.searchParams.get('userId');

  if (!userId) {
    return NextResponse.json({ error: 'userId가 필요합니다.' }, { status: 400 });
  }

  const { data: journals, error } = await supabase
    .from('trading_journals')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!journals || journals.length === 0) {
    return NextResponse.json([]);
  }

  const journalIds = journals.map((j) => j.id);

  const { data: transactions, error: txError } = await supabase
    .from('trading_journal_transactions')
    .select('*')
    .in('journal_id', journalIds)
    .order('trade_date', { ascending: true });

  if (txError) {
    return NextResponse.json({ error: txError.message }, { status: 500 });
  }

  const txByJournal = new Map<number, typeof transactions>();
  for (const tx of transactions ?? []) {
    const list = txByJournal.get(tx.journal_id) ?? [];
    list.push(tx);
    txByJournal.set(tx.journal_id, list);
  }

  const result = journals.map((j) => {
    const txList = txByJournal.get(j.id) ?? [];
    const buys = txList.filter((t) => t.type === 'buy');
    const sells = txList.filter((t) => t.type === 'sell');

    const totalBuyQty = buys.reduce((s, t) => s + Number(t.quantity), 0);
    const totalSellQty = sells.reduce((s, t) => s + Number(t.quantity), 0);
    const totalBuyAmount = buys.reduce((s, t) => s + Number(t.amount), 0);
    const totalSellAmount = sells.reduce((s, t) => s + Number(t.amount), 0);
    const holdingQty = totalBuyQty - totalSellQty;

    const firstBuyDate = buys.length > 0 ? buys[0].trade_date : null;
    const lastSellDate = sells.length > 0 ? sells[sells.length - 1].trade_date : null;

    let resultStatus: 'waiting' | 'holding' | 'sold' = 'holding';
    let realizedProfitRate: number | null = null;

    if (txList.length === 0) {
      resultStatus = 'waiting';
    } else if (holdingQty === 0 && totalSellQty > 0) {
      resultStatus = 'sold';
      realizedProfitRate = totalBuyAmount > 0
        ? ((totalSellAmount - totalBuyAmount) / totalBuyAmount) * 100
        : 0;
    }

    return {
      id: String(j.id),
      marketType: j.market_type,
      stockName: j.stock_name,
      ticker: j.ticker,
      broker: j.broker,
      firstBuyDate,
      lastSellDate,
      holdingQty,
      resultStatus,
      realizedProfitRate,
      createdAt: j.created_at,
    };
  });

  return NextResponse.json(result);
}

// POST /api/trading-journal → 매매일지 등록 (매수 정보 없이도 등록 가능)
export async function POST(request: NextRequest) {
  const body = await request.json();
  const {
    userId, marketType, stockName, ticker, broker,
    buyReason, plan, expectedInvestment,
    price, quantity, amount, tradeDate,
  } = body;

  if (!userId || !marketType || !stockName || !ticker) {
    return NextResponse.json({ error: '필수 항목이 누락되었습니다.' }, { status: 400 });
  }

  const { data: journal, error: jError } = await supabase
    .from('trading_journals')
    .insert({
      user_id: userId,
      market_type: marketType,
      stock_name: stockName,
      ticker,
      broker: broker || '',
      buy_reason: buyReason || '',
      plan: plan || '',
      expected_investment: expectedInvestment || 0,
      target_sell_price: body.targetSellPrice || 0,
      stop_loss_price: body.stopLossPrice || 0,
    })
    .select()
    .single();

  if (jError) {
    return NextResponse.json({ error: jError.message }, { status: 500 });
  }

  // 매수 정보가 있을 때만 첫 거래 생성
  if (price != null && quantity != null && tradeDate) {
    const { error: txError } = await supabase
      .from('trading_journal_transactions')
      .insert({
        journal_id: journal.id,
        user_id: userId,
        type: 'buy',
        price,
        quantity,
        amount: amount || price * quantity,
        trade_date: tradeDate,
      });

    if (txError) {
      await supabase.from('trading_journals').delete().eq('id', journal.id);
      return NextResponse.json({ error: txError.message }, { status: 500 });
    }
  }

  // 투자내역(investment)과 연결
  const investmentId = body.investmentId;
  if (investmentId) {
    await supabase
      .from('investments')
      .update({ journal_id: journal.id })
      .eq('id', investmentId)
      .eq('user_id', userId);
  }

  return NextResponse.json({ id: String(journal.id) }, { status: 201 });
}
