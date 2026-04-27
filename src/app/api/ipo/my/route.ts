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

export async function GET(request: NextRequest) {
  const userId = request.nextUrl.searchParams.get('userId');
  if (!userId) {
    return NextResponse.json({ error: 'userId가 필요합니다.' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('my_ipo_entries')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json((data ?? []).map(toEntry));
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { userId, stockName, ipoPrice, allocatedQuantity, sellPrice, sellDate, fee } = body;

  if (!userId || !stockName || ipoPrice == null || allocatedQuantity == null) {
    return NextResponse.json({ error: '필수 항목이 누락되었습니다.' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('my_ipo_entries')
    .insert({
      user_id: userId,
      stock_name: stockName,
      ipo_price: ipoPrice,
      allocated_quantity: allocatedQuantity,
      sell_price: sellPrice ?? null,
      sell_date: sellDate ?? null,
      fee: fee ?? 0,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(toEntry(data), { status: 201 });
}
