import { NextRequest, NextResponse } from 'next/server';
import supabase from '@/lib/supabase';

function toEntry(row: Record<string, unknown>) {
  const ipoPrice = Number(row.ipo_price);
  const qty = Number(row.allocated_quantity);
  const sellPrice = row.sell_price != null ? Number(row.sell_price) : null;
  const fee = Number(row.fee) || 0;
  return {
    id: String(row.id),
    stockName: row.stock_name,
    ipoPrice,
    allocatedQuantity: qty,
    sellPrice,
    sellDate: row.sell_date || null,
    fee,
    profit: sellPrice != null ? (sellPrice - ipoPrice) * qty - fee : 0,
  };
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = await request.json();
  const { stockName, ipoPrice, allocatedQuantity, sellPrice, sellDate, fee } = body;

  if (!stockName || ipoPrice == null || allocatedQuantity == null) {
    return NextResponse.json({ error: '필수 항목이 누락되었습니다.' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('my_ipo_entries')
    .update({
      stock_name: stockName,
      ipo_price: ipoPrice,
      allocated_quantity: allocatedQuantity,
      sell_price: sellPrice ?? null,
      sell_date: sellDate ?? null,
      fee: fee ?? 0,
    })
    .eq('id', id)
    .select()
    .single();

  if (error || !data) {
    return NextResponse.json({ error: '기록을 찾을 수 없습니다.' }, { status: 404 });
  }

  return NextResponse.json(toEntry(data));
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const { error } = await supabase
    .from('my_ipo_entries')
    .delete()
    .eq('id', id);

  if (error) {
    return NextResponse.json({ error: '기록을 찾을 수 없습니다.' }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
