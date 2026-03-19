import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

interface UserRow extends RowDataPacket {
  id: number;
  email: string;
}

// 이메일로 사용자 조회 또는 생성
export async function POST(request: NextRequest) {
  const { email } = await request.json();

  if (!email) {
    return NextResponse.json({ error: '이메일이 필요합니다.' }, { status: 400 });
  }

  // 기존 사용자 조회
  const [rows] = await pool.query<UserRow[]>('SELECT * FROM users WHERE email = ?', [email]);

  if (rows.length > 0) {
    return NextResponse.json({ id: String(rows[0].id), email: rows[0].email });
  }

  // 없으면 새로 생성
  const [result] = await pool.query<ResultSetHeader>(
    'INSERT INTO users (email) VALUES (?)',
    [email],
  );

  return NextResponse.json({ id: String(result.insertId), email }, { status: 201 });
}
