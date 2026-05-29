import { NextRequest, NextResponse } from 'next/server';
import supabase from '@/lib/supabase';

type Params = { params: Promise<{ id: string }> };

// GET /api/trading-journal/[id]?userId=X → 일지 상세 + 거래 내역
export async function GET(request: NextRequest, { params }: Params) {
  const { id } = await params;
  const userId = request.nextUrl.searchParams.get('userId');

  if (!userId) {
    return NextResponse.json({ error: 'userId가 필요합니다.' }, { status: 400 });
  }

  const { data: journal, error: jError } = await supabase
    .from('trading_journals')
    .select('*')
    .eq('id', id)
    .eq('user_id', userId)
    .single();

  if (jError || !journal) {
    return NextResponse.json({ error: '매매일지를 찾을 수 없습니다.' }, { status: 404 });
  }

  const { data: transactions, error: txError } = await supabase
    .from('trading_journal_transactions')
    .select('*')
    .eq('journal_id', id)
    .order('trade_date', { ascending: true })
    .order('created_at', { ascending: true });

  if (txError) {
    return NextResponse.json({ error: txError.message }, { status: 500 });
  }

  return NextResponse.json({
    id: String(journal.id),
    marketType: journal.market_type,
    stockName: journal.stock_name,
    ticker: journal.ticker,
    broker: journal.broker,
    buyReason: journal.buy_reason,
    plan: journal.plan,
    expectedInvestment: Number(journal.expected_investment),
    targetSellPrice: Number(journal.target_sell_price),
    stopLossPrice: Number(journal.stop_loss_price),
    memo: journal.memo,
    createdAt: journal.created_at,
    updatedAt: journal.updated_at,
    transactions: (transactions ?? []).map((t) => ({
      id: String(t.id),
      type: t.type,
      price: Number(t.price),
      quantity: Number(t.quantity),
      amount: Number(t.amount),
      tradeDate: t.trade_date,
    })),
  });
}

// PUT /api/trading-journal/[id] → 일지 정보 수정 (메모, 매수이유, 계획 등)
export async function PUT(request: NextRequest, { params }: Params) {
  const { id } = await params;
  const body = await request.json();
  const { userId, ...fields } = body;

  if (!userId) {
    return NextResponse.json({ error: 'userId가 필요합니다.' }, { status: 400 });
  }

  const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (fields.memo !== undefined) updateData.memo = fields.memo;
  if (fields.buyReason !== undefined) updateData.buy_reason = fields.buyReason;
  if (fields.plan !== undefined) updateData.plan = fields.plan;
  if (fields.expectedInvestment !== undefined) updateData.expected_investment = fields.expectedInvestment;
  if (fields.targetSellPrice !== undefined) updateData.target_sell_price = fields.targetSellPrice;
  if (fields.stopLossPrice !== undefined) updateData.stop_loss_price = fields.stopLossPrice;
  if (fields.broker !== undefined) updateData.broker = fields.broker;

  const { error } = await supabase
    .from('trading_journals')
    .update(updateData)
    .eq('id', id)
    .eq('user_id', userId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

// DELETE /api/trading-journal/[id]?userId=X → 일지 삭제 (Storage 이미지도 함께 정리)
export async function DELETE(request: NextRequest, { params }: Params) {
  const { id } = await params;
  const userId = request.nextUrl.searchParams.get('userId');

  if (!userId) {
    return NextResponse.json({ error: 'userId가 필요합니다.' }, { status: 400 });
  }

  // 삭제 전 memo에서 이미지 경로 추출
  const { data: journal } = await supabase
    .from('trading_journals')
    .select('memo')
    .eq('id', id)
    .eq('user_id', userId)
    .single();

  const { error } = await supabase
    .from('trading_journals')
    .delete()
    .eq('id', id)
    .eq('user_id', userId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Storage 이미지 정리 (삭제 실패해도 일지 삭제는 유지)
  if (journal?.memo) {
    const imgRegex = /journal-images\/([^"'\s)]+)/g;
    const paths: string[] = [];
    let match;
    while ((match = imgRegex.exec(journal.memo)) !== null) {
      paths.push(match[1]);
    }
    if (paths.length > 0) {
      await supabase.storage.from('journal-images').remove(paths);
    }
  }

  return NextResponse.json({ success: true });
}
