'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  Box, Paper, Stack, Typography, Skeleton, Divider,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import PaidIcon from '@mui/icons-material/Paid';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip,
} from 'recharts';
import { Investment } from '@/types/investment';
import { formatKRW } from '@/utils/format';

interface DividendPayment {
  month: number;
  amount: number;
  date: string;
}

interface DividendResult {
  symbol: string;
  currency: string;
  annualRate: number;
  yield: number;
  payments: DividendPayment[];
  error?: string;
}

interface DividendWidgetProps {
  investments: Investment[];
  exchangeRate: number;
}

interface StockRow {
  name: string;
  ticker: string;
  frequencyLabel: string;
  annualAmountKRW: number;
  yield: number;
}

function frequencyLabel(count: number): string {
  if (count >= 11) return '월배당';
  if (count >= 3) return '분기배당';
  if (count === 2) return '반기배당';
  if (count === 1) return '연배당';
  return '-';
}

export default function DividendWidget({ investments, exchangeRate }: DividendWidgetProps) {
  const theme = useTheme();
  const [dividends, setDividends] = useState<DividendResult[]>([]);
  const [fetched, setFetched] = useState(false);
  const loading = investments.length > 0 && !fetched;

  useEffect(() => {
    if (investments.length === 0) return;
    let cancelled = false;
    const tickers = investments.map((i) => i.ticker).join(',');
    fetch(`/api/stock/dividend?symbols=${tickers}`)
      .then((res) => res.json())
      .then((data: DividendResult[]) => {
        if (cancelled) return;
        setDividends(Array.isArray(data) ? data : []);
        setFetched(true);
      })
      .catch(() => {
        if (cancelled) return;
        setDividends([]);
        setFetched(true);
      });
    return () => { cancelled = true; };
  }, [investments]);

  const { totalAnnual, avgYield, monthlyData, stockRows } = useMemo(() => {
    const monthly = Array(12).fill(0);
    const rows: StockRow[] = [];
    let total = 0;
    let weightedYield = 0;
    let investedForYield = 0;

    for (const inv of investments) {
      const div = dividends.find((d) => d.symbol === inv.ticker);
      if (!div || div.annualRate <= 0) continue;

      const factor = div.currency === 'USD' ? exchangeRate : 1;
      const annualKRW = div.annualRate * inv.quantity * factor;
      total += annualKRW;

      // 월별 배당금 집계 (각 지급일의 월에 누적)
      for (const p of div.payments) {
        monthly[p.month - 1] += p.amount * inv.quantity * factor;
      }

      // 가중 평균 수익률 계산
      const investedKRW = inv.avgPrice * inv.quantity * factor;
      weightedYield += div.yield * investedKRW;
      investedForYield += investedKRW;

      rows.push({
        name: inv.name,
        ticker: inv.ticker,
        frequencyLabel: frequencyLabel(div.payments.length),
        annualAmountKRW: annualKRW,
        yield: div.yield,
      });
    }

    const monthlyChart = monthly.map((amount, i) => ({
      month: `${i + 1}월`,
      amount: Math.round(amount),
    }));

    rows.sort((a, b) => b.annualAmountKRW - a.annualAmountKRW);

    return {
      totalAnnual: total,
      avgYield: investedForYield > 0 ? weightedYield / investedForYield : 0,
      monthlyData: monthlyChart,
      stockRows: rows,
    };
  }, [dividends, investments, exchangeRate]);

  if (loading) {
    return (
      <Skeleton
        variant="rectangular"
        animation="wave"
        width="100%"
        height={240}
        sx={{ borderRadius: 1 }}
      />
    );
  }

  // 배당주가 하나도 없으면 위젯 자체 숨김
  if (stockRows.length === 0) return null;

  return (
    <Paper sx={{ p: { xs: 2, sm: 3 }, width: 1, borderRadius: 2 }}>
      <Stack spacing={2.5}>
        {/* 헤더 */}
        <Stack direction="row" alignItems="center" spacing={1}>
          {/* <PaidIcon sx={{ fontSize: 20, color: 'warning.main' }} /> */}
          <Typography variant="body2" color="gray6">
            배당 현황
          </Typography>
        </Stack>

        {/* ① 연간 예상 배당금 */}
        <Box>
          <Typography variant="caption" color="gray6">
            연간 예상 배당금
          </Typography>
          <Stack direction="row" alignItems="baseline" spacing={1}>
            <Typography variant="h5" fontWeight={700} sx={{ letterSpacing: '-1px' }}>
              {formatKRW(totalAnnual)}
            </Typography>
            <Typography variant="body2" color="gray6">
              평균 수익률 {avgYield.toFixed(2)}%
            </Typography>
          </Stack>
        </Box>

        <Divider />

        {/* ② 월별 예상 배당금 차트 */}
        <Box>
          <Typography variant="caption" color="gray6" sx={{ mb: 1, display: 'block' }}>
            월별 예상 배당금
          </Typography>
          <Box sx={{ width: '100%', height: 160 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyData} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 10, fill: theme.palette.gray6 }}
                  tickLine={false}
                  axisLine={{ stroke: theme.palette.gray2 }}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: theme.palette.gray6 }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v: number) => {
                    if (v >= 10_000) return `${Math.round(v / 10_000)}만`;
                    if (v >= 1000) return `${Math.round(v / 1000)}k`;
                    return v.toString();
                  }}
                  width={40}
                />
                <Tooltip
                  cursor={{ fill: 'rgba(0,0,0,0.04)' }}
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const d = payload[0].payload as { month: string; amount: number };
                    return (
                      <Paper sx={{ px: 1.5, py: 1, boxShadow: '0 2px 8px rgba(0,0,0,0.12)' }}>
                        <Typography variant="caption" color="gray6">{d.month}</Typography>
                        <Typography variant="body2" fontWeight={700}>
                          {formatKRW(d.amount)}
                        </Typography>
                      </Paper>
                    );
                  }}
                />
                <Bar dataKey="amount" radius={[4, 4, 0, 0]} fill={theme.palette.primary.main} />
              </BarChart>
            </ResponsiveContainer>
          </Box>
        </Box>

        <Divider />

        {/* ③ 종목별 배당 요약 */}
        <Box>
          <Typography variant="caption" color="gray6" sx={{ mb: 1, display: 'block' }}>
            종목별 배당
          </Typography>
          <Stack spacing={0.75}>
            {stockRows.map((row) => (
              <Stack
                key={row.ticker}
                direction="row"
                alignItems="center"
                justifyContent="space-between"
                sx={{ py: 0.5 }}
              >
                <Stack direction="row" alignItems="center" spacing={1} sx={{ minWidth: 0, flex: 1 }}>
                  <Typography variant="body2" fontWeight={600} fontSize="0.85rem" noWrap>
                    {row.name}
                  </Typography>
                  <Typography
                    variant="caption"
                    color="gray6"
                    fontSize="0.7rem"
                    sx={{
                      px: 0.75,
                      py: 0.25,
                      bgcolor: 'gray1',
                      borderRadius: 0.75,
                      flexShrink: 0,
                    }}
                  >
                    {row.frequencyLabel}
                  </Typography>
                </Stack>
                <Stack direction="row" alignItems="baseline" spacing={1}>
                  <Typography variant="body2" fontWeight={700} fontSize="0.85rem">
                    {formatKRW(row.annualAmountKRW)}
                  </Typography>
                  <Typography variant="caption" color="gray6" fontSize="0.7rem" sx={{ minWidth: 40, textAlign: 'right' }}>
                    {row.yield.toFixed(2)}%
                  </Typography>
                </Stack>
              </Stack>
            ))}
          </Stack>
        </Box>
      </Stack>
    </Paper>
  );
}
