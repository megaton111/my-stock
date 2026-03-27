'use client';

import { useState, useMemo, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  Container, Typography, Box, Stack, IconButton, Button, TextField,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Paper, CircularProgress, Snackbar, Alert, MenuItem,
  Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import DeleteForeverIcon from '@mui/icons-material/DeleteForever';
import PageHeader from '@/components/PageHeader';
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend, LabelList,
} from 'recharts';
import { useUser } from '@/hooks/useUser';
import { formatCurrency, formatRate, profitColor } from '@/utils/format';

interface DcaEntry {
  id: string;
  date: string;
  amount: number;
  quantity: number;
}

interface DcaRow extends DcaEntry {
  price: number;
  cumAmount: number;
  cumQuantity: number;
  cumAvgPrice: number;
}

interface EditDraft {
  id: string;
  date: string;
  amount: string;
  quantity: string;
}

const CATEGORIES = [
  { value: '미국주식', label: '미국주식', suffix: '', currency: 'USD' as const, placeholder: 'QLD' },
  { value: 'ETF', label: 'ETF', suffix: '', currency: 'USD' as const, placeholder: 'SPY' },
  { value: '코스피', label: '코스피', suffix: '.KS', currency: 'KRW' as const, placeholder: '005930' },
  { value: '코스닥', label: '코스닥', suffix: '.KQ', currency: 'KRW' as const, placeholder: '373220' },
  { value: '코인', label: '코인', suffix: '-USD', currency: 'USD' as const, placeholder: 'BTC' },
];

function getCategoryConfig(category: string) {
  return CATEGORIES.find((c) => c.value === category) || CATEGORIES[0];
}

const DAY_LABELS = ['', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일', '일요일'];

function formatSchedule(type: string | null, value: number | null, qty?: number | null): string | null {
  if (!type || value == null) return null;
  let label = '';
  if (type === 'weekly') label = `매주 ${DAY_LABELS[value] || ''}`;
  else if (type === 'monthly') label = `매달 ${value}일`;
  else return null;
  if (qty) label += ` · ${qty}주씩`;
  return label;
}

const headerCellSx = { color: 'gray7', fontWeight: 600, whiteSpace: 'nowrap' } as const;

const COLUMNS = [
  { label: '날짜', align: 'left' as const },
  { label: '매수금액', align: 'right' as const },
  { label: '수량', align: 'right' as const },
  { label: '평단가', align: 'right' as const },
  { label: '누적매수금액', align: 'right' as const },
  { label: '누적수량', align: 'right' as const },
  { label: '누적평단가', align: 'right' as const },
];

function computeRows(entries: DcaEntry[]): DcaRow[] {
  const sorted = [...entries].sort((a, b) => a.date.localeCompare(b.date));
  let cumAmount = 0;
  let cumQuantity = 0;

  return sorted.map((entry) => {
    const price = entry.quantity > 0 ? entry.amount / entry.quantity : 0;
    cumAmount += entry.amount;
    cumQuantity += entry.quantity;
    const cumAvgPrice = cumQuantity > 0 ? cumAmount / cumQuantity : 0;
    return { ...entry, price, cumAmount, cumQuantity, cumAvgPrice };
  });
}

function getToday(): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function formatDateStr(date: Date): string {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

/** scheduleValue 1(월)~7(일) → JS Date.getDay() 0(일)~6(토) 변환 */
function isScheduleDay(date: Date, type: 'weekly' | 'monthly', value: number): boolean {
  if (type === 'weekly') return date.getDay() === value % 7;
  return date.getDate() === value;
}

/** 마지막 매수일 이후 ~ 오늘까지 미입력된 스케줄 날짜 목록 반환 */
function getPendingScheduleDates(
  scheduleType: 'weekly' | 'monthly' | null,
  scheduleValue: number | null,
  entries: DcaEntry[],
): string[] {
  if (!scheduleType || scheduleValue == null || entries.length === 0) return [];

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const entryDates = new Set(entries.map((e) => e.date));
  const sortedDates = entries.map((e) => e.date).sort();
  const lastDate = new Date(sortedDates[sortedDates.length - 1] + 'T00:00:00');

  const current = new Date(lastDate);
  current.setDate(current.getDate() + 1);

  const pending: string[] = [];
  while (current <= today) {
    const dateStr = formatDateStr(current);
    if (isScheduleDay(current, scheduleType, scheduleValue) && !entryDates.has(dateStr)) {
      pending.push(dateStr);
    }
    current.setDate(current.getDate() + 1);
  }
  return pending;
}

function computeEditPreview(entries: DcaEntry[], draft: EditDraft) {
  const amount = Number(draft.amount) || 0;
  const quantity = Number(draft.quantity) || 0;
  if (!amount || !quantity) return null;

  const patched = entries.map((e) =>
    e.id === draft.id ? { ...e, date: draft.date, amount, quantity } : e,
  );
  const rows = computeRows(patched);
  return rows.find((r) => r.id === draft.id) ?? null;
}

function DcaDetailContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user } = useUser();
  const tickerParam = searchParams.get('ticker') ?? '';
  const isNew = !tickerParam;

  // 신규 등록 모드 상태
  const [stockName, setStockName] = useState('');
  const [stockTicker, setStockTicker] = useState('');
  const [stockCategory, setStockCategory] = useState('미국주식');
  const [targetQuantity, setTargetQuantity] = useState('');
  const [scheduleType, setScheduleType] = useState<'weekly' | 'monthly'>('weekly');
  const [scheduleValue, setScheduleValue] = useState<number>(1);
  const [scheduleQuantity, setScheduleQuantity] = useState('');
  const [registered, setRegistered] = useState(false);

  const catConfig = getCategoryConfig(stockCategory);
  // 실제 Yahoo Finance 조회용 티커 (suffix 포함)
  const fullTicker = isNew ? `${stockTicker}${catConfig.suffix}` : tickerParam;
  const ticker = isNew ? fullTicker : tickerParam;

  // 기존 종목 접근 시 DB에서 가져온 종목 정보
  const [fetchedStockName, setFetchedStockName] = useState('');
  const [fetchedTargetQuantity, setFetchedTargetQuantity] = useState(0);
  const [fetchedScheduleType, setFetchedScheduleType] = useState<string | null>(null);
  const [fetchedScheduleValue, setFetchedScheduleValue] = useState<number | null>(null);
  const [fetchedScheduleQuantity, setFetchedScheduleQuantity] = useState<number | null>(null);

  // 통화 판별: 티커 suffix 기반
  const currency: 'USD' | 'KRW' = useMemo(() => {
    const t = isNew ? fullTicker : tickerParam;
    if (t.endsWith('.KS') || t.endsWith('.KQ')) return 'KRW';
    return 'USD';
  }, [isNew, fullTicker, tickerParam]);

  const [entries, setEntries] = useState<DcaEntry[]>([]);
  const [loading, setLoading] = useState(!isNew);
  const [adding, setAdding] = useState(false);
  const [newDate, setNewDate] = useState(getToday());
  const [newAmount, setNewAmount] = useState('');
  const [newQuantity, setNewQuantity] = useState('');
  const [editing, setEditing] = useState<EditDraft | null>(null);
  const [snackbar, setSnackbar] = useState<string | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [duplicateMsg, setDuplicateMsg] = useState<string | null>(null);
  const [currentPrice, setCurrentPrice] = useState<number | null>(null);

  // 기존 종목: DB에서 매수 기록 로드
  const fetchEntries = useCallback(async () => {
    if (!user || !tickerParam) return;
    try {
      const res = await fetch(`/api/dca/entries?userId=${user.id}&ticker=${tickerParam}`);
      const data = await res.json();
      setEntries(data);
      // 첫 번째 엔트리에서 종목 정보 추출
      if (data.length > 0) {
        setFetchedStockName(data[0].stockName);
        setFetchedTargetQuantity(data[0].targetQuantity);
        setFetchedScheduleType(data[0].scheduleType ?? null);
        setFetchedScheduleValue(data[0].scheduleValue ?? null);
        setFetchedScheduleQuantity(data[0].scheduleQuantity ?? null);
      }
    } catch (err) {
      console.error('Failed to fetch entries:', err);
    } finally {
      setLoading(false);
    }
  }, [user, tickerParam]);

  useEffect(() => {
    if (!isNew) fetchEntries();
  }, [isNew, fetchEntries]);

  // 현재가 조회
  const fetchPrice = useCallback(async () => {
    if (!ticker) return;
    try {
      const res = await fetch(`/api/stock/price?symbols=${ticker}`);
      const data = await res.json();
      if (Array.isArray(data) && data[0]?.price) {
        setCurrentPrice(data[0].price);
      }
    } catch (err) {
      console.error('Failed to fetch price:', err);
    }
  }, [ticker]);

  useEffect(() => {
    if (!isNew || registered) fetchPrice();
  }, [isNew, registered, fetchPrice]);

  // 신규 등록
  const handleRegister = async () => {
    if (!stockName.trim() || !stockTicker.trim() || !targetQuantity.trim() || !user) return;

    // 이미 등록된 종목인지 확인
    try {
      const res = await fetch(`/api/dca?userId=${user.id}`);
      const existing = await res.json();
      if (Array.isArray(existing) && existing.some((item: { ticker: string }) => item.ticker === fullTicker)) {
        setDuplicateMsg(`${stockName}(${fullTicker})은 이미 적립식 투자에 등록된 종목입니다.`);
        return;
      }
    } catch {
      // 조회 실패 시 등록 진행
    }

    setRegistered(true);
    if (scheduleQuantity) setNewQuantity(scheduleQuantity);
    setAdding(true);
  };

  // 투자 종료 (전체 삭제)
  const handleDeleteAll = async () => {
    if (!user || !ticker) return;
    try {
      await fetch(`/api/dca?userId=${user.id}&ticker=${ticker}`, { method: 'DELETE' });
      setDeleteOpen(false);
      router.push('/dca');
    } catch (err) {
      console.error('Failed to delete:', err);
    }
  };

  const rows = useMemo(() => computeRows(entries).reverse(), [entries]);

  // 미입력 스케줄 날짜 계산
  const pendingDates = useMemo(() => {
    const sType = isNew ? (registered ? scheduleType : null) : fetchedScheduleType;
    const sValue = isNew ? (registered ? scheduleValue : null) : fetchedScheduleValue;
    return getPendingScheduleDates(sType as 'weekly' | 'monthly' | null, sValue, entries);
  }, [isNew, registered, scheduleType, scheduleValue, fetchedScheduleType, fetchedScheduleValue, entries]);

  // --- 추가 ---
  const handleAddConfirm = async () => {
    const amount = Number(newAmount);
    const quantity = Number(newQuantity);
    if (!amount || !quantity || !user) return;

    // 같은 날짜에 이미 등록된 기록이 있는지 확인
    const duplicate = entries.find((e) => e.date === newDate);
    if (duplicate) {
      setSnackbar(`${newDate} 날짜에 이미 매수 기록이 있습니다. 하루에 한 번만 등록할 수 있습니다.`);
      return;
    }

    const name = isNew ? stockName : (fetchedStockName || ticker);
    const target = isNew ? Number(targetQuantity) : fetchedTargetQuantity;

    try {
      const res = await fetch('/api/dca/entries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          stockName: name,
          ticker,
          targetQuantity: target,
          date: newDate,
          amount,
          quantity,
          scheduleType: isNew ? scheduleType : undefined,
          scheduleValue: isNew ? scheduleValue : undefined,
          scheduleQuantity: isNew && scheduleQuantity ? Number(scheduleQuantity) : undefined,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        setSnackbar(err.error || '매수 기록 추가에 실패했습니다.');
        return;
      }
      const created = await res.json();
      setEntries((prev) => [...prev, created]);
      setAdding(false);
      setNewDate(getToday());
      setNewAmount('');
      setNewQuantity('');
    } catch (err) {
      console.error('Failed to add entry:', err);
    }
  };

  const handleAddCancel = () => {
    setAdding(false);
    setNewDate(getToday());
    setNewAmount('');
    setNewQuantity('');
  };

  const addPreview = useMemo(() => {
    const amount = Number(newAmount) || 0;
    const quantity = Number(newQuantity) || 0;
    if (!amount || !quantity) return null;

    const price = amount / quantity;
    const computed = computeRows(entries);
    const last = computed[computed.length - 1];
    const cumAmount = (last?.cumAmount ?? 0) + amount;
    const cumQuantity = (last?.cumQuantity ?? 0) + quantity;
    const cumAvgPrice = cumQuantity > 0 ? cumAmount / cumQuantity : 0;

    return { price, cumAmount, cumQuantity, cumAvgPrice };
  }, [newAmount, newQuantity, entries]);

  // --- 수정 ---
  const startEdit = (entry: DcaRow) => {
    setEditing({
      id: entry.id,
      date: entry.date,
      amount: String(entry.amount),
      quantity: String(entry.quantity),
    });
    setAdding(false);
    setNewAmount('');
    setNewQuantity('');
  };

  const handleEditConfirm = async () => {
    if (!editing) return;
    const amount = Number(editing.amount);
    const quantity = Number(editing.quantity);
    if (!amount || !quantity) return;

    // 날짜를 변경한 경우, 다른 기록과 중복되는지 확인
    const duplicate = entries.find((e) => e.id !== editing.id && e.date === editing.date);
    if (duplicate) {
      setSnackbar(`${editing.date} 날짜에 이미 매수 기록이 있습니다. 하루에 한 번만 등록할 수 있습니다.`);
      return;
    }

    try {
      await fetch(`/api/dca/entries/${editing.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: editing.date, amount, quantity }),
      });
      setEntries((prev) =>
        prev.map((e) =>
          e.id === editing.id ? { ...e, date: editing.date, amount, quantity } : e,
        ),
      );
      setEditing(null);
    } catch (err) {
      console.error('Failed to update entry:', err);
    }
  };

  const handleEditCancel = () => {
    setEditing(null);
  };

  const editPreview = useMemo(() => {
    if (!editing) return null;
    return computeEditPreview(entries, editing);
  }, [editing, entries]);

  const isBusy = adding || !!editing;

  const displayName = isNew ? stockName : (fetchedStockName || ticker);
  const displayTarget = isNew ? Number(targetQuantity) : fetchedTargetQuantity;

  // 요약 계산
  const summary = useMemo(() => {
    if (entries.length === 0) return null;
    const computed = computeRows(entries);
    const last = computed[computed.length - 1];
    const totalQuantity = last.cumQuantity;
    const totalAmount = last.cumAmount;
    const avgPrice = last.cumAvgPrice;
    return { totalQuantity, totalAmount, avgPrice };
  }, [entries]);

  const profitInfo = useMemo(() => {
    if (!summary || currentPrice === null) return null;
    const evalAmount = currentPrice * summary.totalQuantity;
    const profit = evalAmount - summary.totalAmount;
    const profitRate = summary.totalAmount > 0 ? (profit / summary.totalAmount) * 100 : 0;
    return { evalAmount, profit, profitRate };
  }, [summary, currentPrice]);

  // 차트 데이터: 날짜별 누적 원금 & 평가금액
  const chartData = useMemo(() => {
    if (entries.length === 0 || currentPrice === null) return [];
    const computed = computeRows(entries);
    const lastIdx = computed.length - 1;
    return computed.map((row, i) => ({
      date: row.date,
      cumAmount: Math.round(row.cumAmount * 100) / 100,
      evalAmount: Math.round(row.cumQuantity * currentPrice * 100) / 100,
      // 마지막 점에만 라벨용 값 세팅
      cumAmountLabel: i === lastIdx ? formatCurrency(row.cumAmount, currency) : '',
      evalAmountLabel: i === lastIdx ? formatCurrency(row.cumQuantity * currentPrice, currency) : '',
    }));
  }, [entries, currentPrice]);

  if (loading) {
    return (
      <Container maxWidth="xl" sx={{ py: 10, position: 'relative' }}>
        <PageHeader
          left={
            <IconButton
              onClick={() => router.push('/dca')}
              sx={{
                border: '1px solid',
                borderColor: 'gray2',
                borderRadius: '4px',
                bgcolor: 'background.paper',
                '&:hover': { bgcolor: 'gray1' },
                width: 40,
                height: 40,
              }}
            >
              <ArrowBackIcon fontSize="small" />
            </IconButton>
          }
        />
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress size={32} />
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ py: 10, position: 'relative' }}>
      <PageHeader
        left={
          <IconButton
            onClick={() => router.push('/dca')}
            sx={{
              border: '1px solid',
              borderColor: 'gray2',
              borderRadius: '4px',
              bgcolor: 'background.paper',
              '&:hover': { bgcolor: 'gray1' },
              width: 40,
              height: 40,
            }}
          >
            <ArrowBackIcon fontSize="small" />
          </IconButton>
        }
      />

      <Stack spacing={1}>
        {/* 신규 등록 폼 */}
        {isNew && !registered ? (
          <Paper
            sx={{
              p: 4,
              border: '1px solid',
              borderColor: 'gray2',
              boxShadow: 'none',
            }}
          >
            <Typography variant="h5" fontWeight={700} sx={{ mb: 3 }}>
              신규 적립식 매수 등록
            </Typography>
            <Stack spacing={2.5} sx={{ maxWidth: 400 }}>
              <TextField
                select
                label="카테고리"
                value={stockCategory}
                onChange={(e) => {
                  setStockCategory(e.target.value);
                  setStockTicker(''); // 카테고리 변경 시 티커 초기화
                }}
                fullWidth
              >
                {CATEGORIES.map((cat) => (
                  <MenuItem key={cat.value} value={cat.value}>{cat.label}</MenuItem>
                ))}
              </TextField>
              <TextField
                label="종목명"
                placeholder={`예: ${catConfig.placeholder}`}
                value={stockName}
                onChange={(e) => setStockName(e.target.value)}
                autoFocus
                fullWidth
              />
              <TextField
                label="티커"
                placeholder={`예: ${catConfig.placeholder}`}
                value={stockTicker}
                onChange={(e) => setStockTicker(e.target.value.toUpperCase())}
                helperText={catConfig.suffix ? `${catConfig.suffix}가 자동으로 붙습니다 (${catConfig.currency})` : `통화: ${catConfig.currency}`}
                fullWidth
              />
              <TextField
                label="목표수량"
                type="number"
                placeholder="예: 1000"
                value={targetQuantity}
                onChange={(e) => setTargetQuantity(e.target.value)}
                slotProps={{ htmlInput: { min: 1 } }}
                fullWidth
              />
              <TextField
                select
                label="투자 주기"
                value={scheduleType}
                onChange={(e) => {
                  const v = e.target.value as 'weekly' | 'monthly';
                  setScheduleType(v);
                  setScheduleValue(1);
                }}
                fullWidth
              >
                <MenuItem value="weekly">매주</MenuItem>
                <MenuItem value="monthly">매달</MenuItem>
              </TextField>
              <TextField
                select
                label={scheduleType === 'weekly' ? '요일' : '날짜'}
                value={scheduleValue}
                onChange={(e) => setScheduleValue(Number(e.target.value))}
                fullWidth
              >
                {scheduleType === 'weekly'
                  ? [
                      { value: 1, label: '월요일' },
                      { value: 2, label: '화요일' },
                      { value: 3, label: '수요일' },
                      { value: 4, label: '목요일' },
                      { value: 5, label: '금요일' },
                      { value: 6, label: '토요일' },
                      { value: 7, label: '일요일' },
                    ].map((d) => (
                      <MenuItem key={d.value} value={d.value}>{d.label}</MenuItem>
                    ))
                  : Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                      <MenuItem key={d} value={d}>{d}일</MenuItem>
                    ))
                }
              </TextField>
              <TextField
                label="1회 매수 수량"
                type="number"
                placeholder="예: 5"
                value={scheduleQuantity}
                onChange={(e) => setScheduleQuantity(e.target.value)}
                slotProps={{ htmlInput: { min: 0, step: 'any' } }}
                fullWidth
              />
              <Box sx={{ display: 'flex', gap: 1.5, pt: 1 }}>
                <Button
                  variant="contained"
                  onClick={handleRegister}
                  disabled={!stockName.trim() || !stockTicker.trim() || !targetQuantity.trim()}
                >
                  등록하고 매수 시작
                </Button>
                <Button
                  variant="outlined"
                  onClick={() => router.push('/dca')}
                  sx={{ color: 'gray7', borderColor: 'gray3' }}
                >
                  취소
                </Button>
              </Box>
            </Stack>
          </Paper>
        ) : (
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            justifyContent="space-between"
            alignItems={{ xs: 'flex-start', sm: 'flex-end' }}
            spacing={2}
            sx={{ pb: 2 }}
          >
            <Box>
              <Typography variant="h4" fontWeight={700}>{displayName}</Typography>
              {displayTarget > 0 && (
                <Typography variant="body2" color="gray5" sx={{ mt: 0.5 }}>
                  {ticker} · 목표수량 {displayTarget.toLocaleString()}주
                </Typography>
              )}
              {(() => {
                const sType = isNew ? scheduleType : fetchedScheduleType;
                const sValue = isNew ? scheduleValue : fetchedScheduleValue;
                const sQty = isNew ? (scheduleQuantity ? Number(scheduleQuantity) : null) : fetchedScheduleQuantity;
                const schedule = formatSchedule(sType, sValue, sQty);
                return schedule ? (
                  <Typography variant="body2" color="primary.main" fontWeight={600} sx={{ mt: 0.5 }}>
                    투자날짜: {schedule}
                  </Typography>
                ) : (
                  <Typography variant="body2" color="gray5" sx={{ mt: 0.5 }}>
                    적립식 매수 일지
                  </Typography>
                );
              })()}
            </Box>
            {!isBusy && (
              <Stack direction="row" spacing={1} flexShrink={0}>
                <Button
                  variant="outlined"
                  color="error"
                  startIcon={<DeleteForeverIcon />}
                  onClick={() => setDeleteOpen(true)}
                >
                  투자 종료
                </Button>
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={() => {
                    const qty = isNew ? scheduleQuantity : (fetchedScheduleQuantity ? String(fetchedScheduleQuantity) : '');
                    setNewQuantity(qty);
                    setAdding(true);
                  }}
                >
                  매수 추가
                </Button>
              </Stack>
            )}
          </Stack>
        )}

        {/* 요약 카드 */}
        {(!isNew || registered) && summary && (
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr 1fr', md: '1fr 1fr 1fr 1fr 1fr' },
              gap: 1,
            }}
          >
            {[
              { label: '현재수량', value: `${summary.totalQuantity.toLocaleString()}주` },
              { label: '평균단가', value: formatCurrency(summary.avgPrice, currency) },
              { label: '총 투자금액', value: formatCurrency(summary.totalAmount, currency) },
              {
                label: '현재가',
                value: currentPrice !== null ? formatCurrency(currentPrice, currency) : '-',
              },
              {
                label: '수익률',
                value: profitInfo ? formatRate(profitInfo.profitRate) : '-',
                color: profitInfo ? profitColor(profitInfo.profitRate) : undefined,
                sub: profitInfo
                  ? `${profitInfo.profit >= 0 ? '+' : ''}${formatCurrency(profitInfo.profit, currency)}`
                  : undefined,
              },
            ].map((item) => (
              <Paper
                key={item.label}
                sx={{
                  p: 2.5,
                  border: '1px solid',
                  borderColor: 'gray2',
                  boxShadow: 'none',
                }}
              >
                <Typography variant="body2" color="gray5" sx={{ mb: 0.5 }}>
                  {item.label}
                </Typography>
                <Typography
                  fontSize={20}
                  fontWeight={700}
                  color={item.color ?? 'text.primary'}
                >
                  {item.value}
                </Typography>
                {item.sub && (
                  <Typography
                    variant="body2"
                    fontWeight={600}
                    color={item.color ?? 'text.primary'}
                    sx={{ mt: 0.25 }}
                  >
                    {item.sub}
                  </Typography>
                )}
              </Paper>
            ))}
          </Box>
        )}

        {/* 원금 vs 평가금액 차트 */}
        {(!isNew || registered) && chartData.length >= 2 && (
          <Paper
            sx={{
              p: 3,
              border: '1px solid',
              borderColor: 'gray2',
              boxShadow: 'none',
            }}
          >
            <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 2 }}>
              원금 vs 평가금액
            </Typography>
            <ResponsiveContainer width="100%" height={350}>
              <LineChart data={chartData} margin={{ top: 25, right: 80, bottom: 25, left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E0E0E0" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 12 }}
                  tickFormatter={(v: string) => v.slice(5)}
                />
                <YAxis
                  tick={{ fontSize: 12 }}
                  tickFormatter={(v: number) => formatCurrency(v, currency)}
                />
                <Tooltip
                  formatter={(value, name) => [
                    formatCurrency(Number(value), currency),
                    name === 'cumAmount' ? '누적 원금' : '평가금액',
                  ]}
                  labelFormatter={(label) => `날짜: ${label}`}
                />
                <Legend
                  formatter={(value: string) =>
                    value === 'cumAmount' ? '누적 원금' : '평가금액'
                  }
                />
                <Line
                  type="monotone"
                  dataKey="cumAmount"
                  stroke="#1976d2"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                >
                  <LabelList
                    dataKey="cumAmountLabel"
                    position="top"
                    offset={10}
                    style={{ fontSize: 12, fontWeight: 600, fill: '#1976d2' }}
                  />
                </Line>
                <Line
                  type="monotone"
                  dataKey="evalAmount"
                  stroke="#d32f2f"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                >
                  <LabelList
                    dataKey="evalAmountLabel"
                    position="bottom"
                    offset={10}
                    style={{ fontSize: 12, fontWeight: 600, fill: '#d32f2f' }}
                  />
                </Line>
              </LineChart>
            </ResponsiveContainer>
          </Paper>
        )}

        {/* 테이블: 등록 완료 후 또는 기존 종목일 때 */}
        {(!isNew || registered) && (
          <TableContainer
            component={Paper}
            sx={{ boxShadow: 'none', border: (theme) => `1px solid ${theme.palette.gray2}` }}
          >
            <Table>
              <TableHead sx={{ bgcolor: 'gray1' }}>
                <TableRow>
                  {COLUMNS.map((col) => (
                    <TableCell key={col.label} align={col.align} sx={headerCellSx}>
                      {col.label}
                    </TableCell>
                  ))}
                  <TableCell sx={headerCellSx} />
                </TableRow>
              </TableHead>
              <TableBody>
                {/* 추가 입력 행 */}
                {adding && (
                  <TableRow sx={{ bgcolor: 'rgba(25, 118, 210, 0.04)' }}>
                    <TableCell>
                      <TextField
                        size="small"
                        type="date"
                        value={newDate}
                        onChange={(e) => setNewDate(e.target.value)}
                        slotProps={{ htmlInput: { style: { textAlign: 'left' } } }}
                        sx={{ width: 200 }}
                      />
                    </TableCell>
                    <TableCell align="right">
                      <TextField
                        size="small"
                        type="number"
                        placeholder="매수금액"
                        value={newAmount}
                        onChange={(e) => setNewAmount(e.target.value)}
                        autoFocus
                        slotProps={{ htmlInput: { min: 0, step: 'any', style: { textAlign: 'right' } } }}
                        sx={{ width: 120 }}
                      />
                    </TableCell>
                    <TableCell align="right">
                      <TextField
                        size="small"
                        type="number"
                        placeholder="수량"
                        value={newQuantity}
                        onChange={(e) => setNewQuantity(e.target.value)}
                        slotProps={{ htmlInput: { min: 0, step: 'any', style: { textAlign: 'right' } } }}
                        sx={{ width: 100 }}
                      />
                    </TableCell>
                    <TableCell align="right" sx={{ color: 'gray5' }}>
                      {addPreview ? formatCurrency(addPreview.price, currency) : '-'}
                    </TableCell>
                    <TableCell align="right" sx={{ color: 'gray5', fontWeight: 600 }}>
                      {addPreview ? formatCurrency(addPreview.cumAmount, currency) : '-'}
                    </TableCell>
                    <TableCell align="right" sx={{ color: 'gray5', fontWeight: 600 }}>
                      {addPreview ? addPreview.cumQuantity.toLocaleString() : '-'}
                    </TableCell>
                    <TableCell align="right" sx={{ color: 'gray5', fontWeight: 600 }}>
                      {addPreview ? formatCurrency(addPreview.cumAvgPrice, currency) : '-'}
                    </TableCell>
                    <TableCell align="center">
                      <Stack direction="row" spacing={0.5} justifyContent="center">
                        <IconButton size="small" onClick={handleAddConfirm} color="primary" disabled={!addPreview}>
                          <CheckIcon fontSize="small" />
                        </IconButton>
                        <IconButton size="small" onClick={handleAddCancel} sx={{ color: 'gray6' }}>
                          <CloseIcon fontSize="small" />
                        </IconButton>
                      </Stack>
                    </TableCell>
                  </TableRow>
                )}

                {/* 미입력 스케줄 행 */}
                {pendingDates.slice().reverse()
                  .filter((date) => !(adding && newDate === date))
                  .map((date) => (
                    <TableRow
                      key={`pending-${date}`}
                      sx={{
                        bgcolor: 'rgba(255, 167, 38, 0.08)',
                        cursor: isBusy ? 'default' : 'pointer',
                        '&:hover': isBusy ? {} : { bgcolor: 'rgba(255, 167, 38, 0.15)' },
                      }}
                      onClick={() => {
                        if (isBusy) return;
                        setNewDate(date);
                        const qty = isNew ? scheduleQuantity : (fetchedScheduleQuantity ? String(fetchedScheduleQuantity) : '');
                        setNewQuantity(qty);
                        setAdding(true);
                      }}
                    >
                      <TableCell>{date}</TableCell>
                      <TableCell align="right" sx={{ color: 'gray4' }}>-</TableCell>
                      <TableCell align="right" sx={{ color: 'gray4' }}>-</TableCell>
                      <TableCell align="right" sx={{ color: 'gray4' }}>-</TableCell>
                      <TableCell align="right" sx={{ color: 'gray4' }}>-</TableCell>
                      <TableCell align="right" sx={{ color: 'gray4' }}>-</TableCell>
                      <TableCell align="right" sx={{ color: 'gray4' }}>-</TableCell>
                      <TableCell align="center">
                        <Typography variant="caption" color="warning.main" fontWeight={600}>
                          미입력
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ))}

                {/* 기존 데이터 */}
                {rows.length === 0 && !adding && pendingDates.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={COLUMNS.length + 1} align="center" sx={{ py: 6, color: 'gray5' }}>
                      매수 기록이 없습니다. 매수 내역을 추가해보세요.
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((entry) =>
                    editing && editing.id === entry.id ? (
                      <TableRow key={entry.id} sx={{ bgcolor: 'rgba(25, 118, 210, 0.04)' }}>
                        <TableCell>
                          <TextField
                            size="small"
                            type="date"
                            value={editing.date}
                            onChange={(e) => setEditing({ ...editing, date: e.target.value })}
                            slotProps={{ htmlInput: { style: { textAlign: 'left' } } }}
                            sx={{ width: 150 }}
                          />
                        </TableCell>
                        <TableCell align="right">
                          <TextField
                            size="small"
                            type="number"
                            value={editing.amount}
                            onChange={(e) => setEditing({ ...editing, amount: e.target.value })}
                            autoFocus
                            slotProps={{ htmlInput: { min: 0, step: 'any', style: { textAlign: 'right' } } }}
                            sx={{ width: 200 }}
                          />
                        </TableCell>
                        <TableCell align="right">
                          <TextField
                            size="small"
                            type="number"
                            value={editing.quantity}
                            onChange={(e) => setEditing({ ...editing, quantity: e.target.value })}
                            slotProps={{ htmlInput: { min: 0, step: 'any', style: { textAlign: 'right' } } }}
                            sx={{ width: 100 }}
                          />
                        </TableCell>
                        <TableCell align="right" sx={{ color: 'gray5' }}>
                          {editPreview ? formatCurrency(editPreview.price, currency) : '-'}
                        </TableCell>
                        <TableCell align="right" sx={{ color: 'gray5', fontWeight: 600 }}>
                          {editPreview ? formatCurrency(editPreview.cumAmount, currency) : '-'}
                        </TableCell>
                        <TableCell align="right" sx={{ color: 'gray5', fontWeight: 600 }}>
                          {editPreview ? editPreview.cumQuantity.toLocaleString() : '-'}
                        </TableCell>
                        <TableCell align="right" sx={{ color: 'gray5', fontWeight: 600 }}>
                          {editPreview ? formatCurrency(editPreview.cumAvgPrice, currency) : '-'}
                        </TableCell>
                        <TableCell align="center">
                          <Stack direction="row" spacing={0.5} justifyContent="center">
                            <IconButton size="small" onClick={handleEditConfirm} color="primary" disabled={!editPreview}>
                              <CheckIcon fontSize="small" />
                            </IconButton>
                            <IconButton size="small" onClick={handleEditCancel} sx={{ color: 'gray6' }}>
                              <CloseIcon fontSize="small" />
                            </IconButton>
                          </Stack>
                        </TableCell>
                      </TableRow>
                    ) : (
                      <TableRow key={entry.id} sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                        <TableCell>{entry.date}</TableCell>
                        <TableCell align="right">{formatCurrency(entry.amount, currency)}</TableCell>
                        <TableCell align="right">{entry.quantity.toLocaleString()}</TableCell>
                        <TableCell align="right">{formatCurrency(entry.price, currency)}</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 600 }}>
                          {formatCurrency(entry.cumAmount, currency)}
                        </TableCell>
                        <TableCell align="right" sx={{ fontWeight: 600 }}>
                          {entry.cumQuantity.toLocaleString()}
                        </TableCell>
                        <TableCell align="right" sx={{ fontWeight: 600 }}>
                          {formatCurrency(entry.cumAvgPrice, currency)}
                        </TableCell>
                        <TableCell align="center">
                          <IconButton
                            size="small"
                            onClick={() => startEdit(entry)}
                            sx={{ color: 'gray6', opacity: isBusy ? 0.3 : 1 }}
                            disabled={isBusy}
                          >
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ),
                  )
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}

      </Stack>

      <Dialog open={deleteOpen} onClose={() => setDeleteOpen(false)}>
        <DialogTitle>적립식 투자 종료</DialogTitle>
        <DialogContent>
          <DialogContentText>
            <strong>{displayName}({ticker})</strong>의 모든 매수 기록이 삭제됩니다.
            이 작업은 되돌릴 수 없습니다. 정말 종료하시겠습니까?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteOpen(false)}>취소</Button>
          <Button onClick={handleDeleteAll} color="error" variant="contained">종료</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={!!duplicateMsg} onClose={() => setDuplicateMsg(null)}>
        <DialogTitle>종목 중복</DialogTitle>
        <DialogContent>
          <DialogContentText>{duplicateMsg}</DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDuplicateMsg(null)} variant="contained">확인</Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={!!snackbar}
        autoHideDuration={3000}
        onClose={() => setSnackbar(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setSnackbar(null)}
          severity="warning"
          variant="filled"
          sx={{ width: '100%' }}
        >
          {snackbar}
        </Alert>
      </Snackbar>
    </Container>
  );
}

export default function DcaDetailPage() {
  return (
    <Suspense>
      <DcaDetailContent />
    </Suspense>
  );
}
