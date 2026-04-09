'use client';

import { useState } from 'react';
import {
  Box,
  Paper,
  Stack,
  Typography,
  Button,
  IconButton,
  CircularProgress,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { useWatchlist } from '@/hooks/useWatchlist';
import { formatRate, profitColor } from '@/utils/format';
import WatchlistAddDialog from './WatchlistAddDialog';

interface WatchlistWidgetProps {
  userId: string;
}

function formatPrice(price: number, currency?: string) {
  if (currency === 'KRW') return `${Math.floor(price).toLocaleString()}원`;
  if (currency === 'USD') return `$${price.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
  return price.toLocaleString(undefined, { maximumFractionDigits: 4 });
}

// 한국 주식(.KS/.KQ)은 종목명, 그 외(미국/코인)는 티커를 타이틀로 사용
function getCardTitle(ticker: string, stockName: string): string {
  const isKorean = ticker.endsWith('.KS') || ticker.endsWith('.KQ');
  return isKorean ? stockName : ticker.replace(/-USD$/, '');
}

export default function WatchlistWidget({ userId }: WatchlistWidgetProps) {
  const { items, quotes, loading, add, remove } = useWatchlist(userId);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [hoverId, setHoverId] = useState<string | null>(null);

  return (
    <Paper sx={{ p: { xs: 1.5, sm: 3 }, borderRadius: 2, width: 1 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
        <Typography variant="body2" color="gray6" gutterBottom>
          관심종목
        </Typography>
        <Button
          size="small"
          variant="outlined"
          onClick={() => setDialogOpen(true)}
        >
          등록
        </Button>
      </Stack>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress size={24} />
        </Box>
      ) : items.length === 0 ? (
        // <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 6 }}>
          <Typography variant="body2" color="gray5">
            등록된 관심종목이 없습니다.
          </Typography>
        </Box>
      ) : (
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: {
              xs: 'repeat(2, 1fr)',
              sm: 'repeat(3, 1fr)',
              md: 'repeat(4, 1fr)',
              lg: 'repeat(5, 1fr)',
            },
            gap: 1,
          }}
        >
          {items.map((item) => {
            const quote = quotes[item.ticker];
            const change = quote?.changePercent;
            const title = getCardTitle(item.ticker, item.stockName);
            return (
              <Paper
                key={item.id}
                onMouseEnter={() => setHoverId(item.id)}
                onMouseLeave={() => setHoverId(null)}
                sx={{
                  position: 'relative',
                  px: 1.5,
                  py: 1.25,
                  border: '1px solid',
                  borderColor: 'gray2',
                  boxShadow: 'none',
                  transition: 'border-color 0.2s, transform 0.2s',
                  '&:hover': {
                    borderColor: 'primary.main',
                    transform: 'translateY(-2px)',
                    boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
                  },
                }}
              >
                <Stack spacing={0.25}>
                  <Typography variant="body2" fontWeight={700} noWrap>
                    {title}
                  </Typography>
                  <Typography variant="body2" fontWeight={600} noWrap>
                    {quote?.price != null ? formatPrice(quote.price, quote.currency) : '-'}
                  </Typography>
                  <Typography
                    variant="caption"
                    sx={{ color: change != null ? profitColor(change) : 'text.disabled' }}
                  >
                    {change != null ? formatRate(change) : '-'}
                  </Typography>
                </Stack>
                {hoverId === item.id && (
                  <IconButton
                    size="small"
                    onClick={() => remove(item.id)}
                    aria-label="삭제"
                    sx={{
                      position: 'absolute',
                      top: 2,
                      right: 2,
                      bgcolor: 'background.paper',
                      '&:hover': { bgcolor: 'gray1' },
                    }}
                  >
                    <CloseIcon sx={{ fontSize: 14 }} />
                  </IconButton>
                )}
              </Paper>
            );
          })}
        </Box>
      )}

      <WatchlistAddDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onAdd={add}
      />
    </Paper>
  );
}
