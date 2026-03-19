import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

interface InvestmentRow extends RowDataPacket {
  id: number;
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

// 단건 조회
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const [rows] = await pool.query<InvestmentRow[]>('SELECT * FROM investments WHERE id = ?', [id]);

  if (rows.length === 0) {
    return NextResponse.json({ error: '종목을 찾을 수 없습니다.' }, { status: 404 });
  }

  return NextResponse.json(toInvestment(rows[0]));
}

// 종목 수정
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = await request.json();

  const fields: string[] = [];
  const values: (string | number)[] = [];

  if (body.name !== undefined) { fields.push('name = ?'); values.push(body.name); }
  if (body.ticker !== undefined) { fields.push('ticker = ?'); values.push(body.ticker); }
  if (body.category !== undefined) { fields.push('category = ?'); values.push(body.category); }
  if (body.quantity !== undefined) { fields.push('quantity = ?'); values.push(body.quantity); }
  if (body.avgPrice !== undefined) { fields.push('avg_price = ?'); values.push(body.avgPrice); }
  if (body.currency !== undefined) { fields.push('currency = ?'); values.push(body.currency); }

  if (fields.length === 0) {
    return NextResponse.json({ error: '수정할 항목이 없습니다.' }, { status: 400 });
  }

  values.push(Number(id));
  const [result] = await pool.query<ResultSetHeader>(
    `UPDATE investments SET ${fields.join(', ')} WHERE id = ?`,
    values,
  );

  if (result.affectedRows === 0) {
    return NextResponse.json({ error: '종목을 찾을 수 없습니다.' }, { status: 404 });
  }

  const [rows] = await pool.query<InvestmentRow[]>('SELECT * FROM investments WHERE id = ?', [id]);
  return NextResponse.json(toInvestment(rows[0]));
}

// 종목 삭제
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const [result] = await pool.query<ResultSetHeader>('DELETE FROM investments WHERE id = ?', [id]);

  if (result.affectedRows === 0) {
    return NextResponse.json({ error: '종목을 찾을 수 없습니다.' }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
