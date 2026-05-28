'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Button, Stack, FormControl, InputLabel, Select, MenuItem, IconButton,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import CloseIcon from '@mui/icons-material/Close';
import dayjs, { Dayjs } from 'dayjs';
import 'dayjs/locale/ko';
import type { Investment } from '@/types/investment';

interface JournalLinkDialogProps {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
  investment: Investment | null;
  userId: string | null | undefined;
}

interface FormState {
  marketType: string;
  stockName: string;
  ticker: string;
  broker: string;
  price: string;
  quantity: string;
  buyReason: string;
  plan: string;
  expectedInvestment: string;
  tradeDate: Dayjs | null;
}

function categoryToMarketType(category: string): string {
  if (category === '코스피') return 'KOSPI';
  if (category === '코스닥') return 'KOSDAQ';
  return 'US';
}

function stripTickerSuffix(ticker: string): string {
  return ticker.replace(/\.(KS|KQ)$/i, '').replace(/-USD$/i, '');
}

export default function JournalLinkDialog({ open, onClose, onCreated, investment, userId }: JournalLinkDialogProps) {
  const router = useRouter();
  const [form, setForm] = useState<FormState>({
    marketType: '', stockName: '', ticker: '', broker: '',
    price: '', quantity: '', buyReason: '', plan: '',
    expectedInvestment: '', tradeDate: dayjs(),
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open && investment) {
      setForm({
        marketType: categoryToMarketType(investment.category),
        stockName: investment.name,
        ticker: stripTickerSuffix(investment.ticker),
        broker: investment.broker || '',
        price: String(investment.avgPrice),
        quantity: String(investment.quantity),
        buyReason: '',
        plan: '',
        expectedInvestment: '',
        tradeDate: dayjs(),
      });
    }
  }, [open, investment]);

  const buyAmount = (Number(form.price) || 0) * (Number(form.quantity) || 0);

  const handleSubmit = async () => {
    if (!userId || !investment || !form.tradeDate) return;
    setSaving(true);
    try {
      const res = await fetch('/api/trading-journal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          investmentId: investment.id,
          marketType: form.marketType,
          stockName: form.stockName,
          ticker: form.ticker,
          broker: form.broker,
          buyReason: form.buyReason,
          plan: form.plan,
          expectedInvestment: Number(form.expectedInvestment) || 0,
          price: Number(form.price),
          quantity: Number(form.quantity),
          amount: buyAmount,
          tradeDate: form.tradeDate.format('YYYY-MM-DD'),
        }),
      });
      if (res.ok) {
        const data = await res.json();
        onCreated();
        router.push(`/trading-journal/detail?id=${data.id}`);
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        매매일지 작성
        <IconButton onClick={onClose} size="small"><CloseIcon /></IconButton>
      </DialogTitle>
      <DialogContent dividers>
        <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="ko">
          <Stack spacing={2.5} sx={{ pt: 1 }}>
            <Stack direction="row" spacing={2}>
              <FormControl size="small" sx={{ minWidth: 120 }}>
                <InputLabel>구분</InputLabel>
                <Select value={form.marketType} label="구분" onChange={(e) => setForm((f) => ({ ...f, marketType: e.target.value }))}>
                  <MenuItem value="US">미국</MenuItem>
                  <MenuItem value="KOSPI">코스피</MenuItem>
                  <MenuItem value="KOSDAQ">코스닥</MenuItem>
                </Select>
              </FormControl>
              <TextField label="종목명" size="small" value={form.stockName} onChange={(e) => setForm((f) => ({ ...f, stockName: e.target.value }))} sx={{ flex: 1 }} />
              <TextField label="티커" size="small" value={form.ticker} onChange={(e) => setForm((f) => ({ ...f, ticker: e.target.value }))} sx={{ flex: 1 }} />
            </Stack>

            <DatePicker
              label="매수일"
              value={form.tradeDate}
              onChange={(v) => setForm((f) => ({ ...f, tradeDate: v }))}
              slotProps={{ textField: { size: 'small', fullWidth: true } }}
            />

            <Stack direction="row" spacing={2}>
              <TextField label="매수가" size="small" type="number" value={form.price} onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))} sx={{ flex: 1 }} />
              <TextField label="수량" size="small" type="number" value={form.quantity} onChange={(e) => setForm((f) => ({ ...f, quantity: e.target.value }))} sx={{ flex: 1 }} />
              <TextField label="매입금액" size="small" value={buyAmount.toLocaleString()} slotProps={{ input: { readOnly: true } }} sx={{ flex: 1 }} />
            </Stack>

            <TextField label="매수 이유" size="small" multiline minRows={2} value={form.buyReason} onChange={(e) => setForm((f) => ({ ...f, buyReason: e.target.value }))} />
            <TextField label="계획" size="small" multiline minRows={2} value={form.plan} onChange={(e) => setForm((f) => ({ ...f, plan: e.target.value }))} />
            <TextField label="총 투자예상금액" size="small" type="number" value={form.expectedInvestment} onChange={(e) => setForm((f) => ({ ...f, expectedInvestment: e.target.value }))} />
          </Stack>
        </LocalizationProvider>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose}>취소</Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={saving || !form.stockName || !form.ticker || !form.price || !form.quantity}
        >
          {saving ? '등록 중...' : '등록 및 이동'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
