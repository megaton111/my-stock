'use client';

import { useState, useMemo } from 'react';
import { Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TableSortLabel } from '@mui/material';
import { Investment } from '@/types/investment';
import { investedAmount, currentValue } from '@/utils/calculator';
import { formatCurrency, formatKRW, formatRate, formatProfit, profitColor } from '@/utils/format';

interface InvestmentTableProps {
  investments: Investment[];
  prices: Record<string, number>;
  exchangeRate: number;
}

type SortKey = 'name' | 'ticker' | 'category' | 'invested' | 'quantity' | 'avgPrice' | 'price' | 'rate' | 'profit' | 'current';
type SortDir = 'asc' | 'desc';

const COLUMNS: { label: string; key: SortKey; align?: 'right' }[] = [
  { label: '종목명', key: 'name' },
  { label: '티커', key: 'ticker' },
  { label: '카테고리', key: 'category' },
  { label: '투자금액', key: 'invested', align: 'right' },
  { label: '보유 수량', key: 'quantity', align: 'right' },
  { label: '매입가', key: 'avgPrice', align: 'right' },
  { label: '현재가', key: 'price', align: 'right' },
  { label: '수익률', key: 'rate', align: 'right' },
  { label: '수익금', key: 'profit', align: 'right' },
  { label: '총 평가금액', key: 'current', align: 'right' },
];

interface RowData {
  item: Investment;
  price: number;
  invested: number;
  current: number;
  profit: number;
  rate: number;
  avgPriceKRW: number;  // 매입가를 원화로 환산한 값 (정렬용)
  priceKRW: number;     // 현재가를 원화로 환산한 값 (정렬용)
}

function getRowValue(row: RowData, key: SortKey): number | string {
  switch (key) {
    case 'name': return row.item.name;
    case 'ticker': return row.item.ticker;
    case 'category': return row.item.category;
    case 'invested': return row.invested;
    case 'quantity': return row.item.quantity;
    case 'avgPrice': return row.avgPriceKRW;
    case 'price': return row.priceKRW;
    case 'rate': return row.rate;
    case 'profit': return row.profit;
    case 'current': return row.current;
  }
}

export default function InvestmentTable({ investments, prices, exchangeRate }: InvestmentTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>('current');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  const rows: RowData[] = useMemo(() =>
    investments.map((item) => {
      const price = prices[item.ticker] || 0;
      const invested = investedAmount(item, exchangeRate);
      const current = currentValue(item, price, exchangeRate);
      const profit = current - invested;
      const rate = invested > 0 ? (profit / invested) * 100 : 0;
      const avgPriceKRW = item.currency === 'USD' ? item.avgPrice * exchangeRate : item.avgPrice;
      const priceKRW = item.currency === 'USD' ? price * exchangeRate : price;
      return { item, price, invested, current, profit, rate, avgPriceKRW, priceKRW };
    }),
    [investments, prices, exchangeRate],
  );

  const sortedRows = useMemo(() => {
    return [...rows].sort((a, b) => {
      const aVal = getRowValue(a, sortKey);
      const bVal = getRowValue(b, sortKey);
      const cmp = typeof aVal === 'string' && typeof bVal === 'string'
        ? aVal.localeCompare(bVal, 'ko')
        : (aVal as number) - (bVal as number);
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [rows, sortKey, sortDir]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir(key === 'name' || key === 'ticker' || key === 'category' ? 'asc' : 'desc');
    }
  };

  return (
    <TableContainer component={Paper} sx={{ boxShadow: 'none', border: (theme) => `1px solid ${theme.palette.gray2}` }}>
      <Table>
        <TableHead sx={{ bgcolor: 'gray1' }}>
          <TableRow>
            {COLUMNS.map((col) => (
              <TableCell key={col.key} align={col.align} sx={{ color: 'gray7', fontWeight: 600 }}>
                <TableSortLabel
                  active={sortKey === col.key}
                  direction={sortKey === col.key ? sortDir : 'asc'}
                  onClick={() => handleSort(col.key)}
                  sx={{
                    '&.MuiTableSortLabel-root': { color: 'gray7' },
                    '&.Mui-active': { color: 'gray9' },
                    flexDirection: col.align === 'right' ? 'row-reverse' : 'row',
                  }}
                >
                  {col.label}
                </TableSortLabel>
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {sortedRows.map(({ item, price, invested, current, profit, rate }) => (
            <TableRow key={item.ticker} sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
              <TableCell sx={{ fontWeight: 600 }}>{item.name}</TableCell>
              <TableCell sx={{ color: 'gray6' }}>{item.ticker}</TableCell>
              <TableCell>{item.category}</TableCell>
              <TableCell align="right">{formatKRW(invested)}</TableCell>
              <TableCell align="right">{item.quantity.toLocaleString()}</TableCell>
              <TableCell align="right">{formatCurrency(item.avgPrice, item.currency)}</TableCell>
              <TableCell align="right" sx={{ fontWeight: 700 }}>
                {price ? formatCurrency(price, item.currency) : '-'}
              </TableCell>
              <TableCell align="right" sx={{ color: profitColor(rate), fontWeight: 700 }}>
                {price ? formatRate(rate) : '-'}
              </TableCell>
              <TableCell align="right" sx={{ color: profitColor(profit), fontWeight: 700 }}>
                {price ? formatProfit(profit) : '-'}
              </TableCell>
              <TableCell align="right" sx={{ fontWeight: 700 }}>
                {price ? formatKRW(current) : '-'}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
