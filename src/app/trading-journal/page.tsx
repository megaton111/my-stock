'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Container, Box, Typography, Paper, Stack, CircularProgress, Button,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField,
  FormControl, InputLabel, Select, MenuItem, IconButton,
} from '@mui/material';
import CalculateIcon from '@mui/icons-material/Calculate';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import AddIcon from '@mui/icons-material/Add';
import CloseIcon from '@mui/icons-material/Close';
import dayjs, { Dayjs } from 'dayjs';
import 'dayjs/locale/ko';
import PageHeader from '@/components/PageHeader';
import { useUser } from '@/hooks/useUser';
import { formatRate, profitColor } from '@/utils/format';

interface JournalItem {
  id: string;
  marketType: string;
  stockName: string;
  ticker: string;
  broker: string;
  firstBuyDate: string | null;
  lastSellDate: string | null;
  holdingQty: number;
  resultStatus: 'holding' | 'sold';
  realizedProfitRate: number | null;
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
  targetSellPrice: string;
  stopLossPrice: string;
  tradeDate: Dayjs | null;
}

const EMPTY_FORM: FormState = {
  marketType: '', stockName: '', ticker: '', broker: '',
  price: '', quantity: '', buyReason: '', plan: '',
  expectedInvestment: '', targetSellPrice: '', stopLossPrice: '',
  tradeDate: dayjs(),
};

const BROKERS = [
  '한국투자증권', '미래에셋증권', '삼성증권', 'NH투자증권', 'KB증권',
  '키움증권', '신한투자증권', '대신증권', '하나증권', '토스증권',
  '카카오페이증권', 'IBK투자증권', '유안타증권', 'DB금융투자', '한화투자증권',
  '교보증권', '현대차증권', 'SK증권', '부국증권', '이베스트투자증권',
];

export default function TradingJournalPage() {
  const router = useRouter();
  const { user } = useUser();
  const [items, setItems] = useState<JournalItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  // 2% 룰 손절가 계산
  const calcStopLoss = (() => {
    const expected = Number(form.expectedInvestment) || 0;
    const price = Number(form.price) || 0;
    const qty = Number(form.quantity) || 0;
    if (!expected || !price || !qty) return null;
    const lossLimit = expected * 0.02;
    const perShareLoss = lossLimit / qty;
    const stopLoss = price - perShareLoss;
    return { lossLimit, perShareLoss, stopLoss: Math.max(stopLoss, 0) };
  })();

  const fetchList = useCallback(async () => {
    if (!user) return;
    try {
      const res = await fetch(`/api/trading-journal?userId=${user.id}`);
      if (res.ok) setItems(await res.json());
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { fetchList(); }, [fetchList]);

  const handleChange = (field: keyof FormState, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const buyAmount = (() => {
    const p = Number(form.price) || 0;
    const q = Number(form.quantity) || 0;
    return p * q;
  })();

  const handleSubmit = async () => {
    if (!user || !form.marketType || !form.stockName || !form.ticker || !form.price || !form.quantity || !form.tradeDate) return;
    setSaving(true);
    try {
      const res = await fetch('/api/trading-journal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          marketType: form.marketType,
          stockName: form.stockName,
          ticker: form.ticker,
          broker: form.broker,
          buyReason: form.buyReason,
          plan: form.plan,
          expectedInvestment: Number(form.expectedInvestment) || 0,
          targetSellPrice: Number(form.targetSellPrice) || 0,
          stopLossPrice: Number(form.stopLossPrice) || 0,
          price: Number(form.price),
          quantity: Number(form.quantity),
          amount: buyAmount,
          tradeDate: form.tradeDate.format('YYYY-MM-DD'),
        }),
      });
      if (res.ok) {
        setDialogOpen(false);
        setForm(EMPTY_FORM);
        await fetchList();
      }
    } finally {
      setSaving(false);
    }
  };

  const marketLabel = (type: string) => {
    if (type === 'US') return '미국';
    if (type === 'KOSPI') return '코스피';
    return '코스닥';
  };

  return (
    <Container maxWidth="md" sx={{ pt: 10, pb: 10 }}>
      <PageHeader />

      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
        <Typography variant="h5" fontWeight={700}>매매일지</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setDialogOpen(true)}>
          등록
        </Button>
      </Stack>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
          <CircularProgress />
        </Box>
      ) : items.length === 0 ? (
        <Paper sx={{ p: 6, textAlign: 'center' }}>
          <Typography color="text.secondary">등록된 매매일지가 없습니다.</Typography>
        </Paper>
      ) : (
        <TableContainer component={Paper}>
          <Table size="small" sx={{ '& thead th': { bgcolor: 'gray1' } }}>
            <TableHead>
              <TableRow>
                <TableCell align="center" sx={{ fontWeight: 600, width: 60 }}>번호</TableCell>
                <TableCell align="center" sx={{ fontWeight: 600, width: 100 }}>상태</TableCell>
                <TableCell align="center" sx={{ fontWeight: 600, width: 80 }}>구분</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>종목명</TableCell>
                <TableCell align="center" sx={{ fontWeight: 600, width: 160 }}>매수일</TableCell>
                <TableCell align="center" sx={{ fontWeight: 600, width: 160 }}>매도일</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {items.map((item, idx) => (
                <TableRow key={item.id} hover sx={{ cursor: 'pointer' }}>
                  <TableCell align="center">{idx + 1}</TableCell>
                  <TableCell align="center">
                    {item.resultStatus === 'holding' ? (
                      <Typography variant="body2" fontWeight={600} color="text.secondary">보유중</Typography>
                    ) : (
                      <Typography variant="body2" fontWeight={600} sx={{ color: profitColor(item.realizedProfitRate ?? 0) }}>
                        {formatRate(item.realizedProfitRate ?? 0)}
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell align="center">
                    <Typography variant="body2">{marketLabel(item.marketType)}</Typography>
                  </TableCell>
                  <TableCell
                    onClick={() => router.push(`/trading-journal/detail?id=${item.id}`)}
                    sx={{ color: 'primary.main', fontWeight: 600, cursor: 'pointer', '&:hover': { textDecoration: 'underline' } }}
                  >
                    {item.stockName}
                  </TableCell>
                  <TableCell align="center">{item.firstBuyDate || '-'}</TableCell>
                  <TableCell align="center">{item.lastSellDate || '-'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* 등록 다이얼로그 */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          매매일지 등록
          <IconButton onClick={() => setDialogOpen(false)} size="small"><CloseIcon /></IconButton>
        </DialogTitle>
        <DialogContent dividers>
          <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="ko">
            <Stack spacing={2.5} sx={{ pt: 1 }}>
              <FormControl fullWidth size="small" required>
                <InputLabel>구분</InputLabel>
                <Select value={form.marketType} label="구분" onChange={(e) => handleChange('marketType', e.target.value)}>
                  <MenuItem value="US">미국</MenuItem>
                  <MenuItem value="KOSPI">코스피</MenuItem>
                  <MenuItem value="KOSDAQ">코스닥</MenuItem>
                </Select>
              </FormControl>

              <TextField label="종목명" size="small" required value={form.stockName} onChange={(e) => handleChange('stockName', e.target.value)} />
              <TextField label="티커" size="small" required value={form.ticker} onChange={(e) => handleChange('ticker', e.target.value)} placeholder={form.marketType === 'US' ? 'AAPL' : '005930'} />

              <DatePicker
                label="매수일"
                value={form.tradeDate}
                onChange={(v) => setForm((prev) => ({ ...prev, tradeDate: v }))}
                slotProps={{ textField: { size: 'small', required: true, fullWidth: true } }}
              />

              <FormControl fullWidth size="small">
                <InputLabel>증권사</InputLabel>
                <Select value={form.broker} label="증권사" onChange={(e) => handleChange('broker', e.target.value)}>
                  {BROKERS.map((b) => <MenuItem key={b} value={b}>{b}</MenuItem>)}
                </Select>
              </FormControl>

              <Stack direction="row" spacing={2}>
                <TextField label="매수가" size="small" required type="number" value={form.price} onChange={(e) => handleChange('price', e.target.value)} sx={{ flex: 1 }} />
                <TextField label="수량" size="small" required type="number" value={form.quantity} onChange={(e) => handleChange('quantity', e.target.value)} sx={{ flex: 1 }} />
              </Stack>

              <TextField label="매입금액" size="small" value={buyAmount.toLocaleString()} slotProps={{ input: { readOnly: true } }} />

              <TextField label="매수 이유" size="small" multiline minRows={3} value={form.buyReason} onChange={(e) => handleChange('buyReason', e.target.value)} />
              <TextField label="계획" size="small" multiline minRows={3} value={form.plan} onChange={(e) => handleChange('plan', e.target.value)} />
              <TextField label="총 투자예상금액" size="small" type="number" value={form.expectedInvestment} onChange={(e) => handleChange('expectedInvestment', e.target.value)} />
              <TextField label="목표 매도가" size="small" type="number" value={form.targetSellPrice} onChange={(e) => handleChange('targetSellPrice', e.target.value)} />

              {/* 손절가 + 2% 룰 자동 계산 */}
              <Stack direction="row" spacing={1} alignItems="center">
                <TextField label="손절가" size="small" type="number" value={form.stopLossPrice} onChange={(e) => handleChange('stopLossPrice', e.target.value)} sx={{ flex: 1 }} />
                {calcStopLoss && (
                  <Button
                    size="small"
                    variant="outlined"
                    startIcon={<CalculateIcon />}
                    onClick={() => handleChange('stopLossPrice', String(Math.floor(calcStopLoss.stopLoss)))}
                    sx={{ whiteSpace: 'nowrap', height: 40 }}
                  >
                    2% 룰 적용
                  </Button>
                )}
              </Stack>
              {calcStopLoss && (
                <Paper variant="outlined" sx={{ p: 1.5, bgcolor: 'gray1' }}>
                  <Stack direction="row" spacing={2} flexWrap="wrap">
                    <Typography variant="caption" color="text.secondary">
                      손실 한도(2%): {Math.floor(calcStopLoss.lossLimit).toLocaleString()}원
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      주당 허용 손실: {calcStopLoss.perShareLoss.toLocaleString(undefined, { maximumFractionDigits: 2 })}원
                    </Typography>
                    <Typography variant="caption" fontWeight={700} color="primary.main">
                      손절가: {calcStopLoss.stopLoss.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                    </Typography>
                  </Stack>
                </Paper>
              )}
            </Stack>
          </LocalizationProvider>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setDialogOpen(false)}>취소</Button>
          <Button
            variant="contained"
            onClick={handleSubmit}
            disabled={saving || !form.marketType || !form.stockName || !form.ticker || !form.price || !form.quantity}
          >
            {saving ? '등록 중...' : '등록'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
