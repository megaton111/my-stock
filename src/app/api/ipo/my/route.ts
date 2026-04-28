import { NextRequest, NextResponse } from 'next/server';
import supabase from '@/lib/supabase';

function toEntry(row: Record<string, unknown>, listingDate?: string | null) {
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
    broker: (row.broker as string) || null,
    listingDate: listingDate ?? null,
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

  const entries = data ?? [];
  const stockNames = entries.map((r: Record<string, unknown>) => r.stock_name as string);
  const { data: schedules } = await supabase
    .from('ipo_schedules')
    .select('stock_name, listing_date')
    .in('stock_name', stockNames);

  const listingMap = new Map<string, string>();
  (schedules ?? []).forEach((s: Record<string, unknown>) => {
    if (s.listing_date) listingMap.set(s.stock_name as string, s.listing_date as string);
  });

  return NextResponse.json(
    entries.map((r: Record<string, unknown>) => toEntry(r, listingMap.get(r.stock_name as string))),
  );
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { userId, stockName, ipoPrice, allocatedQuantity, sellPrice, sellDate, fee, broker } = body;

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
      broker: broker ?? null,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(toEntry(data), { status: 201 });
}
