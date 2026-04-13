'use client';

import { useState, useCallback } from 'react';
import {
  Container, Box, Paper, Stack, Typography, Button,
  ToggleButton, ToggleButtonGroup, Collapse, IconButton,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ReferenceLine,
} from 'recharts';
import PageHeader from '@/components/PageHeader';
import WatchlistAddDialog from '@/components/WatchlistAddDialog';
import { calculateMdd, calculateAth, calculateAvgAnnualMdd, calculateDrawdownSeries, MddResult, AthResult, Point, DrawdownPoint } from '@/utils/mdd';
import { formatRate, profitColor } from '@/utils/format';

type Range = '1y' | '2y' | '3y' | '5y' | '10y';

const RANGE_LABEL: Record<Range, string> = {
  '1y': '1Y',
  '2y': '2Y',
  '3y': '3Y',
  '5y': '5Y',
  '10y': '10Y',
};

interface MddRow {
  symbol: string;
  name: string;
  currency: string;
  range: Range;
  result: MddResult;
  drawdownSeries: DrawdownPoint[];
  ath: AthResult;
  athDrawdown: number;
  avgMdd: number | null;
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
    <Box sx={{ width: '100%', height: 200, mt: 2 }}>
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
            labelFormatter={(_, payload) => {
              if (payload?.[0]?.payload?.date) {
                const [y, m, d] = payload[0].payload.date.split('-');
                return `${y.slice(2)}.${m}.${d}`;
              }
              return '';
            }}
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

function DataCell({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <Box>
      <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.2 }}>
        {label}
      </Typography>
      <Typography variant="body2" fontWeight={600} sx={{ color, lineHeight: 1.4 }}>
        {value}
      </Typography>
    </Box>
  );
}

export default function MddPage() {
  const [rows, setRows] = useState<MddRow[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [expandedSet, setExpandedSet] = useState<Set<string>>(new Set());

  const toggleExpand = (symbol: string) => {
    setExpandedSet((prev) => {
      const next = new Set(prev);
      if (next.has(symbol)) next.delete(symbol);
      else next.add(symbol);
      return next;
    });
  };

  const handleAdd = useCallback(async (ticker: string) => {
    const symbol = ticker.trim().toUpperCase();
    if (!symbol) return;

    if (rows.some((r) => r.symbol === symbol)) {
      throw new Error('이미 추가된 종목입니다.');
    }

    const [maxData, rangeData] = await Promise.all([
      fetchHistory(symbol, 'max'),
      fetchHistory(symbol, '1y'),
    ]);

    const rangeHistory = rangeData.history as Point[];
    const ath = calculateAth(maxData.history as Point[]);
    const result = calculateMdd(rangeHistory);
    const drawdownSeries = calculateDrawdownSeries(rangeHistory);
    const avgMdd = calculateAvgAnnualMdd(rangeHistory);

    if (!ath || !result) throw new Error('데이터가 부족합니다.');

    const athDrawdown = (result.latest - ath.allTimeHigh) / ath.allTimeHigh;
    const resolvedSymbol = maxData.symbol as string;

    setRows((prev) => [
      ...prev,
      {
        symbol: resolvedSymbol,
        name: maxData.name,
        currency: maxData.currency,
        range: '1y',
        result,
        drawdownSeries,
        ath,
        athDrawdown,
        avgMdd,
      },
    ]);
    setExpandedSet((prev) => new Set(prev).add(resolvedSymbol));
  }, [rows]);

  const handleRangeChange = useCallback(async (symbol: string, newRange: Range) => {
    setRows((prev) => prev.map((r) => r.symbol === symbol ? { ...r, loading: true } : r));

    try {
      const data = await fetchHistory(symbol, newRange);
      const history = data.history as Point[];
      const result = calculateMdd(history);
      const drawdownSeries = calculateDrawdownSeries(history);
      const avgMdd = calculateAvgAnnualMdd(history);

      if (!result) throw new Error('데이터 부족');

      setRows((prev) =>
        prev.map((r) => {
          if (r.symbol !== symbol) return r;
          const athDrawdown = (result.latest - r.ath.allTimeHigh) / r.ath.allTimeHigh;
          return { ...r, range: newRange, result, drawdownSeries, athDrawdown, avgMdd, loading: false };
        }),
      );
    } catch {
      setRows((prev) => prev.map((r) => r.symbol === symbol ? { ...r, loading: false } : r));
    }
  }, []);

  const handleRemove = (symbol: string) => {
    setRows((prev) => prev.filter((r) => r.symbol !== symbol));
    setExpandedSet((prev) => {
      const next = new Set(prev);
      next.delete(symbol);
      return next;
    });
  };

  return (
    <Container maxWidth="md" sx={{ py: { xs: 2, sm: 4 } }}>
      <PageHeader />
      <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>
        MDD 분석
      </Typography>

      <Box sx={{ mb: 2 }}>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setDialogOpen(true)}
        >
          종목 추가
        </Button>
      </Box>

      <WatchlistAddDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onAdd={handleAdd}
        title="종목 추가"
      />

      <Stack spacing={1.5}>
        {rows.map((row) => {
          const r = row.result;
          const isExpanded = expandedSet.has(row.symbol);

          return (
            <Paper
              key={row.symbol}
              sx={{ borderRadius: 2, overflow: 'hidden', opacity: row.loading ? 0.5 : 1 }}
            >
              {/* 헤더 */}
              <Stack
                direction="row"
                alignItems="center"
                sx={{ px: 2, py: 1.2, cursor: 'pointer' }}
                onClick={() => toggleExpand(row.symbol)}
              >
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography variant="body1" fontWeight={700} noWrap>
                    {row.name}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {row.symbol}
                  </Typography>
                </Box>

                <Stack direction="row" alignItems="center" spacing={0.5}>
                  <Box onClick={(e) => e.stopPropagation()}>
                    <ToggleButtonGroup
                      value={row.range}
                      exclusive
                      size="small"
                      disabled={row.loading}
                      onChange={(_, v) => v && handleRangeChange(row.symbol, v)}
                      sx={{ '& .MuiToggleButton-root': { px: 0.8, py: 0.2, fontSize: '0.7rem' } }}
                    >
                      <ToggleButton value="1y">1Y</ToggleButton>
                      <ToggleButton value="2y">2Y</ToggleButton>
                      <ToggleButton value="3y">3Y</ToggleButton>
                      <ToggleButton value="5y">5Y</ToggleButton>
                      <ToggleButton value="10y">10Y</ToggleButton>
                    </ToggleButtonGroup>
                  </Box>
                  <IconButton
                    size="small"
                    onClick={(e) => { e.stopPropagation(); handleRemove(row.symbol); }}
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                  <IconButton size="small">
                    <ExpandMoreIcon
                      fontSize="small"
                      sx={{
                        transition: 'transform 0.2s',
                        transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                      }}
                    />
                  </IconButton>
                </Stack>
              </Stack>

              {/* 본문 */}
              <Collapse in={isExpanded} unmountOnExit>
                <Box sx={{ px: 2, pb: 2 }}>
                  <Box
                    sx={{
                      display: 'grid',
                      gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(4, 1fr)' },
                      gap: 1.5,
                    }}
                  >
                    <DataCell label="최고가" value={formatPrice(row.ath.allTimeHigh, row.currency)} />
                    <DataCell label="현재가" value={formatPrice(r.latest, row.currency)} />
                    <DataCell
                      label="고점대비"
                      value={formatRate(row.athDrawdown * 100)}
                      color={profitColor(row.athDrawdown)}
                    />
                    <DataCell
                      label={`MDD (${RANGE_LABEL[row.range]})`}
                      value={formatRate(r.mdd * 100)}
                      color="var(--mui-palette-primary-main)"
                    />
                    <DataCell label="연초가" value={formatPrice(r.ytdStart, row.currency)} />
                    <DataCell
                      label="연초대비"
                      value={formatRate(r.ytdReturn * 100)}
                      color={profitColor(r.ytdReturn)}
                    />
                    <DataCell
                      label="고점일"
                      value={`${formatShortDate(r.peakDate)} (${formatPrice(r.peakPrice, row.currency)})`}
                    />
                    <DataCell
                      label="저점일"
                      value={`${formatShortDate(r.troughDate)} (${formatPrice(r.troughPrice, row.currency)})`}
                    />
                    {row.avgMdd !== null && (
                      <DataCell
                        label={`평균 MDD (${RANGE_LABEL[row.range]})`}
                        value={formatRate(row.avgMdd * 100)}
                        color="var(--mui-palette-primary-main)"
                      />
                    )}
                  </Box>

                  <MddChart data={row.drawdownSeries} mdd={r.mdd} />
                </Box>
              </Collapse>
            </Paper>
          );
        })}
      </Stack>

      {rows.length === 0 && (
        <Paper sx={{ p: 6, borderRadius: 2, textAlign: 'center' }}>
          <Typography variant="body2" color="text.secondary">
            종목을 추가하여 MDD를 분석해보세요.
          </Typography>
        </Paper>
      )}
    </Container>
  );
}
