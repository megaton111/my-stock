'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box, Paper, Stack, Typography, LinearProgress, CircularProgress, Button,
} from '@mui/material';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { useUser } from '@/hooks/useUser';

interface DcaStock {
  stockName: string;
  ticker: string;
  targetQuantity: number;
  currentQuantity: number;
  scheduleType: 'weekly' | 'monthly' | null;
  scheduleValue: number | null;
  lastEntryDate: string | null;
}

interface CollectStock {
  stockName: string;
  ticker: string;
  targetQuantity: number;
  currentQuantity: number;
}

function getPercent(current: number, target: number) {
  if (target <= 0) return 0;
  return Math.min(Math.round((current / target) * 100), 100);
}

function getOverdueCount(
  scheduleType: string | null,
  scheduleValue: number | null,
  lastEntryDate: string | null,
): number {
  if (!scheduleType || scheduleValue == null || !lastEntryDate) return 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const current = new Date(lastEntryDate + 'T00:00:00');
  current.setDate(current.getDate() + 1);
  let count = 0;
  while (current <= today) {
    if (scheduleType === 'weekly' && current.getDay() === Number(scheduleValue) % 7) count++;
    else if (scheduleType === 'monthly' && current.getDate() === Number(scheduleValue)) count++;
    current.setDate(current.getDate() + 1);
  }
  return count;
}

export default function ProgressWidget() {
  const router = useRouter();
  const { user } = useUser();
  const [dcaStocks, setDcaStocks] = useState<DcaStock[]>([]);
  const [collectStocks, setCollectStocks] = useState<CollectStock[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    if (!user) return;
    try {
      const [dcaRes, collectRes] = await Promise.all([
        fetch(`/api/dca?userId=${user.id}`),
        fetch(`/api/collect?userId=${user.id}`),
      ]);
      const [dcaData, collectData] = await Promise.all([dcaRes.json(), collectRes.json()]);
      setDcaStocks(Array.isArray(dcaData) ? dcaData : []);
      setCollectStocks(Array.isArray(collectData) ? collectData : []);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 4, width: 1 }}>
        <CircularProgress size={24} />
      </Box>
    );
  }

  if (dcaStocks.length === 0 && collectStocks.length === 0) return null;

  return (
    <Stack spacing={1} width={1}>
      {dcaStocks.length > 0 && (
        <Section title="적립식 매수" onMore={() => router.push('/dca')}>
          <Box sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr 1fr', sm: 'repeat(3, 1fr)', md: 'repeat(4, 1fr)' },
            gap: 1,
          }}>
            {dcaStocks.map((s) => {
              const percent = getPercent(s.currentQuantity, s.targetQuantity);
              const overdue = getOverdueCount(s.scheduleType, s.scheduleValue, s.lastEntryDate);
              return (
                <MiniCard
                  key={s.ticker}
                  name={s.stockName}
                  ticker={s.ticker}
                  percent={percent}
                  current={s.currentQuantity}
                  target={s.targetQuantity}
                  overdue={overdue}
                  onClick={() => router.push(`/dca/detail?ticker=${s.ticker}`)}
                />
              );
            })}
          </Box>
        </Section>
      )}
      {collectStocks.length > 0 && (
        <Section title="주식 모으기" onMore={() => router.push('/collect')}>
          <Box sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr 1fr', sm: 'repeat(3, 1fr)', md: 'repeat(4, 1fr)' },
            gap: 1,
          }}>
            {collectStocks.map((s) => {
              const percent = getPercent(s.currentQuantity, s.targetQuantity);
              return (
                <MiniCard
                  key={s.ticker}
                  name={s.stockName}
                  ticker={s.ticker}
                  percent={percent}
                  current={s.currentQuantity}
                  target={s.targetQuantity}
                  onClick={() => router.push(`/collect/detail?ticker=${s.ticker}`)}
                />
              );
            })}
          </Box>
        </Section>
      )}
    </Stack>
  );
}

function Section({ title, onMore, children }: { title: string; onMore: () => void; children: React.ReactNode }) {
  return (
    <Paper sx={{ p: { xs: 1.5, sm: 3 }, borderRadius: 2 }}>
      <Stack spacing={1.5}>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Typography variant="body2" color="gray6" fontWeight={600}>{title}</Typography>
          <Button
            size="small"
            endIcon={<ArrowForwardIcon sx={{ fontSize: 14 }} />}
            onClick={onMore}
            sx={{ fontSize: '0.75rem', color: 'gray6' }}
          >
            전체보기
          </Button>
        </Stack>
        {children}
      </Stack>
    </Paper>
  );
}

function MiniCard({ name, ticker, percent, current, target, overdue, onClick }: {
  name: string;
  ticker: string;
  percent: number;
  current: number;
  target: number;
  overdue?: number;
  onClick: () => void;
}) {
  const isComplete = percent === 100;

  return (
    <Paper
      onClick={onClick}
      sx={{
        p: { xs: 1.5, sm: 2 },
        boxShadow: 'none',
        border: '1px solid',
        borderColor: isComplete ? 'success.light' : 'gray2',
        bgcolor: isComplete ? 'rgba(46, 125, 50, 0.04)' : 'background.paper',
        cursor: 'pointer',
        transition: 'border-color 0.2s, transform 0.15s',
        '&:hover': {
          borderColor: isComplete ? 'success.main' : 'primary.main',
          transform: 'translateY(-1px)',
        },
      }}
    >
      <Stack spacing={1}>
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
          <Box sx={{ minWidth: 0 }}>
            <Typography fontWeight={700} fontSize={{ xs: '0.85rem', sm: '0.95rem' }} noWrap>
              {name}
            </Typography>
            {/* <Typography variant="caption" color="gray5" fontSize="0.7rem">
              {ticker}
            </Typography> */}
          </Box>
          <Typography
            fontWeight={700}
            fontSize={{ xs: '0.85rem', sm: '1rem' }}
            sx={{ color: isComplete ? 'success.main' : 'primary.main', flexShrink: 0, ml: 0.5 }}
          >
            {percent}%
          </Typography>
        </Stack>

        <LinearProgress
          variant="determinate"
          value={percent}
          sx={{
            height: 5,
            borderRadius: 3,
            bgcolor: 'gray2',
            '& .MuiLinearProgress-bar': {
              borderRadius: 3,
              bgcolor: isComplete ? 'success.main' : 'primary.main',
            },
          }}
        />

        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Typography variant="caption" color="gray6" fontSize="0.7rem">
            {current.toLocaleString()} / {target.toLocaleString()}
          </Typography>
          {isComplete ? (
            <CheckCircleIcon sx={{ fontSize: 14, color: 'success.main' }} />
          ) : overdue && overdue > 0 ? (
            <Stack direction="row" alignItems="center" spacing={0.25}>
              <WarningAmberIcon sx={{ fontSize: 12, color: 'warning.main' }} />
              <Typography variant="caption" color="warning.dark" fontWeight={600} fontSize="0.6rem">
                {overdue}건 미입력
              </Typography>
            </Stack>
          ) : null}
        </Stack>
      </Stack>
    </Paper>
  );
}
