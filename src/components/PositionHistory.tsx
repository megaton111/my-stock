'use client';

import { useEffect, useState } from 'react';
import {
  Box, Stack, Typography, Chip, Divider, CircularProgress, Skeleton, IconButton,
} from '@mui/material';
import EditIcon from '@mui/icons-material/EditOutlined';
import { formatCurrency, formatProfit, profitColor } from '@/utils/format';
import type { PositionHistoryResponse, TransactionItem } from '@/app/api/positions/[id]/transactions/route';

interface PositionHistoryProps {
  positionId: number;
  refreshKey?: number;
  onEditBuy?: (tx: TransactionItem) => void;
}

export default function PositionHistory({ positionId, refreshKey, onEditBuy }: PositionHistoryProps) {
  const [data, setData] = useState<PositionHistoryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    fetch(`/api/positions/${positionId}/transactions`)
      .then((res) => {
        if (!res.ok) throw new Error('거래 내역을 불러오지 못했습니다.');
        return res.json();
      })
      .then((json: PositionHistoryResponse) => {
        if (!cancelled) {
          setData(json);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err.message || '오류가 발생했습니다.');
          setLoading(false);
        }
      });
    return () => { cancelled = true; };
  }, [positionId, refreshKey]);

  if (loading) {
    return (
      <Box sx={{ p: 2, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress size={24} />
      </Box>
    );
  }

  if (error || !data) {
    return (
      <Box sx={{ p: 2 }}>
        <Typography variant="body2" color="error.main">{error || '데이터 없음'}</Typography>
      </Box>
    );
  }

  const currency = data.currency as 'USD' | 'KRW';
  const hasAnySell = data.transactions.some((t) => t.type === 'sell');

  return (
    <Box sx={{ p: 2, bgcolor: 'gray1' }}>
      {/* 누적 요약 */}
      <Box sx={{ mb: 2 }}>
        <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>
          누적 요약
        </Typography>
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={{ xs: 1, sm: 3 }}
          sx={{ fontSize: '0.8rem' }}
        >
          <Stack direction="row" spacing={0.75}>
            <Typography variant="body2" color="gray6">총 매수</Typography>
            <Typography variant="body2" fontWeight={600}>
              {data.totalBuyQuantity.toLocaleString()}주
            </Typography>
          </Stack>
          <Stack direction="row" spacing={0.75}>
            <Typography variant="body2" color="gray6">총 매도</Typography>
            <Typography variant="body2" fontWeight={600}>
              {data.totalSellQuantity.toLocaleString()}주
            </Typography>
          </Stack>
          <Stack direction="row" spacing={0.75}>
            <Typography variant="body2" color="gray6">평균 매입가</Typography>
            <Typography variant="body2" fontWeight={600}>
              {formatCurrency(data.avgBuyPrice, currency)}
            </Typography>
          </Stack>
          {hasAnySell && (
            <Stack direction="row" spacing={0.75}>
              <Typography variant="body2" color="gray6">실현손익</Typography>
              <Typography variant="body2" fontWeight={700} color={profitColor(data.totalRealizedPlKrw)}>
                {formatProfit(data.totalRealizedPlKrw)}
              </Typography>
            </Stack>
          )}
        </Stack>
      </Box>

      <Divider sx={{ mb: 1.5 }} />

      {/* 거래 타임라인 */}
      <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>
        거래 내역 ({data.transactions.length}건)
      </Typography>

      {data.transactions.length === 0 ? (
        <Typography variant="body2" color="gray5">거래가 없습니다.</Typography>
      ) : (
        <Stack spacing={0.75}>
          {data.transactions.map((tx) => (
            <TransactionRow
              key={`${tx.type}-${tx.id}`}
              tx={tx}
              currency={currency}
              onEditBuy={onEditBuy}
            />
          ))}
        </Stack>
      )}
    </Box>
  );
}

function TransactionRow({
  tx,
  currency,
  onEditBuy,
}: {
  tx: TransactionItem;
  currency: 'USD' | 'KRW';
  onEditBuy?: (tx: TransactionItem) => void;
}) {
  const isSell = tx.type === 'sell';
  const canEdit = !isSell && !!onEditBuy;
  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: '60px 1fr auto', sm: '90px 50px 1fr auto auto' },
        alignItems: 'center',
        gap: { xs: 0.5, sm: 1.5 },
        px: 1,
        py: 0.75,
        borderRadius: 1,
        bgcolor: 'background.paper',
        border: '1px solid',
        borderColor: 'gray2',
        fontSize: '0.8rem',
      }}
    >
      <Typography variant="body2" color="gray6" sx={{ fontSize: '0.75rem' }}>
        {tx.date}
      </Typography>
      <Chip
        label={isSell ? '매도' : '매수'}
        size="small"
        sx={{
          bgcolor: isSell ? 'error.light' : 'primary.light',
          color: 'common.white',
          fontWeight: 700,
          fontSize: '0.7rem',
          height: 20,
          display: { xs: 'none', sm: 'inline-flex' },
        }}
      />
      <Stack direction="row" spacing={{ xs: 0.75, sm: 1.5 }} sx={{ flexWrap: 'wrap' }}>
        <Typography variant="body2" sx={{ fontSize: '0.75rem' }}>
          <Box component="span" sx={{ display: { xs: 'inline', sm: 'none' }, color: isSell ? 'error.main' : 'primary.main', fontWeight: 700, mr: 0.5 }}>
            {isSell ? '매도' : '매수'}
          </Box>
          {tx.quantity.toLocaleString()}주
        </Typography>
        <Typography variant="body2" color="gray6" sx={{ fontSize: '0.75rem' }}>
          @ {formatCurrency(tx.price, currency)}
        </Typography>
      </Stack>
      {isSell && tx.realizedPlKrw != null ? (
        <Typography
          variant="body2"
          fontWeight={700}
          color={profitColor(tx.realizedPlKrw)}
          sx={{ fontSize: '0.75rem', textAlign: 'right' }}
        >
          {formatProfit(tx.realizedPlKrw)}
        </Typography>
      ) : (
        <Box />
      )}
      {canEdit ? (
        <IconButton
          size="small"
          onClick={() => onEditBuy!(tx)}
          sx={{ p: 0.25 }}
          aria-label="매수 내역 수정"
        >
          <EditIcon sx={{ fontSize: 16 }} />
        </IconButton>
      ) : (
        <Box />
      )}
    </Box>
  );
}

export function PositionHistorySkeleton() {
  return (
    <Box sx={{ p: 2 }}>
      <Skeleton variant="text" width={120} />
      <Skeleton variant="text" width="100%" />
      <Skeleton variant="text" width="80%" />
    </Box>
  );
}
