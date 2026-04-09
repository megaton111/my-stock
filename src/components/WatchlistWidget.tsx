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
import AddIcon from '@mui/icons-material/Add';
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
        <Stack divider={<Box sx={{ borderBottom: 1, borderColor: 'divider' }} />}>
          {items.map((item) => {
            const quote = quotes[item.ticker];
            const change = quote?.changePercent;
            return (
              <Stack
                key={item.id}
                direction="row"
                alignItems="center"
                justifyContent="space-between"
                onMouseEnter={() => setHoverId(item.id)}
                onMouseLeave={() => setHoverId(null)}
                sx={{ py: 1.25, px: 0.5, position: 'relative' }}
              >
                <Box sx={{ minWidth: 0, flex: 1 }}>
                  <Typography variant="body2" fontWeight={600} noWrap>
                    {item.stockName}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {item.ticker}
                  </Typography>
                </Box>
                <Stack direction="row" spacing={2} alignItems="center">
                  <Box sx={{ textAlign: 'right' }}>
                    <Typography variant="body2" fontWeight={600}>
                      {quote?.price != null ? formatPrice(quote.price, quote.currency) : '-'}
                    </Typography>
                    {change != null && (
                      <Typography variant="caption" sx={{ color: profitColor(change) }}>
                        {formatRate(change)}
                      </Typography>
                    )}
                  </Box>
                  <Box sx={{ width: 28, display: 'flex', justifyContent: 'center' }}>
                    {hoverId === item.id && (
                      <IconButton
                        size="small"
                        onClick={() => remove(item.id)}
                        aria-label="삭제"
                      >
                        <CloseIcon fontSize="small" />
                      </IconButton>
                    )}
                  </Box>
                </Stack>
              </Stack>
            );
          })}
        </Stack>
      )}

      <WatchlistAddDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onAdd={add}
      />
    </Paper>
  );
}
