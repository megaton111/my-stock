'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Container, Typography, Box, Paper, Stack, CircularProgress, Button,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import PageHeader from '@/components/PageHeader';
import { useUser } from '@/hooks/useUser';

interface CollectStock {
  stockName: string;
  ticker: string;
  targetQuantity: number;
  currentQuantity: number;
  entryCount: number;
}

function getProgressPercent(current: number, target: number) {
  if (target <= 0) return 0;
  return Math.min(Math.round((current / target) * 100), 100);
}

export default function CollectPage() {
  const router = useRouter();
  const { user } = useUser();
  const [stocks, setStocks] = useState<CollectStock[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchStocks = useCallback(async () => {
    if (!user) return;
    try {
      const res = await fetch(`/api/collect?userId=${user.id}`);
      const data = await res.json();
      console.log({ data })
      setStocks(data);
    } catch (err) {
      console.error('Failed to fetch collect stocks:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchStocks();
  }, [fetchStocks]);

  return (
    <Container maxWidth="xl" sx={{ py: 10, position: 'relative' }}>
      <PageHeader />

      <Stack spacing={3} sx={{ alignItems: 'center' }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'stretch', sm: 'center' }} spacing={2} width={1}>
          <Box>
            <Typography variant="h5" fontWeight={700}>주식 모으기</Typography>
            <Typography variant="body2" color="gray5" sx={{ mt: 0.5 }}>
              카드를 클릭하여 매수 일지를 작성하세요
            </Typography>
          </Box>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => router.push('/collect/detail')}
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
              gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: '1fr 1fr 1fr 1fr' },
              gap: 1,
            }}
          >
            {stocks.map((stock) => {
              const percent = getProgressPercent(stock.currentQuantity, stock.targetQuantity);
              return (
                <Paper
                  key={stock.ticker}
                  onClick={() => router.push(`/collect/detail?ticker=${stock.ticker}`)}
                  sx={{
                    p: { xs: 2, sm: 3 },
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
                  <Stack spacing={{ xs: 1, sm: 1.5 }}>
                    <Typography sx={{ fontSize: { xs: 20, sm: 28 } }} fontWeight={600}>{stock.stockName}</Typography>
                    <Stack direction="column" spacing={0.25}>
                      <Stack direction="row" alignItems="center">
                        <Typography variant="body1" flex={1} sx={{ fontSize: { xs: '0.85rem', sm: '18px' } }}>목표수량</Typography>
                        <Typography variant="body1" flex={1} sx={{ fontSize: { xs: '0.85rem', sm: '18px' } }} textAlign="right">
                          {stock.targetQuantity.toLocaleString()}
                        </Typography>
                      </Stack>
                      <Stack direction="row" alignItems="center">
                        <Typography variant="body1" flex={1} sx={{ fontSize: { xs: '0.85rem', sm: '18px' } }} fontWeight={700}>현재수량</Typography>
                        <Typography variant="body1" flex={1} sx={{ fontSize: { xs: '0.85rem', sm: '18px' } }} fontWeight={700} textAlign="right">
                          {stock.currentQuantity.toLocaleString()}
                        </Typography>
                      </Stack>
                      <Stack direction="row" alignItems="center">
                        <Typography variant="body1" flex={1} sx={{ fontSize: { xs: '0.85rem', sm: '18px' } }}>달성률</Typography>
                        <Typography variant="body1" flex={1} sx={{ fontSize: { xs: '0.85rem', sm: '18px' } }} textAlign="right">{percent}%</Typography>
                      </Stack>
                    </Stack>

                    {/* 달성률 프로그레스 바 */}
                    <Box sx={{ width: '100%', height: 6, bgcolor: 'gray2', borderRadius: 3, overflow: 'hidden' }}>
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
