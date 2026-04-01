'use client';

import { useState, useEffect } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Button, Stack, ToggleButton, ToggleButtonGroup,
  MenuItem, CircularProgress,
} from '@mui/material';
import { Investment, InvestmentInput } from '@/types/investment';

const CATEGORIES = [
  { value: '미국주식', label: '미국주식', suffix: '', currency: 'USD' as const, placeholder: 'AAPL', hint: '' },
  { value: '코스피', label: '코스피', suffix: '.KS', currency: 'KRW' as const, placeholder: '005930', hint: '.KS가 자동으로 붙습니다' },
  { value: '코스닥', label: '코스닥', suffix: '.KQ', currency: 'KRW' as const, placeholder: '373220', hint: '.KQ가 자동으로 붙습니다' },
  { value: '코인', label: '코인', suffix: '-USD', currency: 'USD' as const, placeholder: 'ETH', hint: '-USD가 자동으로 붙습니다' },
  { value: 'ETF', label: 'ETF', suffix: '', currency: 'USD' as const, placeholder: 'SPY', hint: '' },
];

interface InvestmentFormDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: InvestmentInput) => void;
  initial?: Investment | null;
}

const emptyForm: InvestmentInput = {
  name: '',
  ticker: '',
  category: '미국주식',
  quantity: 0,
  avgPrice: 0,
  currency: 'USD',
};

function getCategoryConfig(category: string) {
  return CATEGORIES.find((c) => c.value === category) || CATEGORIES[0];
}

export default function InvestmentFormDialog({ open, onClose, onSubmit, initial }: InvestmentFormDialogProps) {
  const [form, setForm] = useState<InvestmentInput>(emptyForm);
  const [tickerError, setTickerError] = useState('');
  const [validating, setValidating] = useState(false);

  useEffect(() => {
    if (open) {
      setTickerError('');
      setForm(initial ? {
        name: initial.name,
        ticker: stripSuffix(initial.ticker, initial.category),
        category: initial.category,
        quantity: initial.quantity,
        avgPrice: initial.avgPrice,
        currency: initial.currency,
      } : emptyForm);
    }
  }, [open, initial]);

  const handleChange = (field: keyof InvestmentInput, value: string | number) => {
    if (field === 'ticker' || field === 'category') setTickerError('');
    setForm((prev) => {
      const next = { ...prev, [field]: value };
      if (field === 'category') {
        const config = getCategoryConfig(value as string);
        next.currency = config.currency;
      }
      return next;
    });
  };

  const handleSubmit = async () => {
    const submitted = { ...form };
    const config = getCategoryConfig(submitted.category);
    if (config.suffix && !submitted.ticker.endsWith(config.suffix)) {
      submitted.ticker = `${submitted.ticker}${config.suffix}`;
    }

    // 신규 추가 시에만 티커 유효성 검증 (수정 시에는 이미 등록된 종목이므로 스킵)
    if (!initial) {
      setValidating(true);
      try {
        const res = await fetch(`/api/stock/price?symbols=${encodeURIComponent(submitted.ticker)}`);
        const data = await res.json();
        const result = Array.isArray(data) ? data[0] : null;
        if (!result || result.error || !result.price) {
          setTickerError('시세를 불러올 수 없는 티커입니다. 입력값을 확인해주세요.');
          setValidating(false);
          return;
        }
      } catch {
        setTickerError('티커 검증 중 오류가 발생했습니다. 다시 시도해주세요.');
        setValidating(false);
        return;
      }
      setValidating(false);
    }

    onSubmit(submitted);
    onClose();
  };

  const config = getCategoryConfig(form.category);
  const isValid = form.name && form.ticker && form.quantity > 0 && form.avgPrice > 0;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontWeight: 700 }}>
        {initial ? '종목 수정' : '종목 추가'}
      </DialogTitle>
      <DialogContent>
        <Stack spacing={2.5} sx={{ mt: 1 }}>
          <Stack direction="row" spacing={2}>
            <TextField
              label="종목명"
              value={form.name}
              onChange={(e) => handleChange('name', e.target.value)}
              fullWidth
              size="small"
              placeholder="애플"
            />
            <TextField
              label="티커"
              value={form.ticker}
              onChange={(e) => handleChange('ticker', e.target.value.toUpperCase())}
              fullWidth
              size="small"
              placeholder={config.placeholder}
              error={!!tickerError}
              helperText={tickerError || config.hint || undefined}
            />
          </Stack>

          <Stack direction="row" spacing={2} alignItems="center">
            <TextField
              label="카테고리"
              value={form.category}
              onChange={(e) => handleChange('category', e.target.value)}
              select
              size="small"
              sx={{ minWidth: 140 }}
            >
              {CATEGORIES.map((cat) => (
                <MenuItem key={cat.value} value={cat.value}>{cat.label}</MenuItem>
              ))}
            </TextField>

            <ToggleButtonGroup
              value={form.currency}
              exclusive
              onChange={(_, v) => { if (v) handleChange('currency', v); }}
              size="small"
            >
              <ToggleButton value="USD">USD</ToggleButton>
              <ToggleButton value="KRW">KRW</ToggleButton>
            </ToggleButtonGroup>
          </Stack>

          <Stack direction="row" spacing={2}>
            <TextField
              label="보유 수량"
              type="number"
              value={form.quantity || ''}
              onChange={(e) => handleChange('quantity', Number(e.target.value))}
              fullWidth
              size="small"
              slotProps={{ htmlInput: { step: 'any', min: 0 } }}
            />
            <TextField
              label={`매입가 (${form.currency === 'USD' ? '$' : '원'})`}
              type="number"
              value={form.avgPrice || ''}
              onChange={(e) => handleChange('avgPrice', Number(e.target.value))}
              fullWidth
              size="small"
              slotProps={{ htmlInput: { step: 'any', min: 0 } }}
            />
          </Stack>
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.5 }}>
        <Button onClick={onClose} color="inherit">취소</Button>
        <Button onClick={handleSubmit} variant="contained" disabled={!isValid || validating}>
          {validating ? <CircularProgress size={20} color="inherit" /> : initial ? '수정' : '추가'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

/** 수정 모드에서 티커의 접미사를 제거하여 입력 필드에 깨끗하게 표시 */
function stripSuffix(ticker: string, category: string): string {
  const config = getCategoryConfig(category);
  if (config.suffix && ticker.endsWith(config.suffix)) {
    return ticker.slice(0, -config.suffix.length);
  }
  return ticker;
}
