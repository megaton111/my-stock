'use client';

import {
  Container, Box,
  Typography,
  Button,
  Stack,
  Skeleton,
} from '@mui/material';

import { useInvestments } from '@/hooks/useInvestments';
import { useStockPrices } from '@/hooks/useStockPrices';
import { calcPortfolioSummary } from '@/utils/calculator';
import SummaryCards from '@/components/SummaryCards';
import InvestmentTable from '@/components/InvestmentTable';
import AssetHistoryChart from '@/components/AssetHistoryChart';
import AssetAllocationWidget from '@/components/AssetAllocationWidget';
import DividendWidget from '@/components/DividendWidget';
import ProgressWidget from '@/components/ProgressWidget';
import RealizedPlWidget from '@/components/RealizedPlWidget';
import PageHeader from '@/components/PageHeader';
import { useRouter } from 'next/navigation';

export default function DashboardPage() {
  const router = useRouter();

  const { investments, loading: investmentsLoading, userId } = useInvestments();
  const { prices, exchangeRate, loading } = useStockPrices(investments);
  const summary = calcPortfolioSummary(investments, prices, exchangeRate);

  return (
    <Container maxWidth="md" sx={{ py: 10, position: 'relative' }}>
      <PageHeader />

      {investmentsLoading ? (
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
          {/* SummaryCards: 3개 카드 가로 배치 */}
          <Stack direction="row" spacing={1} width={1}>
            {[0, 1, 2].map((i) => (
              <Skeleton
                key={i}
                variant="rectangular"
                animation="wave"
                height={108}
                sx={{ flex: 1, borderRadius: 1 }}
              />
            ))}
          </Stack>

          {/* 실현손익 + 자산현황: PC 1:2 가로, 모바일 세로 */}
          <Stack
            direction={{ xs: 'column', md: 'row' }}
            spacing={1}
            width={1}
            sx={{ alignItems: 'stretch' }}
          >
            <Skeleton
              variant="rectangular"
              animation="wave"
              height={200}
              sx={{ flex: { xs: 'none', md: 1 }, width: { xs: '100%', md: 'auto' }, borderRadius: 1 }}
            />
            <Skeleton
              variant="rectangular"
              animation="wave"
              height={200}
              sx={{ flex: { xs: 'none', md: 2 }, width: { xs: '100%', md: 'auto' }, borderRadius: 1 }}
            />
          </Stack>

          {/* AssetHistoryChart */}
          <Skeleton
            variant="rectangular"
            animation="wave"
            width="100%"
            height={320}
            sx={{ borderRadius: 1 }}
          />

          {/* DividendWidget */}
          <Skeleton
            variant="rectangular"
            animation="wave"
            width="100%"
            height={240}
            sx={{ borderRadius: 1 }}
          />

          {/* ProgressWidget */}
          <Skeleton
            variant="rectangular"
            animation="wave"
            width="100%"
            height={180}
            sx={{ borderRadius: 1 }}
          />

          {/* InvestmentTable: 헤더 + 8개 행 */}
          <Stack direction="column" width={1} spacing={0.5} sx={{ mt: 1 }}>
            <Skeleton variant="rectangular" animation="wave" width="100%" height={40} sx={{ borderRadius: 1 }} />
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton
                key={i}
                variant="rectangular"
                animation="wave"
                width="100%"
                height={56}
                sx={{ borderRadius: 1 }}
              />
            ))}
          </Stack>
        </Box>
      ) : investments.length === 0 ? (
        <Stack direction="column" spacing={7} width={1} pt={20} justifyContent="center" alignItems="center">
          <Typography variant='body1' fontSize={'20px'} color='gray5' pb={10}>아직 투자내역이 없으시군요...</Typography>
          <Typography variant='body1' lineHeight={1.2} textAlign={"center"} fontSize={'58px'}>
            모든 투자를<br />
            <Box component="strong">기록해 보세요!</Box>
          </Typography>
          <Button variant="contained" size='large' onClick={() => router.push('/investments')}>투자 내역 작성하기</Button>
        </Stack>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
          <SummaryCards {...summary} loading={loading} />
          <Stack
            direction={{ xs: 'column', md: 'row' }}
            spacing={1}
            sx={{ width: 1, alignItems: 'stretch' }}
          >
            {userId && (
              <RealizedPlWidget
                userId={userId}
                sx={{ flex: { xs: 'none', md: 1 }, width: { xs: '100%', md: 'auto' }, minWidth: 0, alignSelf: 'stretch' }}
              />
            )}
            <Box sx={{ flex: { xs: 'none', md: 2 }, width: { xs: '100%', md: 'auto' }, display: 'flex', minWidth: 0 }}>
              <AssetAllocationWidget investments={investments} prices={prices} exchangeRate={exchangeRate} />
            </Box>
          </Stack>
          {userId && <AssetHistoryChart userId={userId} />}
          <DividendWidget investments={investments} exchangeRate={exchangeRate} />
          <ProgressWidget />
          <InvestmentTable
            investments={investments}
            prices={prices}
            exchangeRate={exchangeRate}
          />
        </Box>
      )}
    </Container>
  );
}
