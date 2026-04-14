'use client';

import {
  Container, Box, Typography, Button, Stack, Paper, Grid, Divider,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import AutorenewIcon from '@mui/icons-material/Autorenew';
import ShowChartIcon from '@mui/icons-material/ShowChart';
import PieChartIcon from '@mui/icons-material/PieChart';
import PaidIcon from '@mui/icons-material/Paid';
import BarChartIcon from '@mui/icons-material/BarChart';
import TimelineIcon from '@mui/icons-material/Timeline';
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis,
  CartesianGrid, Tooltip, ReferenceLine, BarChart, Bar,
} from 'recharts';
import { useRouter } from 'next/navigation';

const SAMPLE_DCA = [
  { name: 'SCHD', schedule: '매달 15일 · 5주씩', target: 200, current: 85, percent: 43 },
  { name: 'VOO', schedule: '매주 월요일 · 2주씩', target: 100, current: 62, percent: 62 },
  { name: 'QQQ', schedule: '매달 1일 · 3주씩', target: 150, current: 150, percent: 100 },
];

const FEATURES = [
  {
    icon: <TrendingDownIcon sx={{ fontSize: 32, color: 'primary.main' }} />,
    title: 'MDD 분석',
    description: '최대낙폭을 기간별로 분석, 고점 대비 현재 위치 확인',
  },
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
    icon: <PaidIcon sx={{ fontSize: 32, color: 'primary.main' }} />,
    title: '배당현황',
    description: '보유 종목의 예상 배당금과 배당 주기 자동 계산',
  },
  {
    icon: <PieChartIcon sx={{ fontSize: 32, color: 'primary.main' }} />,
    title: '포트폴리오 시각화',
    description: '트리맵 차트로 자산 배분을 직관적으로 파악',
  },
  {
    icon: <BarChartIcon sx={{ fontSize: 32, color: 'primary.main' }} />,
    title: '자산 추이',
    description: '일별 포트폴리오 변동과 종목별 기여도 분석',
  },
  {
    icon: <TimelineIcon sx={{ fontSize: 32, color: 'primary.main' }} />,
    title: '자산현황',
    description: '총 자산, 수익률, 투자금액을 한눈에 확인',
  },
];

const MDD_RANGES = ['1Y', '2Y', '3Y', '5Y', '10Y'];

// MDD 샘플: 실제 MDD 페이지 DataCell 형태에 맞춘 데이터
const SAMPLE_MDD = [
  {
    name: 'NVIDIA', symbol: 'NVDA', currency: 'USD',
    ath: '$152.89', current: '$124.20', athDrop: -18.7,
    mdd: -34.2, ytdStart: '$134.50', ytdReturn: -7.7,
    peakDate: '24.07.10', peakPrice: '$152.89',
    troughDate: '24.09.06', troughPrice: '$100.62',
    avgMdd: -22.8,
  },
];

// NVIDIA 1Y 드로다운 샘플 데이터 (일별 수준)
const SAMPLE_DRAWDOWN = (() => {
  const points: { label: string; drawdown: number }[] = [];
  const monthly = [
    { m: '04', vals: [0, -1.2, -0.5, -2.1, -3.4, -1.8, -0.9, -2.5, -1.1, 0] },
    { m: '05', vals: [-0.8, -2.3, -3.7, -5.2, -4.1, -3.5, -2.8, -4.6, -5.1, -3.9] },
    { m: '06', vals: [-2.4, -1.5, -0.8, -1.9, -3.1, -2.1, -0.6, -1.4, -2.8, -1.2] },
    { m: '07', vals: [0, -0.3, -0.8, -1.5, -0.4, 0, -0.2, -1.1, -2.3, -3.8] },
    { m: '08', vals: [-5.2, -8.7, -11.3, -14.6, -12.1, -15.8, -18.5, -16.2, -17.9, -19.4] },
    { m: '09', vals: [-22.3, -25.1, -28.7, -31.5, -34.2, -32.1, -29.8, -27.4, -30.6, -28.9] },
    { m: '10', vals: [-26.3, -24.1, -22.8, -20.5, -23.7, -25.1, -22.1, -19.8, -21.4, -20.2] },
    { m: '11', vals: [-18.6, -16.9, -15.2, -17.8, -14.5, -16.1, -15.6, -13.8, -14.9, -12.7] },
    { m: '12', vals: [-11.5, -13.2, -10.8, -12.3, -9.7, -11.1, -10.2, -8.9, -9.5, -8.1] },
    { m: '01', vals: [-7.3, -8.7, -6.5, -9.1, -10.8, -8.2, -7.6, -9.4, -11.2, -10.5] },
    { m: '02', vals: [-12.1, -13.8, -15.4, -14.2, -16.7, -13.5, -15.1, -14.8, -16.2, -15.6] },
    { m: '03', vals: [-17.3, -18.9, -16.5, -19.2, -20.1, -18.7, -17.1, -19.5, -18.2, -18.7] },
  ];
  for (const { m, vals } of monthly) {
    vals.forEach((v, i) => {
      points.push({ label: `${m}.${String(i * 3 + 1).padStart(2, '0')}`, drawdown: v });
    });
  }
  return points;
})();

// 자산추이 샘플 데이터 (3개월 일별)
const SAMPLE_ASSET_HISTORY = (() => {
  const points: { label: string; totalValue: number; totalInvested: number }[] = [];
  const base = 17020000;
  const invested = 17020000;
  // 1월 ~ 3월 일별 데이터
  const months = [
    { m: 1, days: 31 }, { m: 2, days: 28 }, { m: 3, days: 31 },
  ];
  let value = 18500000;
  for (const { m, days } of months) {
    for (let d = 1; d <= days; d++) {
      // 약간의 변동 추가
      const drift = (Math.sin(d * 0.5 + m * 2) * 300000) + (m - 1) * 200000;
      const noise = Math.sin(d * 1.7 + m * 5.3) * 150000;
      value = base + 1500000 + drift + noise;
      points.push({
        label: `${m}/${d}`,
        totalValue: Math.round(value),
        totalInvested: invested,
      });
    }
  }
  // 4월 1~14일
  for (let d = 1; d <= 14; d++) {
    const drift = (Math.sin(d * 0.5 + 8) * 250000) + 800000;
    const noise = Math.sin(d * 1.7 + 20) * 120000;
    value = base + 2000000 + drift + noise;
    points.push({
      label: `4/${d}`,
      totalValue: Math.round(value),
      totalInvested: invested,
    });
  }
  return points;
})();

// 배당 월별 샘플 데이터
const SAMPLE_DIVIDEND_MONTHLY = [
  { month: '1월', amount: 82000 }, { month: '2월', amount: 0 },
  { month: '3월', amount: 215000 }, { month: '4월', amount: 102000 },
  { month: '5월', amount: 0 }, { month: '6월', amount: 248000 },
  { month: '7월', amount: 82000 }, { month: '8월', amount: 0 },
  { month: '9월', amount: 215000 }, { month: '10월', amount: 102000 },
  { month: '11월', amount: 0 }, { month: '12월', amount: 248000 },
];

const SAMPLE_DIVIDEND_STOCKS = [
  { name: 'JEPI', frequency: '월배당', annual: '1,230,000원', yield: 7.2 },
  { name: 'SCHD', frequency: '분기배당', annual: '482,000원', yield: 3.4 },
  { name: '삼성전자', frequency: '분기배당', annual: '72,000원', yield: 2.1 },
];

function DataCell({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <Box>
      <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.2 }}>
        {label}
      </Typography>
      <Typography variant="body2" fontWeight={600} sx={{ color, lineHeight: 1.4 }}>
        {value}
      </Typography>
    </Box>
  );
}

export default function LandingPage() {
  const router = useRouter();
  const theme = useTheme();

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

      {/* 자산현황 + 자산추이 */}
      <Container maxWidth="md" sx={{ py: { xs: 6, md: 10 } }}>
        <Stack spacing={{ xs: 2, md: 3 }}>
          <Typography variant="h2" sx={{ fontSize: { xs: '1.5rem', md: '2rem' } }}>
            자산현황
          </Typography>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={{ xs: 1, md: 2 }}>
            <Paper sx={{ p: { xs: 1.5, sm: 2 }, flex: 1, borderRadius: 2 }}>
              <Typography variant="body2" gutterBottom color="gray5">총 자산</Typography>
              <Typography fontWeight={700} sx={{ letterSpacing: '-1.5px', fontSize: { xs: '1.1rem', sm: '1.5rem' } }}>
                20,140,000원
              </Typography>
            </Paper>
            <Paper sx={{ p: { xs: 1.5, sm: 2 }, flex: 1, borderRadius: 2 }}>
              <Typography variant="body2" gutterBottom color="gray5">수익률</Typography>
              <Stack direction="row" spacing={1} alignItems="baseline">
                <Typography fontWeight={700} sx={{ letterSpacing: '-1.5px', fontSize: { xs: '1.1rem', sm: '1.5rem' } }} color="error.main">
                  +18.3%
                </Typography>
                <Typography variant="body2" color="gray6">
                  (+3,120,000원)
                </Typography>
              </Stack>
            </Paper>
            <Paper sx={{ p: { xs: 1.5, sm: 2 }, flex: 1, borderRadius: 2 }}>
              <Typography variant="body2" gutterBottom color="gray5">총 투자금액</Typography>
              <Typography fontWeight={700} sx={{ letterSpacing: '-1.5px', fontSize: { xs: '1.1rem', sm: '1.5rem' } }}>
                17,020,000원
              </Typography>
            </Paper>
          </Stack>

          {/* 자산추이 차트 */}
          <Paper sx={{ p: { xs: 2, sm: 3 }, borderRadius: 2 }}>
            <Stack spacing={2}>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Box>
                  <Typography variant="body2" color="gray6" gutterBottom>자산 추이</Typography>
                  <Typography variant="body1" fontWeight={700} sx={{ color: 'error.main', letterSpacing: '-0.5px' }}>
                    +940,000원 (+4.9%)
                  </Typography>
                </Box>
                <Stack direction="row" spacing={0.5}>
                  {['1주', '1개월', '3개월'].map((label, i) => (
                    <Box
                      key={label}
                      sx={{
                        px: { xs: 1, sm: 1.5 },
                        py: 0.5,
                        borderRadius: 1,
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        bgcolor: i === 1 ? 'primary.main' : 'action.hover',
                        color: i === 1 ? '#fff' : 'text.secondary',
                        border: '1px solid',
                        borderColor: i === 1 ? 'primary.main' : 'gray2',
                      }}
                    >
                      {label}
                    </Box>
                  ))}
                </Stack>
              </Stack>
              <Box sx={{ width: '100%', height: { xs: 180, sm: 220 } }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={SAMPLE_ASSET_HISTORY} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="landingColorValue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={theme.palette.primary.main} stopOpacity={0.15} />
                        <stop offset="95%" stopColor={theme.palette.primary.main} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={theme.palette.divider} />
                    <XAxis dataKey="label" tick={{ fontSize: 11 }} tickLine={false} interval="preserveStartEnd" tickCount={8} />
                    <YAxis
                      tick={{ fontSize: 11 }}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(v: number) => `${Math.round(v / 10_000)}만`}
                      width={45}
                    />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (!active || !payload?.length) return null;
                        const d = payload[0].payload as { label: string; totalValue: number; totalInvested: number };
                        const profit = d.totalValue - d.totalInvested;
                        return (
                          <Paper sx={{ p: 1.5, boxShadow: '0 2px 8px rgba(0,0,0,0.12)' }}>
                            <Typography variant="caption" color="gray6">{d.label}</Typography>
                            <Typography variant="body2" fontWeight={700}>
                              평가금액: {Math.floor(d.totalValue).toLocaleString()}원
                            </Typography>
                            <Typography variant="body2" color="gray6">
                              투자금액: {Math.floor(d.totalInvested).toLocaleString()}원
                            </Typography>
                            <Typography variant="body2" fontWeight={600} sx={{ color: profit >= 0 ? 'error.main' : 'primary.main' }}>
                              수익: {profit >= 0 ? '+' : ''}{Math.floor(profit).toLocaleString()}원
                            </Typography>
                          </Paper>
                        );
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="totalInvested"
                      stroke={theme.palette.grey[400]}
                      strokeWidth={1.5}
                      strokeDasharray="4 4"
                      fill="none"
                    />
                    <Area
                      type="monotone"
                      dataKey="totalValue"
                      stroke={theme.palette.primary.main}
                      strokeWidth={2}
                      fill="url(#landingColorValue)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </Box>
            </Stack>
          </Paper>
        </Stack>
      </Container>

      {/* MDD 분석 — 강조 섹션 */}
      <Box
        sx={{
          py: { xs: 8, md: 12 },
          background: 'linear-gradient(135deg, rgba(33,150,243,0.04) 0%, rgba(33,150,243,0.12) 100%)',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <Container maxWidth="md">
          <Stack spacing={{ xs: 3, md: 4 }}>
            {/* 배지 + 타이틀 */}
            <Stack spacing={1.5} alignItems={{ xs: 'flex-start', md: 'center' }} textAlign={{ xs: 'left', md: 'center' }}>
              <Box sx={{
                display: 'inline-flex',
                alignItems: 'center',
                bgcolor: 'primary.main',
                color: '#fff',
                px: 1.5,
                py: 0.5,
                borderRadius: 5,
                fontSize: '0.75rem',
                fontWeight: 700,
              }}>
                NEW
              </Box>
              <Typography variant="h2" sx={{ fontSize: { xs: '1.5rem', md: '2rem' }, fontWeight: 700 }}>
                MDD 분석
              </Typography>
              <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 520 }}>
                최대낙폭(MDD)을 기간별로 분석하고, 고점 대비 현재 위치를 확인하세요.<br />
                최대 5종목을 저장해두고 언제든 비교할 수 있습니다.
              </Typography>
            </Stack>

            {/* MDD 카드들 — 실제 페이지 UI와 동일한 구조 */}
            <Stack spacing={1.5}>
              {SAMPLE_MDD.map((stock, idx) => (
                <Paper key={stock.symbol} sx={{ borderRadius: 2, overflow: 'hidden' }}>
                  {/* 헤더 */}
                  <Stack direction="row" alignItems="center" sx={{ px: 2, py: 1.2 }}>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography variant="body1" fontWeight={700} noWrap>
                        {stock.name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {stock.symbol}
                      </Typography>
                    </Box>
                    <Stack direction="row" spacing={0.5}>
                      {MDD_RANGES.map((range, i) => (
                        <Box
                          key={range}
                          sx={{
                            px: { xs: 0.8, sm: 1 },
                            py: 0.2,
                            borderRadius: 0.5,
                            fontSize: '0.7rem',
                            fontWeight: 600,
                            bgcolor: i === 0 ? 'primary.main' : 'action.hover',
                            color: i === 0 ? '#fff' : 'text.secondary',
                            border: '1px solid',
                            borderColor: i === 0 ? 'primary.main' : 'gray2',
                          }}
                        >
                          {range}
                        </Box>
                      ))}
                    </Stack>
                  </Stack>

                  {/* 본문 — DataCell 그리드 */}
                  <Box sx={{ px: 2, pb: 2 }}>
                    <Box sx={{
                      display: 'grid',
                      gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(4, 1fr)' },
                      gap: 1.5,
                    }}>
                      <DataCell label="최고가" value={stock.ath} />
                      <DataCell label="현재가" value={stock.current} />
                      <DataCell
                        label="고점대비"
                        value={`${stock.athDrop.toFixed(1)}%`}
                        color={theme.palette.primary.main}
                      />
                      <DataCell
                        label="MDD (1Y)"
                        value={`${stock.mdd.toFixed(1)}%`}
                        color={theme.palette.primary.main}
                      />
                      <DataCell label="연초가" value={stock.ytdStart} />
                      <DataCell
                        label="연초대비"
                        value={`${stock.ytdReturn > 0 ? '+' : ''}${stock.ytdReturn.toFixed(1)}%`}
                        color={stock.ytdReturn >= 0 ? theme.palette.error.main : theme.palette.primary.main}
                      />
                      <DataCell
                        label="고점일"
                        value={`${stock.peakDate} (${stock.peakPrice})`}
                      />
                      <DataCell
                        label="저점일"
                        value={`${stock.troughDate} (${stock.troughPrice})`}
                      />
                      <DataCell
                        label="평균 MDD (1Y)"
                        value={`${stock.avgMdd.toFixed(1)}%`}
                        color={theme.palette.primary.main}
                      />
                    </Box>

                    {/* 첫 번째 종목에만 드로다운 차트 표시 */}
                    {idx === 0 && (
                      <Box sx={{ width: '100%', height: 180, mt: 2 }}>
                        <ResponsiveContainer>
                          <AreaChart data={SAMPLE_DRAWDOWN} margin={{ top: 5, right: 20, bottom: 5, left: 10 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke={theme.palette.divider} />
                            <XAxis dataKey="label" tick={{ fontSize: 10 }} interval="preserveStartEnd" tickCount={8} />
                            <YAxis
                              tick={{ fontSize: 10 }}
                              tickFormatter={(v: number) => `${v}%`}
                              domain={['dataMin', 0]}
                            />
                            <Tooltip
                              formatter={(value) => [`${Number(value).toFixed(1)}%`, 'Drawdown']}
                              contentStyle={{ fontSize: 12 }}
                            />
                            <ReferenceLine
                              y={-34.2}
                              stroke={theme.palette.error.main}
                              strokeDasharray="4 4"
                              label={{ value: 'MDD -34.2%', fontSize: 10, fill: theme.palette.error.main }}
                            />
                            <Area
                              type="monotone"
                              dataKey="drawdown"
                              stroke={theme.palette.primary.main}
                              fill={theme.palette.primary.main}
                              fillOpacity={0.15}
                            />
                          </AreaChart>
                        </ResponsiveContainer>
                      </Box>
                    )}
                  </Box>
                </Paper>
              ))}
            </Stack>
          </Stack>
        </Container>
      </Box>

      {/* DCA */}
      <Box sx={{ bgcolor: 'background.paper', py: { xs: 6, md: 10 } }}>
        <Container maxWidth="md">
          <Stack spacing={{ xs: 1, md: 3 }}>
            <Typography variant="h2" sx={{ fontSize: { xs: '1.5rem', md: '2rem' } }}>
              적립식 매매 일지
            </Typography>
            <Box sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' },
              gap: { xs: 1, md: 1.5 },
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
                    <Typography sx={{ fontSize: { xs: 24, sm: 28 } }} fontWeight={600}>{stock.name}</Typography>
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

      {/* 배당현황 */}
      <Container maxWidth="md" sx={{ py: { xs: 6, md: 10 } }}>
        <Stack spacing={{ xs: 2, md: 3 }}>
          <Typography variant="h2" sx={{ fontSize: { xs: '1.5rem', md: '2rem' } }}>
            배당현황
          </Typography>
          <Paper sx={{ p: { xs: 2, sm: 3 }, borderRadius: 2 }}>
            <Stack spacing={2.5}>
              {/* 헤더 */}
              <Typography variant="body2" color="gray6">배당 현황</Typography>

              {/* 연간 예상 배당금 */}
              <Box>
                <Typography variant="caption" color="gray6">연간 예상 배당금</Typography>
                <Stack direction="row" alignItems="baseline" spacing={1}>
                  <Typography variant="h5" fontWeight={700} sx={{ letterSpacing: '-1px' }}>
                    1,784,000원
                  </Typography>
                  <Typography variant="body2" color="gray6">
                    평균 수익률 4.23%
                  </Typography>
                </Stack>
              </Box>

              <Divider />

              {/* 월별 예상 배당금 차트 */}
              <Box>
                <Typography variant="caption" color="gray6" sx={{ mb: 1, display: 'block' }}>
                  월별 예상 배당금
                </Typography>
                <Box sx={{ width: '100%', height: 160 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={SAMPLE_DIVIDEND_MONTHLY} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
                      <XAxis
                        dataKey="month"
                        tick={{ fontSize: 10 }}
                        tickLine={false}
                        axisLine={{ stroke: theme.palette.divider }}
                      />
                      <YAxis
                        tick={{ fontSize: 10 }}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(v: number) => {
                          if (v >= 10_000) return `${Math.round(v / 10_000)}만`;
                          if (v >= 1000) return `${Math.round(v / 1000)}k`;
                          return v.toString();
                        }}
                        width={40}
                      />
                      <Tooltip
                        cursor={{ fill: 'rgba(0,0,0,0.04)' }}
                        content={({ active, payload }) => {
                          if (!active || !payload?.length) return null;
                          const d = payload[0].payload as { month: string; amount: number };
                          return (
                            <Paper sx={{ px: 1.5, py: 1, boxShadow: '0 2px 8px rgba(0,0,0,0.12)' }}>
                              <Typography variant="caption" color="gray6">{d.month}</Typography>
                              <Typography variant="body2" fontWeight={700}>
                                {Math.floor(d.amount).toLocaleString()}원
                              </Typography>
                            </Paper>
                          );
                        }}
                      />
                      <Bar dataKey="amount" radius={[4, 4, 0, 0]} fill={theme.palette.primary.main} />
                    </BarChart>
                  </ResponsiveContainer>
                </Box>
              </Box>

              <Divider />

              {/* 종목별 배당 요약 */}
              <Box>
                <Typography variant="caption" color="gray6" sx={{ mb: 1, display: 'block' }}>
                  종목별 배당
                </Typography>
                <Stack spacing={0.75}>
                  {SAMPLE_DIVIDEND_STOCKS.map((row) => (
                    <Stack
                      key={row.name}
                      direction="row"
                      alignItems="center"
                      justifyContent="space-between"
                      sx={{ py: 0.5 }}
                    >
                      <Stack direction="row" alignItems="center" spacing={1} sx={{ minWidth: 0, flex: 1 }}>
                        <Typography variant="body2" fontWeight={600} fontSize="0.85rem" noWrap>
                          {row.name}
                        </Typography>
                        <Typography
                          variant="caption"
                          color="gray6"
                          fontSize="0.7rem"
                          sx={{ px: 0.75, py: 0.25, bgcolor: 'gray1', borderRadius: 0.75, flexShrink: 0 }}
                        >
                          {row.frequency}
                        </Typography>
                      </Stack>
                      <Stack direction="row" alignItems="baseline" spacing={1}>
                        <Typography variant="body2" fontWeight={700} fontSize="0.85rem">
                          {row.annual}
                        </Typography>
                        <Typography variant="caption" color="gray6" fontSize="0.7rem" sx={{ minWidth: 40, textAlign: 'right' }}>
                          {row.yield.toFixed(2)}%
                        </Typography>
                      </Stack>
                    </Stack>
                  ))}
                </Stack>
              </Box>
            </Stack>
          </Paper>
        </Stack>
      </Container>

      {/* Features */}
      <Box sx={{ py: { xs: 6, md: 10 }, bgcolor: 'background.paper' }}>
        <Container maxWidth="md">
          <Typography variant="h2" sx={{ mb: { xs: 1, md: 4 }, fontSize: { xs: '1.5rem', md: '2rem' } }}>
            주요 기능
          </Typography>
          <Grid container spacing={{ xs: 1, md: 3 }}>
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
