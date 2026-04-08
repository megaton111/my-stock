'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Button, Stack, Typography, Box, Divider,
} from '@mui/material';
import { Investment } from '@/types/investment';
import { formatCurrency, formatProfit, profitColor } from '@/utils/format';

export interface SellSubmitData {
  sellDate: string;
  sellQuantity: number;
  sellPrice: number;
  exchangeRate: number;
}

interface SellDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: SellSubmitData) => Promise<void> | void;
  investment: Investment | null;
  currentPrice?: number;
  currentExchangeRate: number;
}

function todayString() {
  return new Date().toISOString().slice(0, 10);
}

export default function SellDialog({
  open,
  onClose,
  onSubmit,
  investment,
  currentPrice,
  currentExchangeRate,
}: SellDialogProps) {
  const [sellDate, setSellDate] = useState(todayString());
  const [sellQuantity, setSellQuantity] = useState<number>(0);
  const [sellPrice, setSellPrice] = useState<number>(0);
  const [exchangeRate, setExchangeRate] = useState<number>(currentExchangeRate);
  const [submitting, setSubmitting] = useState(false);

  // 다이얼로그가 열릴 때 초기값 세팅
  useEffect(() => {
    if (open && investment) {
      setSellDate(todayString());
      setSellQuantity(0);
      setSellPrice(currentPrice ?? investment.avgPrice);
      setExchangeRate(currentExchangeRate);
      setSubmitting(false);
    }
  }, [open, investment, currentPrice, currentExchangeRate]);

  const isUSD = investment?.currency === 'USD';
  const heldQty = investment?.quantity ?? 0;
  const avgBuyPrice = investment?.avgPrice ?? 0;

  // 실시간 실현손익 미리보기
  const { realizedPl, realizedPlKrw, valid, error } = useMemo(() => {
    if (!investment) {
      return { realizedPl: 0, realizedPlKrw: 0, valid: false, error: '' };
    }
    if (sellQuantity <= 0 || sellPrice <= 0) {
      return { realizedPl: 0, realizedPlKrw: 0, valid: false, error: '' };
    }
    if (sellQuantity > heldQty) {
      return { realizedPl: 0, realizedPlKrw: 0, valid: false, error: '매도 수량이 보유 수량을 초과합니다.' };
    }
    if (isUSD && exchangeRate <= 0) {
      return { realizedPl: 0, realizedPlKrw: 0, valid: false, error: '환율을 입력해주세요.' };
    }
    const pl = (sellPrice - avgBuyPrice) * sellQuantity;
    const plKrw = isUSD ? pl * exchangeRate : pl;
    return { realizedPl: pl, realizedPlKrw: plKrw, valid: true, error: '' };
  }, [investment, sellQuantity, sellPrice, exchangeRate, isUSD, heldQty, avgBuyPrice]);

  const handleSellAll = () => {
    setSellQuantity(heldQty);
  };

  const handleSubmit = async () => {
    if (!valid || !investment) return;
    setSubmitting(true);
    try {
      await onSubmit({
        sellDate,
        sellQuantity,
        sellPrice,
        exchangeRate: isUSD ? exchangeRate : 1,
      });
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  const willBeFullSell = sellQuantity > 0 && sellQuantity === heldQty;

  if (!investment) return null;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontWeight: 700 }}>
        {investment.name} 매도
      </DialogTitle>
      <DialogContent>
        <Stack spacing={2.5} sx={{ mt: 1 }}>
          {/* 보유 정보 요약 */}
          <Box sx={{ p: 1.5, bgcolor: 'gray1', borderRadius: 1 }}>
            <Stack direction="row" justifyContent="space-between">
              <Typography variant="body2" color="gray6">보유 수량</Typography>
              <Typography variant="body2" fontWeight={600}>{heldQty.toLocaleString()}</Typography>
            </Stack>
            <Stack direction="row" justifyContent="space-between">
              <Typography variant="body2" color="gray6">평균 매입가</Typography>
              <Typography variant="body2" fontWeight={600}>
                {formatCurrency(avgBuyPrice, investment.currency)}
              </Typography>
            </Stack>
          </Box>

          <TextField
            label="매도일"
            type="date"
            value={sellDate}
            onChange={(e) => setSellDate(e.target.value)}
            size="small"
            fullWidth
            slotProps={{ inputLabel: { shrink: true } }}
          />

          <Stack direction="row" spacing={1} alignItems="flex-start">
            <TextField
              label="매도 수량"
              type="number"
              value={sellQuantity || ''}
              onChange={(e) => setSellQuantity(Number(e.target.value))}
              size="small"
              fullWidth
              slotProps={{ htmlInput: { step: 'any', min: 0, max: heldQty } }}
              helperText={`최대 ${heldQty.toLocaleString()}`}
            />
            <Button
              onClick={handleSellAll}
              size="small"
              variant="outlined"
              sx={{ mt: 0.25, whiteSpace: 'nowrap' }}
            >
              전량
            </Button>
          </Stack>

          <TextField
            label={`매도 단가 (${isUSD ? '$' : '원'})`}
            type="number"
            value={sellPrice || ''}
            onChange={(e) => setSellPrice(Number(e.target.value))}
            size="small"
            fullWidth
            slotProps={{ htmlInput: { step: 'any', min: 0 } }}
            helperText={currentPrice ? `현재가: ${formatCurrency(currentPrice, investment.currency)}` : undefined}
          />

          {isUSD && (
            <TextField
              label="환율 (USD → KRW)"
              type="number"
              value={exchangeRate || ''}
              onChange={(e) => setExchangeRate(Number(e.target.value))}
              size="small"
              fullWidth
              slotProps={{ htmlInput: { step: 'any', min: 0 } }}
              helperText="자동으로 현재 환율이 입력되며 수정 가능합니다"
            />
          )}

          <Divider />

          {/* 실시간 실현손익 미리보기 */}
          <Box sx={{ p: 1.5, bgcolor: 'gray1', borderRadius: 1 }}>
            <Typography variant="body2" color="gray6" sx={{ mb: 0.5 }}>
              예상 실현손익
            </Typography>
            {error ? (
              <Typography variant="body2" color="error.main">{error}</Typography>
            ) : valid ? (
              <Stack spacing={0.25}>
                <Typography variant="h6" fontWeight={700} color={profitColor(realizedPlKrw)}>
                  {formatProfit(realizedPlKrw)}
                </Typography>
                {isUSD && (
                  <Typography variant="body2" color={profitColor(realizedPl)}>
                    ({realizedPl >= 0 ? '+' : ''}{realizedPl.toFixed(2)} USD)
                  </Typography>
                )}
              </Stack>
            ) : (
              <Typography variant="body2" color="gray5">
                매도 수량과 단가를 입력해주세요
              </Typography>
            )}
          </Box>

          {willBeFullSell && (
            <Box sx={{ p: 1.5, border: '1px solid', borderColor: 'warning.light', borderRadius: 1, bgcolor: 'warning.light', opacity: 0.95 }}>
              <Typography variant="body2" color="text.primary">
                전량매도로 해당 종목의 보유가 종료됩니다. 활성 보유 목록에서 제거되지만,
                거래 내역은 <strong>매도 완료 종목</strong> 섹션과 대시보드에서 확인할 수 있습니다.
              </Typography>
            </Box>
          )}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.5 }}>
        <Button onClick={onClose} color="inherit">취소</Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          color="error"
          disabled={!valid || submitting}
        >
          {submitting ? '처리 중...' : '매도'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
