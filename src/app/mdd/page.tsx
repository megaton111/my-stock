'use client';

import { useState, useCallback, Fragment } from 'react';
import {
  Container, Box, Paper, Stack, Typography, TextField, Button,
  ToggleButton, ToggleButtonGroup, CircularProgress, Collapse,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  IconButton,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import DeleteIcon from '@mui/icons-material/Delete';
import BarChartIcon from '@mui/icons-material/BarChart';
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ReferenceLine,
} from 'recharts';
import PageHeader from '@/components/PageHeader';
import { calculateMdd, calculateAth, calculateDrawdownSeries, MddResult, AthResult, Point, DrawdownPoint } from '@/utils/mdd';
import { formatRate, profitColor } from '@/utils/format';

type Range = '1y' | '2y' | '3y' | '5y' | 'max';

const RANGE_LABEL: Record<Range, string> = {
  '1y': '1Y',
  '2y': '2Y',
  '3y': '3Y',
  '5y': '5Y',
  max: '전체',
};

interface MddRow {
  symbol: string;
  name: string;
  currency: string;
  range: Range;
  result: MddResult;
  drawdownSeries: DrawdownPoint[];
  ath: AthResult;       // 전체 기간 최고가 (고정)
  athDrawdown: number;  // 최고가 대비 현재 하락율
  loading?: boolean;
}

function formatPrice(price: number, currency: string) {
  if (currency === 'KRW') return `${Math.floor(price).toLocaleString()}원`;
  return `$${price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatShortDate(dateStr: string) {
  const [y, m, d] = dateStr.split('-');
  return `${y.slice(2)}.${m}.${d}`;
}

async function fetchHistory(symbol: string, range: string) {
  const res = await fetch(`/api/stock/history?symbol=${encodeURIComponent(symbol)}&range=${range}`);
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || '데이터 조회 실패');
  }
  return res.json();
}

function MddChart({ data, mdd }: { data: DrawdownPoint[]; mdd: number }) {
  const theme = useTheme();
  const mddPercent = Math.round(mdd * 10000) / 100;

  return (
    <Box sx={{ width: '100%', height: 200, mt: 1, mb: 1 }}>
      <ResponsiveContainer>
        <AreaChart data={data} margin={{ top: 5, right: 20, bottom: 5, left: 10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={theme.palette.divider} />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 10 }}
            interval="preserveStartEnd"
            tickCount={6}
          />
          <YAxis
            tick={{ fontSize: 10 }}
            tickFormatter={(v: number) => `${v}%`}
            domain={['dataMin', 0]}
          />
          <Tooltip
            formatter={(value) => [`${Number(value).toFixed(2)}%`, 'Drawdown']}
            contentStyle={{ fontSize: 12 }}
          />
          <ReferenceLine
            y={mddPercent}
            stroke={theme.palette.error.main}
            strokeDasharray="4 4"
            label={{ value: `MDD ${mddPercent.toFixed(1)}%`, fontSize: 10, fill: theme.palette.error.main }}
          />
          <Area
            type="monotone"
            dataKey="drawdown"
            stroke={theme.palette.primary.main}
            fill={theme.palette.primary.main}
            fillOpacity={0.15}
          />
        </AreaChart>
      </ResponsiveContainer>
    </Box>
  );
}

export default function MddPage() {
  const [ticker, setTicker] = useState('');
  const [rows, setRows] = useState<MddRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [expandedChart, setExpandedChart] = useState<string | null>(null);

  const toggleChart = (symbol: string) => {
    setExpandedChart((prev) => (prev === symbol ? null : symbol));
  };

  const handleAdd = useCallback(async () => {
    const symbol = ticker.trim().toUpperCase();
    if (!symbol) return;

    if (rows.some((r) => r.symbol === symbol)) {
      setError('이미 추가된 종목입니다.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // 전체 기간 + 1Y 동시 조회
      const [maxData, rangeData] = await Promise.all([
        fetchHistory(symbol, 'max'),
        fetchHistory(symbol, '1y'),
      ]);

      const ath = calculateAth(maxData.history as Point[]);
      const result = calculateMdd(rangeData.history as Point[]);
      const drawdownSeries = calculateDrawdownSeries(rangeData.history as Point[]);

      if (!ath || !result) throw new Error('데이터가 부족합니다.');

      const athDrawdown = (result.latest - ath.allTimeHigh) / ath.allTimeHigh;

      setRows((prev) => [
        ...prev,
        {
          symbol: maxData.symbol,
          name: maxData.name,
          currency: maxData.currency,
          range: '1y',
          result,
          drawdownSeries,
          ath,
          athDrawdown,
        },
      ]);
      setTicker('');
    } catch (e) {
      setError(e instanceof Error ? e.message : '오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  }, [ticker, rows]);

  const handleRangeChange = useCallback(async (symbol: string, newRange: Range) => {
    setRows((prev) => prev.map((r) => r.symbol === symbol ? { ...r, loading: true } : r));

    try {
      const data = await fetchHistory(symbol, newRange);
      const history = data.history as Point[];
      const result = calculateMdd(history);
      const drawdownSeries = calculateDrawdownSeries(history);

      if (!result) throw new Error('데이터 부족');

      setRows((prev) =>
        prev.map((r) => {
          if (r.symbol !== symbol) return r;
          const athDrawdown = (result.latest - r.ath.allTimeHigh) / r.ath.allTimeHigh;
          return { ...r, range: newRange, result, drawdownSeries, athDrawdown, loading: false };
        }),
      );
    } catch {
      setRows((prev) => prev.map((r) => r.symbol === symbol ? { ...r, loading: false } : r));
    }
  }, []);

  const handleRemove = (symbol: string) => {
    setRows((prev) => prev.filter((r) => r.symbol !== symbol));
    if (expandedChart === symbol) setExpandedChart(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !loading) handleAdd();
  };

  const rangeToggle = (symbol: string, currentRange: Range, isLoading?: boolean) => (
    <ToggleButtonGroup
      value={currentRange}
      exclusive
      size="small"
      disabled={isLoading}
      onChange={(_, v) => v && handleRangeChange(symbol, v)}
      sx={{ '& .MuiToggleButton-root': { px: 0.8, py: 0.2, fontSize: '0.7rem' } }}
    >
      <ToggleButton value="1y">1Y</ToggleButton>
      <ToggleButton value="2y">2Y</ToggleButton>
      <ToggleButton value="3y">3Y</ToggleButton>
      <ToggleButton value="5y">5Y</ToggleButton>
      <ToggleButton value="max">전체</ToggleButton>
    </ToggleButtonGroup>
  );

  return (
    <Container maxWidth="lg" sx={{ py: { xs: 2, sm: 4 } }}>
      <PageHeader />
      <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>
        MDD 분석
      </Typography>

      {/* 입력 영역 */}
      <Paper sx={{ p: { xs: 1.5, sm: 3 }, mb: 2, borderRadius: 2 }}>
        <Stack direction="row" spacing={1}>
          <TextField
            size="small"
            placeholder="티커 입력 (예: AAPL, 005930.KS)"
            value={ticker}
            onChange={(e) => setTicker(e.target.value)}
            onKeyDown={handleKeyDown}
            sx={{ flex: 1 }}
          />
          <Button
            variant="contained"
            onClick={handleAdd}
            disabled={loading || !ticker.trim()}
          >
            {loading ? <CircularProgress size={20} /> : '추가'}
          </Button>
        </Stack>
        {error && (
          <Typography variant="body2" color="error" sx={{ mt: 1 }}>
            {error}
          </Typography>
        )}
      </Paper>

      {/* 결과 영역 */}
      {rows.length > 0 && (
        <>
          {/* PC: 테이블 */}
          <TableContainer
            component={Paper}
            sx={{
              display: { xs: 'none', md: 'block' },
              borderRadius: 2,
              '& .MuiTableCell-root': { fontSize: '0.8rem', whiteSpace: 'nowrap' },
            }}
          >
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>종목명</TableCell>
                  <TableCell align="right">최고가</TableCell>
                  <TableCell align="right">현재가</TableCell>
                  <TableCell align="right">고점대비</TableCell>
                  <TableCell align="right">연초가</TableCell>
                  <TableCell align="right">연초대비</TableCell>
                  <TableCell align="right">MDD</TableCell>
                  <TableCell align="center">고점일(가격)</TableCell>
                  <TableCell align="center">저점일(가격)</TableCell>
                  <TableCell align="center">기간</TableCell>
                  <TableCell align="center" sx={{ width: 80 }} />
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map((row) => {
                  const r = row.result;
                  const isExpanded = expandedChart === row.symbol;
                  return (
                    <Fragment key={row.symbol}>
                      <TableRow hover sx={{ opacity: row.loading ? 0.5 : 1 }}>
                        <TableCell>{row.name}</TableCell>
                        <TableCell align="right">
                          {formatPrice(row.ath.allTimeHigh, row.currency)}
                        </TableCell>
                        <TableCell align="right">
                          {formatPrice(r.latest, row.currency)}
                        </TableCell>
                        <TableCell align="right" sx={{ color: profitColor(row.athDrawdown) }}>
                          {formatRate(row.athDrawdown * 100)}
                        </TableCell>
                        <TableCell align="right">
                          {formatPrice(r.ytdStart, row.currency)}
                        </TableCell>
                        <TableCell align="right" sx={{ color: profitColor(r.ytdReturn) }}>
                          {formatRate(r.ytdReturn * 100)}
                        </TableCell>
                        <TableCell align="right" sx={{ color: 'primary.main', fontWeight: 700 }}>
                          {RANGE_LABEL[row.range]} {formatRate(r.mdd * 100)}
                        </TableCell>
                        <TableCell align="center">
                          {formatShortDate(r.peakDate)} ({formatPrice(r.peakPrice, row.currency)})
                        </TableCell>
                        <TableCell align="center">
                          {formatShortDate(r.troughDate)} ({formatPrice(r.troughPrice, row.currency)})
                        </TableCell>
                        <TableCell align="center">
                          {rangeToggle(row.symbol, row.range, row.loading)}
                        </TableCell>
                        <TableCell align="center">
                          <Stack direction="row" spacing={0.5}>
                            <IconButton
                              size="small"
                              onClick={() => toggleChart(row.symbol)}
                              color={isExpanded ? 'primary' : 'default'}
                            >
                              <BarChartIcon fontSize="small" />
                            </IconButton>
                            <IconButton size="small" onClick={() => handleRemove(row.symbol)}>
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Stack>
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell colSpan={11} sx={{ py: 0, borderBottom: isExpanded ? undefined : 'none' }}>
                          <Collapse in={isExpanded} unmountOnExit>
                            <MddChart data={row.drawdownSeries} mdd={row.result.mdd} />
                          </Collapse>
                        </TableCell>
                      </TableRow>
                    </Fragment>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>

          {/* 모바일: 카드 */}
          <Box
            sx={{
              display: { xs: 'grid', md: 'none' },
              gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
              gap: 1,
            }}
          >
            {rows.map((row) => {
              const r = row.result;
              const isExpanded = expandedChart === row.symbol;
              return (
                <Paper
                  key={row.symbol}
                  sx={{ p: 1.5, borderRadius: 2, position: 'relative', opacity: row.loading ? 0.5 : 1 }}
                >
                  <Stack direction="row" spacing={0.5} sx={{ position: 'absolute', top: 4, right: 4 }}>
                    <IconButton
                      size="small"
                      onClick={() => toggleChart(row.symbol)}
                      color={isExpanded ? 'primary' : 'default'}
                    >
                      <BarChartIcon fontSize="small" />
                    </IconButton>
                    <IconButton size="small" onClick={() => handleRemove(row.symbol)}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Stack>

                  <Typography variant="body2" fontWeight={700}>
                    {row.name}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {row.symbol}
                  </Typography>

                  <Box sx={{ mt: 1, mb: 1 }}>
                    {rangeToggle(row.symbol, row.range, row.loading)}
                  </Box>

                  <Stack spacing={0.5}>
                    <Stack direction="row" justifyContent="space-between">
                      <Typography variant="caption" color="text.secondary">최고가</Typography>
                      <Typography variant="body2">{formatPrice(row.ath.allTimeHigh, row.currency)}</Typography>
                    </Stack>
                    <Stack direction="row" justifyContent="space-between">
                      <Typography variant="caption" color="text.secondary">현재가</Typography>
                      <Typography variant="body2">{formatPrice(r.latest, row.currency)}</Typography>
                    </Stack>
                    <Stack direction="row" justifyContent="space-between">
                      <Typography variant="caption" color="text.secondary">고점대비</Typography>
                      <Typography variant="body2" sx={{ color: profitColor(row.athDrawdown) }}>
                        {formatRate(row.athDrawdown * 100)}
                      </Typography>
                    </Stack>
                    <Stack direction="row" justifyContent="space-between">
                      <Typography variant="caption" color="text.secondary">연초가</Typography>
                      <Typography variant="body2">{formatPrice(r.ytdStart, row.currency)}</Typography>
                    </Stack>
                    <Stack direction="row" justifyContent="space-between">
                      <Typography variant="caption" color="text.secondary">연초대비</Typography>
                      <Typography variant="body2" sx={{ color: profitColor(r.ytdReturn) }}>
                        {formatRate(r.ytdReturn * 100)}
                      </Typography>
                    </Stack>
                    <Stack direction="row" justifyContent="space-between">
                      <Typography variant="caption" color="text.secondary">MDD ({RANGE_LABEL[row.range]})</Typography>
                      <Typography variant="body2" fontWeight={700} sx={{ color: 'primary.main' }}>
                        {formatRate(r.mdd * 100)}
                      </Typography>
                    </Stack>
                    <Stack direction="row" justifyContent="space-between">
                      <Typography variant="caption" color="text.secondary">고점</Typography>
                      <Typography variant="body2">
                        {formatShortDate(r.peakDate)} ({formatPrice(r.peakPrice, row.currency)})
                      </Typography>
                    </Stack>
                    <Stack direction="row" justifyContent="space-between">
                      <Typography variant="caption" color="text.secondary">저점</Typography>
                      <Typography variant="body2">
                        {formatShortDate(r.troughDate)} ({formatPrice(r.troughPrice, row.currency)})
                      </Typography>
                    </Stack>
                  </Stack>

                  <Collapse in={isExpanded} unmountOnExit>
                    <MddChart data={row.drawdownSeries} mdd={row.result.mdd} />
                  </Collapse>
                </Paper>
              );
            })}
          </Box>
        </>
      )}

      {rows.length === 0 && (
        <Paper sx={{ p: 6, borderRadius: 2, textAlign: 'center' }}>
          <Typography variant="body2" color="text.secondary">
            티커를 입력하여 종목의 MDD를 분석해보세요.
          </Typography>
        </Paper>
      )}
    </Container>
  );
}
