import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

/** 종목별 요약 (카드 목록용) */
interface DcaStockSummary extends RowDataPacket {
  stock_name: string;
  ticker: string;
  target_quantity: number;
  current_quantity: number;
  entry_count: number;
}

// GET /api/dca?userId=X → 종목별 카드 목록
export async function GET(request: NextRequest) {
  const userId = request.nextUrl.searchParams.get('userId');

  if (!userId) {
    return NextResponse.json({ error: 'userId가 필요합니다.' }, { status: 400 });
  }

  const [rows] = await pool.query<DcaStockSummary[]>(
    `SELECT
       stock_name,
       ticker,
       MAX(target_quantity) AS target_quantity,
       CAST(SUM(quantity) AS DECIMAL(15,4)) AS current_quantity,
       COUNT(*) AS entry_count
     FROM dca_entries
     WHERE user_id = ?
     GROUP BY ticker, stock_name
     ORDER BY MIN(id)`,
    [userId],
  );

  return NextResponse.json(
    rows.map((r) => ({
      stockName: r.stock_name,
      ticker: r.ticker,
      targetQuantity: Number(r.target_quantity),
      currentQuantity: Number(r.current_quantity),
      entryCount: Number(r.entry_count),
    })),
  );
}

// DELETE /api/dca?userId=X&ticker=Y → 특정 종목의 모든 매수 기록 삭제
export async function DELETE(request: NextRequest) {
  const userId = request.nextUrl.searchParams.get('userId');
  const ticker = request.nextUrl.searchParams.get('ticker');

  if (!userId || !ticker) {
    return NextResponse.json({ error: 'userId와 ticker가 필요합니다.' }, { status: 400 });
  }

  const [result] = await pool.query<ResultSetHeader>(
    'DELETE FROM dca_entries WHERE user_id = ? AND ticker = ?',
    [userId, ticker],
  );

  return NextResponse.json({ success: true, deletedCount: result.affectedRows });
}
