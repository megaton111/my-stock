'use client';

import { useState, useEffect } from 'react';
import { Paper, Box, Typography, Stack, Skeleton } from '@mui/material';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';

interface MarketIndex {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  error?: string;
}

function getVixLevel(price: number): { label: string; color: string } {
  if (price < 15) return { label: '시장 안정', color: '#4CAF50' };
  if (price < 20) return { label: '보통', color: '#9E9E9E' };
  if (price < 30) return { label: '불안', color: '#FF9800' };
  return { label: '극도 공포', color: '#F44336' };
}

export default function VixWidget() {
  const [vix, setVix] = useState<MarketIndex | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/market')
      .then((r) => r.json())
      .then((data: MarketIndex[]) => {
        const found = data.find((d) => d.symbol === '^VIX');
        if (found) setVix(found);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <Skeleton variant="rectangular" animation="wave" width="100%" height={176} sx={{ borderRadius: 1 }} />;
  }

  if (!vix || vix.error) return null;

  const isUp = vix.change >= 0;
  const changeColor = isUp ? '#F44336' : '#2196F3';
  const { label: levelLabel, color: levelColor } = getVixLevel(vix.price);

  return (
    <Paper sx={{ p: { xs: 2, sm: 2.5 }, borderRadius: 1, height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
      <Stack spacing={2} height="100%">
        <Typography variant="body2" color="gray5" fontWeight={600}>
          VIX 변동성 지수
        </Typography>

        <Stack spacing={0.5} sx={{ flex: 1 }}>
          <Typography
            variant="h3"
            fontWeight={700}
            sx={{ lineHeight: 1, letterSpacing: '-2px', color: levelColor }}
          >
            {vix.price.toFixed(2)}
          </Typography>

          <Stack direction="row" alignItems="center" spacing={0.5}>
            {isUp
              ? <TrendingUpIcon sx={{ fontSize: 16, color: changeColor }} />
              : <TrendingDownIcon sx={{ fontSize: 16, color: changeColor }} />
            }
            <Typography variant="body2" fontWeight={600} sx={{ color: changeColor }}>
              {isUp ? '+' : ''}{vix.change.toFixed(2)}
            </Typography>
            <Typography variant="body2" sx={{ color: changeColor }}>
              ({isUp ? '+' : ''}{vix.changePercent.toFixed(2)}%)
            </Typography>
          </Stack>
        </Stack>

        <Box sx={{
          px: 1.5,
          py: 0.75,
          borderRadius: 1,
          bgcolor: `${levelColor}18`,
          border: '1px solid',
          borderColor: `${levelColor}40`,
          alignSelf: 'flex-start',
        }}>
          <Typography variant="caption" fontWeight={700} sx={{ color: levelColor }}>
            {levelLabel}
          </Typography>
        </Box>
      </Stack>
    </Paper>
  );
}
