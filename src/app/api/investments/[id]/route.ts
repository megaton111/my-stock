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

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: '수정할 항목이 없습니다.' }, { status: 400 });
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

  return NextResponse.json(toInvestment(data));
}

// 종목 삭제
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const { error } = await supabase
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
