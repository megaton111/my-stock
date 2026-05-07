import { NextRequest, NextResponse } from 'next/server';
import supabase from '@/lib/supabase';

function toInvestment(row: Record<string, unknown>) {
  return {
    id: String(row.id),
    name: row.name,
    ticker: row.ticker,
    category: row.category,
    quantity: Number(row.quantity),
    avgPrice: Number(row.avg_price),
    currency: row.currency,
    broker: row.broker || '',
    accountName: row.account_name || '',
    accountNumber: row.account_number || '',
    positionId: row.position_id != null ? Number(row.position_id) : undefined,
  };
}

// 단건 조회
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const { data, error } = await supabase
    .from('investments')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: '종목을 찾을 수 없습니다.' }, { status: 404 });
  }

  return NextResponse.json(toInvestment(data));
}

// 종목 수정
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = await request.json();

  const updates: Record<string, unknown> = {};
  if (body.name !== undefined) updates.name = body.name;
  if (body.ticker !== undefined) updates.ticker = body.ticker;
  if (body.category !== undefined) updates.category = body.category;
  if (body.quantity !== undefined) updates.quantity = body.quantity;
  if (body.avgPrice !== undefined) updates.avg_price = body.avgPrice;
  if (body.currency !== undefined) updates.currency = body.currency;
  if (body.broker !== undefined) updates.broker = body.broker || null;
  if (body.accountName !== undefined) updates.account_name = body.accountName || null;
  if (body.accountNumber !== undefined) updates.account_number = body.accountNumber || null;

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: '수정할 항목이 없습니다.' }, { status: 400 });
  }

  // 계좌 정보 변경 시 account_sort_orders, account_memos도 함께 업데이트
  const accountFieldChanged =
    'broker' in updates || 'account_name' in updates || 'account_number' in updates;

  let oldRow: Record<string, unknown> | null = null;
  if (accountFieldChanged) {
    const { data: current } = await supabase
      .from('investments')
      .select('user_id, broker, account_name, account_number')
      .eq('id', id)
      .single();
    oldRow = current;
  }

  const { data, error } = await supabase
    .from('investments')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error || !data) {
    return NextResponse.json({ error: '종목을 찾을 수 없습니다.' }, { status: 404 });
  }

  // 계좌 정보가 바뀌었으면 sort_orders, memos 키도 이전
  if (accountFieldChanged && oldRow) {
    const oldBroker = oldRow.broker || '';
    const oldAccName = oldRow.account_name || '';
    const oldAccNum = oldRow.account_number || '';
    const newBroker = data.broker || '';
    const newAccName = data.account_name || '';
    const newAccNum = data.account_number || '';
    const userId = oldRow.user_id as string;

    const keyChanged =
      oldBroker !== newBroker || oldAccName !== newAccName || oldAccNum !== newAccNum;

    if (keyChanged && userId) {
      // 이전 키로 된 항목이 아직 다른 종목에서 쓰이는지 확인
      const { count } = await supabase
        .from('investments')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('broker', oldBroker || null)
        .eq('account_name', oldAccName || null)
        .eq('account_number', oldAccNum || null)
        .neq('id', id);

      // 이전 계좌를 쓰는 다른 종목이 없으면 키를 이전
      if (count === 0) {
        await supabase
          .from('account_sort_orders')
          .update({
            broker: newBroker || '',
            account_name: newAccName || '',
            account_number: newAccNum || '',
          })
          .eq('user_id', userId)
          .eq('broker', oldBroker || '')
          .eq('account_name', oldAccName || '')
          .eq('account_number', oldAccNum || '');

        await supabase
          .from('account_memos')
          .update({
            broker: newBroker || '',
            account_name: newAccName || '',
            account_number: newAccNum || '',
          })
          .eq('user_id', userId)
          .eq('broker', oldBroker || '')
          .eq('account_name', oldAccName || '')
          .eq('account_number', oldAccNum || '');
      }
    }
  }

  return NextResponse.json(toInvestment(data));
}

// 종목 삭제
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const { error } = await supabase
    .from('collect_entries')
    .delete()
    .eq('id', id);

  await supabase
    .from('dca_entries')
    .delete()
    .eq('id', id);

  // investments 테이블에서도 삭제
  const { error: invError } = await supabase
    .from('investments')
    .delete()
    .eq('id', id);

  if (invError) {
    return NextResponse.json({ error: '종목을 찾을 수 없습니다.' }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
