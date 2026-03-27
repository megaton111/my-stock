'use client';

import { useState } from 'react';
import {
  Container, Box,
  ToggleButton, ToggleButtonGroup,
  Typography,
  Button,
  Stack,
  Skeleton,
} from '@mui/material';
import DashboardIcon from '@mui/icons-material/Dashboard';
import TocSharpIcon from '@mui/icons-material/TocSharp';

import { useInvestments } from '@/hooks/useInvestments';
import { useStockPrices } from '@/hooks/useStockPrices';
import { calcPortfolioSummary } from '@/utils/calculator';
import SummaryCards from '@/components/SummaryCards';
import InvestmentTable from '@/components/InvestmentTable';
import PortfolioTreemap from '@/components/PortfolioTreemap';
import PageHeader from '@/components/PageHeader';
import { useRouter } from 'next/navigation';

export default function DashboardPage() {
  const router = useRouter();
  const [view, setView] = useState<'board' | 'graph'>('board');

  const { investments, loading: investmentsLoading } = useInvestments();
  const { prices, exchangeRate, loading } = useStockPrices(investments);
  const summary = calcPortfolioSummary(investments, prices, exchangeRate);

  const handleViewChange = (_: React.MouseEvent<HTMLElement>, next: 'board' | 'graph' | null) => {
    if (next !== null) setView(next);
  };

  const viewSwitcher = (
    <ToggleButtonGroup
      value={view}
      exclusive
      onChange={handleViewChange}
      color="primary"
      size="small"
      sx={{
        bgcolor: 'background.paper',
        '& .MuiToggleButton-root': { width: 40, height: 40, borderColor: 'gray2' },
      }}
    >
      <ToggleButton value="board">
        <TocSharpIcon fontSize="small" />
      </ToggleButton>
      <ToggleButton value="graph">
        <DashboardIcon fontSize="small" />
      </ToggleButton>
    </ToggleButtonGroup>
  );

  return (
    <Container maxWidth="xl" sx={{ py: 10, position: 'relative' }}>
      <PageHeader left={investments.length > 0 ? viewSwitcher : undefined} />

      {investmentsLoading ? (
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
          <Stack direction="row" spacing={2} width={1}>
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} variant="rectangular" animation="wave" height={88} sx={{ flex: 1 }} />
            ))}
          </Stack>
          <Skeleton variant="rectangular" animation="wave" width="100%" height={400} />
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
      ) : view === 'board' ? (
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
          <SummaryCards {...summary} loading={loading} />
          <InvestmentTable
            investments={investments}
            prices={prices}
            exchangeRate={exchangeRate}
          />
        </Box>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
          <SummaryCards {...summary} loading={loading} />
          <PortfolioTreemap
            investments={investments}
            prices={prices}
            exchangeRate={exchangeRate}
          />
        </Box>
      )}
    </Container>
  );
}
