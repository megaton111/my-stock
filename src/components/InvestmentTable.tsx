'use client';

import { useState, useMemo } from 'react';
import { Box, Paper, Stack, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TableSortLabel, IconButton, Collapse } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { Investment } from '@/types/investment';
import { investedAmount, currentValue } from '@/utils/calculator';
import { formatCurrency, formatKRW, formatRate, formatProfit, profitColor } from '@/utils/format';
import { isCash } from '@/utils/assetClass';

interface InvestmentTableProps {
  investments: Investment[];
  prices: Record<string, number>;
  exchangeRate: number;
}

type SortKey = 'name' | 'invested' | 'quantity' | 'avgPrice' | 'price' | 'rate' | 'profit' | 'current';
type SortDir = 'asc' | 'desc';

const COLUMNS: { label: string; key: SortKey; align?: 'right' }[] = [
  { label: '종목명', key: 'name' },
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
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());

  console.log({ exchangeRate }) ;

  const toggleCard = (ticker: string) => {
    setExpandedCards((prev) => {
      const next = new Set(prev);
      if (next.has(ticker)) next.delete(ticker);
      else next.add(ticker);
      return next;
    });
  };

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
      setSortDir(key === 'name' ? 'asc' : 'desc');
    }
  };

  const labelSx = { color: 'gray6', fontSize: '0.75rem' } as const;
  const valueSx = { fontSize: '0.75rem', textAlign: 'right' } as const;

  return (
    <>
      {/* 데스크탑: 테이블 */}
      <TableContainer component={Paper} sx={{
        display: { xs: 'none', md: 'block' },
        borderRadius: 2,
        '& .MuiTableCell-root': {
          fontSize: '0.8rem',
          padding: '8px 10px',
        },
      }}>
        <Table>
          <TableHead sx={{ bgcolor: 'gray1' }}>
            <TableRow>
              {COLUMNS.map((col) => (
                <TableCell key={col.key} align={col.align} sx={{ color: 'gray7', fontWeight: 600, fontSize: '0.75rem' }}>
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
            {sortedRows.map(({ item, price, invested, current, profit, rate }) => {
              const cash = isCash(item.ticker);
              return (
              <TableRow key={item.ticker} sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                <TableCell>
                  <Typography fontWeight={600} fontSize="0.8rem" lineHeight={1.25}>{item.name}</Typography>
                  <Typography color="gray6" fontSize="0.65rem" lineHeight={1.2}>{cash ? '현금' : item.ticker}</Typography>
                </TableCell>
                <TableCell align="right">{formatKRW(invested)}</TableCell>
                <TableCell align="right">
                  {cash ? formatCurrency(item.quantity, item.currency) : item.quantity.toLocaleString()}
                </TableCell>
                <TableCell align="right">{cash ? '-' : formatCurrency(item.avgPrice, item.currency)}</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700 }}>
                  {cash ? '-' : (price ? formatCurrency(price, item.currency) : '-')}
                </TableCell>
                <TableCell align="right" sx={{ color: profitColor(rate), fontWeight: 700 }}>
                  {cash ? '-' : (price ? formatRate(rate) : '-')}
                </TableCell>
                <TableCell align="right" sx={{ color: profitColor(profit), fontWeight: 700 }}>
                  {cash ? '-' : (price ? formatProfit(profit) : '-')}
                </TableCell>
                <TableCell align="right" sx={{ fontWeight: 700 }}>
                  {price ? formatKRW(current) : '-'}
                </TableCell>
              </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>

      {/* 모바일: 카드 리스트 */}
      <Box sx={{ display: { xs: 'grid', md: 'none' }, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 1, width: 1 }}>
        {sortedRows.map(({ item, price, invested, current, profit, rate }) => {
          const expanded = expandedCards.has(item.ticker);
          const cash = isCash(item.ticker);
          return (
            <Paper
              key={item.ticker}
              sx={{ px: 1.5, py: 1, borderRadius: 2 }}
            >
              <Stack spacing={.5}>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Typography fontWeight={700} fontSize={16}>{item.name}</Typography>
                  <IconButton
                    size="small"
                    onClick={() => toggleCard(item.ticker)}
                    sx={{
                      transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
                      transition: 'transform 0.2s',
                    }}
                  >
                    <ExpandMoreIcon />
                  </IconButton>
                </Stack>
                <Stack spacing={0.25}>
                  {cash ? (
                    <Stack direction="row" justifyContent="space-between">
                      <Typography sx={labelSx}>금액</Typography>
                      <Typography sx={{ ...valueSx, fontWeight: 700 }}>{formatKRW(current)}</Typography>
                    </Stack>
                  ) : (
                    <>
                      <Stack direction="row" justifyContent="space-between">
                        <Typography sx={labelSx}>수익률</Typography>
                        <Typography sx={{ ...valueSx, fontWeight: 700, color: profitColor(rate) }}>
                          {price ? formatRate(rate) : '-'}
                        </Typography>
                      </Stack>
                      <Stack direction="row" justifyContent="space-between">
                        <Typography sx={labelSx}>수익금</Typography>
                        <Typography sx={{ ...valueSx, fontWeight: 700, color: profitColor(profit) }}>
                          {price ? formatProfit(profit) : '-'}
                        </Typography>
                      </Stack>
                    </>
                  )}
                </Stack>
                <Collapse in={expanded}>
                  <Stack spacing={0.25} sx={{ pt: 0.5 }}>
                    {item.broker && (
                      <Stack direction="row" justifyContent="space-between">
                        <Typography sx={labelSx}>{cash ? '보관처' : '증권사'}</Typography>
                        <Typography sx={valueSx}>{item.broker}</Typography>
                      </Stack>
                    )}
                    {!cash && (
                      <>
                        <Stack direction="row" justifyContent="space-between">
                          <Typography sx={labelSx}>매입가</Typography>
                          <Typography sx={valueSx}>{formatCurrency(item.avgPrice, item.currency)}</Typography>
                        </Stack>
                        <Stack direction="row" justifyContent="space-between">
                          <Typography sx={labelSx}>현재가</Typography>
                          <Typography sx={{ ...valueSx, fontWeight: 700 }}>
                            {price ? formatCurrency(price, item.currency) : '-'}
                          </Typography>
                        </Stack>
                      </>
                    )}
                    <Stack direction="row" justifyContent="space-between">
                      <Typography sx={labelSx}>{cash ? '원금' : '투자금액'}</Typography>
                      <Typography sx={valueSx}>{formatKRW(invested)}</Typography>
                    </Stack>
                    <Stack direction="row" justifyContent="space-between">
                      <Typography sx={labelSx}>평가금액</Typography>
                      <Typography sx={{ ...valueSx, fontWeight: 700 }}>
                        {price ? formatKRW(current) : '-'}
                      </Typography>
                    </Stack>
                  </Stack>
                </Collapse>
              </Stack>
            </Paper>
          );
        })}
      </Box>
    </>
  );
}
