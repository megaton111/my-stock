import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

interface DcaEntryRow extends RowDataPacket {
  id: number;
  user_id: number;
  stock_name: string;
  ticker: string;
  target_quantity: number;
  purchase_date: string;
  amount: number;
  quantity: number;
}

function toEntry(row: DcaEntryRow) {
  return {
    id: String(row.id),
    stockName: row.stock_name,
    ticker: row.ticker,
    targetQuantity: Number(row.target_quantity),
    date: row.purchase_date,
    amount: Number(row.amount),
    quantity: Number(row.quantity),
  };
}

// GET /api/dca/entries?userId=X&ticker=Y → 특정 종목의 매수 기록
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const userId = searchParams.get('userId');
  const ticker = searchParams.get('ticker');

  if (!userId || !ticker) {
    return NextResponse.json({ error: 'userId와 ticker가 필요합니다.' }, { status: 400 });
  }

  const [rows] = await pool.query<DcaEntryRow[]>(
    `SELECT id, user_id, stock_name, ticker, target_quantity,
            DATE_FORMAT(purchase_date, '%Y-%m-%d') AS purchase_date,
            amount, quantity
     FROM dca_entries WHERE user_id = ? AND ticker = ? ORDER BY purchase_date ASC`,
    [userId, ticker],
  );

  return NextResponse.json(rows.map(toEntry));
}

// POST /api/dca/entries → 매수 기록 추가
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { userId, stockName, ticker, targetQuantity, date, amount, quantity } = body;

  if (!userId || !stockName || !ticker || !date || amount == null || quantity == null) {
    return NextResponse.json({ error: '필수 항목이 누락되었습니다.' }, { status: 400 });
  }

  const [result] = await pool.query<ResultSetHeader>(
    `INSERT INTO dca_entries (user_id, stock_name, ticker, target_quantity, purchase_date, amount, quantity)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [userId, stockName, ticker, targetQuantity || 0, date, amount, quantity],
  );

  return NextResponse.json({
    id: String(result.insertId),
    stockName,
    ticker,
    targetQuantity: targetQuantity || 0,
    date,
    amount,
    quantity,
  }, { status: 201 });
}
