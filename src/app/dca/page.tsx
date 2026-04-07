'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Container, Typography, Box, Paper, Stack, CircularProgress, Button, IconButton, Collapse,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import PageHeader from '@/components/PageHeader';
import { useUser } from '@/hooks/useUser';

interface DcaStock {
  stockName: string;
  ticker: string;
  targetQuantity: number;
  currentQuantity: number;
  entryCount: number;
  scheduleType: 'weekly' | 'monthly' | null;
  scheduleValue: number | null;
  scheduleQuantity: number | null;
  lastEntryDate: string | null;
}

const DAY_LABELS = ['', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일', '일요일'];

function formatSchedule(type: string | null, value: number | null, qty?: number | null): string | null {
  if (!type || value == null) return null;
  let label = '';
  if (type === 'weekly') label = `매주 ${DAY_LABELS[value] || ''}`;
  else if (type === 'monthly') label = `매달 ${value}일`;
  else return null;
  if (qty) label += ` · ${qty}주씩`;
  return label;
}

/** 마지막 매수일 이후 ~ 오늘까지 미입력된 스케줄 날짜 수 */
function getOverdueCount(
  scheduleType: string | null,
  scheduleValue: number | null,
  lastEntryDate: string | null,
): number {
  if (!scheduleType || scheduleValue == null || !lastEntryDate) return 0;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const lastDate = new Date(lastEntryDate + 'T00:00:00');
  const current = new Date(lastDate);
  current.setDate(current.getDate() + 1);

  let count = 0;
  while (current <= today) {
    if (scheduleType === 'weekly' && current.getDay() === Number(scheduleValue) % 7) count++;
    else if (scheduleType === 'monthly' && current.getDate() === Number(scheduleValue)) count++;
    current.setDate(current.getDate() + 1);
  }
  return count;
}

function getProgressPercent(current: number, target: number) {
  if (target <= 0) return 0;
  return Math.min(Math.round((current / target) * 100), 100);
}

export default function DcaPage() {
  const router = useRouter();
  const { user } = useUser();
  const [stocks, setStocks] = useState<DcaStock[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());

  const toggleCard = (ticker: string) => {
    setExpandedCards((prev) => {
      const next = new Set(prev);
      if (next.has(ticker)) next.delete(ticker);
      else next.add(ticker);
      return next;
    });
  };

  const fetchStocks = useCallback(async () => {
    if (!user) return;
    try {
      const res = await fetch(`/api/dca?userId=${user.id}`);
      const data = await res.json();
      setStocks(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to fetch DCA stocks:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchStocks();
  }, [fetchStocks]);

  return (
    <Container maxWidth="md" sx={{ py: 10, position: 'relative' }}>
      <PageHeader />

      <Stack spacing={3} sx={{ alignItems: 'center' }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'stretch', sm: 'center' }} spacing={2} width={1}>
          <Box>
            <Typography variant="h5" fontWeight={700}>적립식 매수 일지</Typography>
            <Typography variant="body2" color="gray5" sx={{ mt: 0.5 }}>
              카드를 클릭하여 매수 일지를 작성하세요
            </Typography>
          </Box>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => router.push('/dca/detail')}
            sx={{ flexShrink: 0 }}
          >
            신규 등록
          </Button>
        </Stack>

        {loading ? (
          <Box sx={{ py: 8 }}>
            <CircularProgress size={32} />
          </Box>
        ) : (
          <Box
            sx={{
              width: '100%',
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: '1fr 1fr 1fr' },
              gap: 1,
            }}
          >
            {stocks.map((stock) => {
              const percent = getProgressPercent(stock.currentQuantity, stock.targetQuantity);
              const overdueCount = getOverdueCount(stock.scheduleType, stock.scheduleValue, stock.lastEntryDate);
              const expanded = expandedCards.has(stock.ticker);
              const schedule = formatSchedule(stock.scheduleType, stock.scheduleValue, stock.scheduleQuantity);
              return (
                <Paper
                  key={stock.ticker}
                  onClick={() => router.push(`/dca/detail?ticker=${stock.ticker}`)}
                  sx={{
                    px: { xs: 1.5, sm: 2 },
                    py: { xs: 1, sm: 1.75 },
                    border: '1px solid',
                    borderColor: 'gray2',
                    boxShadow: 'none',
                    cursor: 'pointer',
                    transition: 'border-color 0.2s, transform 0.2s',
                    '&:hover': {
                      borderColor: 'primary.main',
                      transform: 'translateY(-2px)',
                      boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
                    },
                  }}
                >
                  <Stack spacing={{ xs: 0.5, sm: 1 }}>
                    <Stack direction="row" alignItems="center" justifyContent="space-between">
                      <Stack direction="row" alignItems="center" spacing={0.75} sx={{ minWidth: 0 }}>
                        <Typography sx={{ fontSize: { xs: 14, sm: 18 } }} fontWeight={700}>{stock.stockName}</Typography>
                        {overdueCount > 0 && (
                          <Box
                            sx={{
                              px: 0.75,
                              py: 0.25,
                              bgcolor: 'rgba(255, 152, 0, 0.1)',
                              borderRadius: 1,
                              display: 'flex',
                              alignItems: 'center',
                              gap: 0.25,
                              flexShrink: 0,
                            }}
                          >
                            <WarningAmberIcon sx={{ fontSize: 12, color: 'warning.main' }} />
                            <Typography sx={{ fontSize: '0.65rem' }} color="warning.dark" fontWeight={600} lineHeight={1}>
                              {overdueCount}건 미입력
                            </Typography>
                          </Box>
                        )}
                      </Stack>
                      <IconButton
                        size="small"
                        onClick={(e) => { e.stopPropagation(); toggleCard(stock.ticker); }}
                        sx={{
                          display: { xs: 'inline-flex', sm: 'none' },
                          transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
                          transition: 'transform 0.2s',
                        }}
                      >
                        <ExpandMoreIcon />
                      </IconButton>
                    </Stack>
                    <Stack direction="column" spacing={0.25}>
                      <Stack direction="row" alignItems="center">
                        <Typography flex={1} sx={{ fontSize: '0.75rem', color: 'gray6' }}>달성률</Typography>
                        <Typography flex={1} sx={{ fontSize: '0.75rem' }} fontWeight={700} textAlign="right">{percent}%</Typography>
                      </Stack>
                    </Stack>

                    {/* 달성률 프로그레스 바 */}
                    <Box sx={{ width: '100%', height: 5, bgcolor: 'gray2', borderRadius: 3, overflow: 'hidden' }}>
                      <Box
                        sx={{
                          width: `${percent}%`,
                          height: '100%',
                          bgcolor: 'primary.main',
                          borderRadius: 3,
                          transition: 'width 0.3s ease',
                        }}
                      />
                    </Box>

                    {/* 모바일: 펼침 영역 */}
                    <Collapse in={expanded} sx={{ display: { xs: 'block', sm: 'none' } }}>
                      <Stack spacing={0.25} sx={{ pt: 0.5 }}>
                        {schedule && (
                          <Stack direction="row" alignItems="center" justifyContent="space-between">
                            <Typography flexShrink={0} sx={{ fontSize: '0.75rem', color: 'gray6' }}>투자날짜</Typography>
                            <Typography sx={{ fontSize: '0.75rem' }} textAlign="right" color="primary.main" fontWeight={600} whiteSpace="nowrap">
                              {schedule}
                            </Typography>
                          </Stack>
                        )}
                        <Stack direction="row" alignItems="center">
                          <Typography flex={1} sx={{ fontSize: '0.75rem', color: 'gray6' }}>목표수량</Typography>
                          <Typography flex={1} sx={{ fontSize: '0.75rem' }} textAlign="right">
                            {stock.targetQuantity.toLocaleString()}
                          </Typography>
                        </Stack>
                        <Stack direction="row" alignItems="center">
                          <Typography flex={1} sx={{ fontSize: '0.75rem', color: 'gray6' }}>현재수량</Typography>
                          <Typography flex={1} sx={{ fontSize: '0.75rem' }} fontWeight={700} textAlign="right">
                            {stock.currentQuantity.toLocaleString()}
                          </Typography>
                        </Stack>
                      </Stack>
                    </Collapse>

                    {/* 데스크탑: 항상 표시 */}
                    <Box sx={{ display: { xs: 'none', sm: 'block' } }}>
                      <Stack spacing={0.25}>
                        {schedule && (
                          <Stack direction="row" alignItems="center" justifyContent="space-between">
                            <Typography flexShrink={0} sx={{ fontSize: '0.75rem', color: 'gray6' }}>투자날짜</Typography>
                            <Typography sx={{ fontSize: '0.75rem' }} textAlign="right" color="primary.main" fontWeight={600} whiteSpace="nowrap">
                              {schedule}
                            </Typography>
                          </Stack>
                        )}
                        <Stack direction="row" alignItems="center">
                          <Typography flex={1} sx={{ fontSize: '0.75rem', color: 'gray6' }}>목표수량</Typography>
                          <Typography flex={1} sx={{ fontSize: '0.75rem' }} textAlign="right">
                            {stock.targetQuantity.toLocaleString()}
                          </Typography>
                        </Stack>
                        <Stack direction="row" alignItems="center">
                          <Typography flex={1} sx={{ fontSize: '0.75rem', color: 'gray6' }}>현재수량</Typography>
                          <Typography flex={1} sx={{ fontSize: '0.75rem' }} fontWeight={700} textAlign="right">
                            {stock.currentQuantity.toLocaleString()}
                          </Typography>
                        </Stack>
                      </Stack>
                    </Box>

                  </Stack>
                </Paper>
              );
            })}

          </Box>
        )}
      </Stack>
    </Container>
  );
}
