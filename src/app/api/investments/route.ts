import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

interface InvestmentRow extends RowDataPacket {
  id: number;
  user_id: number;
  name: string;
  ticker: string;
  category: string;
  quantity: number;
  avg_price: number;
  currency: 'USD' | 'KRW';
}

function toInvestment(row: InvestmentRow) {
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

// 전체 목록 조회 (user_id 필터)
export async function GET(request: NextRequest) {
  const userId = request.nextUrl.searchParams.get('userId');

  if (!userId) {
    return NextResponse.json({ error: 'userId가 필요합니다.' }, { status: 400 });
  }

  const [rows] = await pool.query<InvestmentRow[]>(
    'SELECT * FROM investments WHERE user_id = ? ORDER BY id',
    [userId],
  );

  return NextResponse.json(rows.map(toInvestment));
}

// 새 종목 추가
export async function POST(request: NextRequest) {
  const body = await request.json();

  if (!body.userId || !body.name || !body.ticker || !body.quantity || !body.avgPrice || !body.currency) {
    return NextResponse.json({ error: '필수 항목이 누락되었습니다.' }, { status: 400 });
  }

  const [result] = await pool.query<ResultSetHeader>(
    'INSERT INTO investments (user_id, name, ticker, category, quantity, avg_price, currency) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [body.userId, body.name, body.ticker, body.category || '미국주식', body.quantity, body.avgPrice, body.currency],
  );

  return NextResponse.json({
    id: String(result.insertId),
    name: body.name,
    ticker: body.ticker,
    category: body.category || '미국주식',
    quantity: body.quantity,
    avgPrice: body.avgPrice,
    currency: body.currency,
  }, { status: 201 });
}
