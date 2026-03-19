import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { ResultSetHeader, RowDataPacket } from 'mysql2';

interface DcaEntryRow extends RowDataPacket {
  id: number;
  stock_name: string;
  ticker: string;
  target_quantity: number;
  purchase_date: string;
  amount: number;
  quantity: number;
}

// PUT /api/dca/entries/[id] → 매수 기록 수정
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = await request.json();
  const { date, amount, quantity } = body;

  if (!date || amount == null || quantity == null) {
    return NextResponse.json({ error: '필수 항목이 누락되었습니다.' }, { status: 400 });
  }

  await pool.query<ResultSetHeader>(
    'UPDATE dca_entries SET purchase_date = ?, amount = ?, quantity = ? WHERE id = ?',
    [date, amount, quantity, id],
  );

  // 수정된 행 반환
  const [rows] = await pool.query<DcaEntryRow[]>(
    `SELECT id, stock_name, ticker, target_quantity,
            DATE_FORMAT(purchase_date, '%Y-%m-%d') AS purchase_date,
            amount, quantity
     FROM dca_entries WHERE id = ?`,
    [id],
  );

  if (rows.length === 0) {
    return NextResponse.json({ error: '기록을 찾을 수 없습니다.' }, { status: 404 });
  }

  const row = rows[0];
  return NextResponse.json({
    id: String(row.id),
    stockName: row.stock_name,
    ticker: row.ticker,
    targetQuantity: Number(row.target_quantity),
    date: row.purchase_date,
    amount: Number(row.amount),
    quantity: Number(row.quantity),
  });
}

// DELETE /api/dca/entries/[id] → 매수 기록 삭제
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const [result] = await pool.query<ResultSetHeader>(
    'DELETE FROM dca_entries WHERE id = ?',
    [id],
  );

  if (result.affectedRows === 0) {
    return NextResponse.json({ error: '기록을 찾을 수 없습니다.' }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
