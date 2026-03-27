'use client';

import { useState, useEffect } from 'react';
import {
  Container, Box, Typography, Button, Stack, Paper, Grid,
} from '@mui/material';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import AutorenewIcon from '@mui/icons-material/Autorenew';
import ShowChartIcon from '@mui/icons-material/ShowChart';
import PieChartIcon from '@mui/icons-material/PieChart';
import { useRouter } from 'next/navigation';

const SAMPLE_DCA = [
  { name: 'SCHD', schedule: '매달 15일 · 5주씩', target: 200, current: 85, percent: 43 },
  { name: 'VOO', schedule: '매주 월요일 · 2주씩', target: 100, current: 62, percent: 62 },
  { name: 'QQQ', schedule: '매달 1일 · 3주씩', target: 150, current: 150, percent: 100 },
];

const FEATURES = [
  {
    icon: <TrendingUpIcon sx={{ fontSize: 32, color: 'primary.main' }} />,
    title: '투자 기록 관리',
    description: '보유 종목, 매수 평균가, 수량을 한곳에서 관리하세요',
  },
  {
    icon: <AutorenewIcon sx={{ fontSize: 32, color: 'primary.main' }} />,
    title: '적립식 매수 추적',
    description: 'DCA 전략의 매수 일정과 진행률을 한눈에 확인',
  },
  {
    icon: <ShowChartIcon sx={{ fontSize: 32, color: 'primary.main' }} />,
    title: '실시간 시세 & 수익률',
    description: '30초마다 시세 갱신, USD/KRW 환율 자동 적용',
  },
  {
    icon: <PieChartIcon sx={{ fontSize: 32, color: 'primary.main' }} />,
    title: '포트폴리오 시각화',
    description: '트리맵 차트로 자산 배분을 직관적으로 파악',
  },
];

const SAMPLE_STOCKS = [
  { name: 'Apple', ticker: 'AAPL', profit: '+12.4%', value: '5,230,000원', color: 'error.main', treemapColor: '#4CAF50', pct: 26 },
  { name: '삼성전자', ticker: '005930.KS', profit: '-3.2%', value: '3,840,000원', color: 'primary.main', treemapColor: '#2196F3', pct: 19 },
  { name: 'Tesla', ticker: 'TSLA', profit: '+28.7%', value: '4,120,000원', color: 'error.main', treemapColor: '#FF5722', pct: 21 },
  { name: 'NVIDIA', ticker: 'NVDA', profit: '+45.1%', value: '6,950,000원', color: 'error.main', treemapColor: '#9C27B0', pct: 34 },
];

export default function LandingPage() {
  const router = useRouter();
  const [showTreemap, setShowTreemap] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => setShowTreemap((prev) => !prev), 4000);
    return () => clearInterval(timer);
  }, []);

  return (
    <Box sx={{ minHeight: '100vh' }}>
      {/* Hero */}
      <Box sx={{ bgcolor: 'background.paper', pt: { xs: 10, md: 14 }, pb: { xs: 8, md: 12 } }}>
        <Container maxWidth="md">
          <Stack alignItems="center" spacing={3} textAlign="center">
            <Typography variant="body1" color="primary.main" fontWeight={600}>
              주식트래커
            </Typography>
            <Typography
              variant="h1"
              sx={{
                fontSize: { xs: '2.5rem', md: '4.5rem' },
                fontWeight: 700,
                lineHeight: 1.2,
              }}
            >
              모든 투자를<br />기록해 보세요!
            </Typography>
            <Typography
              variant="body1"
              color="text.secondary"
              sx={{ maxWidth: 480, fontSize: { xs: '0.95rem', md: '1.1rem' } }}
            >
              적립식 투자 일지, 주식 모으기, 실시간 수익률까지<br />
              무료 주식 포트폴리오 트래커
            </Typography>
            <Button
              variant="contained"
              size="large"
              onClick={() => router.push('/login')}
              sx={{ mt: 2, px: 5, py: 1.5, fontSize: '1rem' }}
            >
              시작하기
            </Button>
          </Stack>
        </Container>
      </Box>

      {/* Preview */}
      <Container maxWidth="md" sx={{ py: { xs: 6, md: 10 } }}>
        <Stack spacing={3}>
          <Typography variant="h2" sx={{ fontSize: { xs: '1.5rem', md: '2rem' } }}>
            투자 내역 관리
          </Typography>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <Paper sx={{ p: 3, flex: 1 }}>
              <Typography variant="body2" color="gray5" gutterBottom>총 자산</Typography>
              <Typography variant="h5" fontWeight={700} sx={{ letterSpacing: '-1.5px' }}>
                20,140,000원
              </Typography>
            </Paper>
            <Paper sx={{ p: 3, flex: 1 }}>
              <Typography variant="body2" color="gray5" gutterBottom>수익률</Typography>
              <Typography variant="h5" fontWeight={700} sx={{ letterSpacing: '-1.5px' }} color="error.main">
                +18.3%
              </Typography>
            </Paper>
            <Paper sx={{ p: 3, flex: 1 }}>
              <Typography variant="body2" color="gray5" gutterBottom>총 투자금액</Typography>
              <Typography variant="h5" fontWeight={700} sx={{ letterSpacing: '-1.5px' }}>
                17,020,000원
              </Typography>
            </Paper>
          </Stack>

          <Box sx={{ position: 'relative', minHeight: 240 }}>
            {/* 테이블 뷰 */}
            <Paper sx={{
              overflow: 'hidden',
              position: 'absolute',
              inset: 0,
              opacity: showTreemap ? 0 : 1,
              transition: 'opacity 0.6s ease-in-out',
            }}>
              {SAMPLE_STOCKS.map((stock, i) => (
                <Stack
                  key={stock.ticker}
                  direction="row"
                  alignItems="center"
                  justifyContent="space-between"
                  sx={{
                    px: 3,
                    py: 2,
                    borderBottom: i < SAMPLE_STOCKS.length - 1 ? '1px solid' : 'none',
                    borderColor: 'gray2',
                  }}
                >
                  <Box>
                    <Typography variant="body1" fontWeight={600}>{stock.name}</Typography>
                    <Typography variant="caption" color="gray5">{stock.ticker}</Typography>
                  </Box>
                  <Stack alignItems="flex-end">
                    <Typography variant="body1" fontWeight={600}>{stock.value}</Typography>
                    <Typography variant="body2" fontWeight={600} color={stock.color}>
                      {stock.profit}
                    </Typography>
                  </Stack>
                </Stack>
              ))}
            </Paper>

            {/* 트리맵 뷰 */}
            <Paper sx={{
              overflow: 'hidden',
              position: 'absolute',
              inset: 0,
              opacity: showTreemap ? 1 : 0,
              transition: 'opacity 0.6s ease-in-out',
              display: 'flex',
              flexWrap: 'wrap',
              p: 0.5,
              gap: 0.5,
            }}>
              {SAMPLE_STOCKS.map((stock) => (
                <Box
                  key={stock.ticker}
                  sx={{
                    flex: `${stock.pct} 0 0`,
                    minHeight: 110,
                    bgcolor: stock.treemapColor,
                    borderRadius: 1.5,
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    alignItems: 'center',
                    color: '#fff',
                    px: 1,
                  }}
                >
                  <Typography variant="body2" fontWeight={700}>{stock.name}</Typography>
                  <Typography variant="caption" sx={{ opacity: 0.85 }}>{stock.profit}</Typography>
                </Box>
              ))}
            </Paper>
          </Box>
        </Stack>
      </Container>

      {/* DCA */}
      <Box sx={{ bgcolor: 'background.paper', py: { xs: 6, md: 10 } }}>
        <Container maxWidth="md">
          <Stack spacing={3}>
            <Typography variant="h2" sx={{ fontSize: { xs: '1.5rem', md: '2rem' } }}>
              적립식 매매 일지
            </Typography>
            <Box sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr 1fr' },
              gap: 1.5,
            }}>
              {SAMPLE_DCA.map((stock) => (
                <Paper
                  key={stock.name}
                  sx={{
                    p: 3,
                    border: '1px solid',
                    borderColor: 'gray2',
                    boxShadow: 'none',
                  }}
                >
                  <Stack spacing={1.5}>
                    <Typography fontSize={28} fontWeight={600}>{stock.name}</Typography>
                    <Stack spacing={0.5}>
                      <Stack direction="row" alignItems="center" justifyContent="space-between">
                        <Typography variant="body1" fontSize="16px" flexShrink={0}>투자날짜</Typography>
                        <Typography variant="body1" fontSize="16px" textAlign="right" color="primary.main" fontWeight={600} whiteSpace="nowrap">
                          {stock.schedule}
                        </Typography>
                      </Stack>
                      <Stack direction="row" alignItems="center">
                        <Typography variant="body1" flex={1} fontSize="16px">목표수량</Typography>
                        <Typography variant="body1" flex={1} fontSize="16px" textAlign="right">
                          {stock.target.toLocaleString()}
                        </Typography>
                      </Stack>
                      <Stack direction="row" alignItems="center">
                        <Typography variant="body1" flex={1} fontSize="16px" fontWeight={700}>현재수량</Typography>
                        <Typography variant="body1" flex={1} fontSize="16px" fontWeight={700} textAlign="right">
                          {stock.current.toLocaleString()}
                        </Typography>
                      </Stack>
                      <Stack direction="row" alignItems="center">
                        <Typography variant="body1" flex={1} fontSize="16px">달성률</Typography>
                        <Typography variant="body1" flex={1} fontSize="16px" textAlign="right">{stock.percent}%</Typography>
                      </Stack>
                    </Stack>
                    <Box sx={{ width: '100%', height: 6, bgcolor: 'gray2', borderRadius: 3, overflow: 'hidden' }}>
                      <Box sx={{
                        width: `${stock.percent}%`,
                        height: '100%',
                        bgcolor: stock.percent === 100 ? 'success.main' : 'primary.main',
                        borderRadius: 3,
                      }} />
                    </Box>
                  </Stack>
                </Paper>
              ))}
            </Box>
          </Stack>
        </Container>
      </Box>

      {/* Features */}
      <Box sx={{ bgcolor: 'background.paper', py: { xs: 6, md: 10 } }}>
        <Container maxWidth="md">
          <Typography variant="h2" sx={{ mb: 4, fontSize: { xs: '1.5rem', md: '2rem' } }}>
            주요 기능
          </Typography>
          <Grid container spacing={3}>
            {FEATURES.map((feature) => (
              <Grid size={{ xs: 12, sm: 6 }} key={feature.title}>
                <Paper sx={{ p: 4, height: '100%', boxShadow: 'none', border: '1px solid', borderColor: 'gray2' }}>
                  <Stack spacing={1.5}>
                    {feature.icon}
                    <Typography variant="h6" fontWeight={600}>{feature.title}</Typography>
                    <Typography variant="body2" color="text.secondary">{feature.description}</Typography>
                  </Stack>
                </Paper>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      {/* Bottom CTA */}
      <Container maxWidth="sm" sx={{ py: { xs: 8, md: 12 } }}>
        <Stack alignItems="center" spacing={2} textAlign="center">
          <Typography variant="h2" sx={{ fontSize: { xs: '1.5rem', md: '2rem' } }}>
            지금 바로 시작하세요
          </Typography>
          <Typography variant="body1" color="text.secondary">
            구글 또는 카카오 계정으로 간편 로그인
          </Typography>
          <Button
            variant="contained"
            size="large"
            onClick={() => router.push('/login')}
            sx={{ mt: 2, px: 5, py: 1.5, fontSize: '1rem' }}
          >
            무료로 시작하기
          </Button>
          <Typography
            variant="caption"
            color="text.secondary"
            component="a"
            href="/privacy"
            sx={{ mt: 2, textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}
          >
            개인정보처리방침
          </Typography>
        </Stack>
      </Container>
    </Box>
  );
}
