'use client';

import { useState } from 'react';
import {
  Container, Box,
  ToggleButton, ToggleButtonGroup,
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

export default function Home() {
  const [view, setView] = useState<'board' | 'graph'>('board');

  const { investments } = useInvestments();
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
      <PageHeader left={viewSwitcher} />

      {view === 'board' ? (
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
