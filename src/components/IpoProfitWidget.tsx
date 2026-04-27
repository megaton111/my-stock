'use client';

import { useState, useEffect } from 'react';
import { Paper, Stack, Typography, Box } from '@mui/material';
import { useUser } from '@/hooks/useUser';
import { MyIpoEntry } from '@/types/ipo';
import { formatProfit, profitColor } from '@/utils/format';

export default function IpoProfitWidget() {
  const { user } = useUser();
  const [entries, setEntries] = useState<MyIpoEntry[]>([]);
  const [loaded, setLoaded] = useState(false);

  const currentYear = new Date().getFullYear();

  useEffect(() => {
    if (!user) return;
    fetch(`/api/ipo/my?userId=${user.id}`)
      .then((res) => res.json())
      .then((data) => { setEntries(data); setLoaded(true); })
      .catch(() => setLoaded(true));
  }, [user]);

  if (!loaded) return null;

  const yearEntries = entries.filter((e) =>
    e.sellDate && e.sellDate.startsWith(String(currentYear)),
  );
  const yearProfit = yearEntries.reduce((sum, e) => sum + e.profit, 0);

  if (yearEntries.length === 0) return null;

  return (
    <Paper sx={{ p: { xs: 2, sm: 3 }, width: 1, borderRadius: 2 }}>
      <Stack spacing={1.5}>
        <Typography variant="body2" color="gray6">
          {currentYear}년 공모주 수익
        </Typography>

        <Box>
          {/* <Typography variant="caption" color="gray6">
            수익금
          </Typography> */}
          <Typography variant="h5" fontWeight={700} color={profitColor(yearProfit)} sx={{ letterSpacing: '-1px' }}>
            {formatProfit(yearProfit)}
          </Typography>
        </Box>

        <Typography variant="caption" color="text.secondary">
          매도 {yearEntries.length}건
        </Typography>
      </Stack>
    </Paper>
  );
}
