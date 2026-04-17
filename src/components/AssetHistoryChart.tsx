'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Box, Paper, Stack, Typography, ToggleButtonGroup, ToggleButton,
  CircularProgress, Collapse, Button, Chip, Tooltip, IconButton,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import TrendingFlatIcon from '@mui/icons-material/TrendingFlat';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis,
  CartesianGrid, Tooltip as RechartsTooltip,
} from 'recharts';
import { formatKRW } from '@/utils/format';

interface Snapshot {
  date: string;
  total_invested: number;
  total_value: number;
  exchange_rate: number;
  cash_value: number;
  financial_value: number;
  profit_rate: number | null;
}

interface DetailItem {
  ticker: string;
  name: string;
  currency: string;
  todayValue: number;
  prevValue: number;
  change: number;
  changeRate: number;
  isNew: boolean;
}

interface DetailData {
  latestDate: string;
  prevDate: string | null;
  items: DetailItem[];
}

interface ChartData {
  date: string;
  label: string;
  totalValue: number;
  totalInvested: number;
  profit: number;
  profitRate: number | null;
  financialValue: number;
  cashValue: number;
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
  const [detailOpen, setDetailOpen] = useState(false);
  const [detail, setDetail] = useState<DetailData | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/portfolio-history?userId=${userId}&period=${period}`);
      const snapshots: Snapshot[] = await res.json();
      const mapped = snapshots.map((s) => {
        const totalValue = Number(s.total_value);
        return {
          date: s.date,
          label: formatDateLabel(s.date, period),
          totalValue,
          totalInvested: Number(s.total_invested),
          profit: totalValue - Number(s.total_invested),
          profitRate: s.profit_rate != null ? Number(s.profit_rate) : null,
          financialValue: Number(s.financial_value) || 0,
          cashValue: Number(s.cash_value) || 0,
        };
      });
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

  const handleToggleDetail = async () => {
    if (detailOpen) {
      setDetailOpen(false);
      return;
    }
    setDetailOpen(true);
    if (!detail) {
      setDetailLoading(true);
      try {
        const res = await fetch(`/api/portfolio-history/detail?userId=${userId}`);
        if (res.ok) {
          setDetail(await res.json());
        }
      } catch {
        // 무시
      } finally {
        setDetailLoading(false);
      }
    }
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
            <Stack direction="row" alignItems="center" spacing={0.5}>
              <Typography variant="body2" color="gray6">
                자산 추이
              </Typography>
              <Tooltip
                title="선택한 기간의 첫날과 마지막 날의 총 평가금액 차이를 표시합니다. 아래 '종목별 변동 자세히 보기'는 직전 스냅샷 대비 변동입니다."
                arrow
                enterTouchDelay={0}
                leaveTouchDelay={3000}
              >
                <IconButton size="small" sx={{ p: 0.25, color: 'text.disabled' }}>
                  <InfoOutlinedIcon sx={{ fontSize: 16 }} />
                </IconButton>
              </Tooltip>
            </Stack>
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
                <RechartsTooltip
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const d = payload[0].payload as ChartData;
                    return (
                      <Paper sx={{ p: 1.5, boxShadow: '0 2px 8px rgba(0,0,0,0.12)' }}>
                        <Typography variant="caption" color="gray6">{d.date}</Typography>
                        <Typography variant="body2" fontWeight={700}>
                          평가금액: {formatKRW(d.totalValue)}
                        </Typography>
                        {(d.financialValue > 0 || d.cashValue > 0) && (
                          <Stack direction="row" spacing={1.5} sx={{ mt: 0.25 }}>
                            <Typography variant="caption" sx={{ color: '#4caf50' }}>
                              금융자산: {formatKRW(d.financialValue)}
                            </Typography>
                            <Typography variant="caption" sx={{ color: '#9e9e9e' }}>
                              현금: {formatKRW(d.cashValue)}
                            </Typography>
                          </Stack>
                        )}
                        <Typography variant="body2" color="gray6">
                          투자금액: {formatKRW(d.totalInvested)}
                        </Typography>
                        <Typography
                          variant="body2"
                          fontWeight={600}
                          sx={{ color: d.profit >= 0 ? 'error.main' : 'primary.main' }}
                        >
                          수익: {d.profit >= 0 ? '+' : ''}{formatKRW(d.profit)}
                          {d.profitRate != null && (
                            <Typography
                              component="span"
                              variant="caption"
                              sx={{ ml: 0.5, color: 'inherit' }}
                            >
                              ({d.profitRate >= 0 ? '+' : ''}{d.profitRate.toFixed(2)}%)
                            </Typography>
                          )}
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
                  dataKey="financialValue"
                  stroke="#4caf50"
                  strokeWidth={1.5}
                  fill="none"
                  name="금융자산"
                />
                <Area
                  type="monotone"
                  dataKey="cashValue"
                  stroke="#9e9e9e"
                  strokeWidth={1.5}
                  fill="none"
                  name="현금"
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
        {data.length > 0 && (
          <>
            <Button
              size="small"
              onClick={handleToggleDetail}
              endIcon={
                <ExpandMoreIcon
                  sx={{
                    transition: 'transform 0.2s',
                    transform: detailOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                  }}
                />
              }
              sx={{ alignSelf: 'center', color: 'text.secondary', fontSize: '0.8rem' }}
            >
              종목별 변동 자세히 보기
            </Button>

            <Collapse in={detailOpen} unmountOnExit>
              {detailLoading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
                  <CircularProgress size={24} />
                </Box>
              ) : detail && detail.items.length > 0 ? (
                <Box>
                  <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
                    {detail.prevDate
                      ? `${detail.prevDate} → ${detail.latestDate} 변동`
                      : `${detail.latestDate} 기준`}
                  </Typography>
                  <Stack spacing={0.5}>
                    {detail.items.map((item) => (
                      <Stack
                        key={item.ticker}
                        direction="row"
                        alignItems="center"
                        sx={{
                          py: 1,
                          px: 1.5,
                          borderRadius: 1,
                          bgcolor: 'action.hover',
                        }}
                      >
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Typography variant="body2" fontWeight={600} noWrap>
                            {item.name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {formatKRW(item.todayValue)}
                          </Typography>
                        </Box>
                        <Stack direction="row" alignItems="center" spacing={0.5}>
                          {item.isNew ? (
                            <Chip label="신규" size="small" color="info" variant="outlined" sx={{ height: 20, fontSize: '0.7rem' }} />
                          ) : (
                            <>
                              {item.change > 0 ? (
                                <TrendingUpIcon sx={{ fontSize: 16, color: 'error.main' }} />
                              ) : item.change < 0 ? (
                                <TrendingDownIcon sx={{ fontSize: 16, color: 'primary.main' }} />
                              ) : (
                                <TrendingFlatIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                              )}
                              <Typography
                                variant="body2"
                                fontWeight={600}
                                sx={{
                                  color: item.change > 0 ? 'error.main' : item.change < 0 ? 'primary.main' : 'text.secondary',
                                  minWidth: 80,
                                  textAlign: 'right',
                                }}
                              >
                                {item.change > 0 ? '+' : ''}{formatKRW(item.change)}
                              </Typography>
                              <Typography
                                variant="caption"
                                sx={{
                                  color: item.change > 0 ? 'error.main' : item.change < 0 ? 'primary.main' : 'text.secondary',
                                  minWidth: 50,
                                  textAlign: 'right',
                                }}
                              >
                                {item.changeRate > 0 ? '+' : ''}{item.changeRate.toFixed(1)}%
                              </Typography>
                            </>
                          )}
                        </Stack>
                      </Stack>
                    ))}
                  </Stack>
                </Box>
              ) : detail ? (
                <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 2 }}>
                  비교할 데이터가 아직 없습니다. 내일부터 변동 내역이 표시됩니다.
                </Typography>
              ) : null}
            </Collapse>
          </>
        )}
      </Stack>
    </Paper>
  );
}
