'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Button, Stack, Typography, Box, Divider,
} from '@mui/material';
import { Investment } from '@/types/investment';
import { formatCurrency } from '@/utils/format';

export interface BuySubmitData {
  buyDate: string;
  buyQuantity: number;
  buyPrice: number;
  exchangeRate: number;
}

export interface BuyEditInitial {
  id: number;
  date: string;
  quantity: number;
  price: number;
  exchangeRate: number;
}

interface BuyDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: BuySubmitData) => Promise<void> | void;
  investment: Investment | null;
  currentPrice?: number;
  currentExchangeRate: number;
  editTransaction?: BuyEditInitial | null;
}

function todayString() {
  return new Date().toISOString().slice(0, 10);
}

export default function BuyDialog({
  open,
  onClose,
  onSubmit,
  investment,
  currentPrice,
  currentExchangeRate,
  editTransaction,
}: BuyDialogProps) {
  const isEdit = !!editTransaction;
  const [buyDate, setBuyDate] = useState(todayString());
  const [buyQuantity, setBuyQuantity] = useState<number>(0);
  const [buyPrice, setBuyPrice] = useState<number>(0);
  const [exchangeRate, setExchangeRate] = useState<number>(currentExchangeRate);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open && investment) {
      if (editTransaction) {
        setBuyDate(editTransaction.date);
        setBuyQuantity(editTransaction.quantity);
        setBuyPrice(editTransaction.price);
        setExchangeRate(editTransaction.exchangeRate || currentExchangeRate);
      } else {
        setBuyDate(todayString());
        setBuyQuantity(0);
        setBuyPrice(currentPrice ?? investment.avgPrice);
        setExchangeRate(currentExchangeRate);
      }
      setSubmitting(false);
    }
  }, [open, investment, currentPrice, currentExchangeRate, editTransaction]);

  const isUSD = investment?.currency === 'USD';
  const heldQty = investment?.quantity ?? 0;
  const avgBuyPrice = investment?.avgPrice ?? 0;

  // 매수 후 평균가/수량 미리보기
  const { newAvg, newQty, addCost, addCostKrw, valid, error } = useMemo(() => {
    if (!investment) {
      return { newAvg: 0, newQty: 0, addCost: 0, addCostKrw: 0, valid: false, error: '' };
    }
    if (buyQuantity <= 0 || buyPrice <= 0) {
      return { newAvg: avgBuyPrice, newQty: heldQty, addCost: 0, addCostKrw: 0, valid: false, error: '' };
    }
    if (isUSD && exchangeRate <= 0) {
      return { newAvg: 0, newQty: 0, addCost: 0, addCostKrw: 0, valid: false, error: '환율을 입력해주세요.' };
    }
    const totalQty = heldQty + buyQuantity;
    const avg = (avgBuyPrice * heldQty + buyPrice * buyQuantity) / totalQty;
    const cost = buyPrice * buyQuantity;
    const costKrw = isUSD ? cost * exchangeRate : cost;
    return { newAvg: avg, newQty: totalQty, addCost: cost, addCostKrw: costKrw, valid: true, error: '' };
  }, [investment, buyQuantity, buyPrice, exchangeRate, isUSD, heldQty, avgBuyPrice]);

  const handleSubmit = async () => {
    if (!valid || !investment) return;
    setSubmitting(true);
    try {
      await onSubmit({
        buyDate,
        buyQuantity,
        buyPrice,
        exchangeRate: isUSD ? exchangeRate : 1,
      });
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  if (!investment) return null;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontWeight: 700 }}>
        {investment.name} {isEdit ? '매수 내역 수정' : '추가매수'}
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
            label="매수일"
            type="date"
            value={buyDate}
            onChange={(e) => setBuyDate(e.target.value)}
            size="small"
            fullWidth
            slotProps={{ inputLabel: { shrink: true } }}
          />

          <TextField
            label="매수 수량"
            type="number"
            value={buyQuantity || ''}
            onChange={(e) => setBuyQuantity(Number(e.target.value))}
            size="small"
            fullWidth
            slotProps={{ htmlInput: { step: 'any', min: 0 } }}
          />

          <TextField
            label={`매수 단가 (${isUSD ? '$' : '원'})`}
            type="number"
            value={buyPrice || ''}
            onChange={(e) => setBuyPrice(Number(e.target.value))}
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

          {/* 매수 후 예상 미리보기 */}
          {isEdit ? (
            <Box sx={{ p: 1.5, bgcolor: 'gray1', borderRadius: 1 }}>
              <Typography variant="body2" color="gray6">
                수정 시 보유 수량과 평균 매입가가 자동으로 재계산됩니다.
              </Typography>
            </Box>
          ) : (
            <Box sx={{ p: 1.5, bgcolor: 'gray1', borderRadius: 1 }}>
              <Typography variant="body2" color="gray6" sx={{ mb: 0.5 }}>
                매수 후 예상
              </Typography>
              {error ? (
                <Typography variant="body2" color="error.main">{error}</Typography>
              ) : valid ? (
                <Stack spacing={0.5}>
                  <Stack direction="row" justifyContent="space-between">
                    <Typography variant="body2" color="gray6">새 보유 수량</Typography>
                    <Typography variant="body2" fontWeight={600}>
                      {newQty.toLocaleString()}
                    </Typography>
                  </Stack>
                  <Stack direction="row" justifyContent="space-between">
                    <Typography variant="body2" color="gray6">새 평균 매입가</Typography>
                    <Typography variant="body2" fontWeight={600}>
                      {formatCurrency(newAvg, investment.currency)}
                    </Typography>
                  </Stack>
                  <Stack direction="row" justifyContent="space-between">
                    <Typography variant="body2" color="gray6">추가 매수금액</Typography>
                    <Typography variant="body2" fontWeight={700}>
                      {formatCurrency(addCostKrw, 'KRW')}
                      {isUSD && (
                        <Typography component="span" variant="caption" color="gray5" sx={{ ml: 0.5 }}>
                          ({addCost.toFixed(2)} USD)
                        </Typography>
                      )}
                    </Typography>
                  </Stack>
                </Stack>
              ) : (
                <Typography variant="body2" color="gray5">
                  매수 수량과 단가를 입력해주세요
                </Typography>
              )}
            </Box>
          )}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.5 }}>
        <Button onClick={onClose} color="inherit">취소</Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          color="primary"
          disabled={!valid || submitting}
        >
          {submitting ? '처리 중...' : isEdit ? '수정' : '매수'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
