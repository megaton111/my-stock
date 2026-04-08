import { NextRequest, NextResponse } from 'next/server';
import supabase from '@/lib/supabase';

export interface TransactionItem {
  id: number;
  type: 'buy' | 'sell';
  date: string;
  quantity: number;
  price: number;
  currency: string;
  // 매도 거래 전용
  avgBuyPrice?: number;
  exchangeRate?: number;
  realizedPl?: number;
  realizedPlKrw?: number;
}

export interface PositionHistoryResponse {
  positionId: number;
  ticker: string;
  stockName: string;
  category: string;
  currency: string;
  openedAt: string;
  closedAt: string | null;
  totalBuyQuantity: number;
  totalSellQuantity: number;
  currentQuantity: number;
  avgBuyPrice: number;
  totalRealizedPl: number;       // 원본 통화
  totalRealizedPlKrw: number;    // KRW 환산
  transactions: TransactionItem[];
}

// 특정 position의 매수/매도 거래 통합 조회
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const positionId = Number(id);

  if (!positionId) {
    return NextResponse.json({ error: '잘못된 positionId 입니다.' }, { status: 400 });
  }

  const [positionRes, buysRes, sellsRes] = await Promise.all([
    supabase.from('positions').select('*').eq('id', positionId).single(),
    supabase.from('buy_transactions').select('*').eq('position_id', positionId).order('buy_date', { ascending: false }),
    supabase.from('sell_transactions').select('*').eq('position_id', positionId).order('sell_date', { ascending: false }),
  ]);

  if (positionRes.error || !positionRes.data) {
    return NextResponse.json({ error: '포지션을 찾을 수 없습니다.' }, { status: 404 });
  }

  const position = positionRes.data;
  const buys = buysRes.data ?? [];
  const sells = sellsRes.data ?? [];

  // 집계
  const totalBuyQty = buys.reduce((s, b) => s + Number(b.buy_quantity), 0);
  const totalBuyCost = buys.reduce(
    (s, b) => s + Number(b.buy_quantity) * Number(b.buy_price),
    0,
  );
  const avgBuyPrice = totalBuyQty > 0 ? totalBuyCost / totalBuyQty : 0;
  const totalSellQty = sells.reduce((s, v) => s + Number(v.sell_quantity), 0);
  const totalRealizedPl = sells.reduce((s, v) => s + Number(v.realized_pl), 0);
  const totalRealizedPlKrw = sells.reduce((s, v) => s + Number(v.realized_pl_krw), 0);
  const currentQty = totalBuyQty - totalSellQty;

  // 통합 타임라인 (최신순)
  const transactions: TransactionItem[] = [
    ...buys.map((b): TransactionItem => ({
      id: b.id,
      type: 'buy',
      date: b.buy_date,
      quantity: Number(b.buy_quantity),
      price: Number(b.buy_price),
      currency: b.currency,
    })),
    ...sells.map((s): TransactionItem => ({
      id: s.id,
      type: 'sell',
      date: s.sell_date,
      quantity: Number(s.sell_quantity),
      price: Number(s.sell_price),
      currency: s.currency,
      avgBuyPrice: Number(s.avg_buy_price),
      exchangeRate: Number(s.exchange_rate),
      realizedPl: Number(s.realized_pl),
      realizedPlKrw: Number(s.realized_pl_krw),
    })),
  ].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));

  const response: PositionHistoryResponse = {
    positionId: position.id,
    ticker: position.ticker,
    stockName: position.stock_name,
    category: position.category,
    currency: position.currency,
    openedAt: position.opened_at,
    closedAt: position.closed_at,
    totalBuyQuantity: totalBuyQty,
    totalSellQuantity: totalSellQty,
    currentQuantity: currentQty,
    avgBuyPrice: Math.round(avgBuyPrice * 100) / 100,
    totalRealizedPl: Math.round(totalRealizedPl * 100) / 100,
    totalRealizedPlKrw: Math.round(totalRealizedPlKrw * 100) / 100,
    transactions,
  };

  return NextResponse.json(response);
}
