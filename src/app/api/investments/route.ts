import { NextRequest, NextResponse } from 'next/server';
import supabase from '@/lib/supabase';

interface SourceBreakdown {
  investments?: number;
  collect?: number;
  dca?: number;
}

interface MergedItem {
  id: string;
  name: string;
  ticker: string;
  category: string;
  quantity: number;
  avgPrice: number;
  currency: string;
  broker: string;
  positionId?: number;
  sources: SourceBreakdown;
}

function toInvestment(row: Record<string, unknown>): MergedItem {
  return {
    id: String(row.id),
    name: String(row.name),
    ticker: String(row.ticker),
    category: String(row.category),
    quantity: Number(row.quantity),
    avgPrice: Number(row.avg_price),
    currency: String(row.currency),
    broker: row.broker ? String(row.broker) : '',
    positionId: row.position_id != null ? Number(row.position_id) : undefined,
    sources: { investments: Number(row.quantity) },
  };
}

/** ticker 접미사로 통화를 추론 (.KS/.KQ → KRW, 그 외 → USD) */
function inferCurrency(ticker: string): 'USD' | 'KRW' {
  const upper = ticker.toUpperCase();
  if (upper.endsWith('.KS') || upper.endsWith('.KQ')) return 'KRW';
  return 'USD';
}

/**
 * collect_entries / dca_entries를 ticker별로 집계하여
 * 기존 investments 맵에 병합한다.
 * - 같은 ticker가 있으면 수량 합산 + 가중평균 매수가 재계산
 * - 없으면 새 항목으로 추가 (통화는 ticker 접미사로 추론)
 */
function mergeEntries(
  map: Map<string, MergedItem>,
  rows: Record<string, unknown>[],
  source: 'collect' | 'dca',
) {
  for (const row of rows) {
    const ticker = String(row.ticker);
    const totalAmount = Number(row.total_amount); // SUM(amount) — 총 매수금액
    const totalQty = Number(row.total_quantity);   // SUM(quantity) — 총 수량

    if (totalQty === 0) continue;

    const existing = map.get(ticker);
    if (existing) {
      // 가중평균 매수가 재계산 (기존 투자의 통화를 그대로 유지)
      const oldCost = existing.avgPrice * existing.quantity;
      const newQty = existing.quantity + totalQty;
      existing.avgPrice = (oldCost + totalAmount) / newQty;
      existing.quantity = newQty;
      existing.sources[source] = totalQty;
      // broker가 비어있으면 entries의 broker로 채움
      if (!existing.broker && row.broker) existing.broker = String(row.broker);
    } else {
      map.set(ticker, {
        id: `${source}-${ticker}`,
        name: String(row.stock_name),
        ticker,
        category: source === 'collect' ? '주식모으기' : '적립식',
        quantity: totalQty,
        avgPrice: totalAmount / totalQty,
        currency: inferCurrency(ticker),
        broker: row.broker ? String(row.broker) : '',
        sources: { [source]: totalQty },
      });
    }
  }
}

// 전체 목록 조회 (user_id 필터) — investments + collect_entries + dca_entries 병합
export async function GET(request: NextRequest) {
  const userId = request.nextUrl.searchParams.get('userId');

  if (!userId) {
    return NextResponse.json({ error: 'userId가 필요합니다.' }, { status: 400 });
  }

  // 3개 테이블을 병렬로 조회
  const [investResult, collectResult, dcaResult] = await Promise.all([
    supabase
      .from('investments')
      .select('*')
      .eq('user_id', userId)
      .order('id'),
    supabase
      .from('collect_entries')
      .select('stock_name, ticker, amount, quantity, broker')
      .eq('user_id', userId),
    supabase
      .from('dca_entries')
      .select('stock_name, ticker, amount, quantity, broker')
      .eq('user_id', userId),
  ]);

  if (investResult.error) {
    return NextResponse.json({ error: investResult.error.message }, { status: 500 });
  }

  // 1) investments를 ticker 기준 맵으로 변환
  const map = new Map<string, MergedItem>();
  for (const row of (investResult.data ?? [])) {
    const item = toInvestment(row);
    map.set(item.ticker, item);
  }

  // 2) collect_entries 집계 후 병합
  if (!collectResult.error && collectResult.data) {
    const grouped = aggregateByTicker(collectResult.data);
    mergeEntries(map, grouped, 'collect');
  }

  // 3) dca_entries 집계 후 병합
  if (!dcaResult.error && dcaResult.data) {
    const grouped = aggregateByTicker(dcaResult.data);
    mergeEntries(map, grouped, 'dca');
  }

  return NextResponse.json(Array.from(map.values()));
}

/** 개별 엔트리 배열을 ticker별로 그룹핑하여 SUM(amount), SUM(quantity) 집계 */
function aggregateByTicker(rows: Record<string, unknown>[]) {
  const agg = new Map<string, { stock_name: string; ticker: string; total_amount: number; total_quantity: number; broker: string }>();

  for (const row of rows) {
    const ticker = String(row.ticker);
    const existing = agg.get(ticker);
    if (existing) {
      existing.total_amount += Number(row.amount);
      existing.total_quantity += Number(row.quantity);
      if (!existing.broker && row.broker) existing.broker = String(row.broker);
    } else {
      agg.set(ticker, {
        stock_name: String(row.stock_name),
        ticker,
        total_amount: Number(row.amount),
        total_quantity: Number(row.quantity),
        broker: row.broker ? String(row.broker) : '',
      });
    }
  }

  return Array.from(agg.values());
}

// 새 종목 추가 — positions + buy_transactions + investments를 함께 생성
export async function POST(request: NextRequest) {
  const body = await request.json();

  if (!body.userId || !body.name || !body.ticker || !body.quantity || !body.avgPrice || !body.currency) {
    return NextResponse.json({ error: '필수 항목이 누락되었습니다.' }, { status: 400 });
  }

  const category = body.category || '미국주식';
  const broker = body.broker || null;
  const today = new Date().toISOString().slice(0, 10);

  // 1) position 생성 (새 보유 사이클 시작)
  const { data: position, error: posError } = await supabase
    .from('positions')
    .insert({
      user_id: body.userId,
      ticker: body.ticker,
      stock_name: body.name,
      category,
      currency: body.currency,
      broker,
      opened_at: today,
    })
    .select()
    .single();

  if (posError || !position) {
    return NextResponse.json({ error: posError?.message || '포지션 생성 실패' }, { status: 500 });
  }

  // 2) buy_transaction 생성 (최초 매수 거래)
  const { error: buyError } = await supabase
    .from('buy_transactions')
    .insert({
      user_id: body.userId,
      position_id: position.id,
      ticker: body.ticker,
      stock_name: body.name,
      category,
      currency: body.currency,
      broker,
      buy_date: today,
      buy_quantity: body.quantity,
      buy_price: body.avgPrice,
      exchange_rate: body.exchangeRate ?? null,
    });

  if (buyError) {
    // 롤백: 방금 만든 position 제거
    await supabase.from('positions').delete().eq('id', position.id);
    return NextResponse.json({ error: buyError.message }, { status: 500 });
  }

  // 3) investments 생성 (활성 보유 캐시)
  const { data, error } = await supabase
    .from('investments')
    .insert({
      user_id: body.userId,
      name: body.name,
      ticker: body.ticker,
      category,
      quantity: body.quantity,
      avg_price: body.avgPrice,
      currency: body.currency,
      broker,
      position_id: position.id,
    })
    .select()
    .single();

  if (error) {
    // 롤백: 방금 만든 position + buy_transaction 제거 (cascade로 buy도 함께 삭제됨)
    await supabase.from('positions').delete().eq('id', position.id);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(toInvestment(data), { status: 201 });
}
