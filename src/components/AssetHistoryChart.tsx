'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Box, Paper, Stack, Typography, ToggleButtonGroup, ToggleButton,
  CircularProgress,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis,
  CartesianGrid, Tooltip,
} from 'recharts';
import { formatKRW } from '@/utils/format';

interface Snapshot {
  date: string;
  total_invested: number;
  total_value: number;
  exchange_rate: number;
}

interface ChartData {
  date: string;
  label: string;
  totalValue: number;
  totalInvested: number;
  profit: number;
}

const PERIODS = [
  { value: '1w', label: '1주' },
  { value: '1m', label: '1개월' },
  { value: '3m', label: '3개월' },
  { value: '1y', label: '1년' },
  { value: 'all', label: '전체' },
] as const;

function formatDateLabel(dateStr: string, period: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  const month = d.getMonth() + 1;
  const day = d.getDate();
  if (period === '1w') return `${month}/${day}`;
  if (period === '1m') return `${month}/${day}`;
  return `${d.getFullYear().toString().slice(2)}.${month}/${day}`;
}

interface AssetHistoryChartProps {
  userId: string | number;
}

export default function AssetHistoryChart({ userId }: AssetHistoryChartProps) {
  const theme = useTheme();
  const [period, setPeriod] = useState('1m');
  const [data, setData] = useState<ChartData[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/portfolio-history?userId=${userId}&period=${period}`);
      const snapshots: Snapshot[] = await res.json();
      const mapped = snapshots.map((s) => ({
        date: s.date,
        label: formatDateLabel(s.date, period),
        totalValue: Number(s.total_value),
        totalInvested: Number(s.total_invested),
        profit: Number(s.total_value) - Number(s.total_invested),
      }));
      setData(mapped);
    } catch {
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [userId, period]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const handlePeriod = (_: React.MouseEvent<HTMLElement>, next: string | null) => {
    if (next) setPeriod(next);
  };

  const firstValue = data.length > 0 ? data[0].totalValue : 0;
  const lastValue = data.length > 0 ? data[data.length - 1].totalValue : 0;
  const change = lastValue - firstValue;
  const changeRate = firstValue > 0 ? (change / firstValue) * 100 : 0;

  return (
    <Paper sx={{ p: { xs: 2, sm: 3 }, width: '100%', borderRadius: 2 }}>
      <Stack spacing={2}>
        <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ sm: 'center' }} spacing={1}>
          <Box>
            <Typography variant="body2" color="gray6" gutterBottom>
              자산 추이
            </Typography>
            {data.length > 0 && (
              <Typography
                variant="body1"
                fontWeight={700}
                sx={{ color: change >= 0 ? 'error.main' : 'primary.main', letterSpacing: '-0.5px' }}
              >
                {change >= 0 ? '+' : ''}{formatKRW(change)} ({change >= 0 ? '+' : ''}{changeRate.toFixed(1)}%)
              </Typography>
            )}
          </Box>
          <ToggleButtonGroup
            value={period}
            exclusive
            onChange={handlePeriod}
            size="small"
            sx={{
              '& .MuiToggleButton-root': {
                px: { xs: 1.5, sm: 2 },
                py: 0.5,
                fontSize: '0.75rem',
                borderColor: theme.palette.gray2,
              },
            }}
          >
            {PERIODS.map((p) => (
              <ToggleButton key={p.value} value={p.value}>{p.label}</ToggleButton>
            ))}
          </ToggleButtonGroup>
        </Stack>

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
            <CircularProgress size={28} />
          </Box>
        ) : data.length === 0 ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 6 }}>
            <Typography variant="body2" color="gray5">
              아직 데이터가 없습니다. 내일부터 자산 추이가 기록됩니다.
            </Typography>
          </Box>
        ) : (
          <Box sx={{ width: '100%', height: { xs: 200, sm: 280 } }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={theme.palette.primary.main} stopOpacity={0.15} />
                    <stop offset="95%" stopColor={theme.palette.primary.main} stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorInvested" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={theme.palette.gray4} stopOpacity={0.1} />
                    <stop offset="95%" stopColor={theme.palette.gray4} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={theme.palette.gray2} />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 11, fill: theme.palette.gray6 }}
                  tickLine={false}
                  axisLine={{ stroke: theme.palette.gray2 }}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: theme.palette.gray6 }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v: number) => {
                    if (v >= 100_000_000) return `${(v / 100_000_000).toFixed(1)}억`;
                    if (v >= 10_000) return `${Math.round(v / 10_000)}만`;
                    return v.toLocaleString();
                  }}
                  width={50}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const d = payload[0].payload as ChartData;
                    return (
                      <Paper sx={{ p: 1.5, boxShadow: '0 2px 8px rgba(0,0,0,0.12)' }}>
                        <Typography variant="caption" color="gray6">{d.date}</Typography>
                        <Typography variant="body2" fontWeight={700}>
                          평가금액: {formatKRW(d.totalValue)}
                        </Typography>
                        <Typography variant="body2" color="gray6">
                          투자금액: {formatKRW(d.totalInvested)}
                        </Typography>
                        <Typography
                          variant="body2"
                          fontWeight={600}
                          sx={{ color: d.profit >= 0 ? 'error.main' : 'primary.main' }}
                        >
                          수익: {d.profit >= 0 ? '+' : ''}{formatKRW(d.profit)}
                        </Typography>
                      </Paper>
                    );
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="totalInvested"
                  stroke={theme.palette.gray4}
                  strokeWidth={1.5}
                  strokeDasharray="4 4"
                  fill="url(#colorInvested)"
                  name="투자금액"
                />
                <Area
                  type="monotone"
                  dataKey="totalValue"
                  stroke={theme.palette.primary.main}
                  strokeWidth={2}
                  fill="url(#colorValue)"
                  name="평가금액"
                />
              </AreaChart>
            </ResponsiveContainer>
          </Box>
        )}
      </Stack>
    </Paper>
  );
}
