'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Container, Typography, Box, Paper, Stack, CircularProgress,
} from '@mui/material';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import PageHeader from '@/components/PageHeader';

interface MarketIndex {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  currency: string;
  error?: string;
}

const FLAG: Record<string, string> = {
  '^KS11': '🇰🇷',
  '^KQ11': '🇰🇷',
  '^DJI': '🇺🇸',
  '^IXIC': '🇺🇸',
  '^GSPC': '🇺🇸',
  'USDKRW=X': '💱',
};

function formatPrice(price: number, symbol: string): string {
  if (symbol === 'USDKRW=X') {
    return `${price.toFixed(2)}원`;
  }
  if (symbol.startsWith('^KS') || symbol.startsWith('^KQ')) {
    return price.toFixed(2);
  }
  return price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatChange(change: number): string {
  const sign = change > 0 ? '+' : '';
  return `${sign}${change.toFixed(2)}`;
}

function formatPercent(pct: number): string {
  const sign = pct > 0 ? '+' : '';
  return `${sign}${pct.toFixed(2)}%`;
}

const POLL_INTERVAL = 30_000;

export default function MarketPage() {
  const [indices, setIndices] = useState<MarketIndex[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMarket = useCallback(async () => {
    try {
      const res = await fetch('/api/market');
      if (!res.ok) throw new Error('Failed');
      const data = await res.json();
      setIndices(data);
    } catch {
      console.error('Failed to fetch market data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMarket();
    const interval = setInterval(fetchMarket, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchMarket]);

  return (
    <Container maxWidth="md" sx={{ py: 10, position: 'relative' }}>
      <PageHeader />

      <Stack spacing={3} sx={{ alignItems: 'center' }}>
        <Box sx={{ width: '100%' }}>
          <Typography variant="h5" fontWeight={700}>주식정보</Typography>
          {/* <Typography variant="body2" color="gray5" sx={{ mt: 0.5 }}>
            주요 지수 및 환율 · 30초마다 자동 갱신
          </Typography> */}
        </Box>

        {loading ? (
          <Box sx={{ py: 10, display: 'flex', justifyContent: 'center' }}>
            <CircularProgress />
          </Box>
        ) : (
          <Box
            sx={{
              width: '100%',
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: '1fr 1fr 1fr' },
              gap: 2,
            }}
          >
            {indices.map((idx) => {
              const isUp = idx.change >= 0;
              const color = idx.change === 0 ? 'text.primary' : isUp ? 'error.main' : 'primary.main';

              return (
                <Paper
                  key={idx.symbol}
                  sx={{
                    p: 3,
                    border: '1px solid',
                    borderColor: 'gray2',
                    boxShadow: 'none',
                    transition: 'border-color 0.2s',
                    '&:hover': { borderColor: 'gray4' },
                  }}
                >
                  <Stack spacing={1.5}>
                    {/* 상단: 국기 + 이름 */}
                    <Stack direction="row" alignItems="center" spacing={1}>
                      <Typography fontSize={20}>{FLAG[idx.symbol] || ''}</Typography>
                      <Typography variant="body2" fontWeight={600} color="gray8">
                        {idx.name}
                      </Typography>
                    </Stack>

                    {/* 현재가 */}
                    <Typography variant="h5" fontWeight={700} letterSpacing="-1px">
                      {idx.error ? '-' : formatPrice(idx.price, idx.symbol)}
                    </Typography>

                    {/* 변동 */}
                    {!idx.error && (
                      <Stack direction="row" alignItems="center" spacing={0.5}>
                        {isUp ? (
                          <TrendingUpIcon sx={{ fontSize: 18, color }} />
                        ) : (
                          <TrendingDownIcon sx={{ fontSize: 18, color }} />
                        )}
                        <Typography variant="body2" fontWeight={600} sx={{ color }}>
                          {formatChange(idx.change)}
                        </Typography>
                        <Typography variant="body2" fontWeight={600} sx={{ color }}>
                          ({formatPercent(idx.changePercent)})
                        </Typography>
                      </Stack>
                    )}

                    {idx.error && (
                      <Typography variant="caption" color="gray5">
                        데이터를 불러올 수 없습니다
                      </Typography>
                    )}
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
