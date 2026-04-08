'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Box, Paper, Stack, Typography, CircularProgress,
  Dialog, DialogTitle, DialogContent, DialogActions, Button,
  Select, MenuItem, Divider, Chip,
} from '@mui/material';
import type { SxProps, Theme } from '@mui/material/styles';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import { formatProfit, profitColor } from '@/utils/format';
import type { RealizedPlSummaryResponse } from '@/app/api/realized-pl/summary/route';

interface RealizedPlWidgetProps {
  userId: string;
  sx?: SxProps<Theme>;
}

export default function RealizedPlWidget({ userId, sx }: RealizedPlWidgetProps) {
  const currentYear = new Date().getFullYear();
  const [summary, setSummary] = useState<RealizedPlSummaryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const [modalData, setModalData] = useState<RealizedPlSummaryResponse | null>(null);
  const [modalLoading, setModalLoading] = useState(false);

  // 카드용 (올해)
  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    fetch(`/api/realized-pl/summary?userId=${userId}&year=${currentYear}`)
      .then((res) => res.ok ? res.json() : null)
      .then((data: RealizedPlSummaryResponse | null) => {
        if (!cancelled) {
          setSummary(data);
          setLoading(false);
        }
      })
      .catch(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [userId, currentYear]);

  // 모달에서 연도 선택 시 fetch (이벤트 핸들러에서 직접 호출)
  const fetchYear = useCallback((year: number) => {
    if (!userId) return;
    setModalLoading(true);
    fetch(`/api/realized-pl/summary?userId=${userId}&year=${year}`)
      .then((res) => res.ok ? res.json() : null)
      .then((data: RealizedPlSummaryResponse | null) => {
        setModalData(data);
        setModalLoading(false);
      })
      .catch(() => setModalLoading(false));
  }, [userId]);

  const handleOpen = () => {
    setSelectedYear(currentYear);
    setModalData(summary);
    setModalOpen(true);
  };

  const handleYearChange = (year: number) => {
    setSelectedYear(year);
    fetchYear(year);
  };

  if (loading) {
    return (
      <Paper sx={[{ width: 1, p: { xs: 1.5, sm: 2 }, borderRadius: 2, display: 'flex', justifyContent: 'center', alignItems: 'center' }, ...(Array.isArray(sx) ? sx : [sx])]}>
        <CircularProgress size={20} />
      </Paper>
    );
  }

  // 매도 거래가 한 번도 없으면 위젯 자체를 숨김
  if (!summary || summary.availableYears.length === 0) {
    return null;
  }

  const total = summary.totalRealizedPlKrw;

  return (
    <>
      <Paper
        onClick={handleOpen}
        sx={[
          {
            width: 1,
            borderRadius: 2,
            cursor: 'pointer',
            display: 'flex',
            flexDirection: 'column',
            '&:hover': { bgcolor: 'gray1' },
          },
          ...(Array.isArray(sx) ? sx : [sx]),
        ]}
      >
        <Stack direction="column" sx={{
            width: 1, height: 1,
            p: { xs: 1.5, sm: 2 },
        }}>
          <Typography variant="body2" color="gray5" gutterBottom>
            {currentYear}년 실현손익
          </Typography>
          <Stack
            direction="row"
            alignItems="center"
            spacing={1}
            sx={{ flex: 1, minHeight: 0 }}
          >
            <TrendingUpIcon sx={{ color: 'gray6', fontSize: 22 }} />
            <Typography variant="h5" fontWeight={700} color={profitColor(total)} sx={{ fontSize: { xs: '1rem', sm: '1.5rem' } }}>
              {formatProfit(total)}
            </Typography>
          </Stack>
          <Stack direction="row" spacing={2}>
            <Stack direction="row" spacing={0.75} alignItems="baseline">
              <Typography variant="caption" color="gray6">거래</Typography>
              <Typography variant="body2" fontWeight={600}>{summary.tradeCount}건</Typography>
            </Stack>
            <Stack direction="row" spacing={0.75} alignItems="baseline">
              <Typography variant="caption" color="gray6">종목</Typography>
              <Typography variant="body2" fontWeight={600}>{summary.tickerCount}개</Typography>
            </Stack>
          </Stack>
        </Stack>
      </Paper>

      <Dialog open={modalOpen} onClose={() => setModalOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700, pb: 1 }}>
          연도별 실현손익
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Select
              size="small"
              value={selectedYear}
              onChange={(e) => handleYearChange(Number(e.target.value))}
              fullWidth
            >
              {summary.availableYears.map((y) => (
                <MenuItem key={y} value={y}>{y}년</MenuItem>
              ))}
            </Select>

            {modalLoading || !modalData ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                <CircularProgress size={24} />
              </Box>
            ) : (
              <>
                <Box sx={{ p: 2, bgcolor: 'gray1', borderRadius: 1 }}>
                  <Typography variant="body2" color="gray6" sx={{ mb: 0.5 }}>
                    {modalData.year}년 누적 실현손익
                  </Typography>
                  <Typography variant="h5" fontWeight={700} color={profitColor(modalData.totalRealizedPlKrw)}>
                    {formatProfit(modalData.totalRealizedPlKrw)}
                  </Typography>
                  <Stack direction="row" spacing={2} sx={{ mt: 1 }}>
                    <Typography variant="body2" color="gray6">
                      거래 <strong>{modalData.tradeCount}</strong>건
                    </Typography>
                    <Typography variant="body2" color="gray6">
                      종목 <strong>{modalData.tickerCount}</strong>개
                    </Typography>
                  </Stack>
                </Box>

                <Divider />

                <Typography variant="subtitle2" fontWeight={700}>
                  종목별 실현손익
                </Typography>

                {modalData.breakdown.length === 0 ? (
                  <Typography variant="body2" color="gray5" textAlign="center" sx={{ py: 2 }}>
                    해당 연도에 매도 거래가 없습니다.
                  </Typography>
                ) : (
                  <Stack spacing={0.75}>
                    {modalData.breakdown.map((item) => (
                      <Stack
                        key={item.ticker}
                        direction="row"
                        alignItems="center"
                        justifyContent="space-between"
                        sx={{
                          px: 1.5, py: 1,
                          border: '1px solid', borderColor: 'gray2', borderRadius: 1,
                        }}
                      >
                        <Stack>
                          <Typography variant="body2" fontWeight={600}>
                            {item.stockName}
                          </Typography>
                          <Stack direction="row" spacing={1} alignItems="center">
                            <Typography variant="caption" color="gray6">{item.ticker}</Typography>
                            <Chip
                              label={`${item.tradeCount}건`}
                              size="small"
                              sx={{ height: 16, fontSize: '0.65rem' }}
                            />
                          </Stack>
                        </Stack>
                        <Typography variant="body2" fontWeight={700} color={profitColor(item.realizedPlKrw)}>
                          {formatProfit(item.realizedPlKrw)}
                        </Typography>
                      </Stack>
                    ))}
                  </Stack>
                )}
              </>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setModalOpen(false)}>닫기</Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
