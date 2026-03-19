'use client';

import { Paper, Stack, Typography, CircularProgress } from '@mui/material';
import { formatKRW, formatRate, formatProfit, profitColor } from '@/utils/format';

interface SummaryCardsProps {
  totalCurrentValue: number;
  totalInvested: number;
  totalProfit: number;
  totalRate: number;
  loading: boolean;
}

const cardSx = { p: 3, flex: 1, display: 'flex', justifyContent: 'center', flexDirection: 'column' } as const;
const valueSx = { letterSpacing: '-1.5px', fontWeight: 700 } as const;

export default function SummaryCards({ totalCurrentValue, totalInvested, totalProfit, totalRate, loading }: SummaryCardsProps) {
  return (
    <Stack direction="row" spacing={2} width={1}>
      <Paper sx={cardSx}>
        <Typography variant="body2" gutterBottom color="gray5">
          총 자산
        </Typography>
        <Typography variant="h5" sx={valueSx}>
          {loading ? <CircularProgress size={20} /> : formatKRW(totalCurrentValue)}
        </Typography>
      </Paper>

      <Paper sx={cardSx}>
        <Typography variant="body2" gutterBottom color="gray5">
          수익률
        </Typography>
        <Stack direction="row" spacing={1} alignItems="baseline">
          <Typography variant="h5" sx={valueSx} color={profitColor(totalRate)}>
            {loading ? <CircularProgress size={20} /> : formatRate(totalRate)}
          </Typography>
          <Typography variant="body2" color="gray6">
            ({formatProfit(totalProfit)})
          </Typography>
        </Stack>
      </Paper>

      <Paper sx={cardSx}>
        <Typography variant="body2" gutterBottom color="gray5">
          총 투자금액
        </Typography>
        <Typography variant="h5" sx={valueSx}>
          {loading ? <CircularProgress size={20} /> : formatKRW(totalInvested)}
        </Typography>
      </Paper>
    </Stack>
  );
}
