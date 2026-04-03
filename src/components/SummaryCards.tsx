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

const cardSx = { p: { xs: 1.5, sm: 2 }, flex: 1, display: 'flex', justifyContent: 'center', flexDirection: 'column', borderRadius: 2 } as const;
const valueSx = { letterSpacing: '-1.5px', fontWeight: 700 } as const;

export default function SummaryCards({ totalCurrentValue, totalInvested, totalProfit, totalRate, loading }: SummaryCardsProps) {
  return (
    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={{ xs: 1, sm: 2 }} width={1}>
      <Paper sx={cardSx}>
        <Typography variant="body2" gutterBottom color="gray5">
          총 자산
        </Typography>
        <Typography sx={{ ...valueSx, fontSize: { xs: '1rem', sm: '1.5rem' } }}>
          {loading ? <CircularProgress size={20} /> : formatKRW(totalCurrentValue)}
        </Typography>
      </Paper>

      <Paper sx={cardSx}>
        <Typography variant="body2" gutterBottom color="gray5">
          수익률
        </Typography>
        <Stack direction="row" spacing={1} alignItems="baseline">
          <Typography sx={{ ...valueSx, fontSize: { xs: '1rem', sm: '1.5rem' } }} color={profitColor(totalRate)}>
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
        <Typography sx={{ ...valueSx, fontSize: { xs: '1rem', sm: '1.5rem' } }}>
          {loading ? <CircularProgress size={20} /> : formatKRW(totalInvested)}
        </Typography>
      </Paper>
    </Stack>
  );
}
