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
import WatchlistWidget from '@/components/WatchlistWidget';
import AssetAllocationWidget from '@/components/AssetAllocationWidget';
import DividendWidget from '@/components/DividendWidget';
import ProgressWidget from '@/components/ProgressWidget';
import RealizedPlWidget from '@/components/RealizedPlWidget';
import PageHeader from '@/components/PageHeader';
import { useRouter } from 'next/navigation';

function SummarySkeleton() {
  return (
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
  );
}

function AllocationSkeleton() {
  return (
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
  );
}

function DividendSkeleton() {
  return (
    <Skeleton
      variant="rectangular"
      animation="wave"
      width="100%"
      height={240}
      sx={{ borderRadius: 1 }}
    />
  );
}

function TableSkeleton() {
  return (
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
  );
}

export default function DashboardPage() {
  const router = useRouter();

  const { investments, loading: investmentsLoading, userId } = useInvestments();
  const { prices, exchangeRate, loading: pricesLoading } = useStockPrices(investments);
  const summary = calcPortfolioSummary(investments, prices, exchangeRate);

  // Phase 1: 유저 정보 미확인 → 전체 스켈레톤
  if (!userId) {
    return (
      <Container maxWidth="md" sx={{ py: 10, position: 'relative' }}>
        <PageHeader />
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
          <SummarySkeleton />
          <AllocationSkeleton />
          <Skeleton variant="rectangular" animation="wave" width="100%" height={320} sx={{ borderRadius: 1 }} />
          <DividendSkeleton />
          <Skeleton variant="rectangular" animation="wave" width="100%" height={180} sx={{ borderRadius: 1 }} />
          <TableSkeleton />
        </Box>
      </Container>
    );
  }

  // Phase 3: 투자 데이터 없음 → 빈 화면
  if (!investmentsLoading && investments.length === 0) {
    return (
      <Container maxWidth="md" sx={{ py: 10, position: 'relative' }}>
        <PageHeader />
        <Stack direction="column" spacing={7} width={1} pt={20} justifyContent="center" alignItems="center">
          <Typography variant='body1' fontSize={'20px'} color='gray5' pb={10}>아직 투자내역이 없으시군요...</Typography>
          <Typography variant='body1' lineHeight={1.2} textAlign={"center"} fontSize={'58px'}>
            모든 투자를<br />
            <Box component="strong">기록해 보세요!</Box>
          </Typography>
          <Button variant="contained" size='large' onClick={() => router.push('/investments')}>투자 내역 작성하기</Button>
        </Stack>
      </Container>
    );
  }

  // Phase 2+3: userId 확보됨
  // 독립 위젯은 항상 렌더(백그라운드 fetch) + dataLoading 중에는 스켈레톤 뒤에 숨김
  const dataLoading = investmentsLoading || pricesLoading;
  const hiddenSx = { position: 'absolute', width: 0, height: 0, overflow: 'hidden', opacity: 0 } as const;

  return (
    <Container maxWidth="md" sx={{ py: 10, position: 'relative' }}>
      <PageHeader />
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
        {/* SummaryCards */}
        {dataLoading ? <SummarySkeleton /> : <SummaryCards {...summary} />}

        {/* 실현손익 + 자산현황 */}
        {dataLoading ? (
          <AllocationSkeleton />
        ) : (
          <Stack
            direction={{ xs: 'column', md: 'row' }}
            spacing={1}
            sx={{ width: 1, alignItems: 'stretch' }}
          >
            <RealizedPlWidget
              userId={userId}
              sx={{ flex: { xs: 'none', md: 1 }, width: { xs: '100%', md: 'auto' }, minWidth: 0, alignSelf: 'stretch' }}
            />
            <Box sx={{ flex: { xs: 'none', md: 2 }, width: { xs: '100%', md: 'auto' }, display: 'flex', minWidth: 0 }}>
              <AssetAllocationWidget investments={investments} prices={prices} exchangeRate={exchangeRate} />
            </Box>
          </Stack>
        )}

        {/* 자산추이 — 독립 위젯: 항상 렌더(fetch 시작), 로딩 중 스켈레톤으로 가림 */}
        {dataLoading && (
          <Skeleton variant="rectangular" animation="wave" width="100%" height={320} sx={{ borderRadius: 1 }} />
        )}
        <Box sx={dataLoading ? hiddenSx : { width: 1 }}>
          <AssetHistoryChart userId={userId} />
        </Box>

        {/* 관심종목 — 독립 위젯 */}
        {dataLoading && (
          <Skeleton variant="rectangular" animation="wave" width="100%" height={200} sx={{ borderRadius: 1 }} />
        )}
        <Box sx={dataLoading ? hiddenSx : { width: 1 }}>
          <WatchlistWidget userId={userId} />
        </Box>

        {/* DividendWidget */}
        {investmentsLoading ? (
          <DividendSkeleton />
        ) : (
          <DividendWidget investments={investments} exchangeRate={exchangeRate} />
        )}

        {/* 적립식/모으기 진행률 — 독립 위젯 */}
        {dataLoading && (
          <Skeleton variant="rectangular" animation="wave" width="100%" height={180} sx={{ borderRadius: 1 }} />
        )}
        <Box sx={dataLoading ? hiddenSx : { width: 1 }}>
          <ProgressWidget />
        </Box>

        {/* InvestmentTable */}
        {dataLoading ? (
          <TableSkeleton />
        ) : (
          <InvestmentTable
            investments={investments}
            prices={prices}
            exchangeRate={exchangeRate}
          />
        )}
      </Box>
    </Container>
  );
}
