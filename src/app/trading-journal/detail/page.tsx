'use client';

import { Suspense } from 'react';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  Container, Box, Typography, Paper, Stack, CircularProgress, Button,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  TextField, FormControl, Select, MenuItem, IconButton,
  Dialog, DialogTitle, DialogContent, DialogActions, DialogContentText,
  Snackbar, Alert, Chip,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import dayjs, { Dayjs } from 'dayjs';
import 'dayjs/locale/ko';
import dynamic from 'next/dynamic';
import 'react-quill-new/dist/quill.snow.css';
import DOMPurify from 'dompurify';
import PageHeader from '@/components/PageHeader';
import { useUser } from '@/hooks/useUser';
import { formatRate, profitColor } from '@/utils/format';

const ReactQuill = dynamic(() => import('react-quill-new'), { ssr: false });

async function uploadImage(file: File, userId: string): Promise<string | null> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('userId', userId);
  try {
    const res = await fetch('/api/trading-journal/upload', { method: 'POST', body: formData });
    if (res.ok) {
      const data = await res.json();
      return data.url;
    }
    return null;
  } catch {
    return null;
  }
}

interface Transaction {
  id: string;
  type: 'buy' | 'sell';
  price: number;
  quantity: number;
  amount: number;
  tradeDate: string;
}

interface JournalDetail {
  id: string;
  marketType: string;
  stockName: string;
  ticker: string;
  broker: string;
  buyReason: string;
  plan: string;
  expectedInvestment: number;
  targetSellPrice: number;
  stopLossPrice: number;
  memo: string;
  transactions: Transaction[];
}

interface AddForm {
  type: 'buy' | 'sell';
  price: string;
  quantity: string;
  tradeDate: Dayjs | null;
}

const EMPTY_ADD: AddForm = { type: 'buy', price: '', quantity: '', tradeDate: dayjs() };

function formatAmount(n: number, marketType: string) {
  if (marketType === 'US') return `$${n.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
  return `${Math.floor(n).toLocaleString()}원`;
}

function formatPrice(n: number, marketType: string) {
  if (marketType === 'US') return `$${n.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
  return n.toLocaleString();
}

function TradingJournalDetail() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user } = useUser();
  const journalId = searchParams.get('id');

  const [detail, setDetail] = useState<JournalDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentPrice, setCurrentPrice] = useState<number | null>(null);

  // 거래 추가
  const [adding, setAdding] = useState(false);
  const [addForm, setAddForm] = useState<AddForm>(EMPTY_ADD);
  const [addSaving, setAddSaving] = useState(false);

  // 거래 수정
  const [editingTx, setEditingTx] = useState<string | null>(null);
  const [editTxForm, setEditTxForm] = useState({ price: '', quantity: '', tradeDate: null as Dayjs | null });
  const [editTxSaving, setEditTxSaving] = useState(false);

  // 거래 삭제
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  // 일지 삭제
  const [journalDeleteOpen, setJournalDeleteOpen] = useState(false);

  // 매수이유/계획 수정
  const [editingInfo, setEditingInfo] = useState(false);
  const [infoForm, setInfoForm] = useState({ buyReason: '', plan: '', expectedInvestment: '', targetSellPrice: '', stopLossPrice: '' });
  const [infoSaving, setInfoSaving] = useState(false);

  // 메모
  const [editingMemo, setEditingMemo] = useState(false);
  const [memoValue, setMemoValue] = useState('');
  const [memoSaving, setMemoSaving] = useState(false);
  const [imageUploading, setImageUploading] = useState(false);

  // 알림
  const [snack, setSnack] = useState<{ msg: string; severity: 'success' | 'error' } | null>(null);

  // Quill 에디터 인스턴스 접근 (동적 import에서 ref 대신 DOM으로 접근)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const getQuillEditor = useCallback((): any => {
    const container = document.querySelector('.ql-container');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (container as any)?.__quill ?? null;
  }, []);

  // 이미지 업로드 후 에디터에 삽입
  const insertImageToEditor = useCallback(async (file: File) => {
    if (!user) return;
    setImageUploading(true);
    try {
      const url = await uploadImage(file, String(user.id));
      if (!url) {
        setSnack({ msg: '이미지 업로드에 실패했습니다.', severity: 'error' });
        return;
      }
      const editor = getQuillEditor();
      if (editor) {
        const range = editor.getSelection(true);
        editor.insertEmbed(range.index, 'image', url);
        editor.setSelection(range.index + 1);
      } else {
        setMemoValue((prev) => prev + `<p><img src="${url}" /></p>`);
      }
    } finally {
      setImageUploading(false);
    }
  }, [user, getQuillEditor]);

  // 툴바 이미지 버튼 핸들러
  const imageHandler = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/png,image/jpeg,image/gif,image/webp';
    input.onchange = () => {
      const file = input.files?.[0];
      if (file) insertImageToEditor(file);
    };
    input.click();
  }, [insertImageToEditor]);

  // 클립보드 붙여넣기 핸들러
  useEffect(() => {
    if (!editingMemo) return;

    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of items) {
        if (item.type.startsWith('image/')) {
          e.preventDefault();
          const file = item.getAsFile();
          if (file) insertImageToEditor(file);
          return;
        }
      }
    };

    const editorEl = document.querySelector('.ql-editor');
    editorEl?.addEventListener('paste', handlePaste as EventListener);
    return () => editorEl?.removeEventListener('paste', handlePaste as EventListener);
  }, [editingMemo, insertImageToEditor]);

  const quillModules = useMemo(() => ({
    toolbar: {
      container: [
        [{ header: [1, 2, 3, false] }],
        ['bold', 'italic', 'underline', 'strike'],
        [{ color: [] }, { background: [] }],
        [{ list: 'ordered' }, { list: 'bullet' }],
        ['blockquote', 'code-block'],
        ['link', 'image'],
        ['clean'],
      ],
      handlers: {
        image: imageHandler,
      },
    },
  }), [imageHandler]);

  const fetchDetail = useCallback(async () => {
    if (!user || !journalId) return;
    try {
      const res = await fetch(`/api/trading-journal/${journalId}?userId=${user.id}`);
      if (res.ok) {
        const data = await res.json();
        setDetail(data);
        setMemoValue(data.memo || '');
      }
    } finally {
      setLoading(false);
    }
  }, [user, journalId]);

  useEffect(() => { fetchDetail(); }, [fetchDetail]);

  // 현재가 조회
  useEffect(() => {
    if (!detail?.ticker || !detail?.marketType) return;
    let symbol = detail.ticker;
    if (detail.marketType === 'KOSPI') symbol = `${detail.ticker}.KS`;
    else if (detail.marketType === 'KOSDAQ') symbol = `${detail.ticker}.KQ`;

    const fetchPrice = async () => {
      try {
        const res = await fetch(`/api/stock/price?symbols=${symbol}`);
        if (res.ok) {
          const data = await res.json();
          if (data.length > 0 && data[0].price) setCurrentPrice(data[0].price);
        }
      } catch { /* ignore */ }
    };
    fetchPrice();
  }, [detail?.ticker, detail?.marketType]);

  // 누적 계산
  const cumulativeData = useMemo(() => {
    if (!detail) return [];
    let totalBuyQty = 0;
    let totalBuyAmount = 0;
    let totalSellQty = 0;

    return detail.transactions.map((tx) => {
      if (tx.type === 'buy') {
        totalBuyQty += tx.quantity;
        totalBuyAmount += tx.amount;
      } else {
        totalSellQty += tx.quantity;
      }
      const holdingQty = totalBuyQty - totalSellQty;
      const avgBuyPrice = totalBuyQty > 0 ? totalBuyAmount / totalBuyQty : 0;
      const evalAmount = currentPrice ? holdingQty * currentPrice : null;
      const investedAmount = holdingQty * avgBuyPrice;
      const profitLoss = evalAmount !== null ? evalAmount - investedAmount : null;
      const profitRate = investedAmount > 0 && profitLoss !== null ? (profitLoss / investedAmount) * 100 : null;

      return { ...tx, holdingQty, avgBuyPrice, evalAmount, profitLoss, profitRate };
    });
  }, [detail, currentPrice]);

  // 현재 보유수량
  const currentHoldingQty = cumulativeData.length > 0 ? cumulativeData[cumulativeData.length - 1].holdingQty : 0;

  // 거래 추가
  const handleAddTransaction = async () => {
    if (!user || !detail || !addForm.price || !addForm.quantity || !addForm.tradeDate) return;
    const qty = Number(addForm.quantity);

    if (addForm.type === 'sell' && qty > currentHoldingQty) {
      setSnack({ msg: `보유수량(${currentHoldingQty})을 초과하여 매도할 수 없습니다.`, severity: 'error' });
      return;
    }

    setAddSaving(true);
    try {
      const res = await fetch(`/api/trading-journal/${detail.id}/transactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          type: addForm.type,
          price: Number(addForm.price),
          quantity: qty,
          amount: Number(addForm.price) * qty,
          tradeDate: addForm.tradeDate.format('YYYY-MM-DD'),
        }),
      });
      if (res.ok) {
        setAdding(false);
        setAddForm(EMPTY_ADD);
        await fetchDetail();
      } else {
        const err = await res.json();
        setSnack({ msg: err.error || '등록 실패', severity: 'error' });
      }
    } finally {
      setAddSaving(false);
    }
  };

  // 거래 삭제
  const handleDeleteTransaction = async () => {
    if (!user || !detail || !deleteTarget) return;
    const res = await fetch(`/api/trading-journal/${detail.id}/transactions/${deleteTarget}?userId=${user.id}`, { method: 'DELETE' });
    if (res.ok) {
      setDeleteTarget(null);
      await fetchDetail();
    } else {
      const err = await res.json();
      setSnack({ msg: err.error || '삭제 실패', severity: 'error' });
      setDeleteTarget(null);
    }
  };

  // 거래 수정 시작
  const startEditTx = (tx: Transaction) => {
    setEditingTx(tx.id);
    setEditTxForm({
      price: String(tx.price),
      quantity: String(tx.quantity),
      tradeDate: dayjs(tx.tradeDate),
    });
  };

  // 거래 수정 저장
  const handleEditTransaction = async () => {
    if (!user || !detail || !editingTx || !editTxForm.price || !editTxForm.quantity || !editTxForm.tradeDate) return;
    setEditTxSaving(true);
    try {
      const price = Number(editTxForm.price);
      const quantity = Number(editTxForm.quantity);
      const res = await fetch(`/api/trading-journal/${detail.id}/transactions/${editingTx}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          price,
          quantity,
          amount: price * quantity,
          tradeDate: editTxForm.tradeDate.format('YYYY-MM-DD'),
        }),
      });
      if (res.ok) {
        setEditingTx(null);
        await fetchDetail();
        setSnack({ msg: '거래가 수정되었습니다.', severity: 'success' });
      } else {
        const err = await res.json();
        setSnack({ msg: err.error || '수정 실패', severity: 'error' });
      }
    } finally {
      setEditTxSaving(false);
    }
  };

  // 일지 삭제
  const handleDeleteJournal = async () => {
    if (!user || !detail) return;
    const res = await fetch(`/api/trading-journal/${detail.id}?userId=${user.id}`, { method: 'DELETE' });
    if (res.ok) {
      router.push('/trading-journal');
    } else {
      const err = await res.json();
      setSnack({ msg: err.error || '삭제 실패', severity: 'error' });
      setJournalDeleteOpen(false);
    }
  };

  // 매수이유/계획 저장
  const handleSaveInfo = async () => {
    if (!user || !detail) return;
    setInfoSaving(true);
    try {
      const res = await fetch(`/api/trading-journal/${detail.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          buyReason: infoForm.buyReason,
          plan: infoForm.plan,
          expectedInvestment: Number(infoForm.expectedInvestment) || 0,
          targetSellPrice: Number(infoForm.targetSellPrice) || 0,
          stopLossPrice: Number(infoForm.stopLossPrice) || 0,
        }),
      });
      if (res.ok) {
        setEditingInfo(false);
        setDetail((prev) => prev ? {
          ...prev,
          buyReason: infoForm.buyReason,
          plan: infoForm.plan,
          expectedInvestment: Number(infoForm.expectedInvestment) || 0,
          targetSellPrice: Number(infoForm.targetSellPrice) || 0,
          stopLossPrice: Number(infoForm.stopLossPrice) || 0,
        } : prev);
        setSnack({ msg: '저장되었습니다.', severity: 'success' });
      }
    } finally {
      setInfoSaving(false);
    }
  };

  // 메모 저장
  const handleSaveMemo = async () => {
    if (!user || !detail) return;
    setMemoSaving(true);
    try {
      const res = await fetch(`/api/trading-journal/${detail.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, memo: memoValue }),
      });
      if (res.ok) {
        setEditingMemo(false);
        setDetail((prev) => prev ? { ...prev, memo: memoValue } : prev);
        setSnack({ msg: '메모가 저장되었습니다.', severity: 'success' });
      }
    } finally {
      setMemoSaving(false);
    }
  };

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ pt: 10, pb: 10 }}>
        <PageHeader />
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}><CircularProgress /></Box>
      </Container>
    );
  }

  if (!detail) {
    return (
      <Container maxWidth="lg" sx={{ pt: 10, pb: 10 }}>
        <PageHeader />
        <Typography>매매일지를 찾을 수 없습니다.</Typography>
      </Container>
    );
  }

  const addFormAmount = (Number(addForm.price) || 0) * (Number(addForm.quantity) || 0);

  return (
    <Container maxWidth="lg" sx={{ pt: 10, pb: 10 }}>
      <PageHeader
        left={
          <IconButton onClick={() => router.push('/trading-journal')} sx={{ border: '1px solid', borderColor: 'gray2', borderRadius: '4px', bgcolor: 'background.paper' }}>
            <ArrowBackIcon fontSize="small" />
          </IconButton>
        }
      />

      {/* 헤더 */}
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 3 }}>
        <Stack direction="row" alignItems="center" spacing={2}>
          <Typography variant="h5" fontWeight={700}>{detail.stockName}</Typography>
          <Chip label={detail.broker} size="small" variant="outlined" />
          <Typography variant="body2" color="text.secondary">{detail.ticker}</Typography>
        </Stack>
        <Button color="error" size="small" startIcon={<DeleteIcon />} onClick={() => setJournalDeleteOpen(true)}>
          삭제
        </Button>
      </Stack>

      {/* 매수이유 / 계획 */}
      <Box sx={{ mb: 3 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
          <Typography variant="subtitle1" fontWeight={600}>매수 정보</Typography>
          {!editingInfo ? (
            <Button size="small" startIcon={<EditIcon />} onClick={() => {
              setInfoForm({
                buyReason: detail.buyReason || '',
                plan: detail.plan || '',
                expectedInvestment: detail.expectedInvestment ? String(detail.expectedInvestment) : '',
                targetSellPrice: detail.targetSellPrice ? String(detail.targetSellPrice) : '',
                stopLossPrice: detail.stopLossPrice ? String(detail.stopLossPrice) : '',
              });
              setEditingInfo(true);
            }}>
              수정
            </Button>
          ) : (
            <Stack direction="row" spacing={1}>
              <Button size="small" variant="contained" onClick={handleSaveInfo} disabled={infoSaving}>
                {infoSaving ? '저장 중...' : '저장'}
              </Button>
              <Button size="small" onClick={() => setEditingInfo(false)}>취소</Button>
            </Stack>
          )}
        </Stack>

        {editingInfo ? (
          <Stack spacing={2}>
            <TextField label="매수 이유" size="small" multiline minRows={3} value={infoForm.buyReason} onChange={(e) => setInfoForm((f) => ({ ...f, buyReason: e.target.value }))} />
            <TextField label="계획" size="small" multiline minRows={3} value={infoForm.plan} onChange={(e) => setInfoForm((f) => ({ ...f, plan: e.target.value }))} />
            <Stack direction="row" spacing={2}>
              <TextField label="총 투자예상금액" size="small" type="number" value={infoForm.expectedInvestment} onChange={(e) => setInfoForm((f) => ({ ...f, expectedInvestment: e.target.value }))} sx={{ flex: 1 }} />
              <TextField label="목표 매도가" size="small" type="number" value={infoForm.targetSellPrice} onChange={(e) => setInfoForm((f) => ({ ...f, targetSellPrice: e.target.value }))} sx={{ flex: 1 }} />
            </Stack>
            <TextField label="손절가" size="small" type="number" value={infoForm.stopLossPrice} onChange={(e) => setInfoForm((f) => ({ ...f, stopLossPrice: e.target.value }))} fullWidth />
          </Stack>
        ) : (
          <Paper sx={{ p: 2.5 }}>
            <Stack spacing={1.5}>
              <Box>
                <Typography variant="caption" color="text.secondary" fontWeight={600}>매수 이유</Typography>
                <Typography sx={{ whiteSpace: 'pre-wrap', fontSize: 12 }}>{detail.buyReason || '-'}</Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary" fontWeight={600}>계획</Typography>
                <Typography sx={{ whiteSpace: 'pre-wrap', fontSize: 12 }}>{detail.plan || '-'}</Typography>
              </Box>
              {(detail.expectedInvestment > 0 || detail.targetSellPrice > 0 || detail.stopLossPrice > 0) && (
                <Stack direction="row" spacing={3}>
                  {detail.expectedInvestment > 0 && (
                    <Box>
                      <Typography variant="caption" color="text.secondary" fontWeight={600}>총 투자예상금액</Typography>
                      <Typography variant="body2">{formatAmount(detail.expectedInvestment, detail.marketType)}</Typography>
                    </Box>
                  )}
                  {detail.targetSellPrice > 0 && (
                    <Box>
                      <Typography variant="caption" color="text.secondary" fontWeight={600}>목표 매도가</Typography>
                      <Typography variant="body2" color="error.main">{formatPrice(detail.targetSellPrice, detail.marketType)}</Typography>
                    </Box>
                  )}
                  {detail.stopLossPrice > 0 && (
                    <Box>
                      <Typography variant="caption" color="text.secondary" fontWeight={600}>손절가</Typography>
                      <Typography variant="body2" color="primary.main">{formatPrice(detail.stopLossPrice, detail.marketType)}</Typography>
                    </Box>
                  )}
                </Stack>
              )}
            </Stack>
          </Paper>
        )}
      </Box>

      {/* 거래 테이블 */}
      <Box sx={{ mb: 3 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
          <Typography variant="subtitle1" fontWeight={600}>거래 내역</Typography>
          <Button size="small" startIcon={<AddIcon />} onClick={() => setAdding(true)} disabled={adding}>
            추가
          </Button>
        </Stack>

        <TableContainer component={Paper} sx={{ overflowX: 'auto' }}>
          <Table size="small" sx={{ minWidth: 800, fontSize: '0.75rem', '& td, & th': { px: 0.5, py: 0.25, fontSize: 'inherit' }, '& thead th': { bgcolor: 'gray1' }, '& input, & .MuiSelect-select, & .MuiInputBase-input': { fontSize: '0.75rem' } }}>
            <TableHead>
              <TableRow>
                <TableCell align="center" rowSpan={2} sx={{ fontWeight: 600, borderRight: '1px solid', borderColor: 'divider', minWidth: 50 }}>구분</TableCell>
                <TableCell align="center" rowSpan={2} sx={{ fontWeight: 600, borderRight: '1px solid', borderColor: 'divider', minWidth: 100 }}>일자</TableCell>
                <TableCell align="center" colSpan={3} sx={{ fontWeight: 600, borderRight: '1px solid', borderColor: 'divider' }}>매수</TableCell>
                <TableCell align="center" colSpan={3} sx={{ fontWeight: 600, borderRight: '1px solid', borderColor: 'divider' }}>매도</TableCell>
                <TableCell align="center" rowSpan={2} sx={{ fontWeight: 600, minWidth: 70 }}>보유수량</TableCell>
                <TableCell align="center" rowSpan={2} sx={{ fontWeight: 600, minWidth: 80 }}>현재가</TableCell>
                <TableCell align="center" rowSpan={2} sx={{ fontWeight: 600, minWidth: 90 }}>평가액</TableCell>
                <TableCell align="center" rowSpan={2} sx={{ fontWeight: 600, minWidth: 90 }}>손익금</TableCell>
                <TableCell align="center" rowSpan={2} sx={{ fontWeight: 600, minWidth: 70 }}>수익률</TableCell>
                <TableCell align="center" rowSpan={2} sx={{ fontWeight: 600, width: 40 }} />
              </TableRow>
              <TableRow>
                <TableCell align="center" sx={{ fontWeight: 600, minWidth: 80 }}>가격</TableCell>
                <TableCell align="center" sx={{ fontWeight: 600, minWidth: 60 }}>수량</TableCell>
                <TableCell align="center" sx={{ fontWeight: 600, borderRight: '1px solid', borderColor: 'divider', minWidth: 90 }}>금액</TableCell>
                <TableCell align="center" sx={{ fontWeight: 600, minWidth: 80 }}>가격</TableCell>
                <TableCell align="center" sx={{ fontWeight: 600, minWidth: 60 }}>수량</TableCell>
                <TableCell align="center" sx={{ fontWeight: 600, borderRight: '1px solid', borderColor: 'divider', minWidth: 90 }}>금액</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {cumulativeData.map((row) => (
                editingTx === row.id ? (
                  <LocalizationProvider key={row.id} dateAdapter={AdapterDayjs} adapterLocale="ko">
                    <TableRow sx={{ bgcolor: 'action.hover' }}>
                      <TableCell align="center" sx={{ borderRight: '1px solid', borderColor: 'divider' }}>
                        <Typography fontSize="inherit" fontWeight={600} color={row.type === 'buy' ? 'error.main' : 'primary.main'}>
                          {row.type === 'buy' ? '매수' : '매도'}
                        </Typography>
                      </TableCell>
                      <TableCell align="center" sx={{ borderRight: '1px solid', borderColor: 'divider' }}>
                        <DatePicker
                          value={editTxForm.tradeDate}
                          onChange={(v) => setEditTxForm((f) => ({ ...f, tradeDate: v }))}
                          slotProps={{ textField: { size: 'small', sx: { width: 140, '& .MuiInputBase-input': { fontSize: '0.75rem' }, '& .MuiInputBase-root': { fontSize: '0.75rem' } } } }}
                        />
                      </TableCell>
                      {/* 매수 입력 */}
                      <TableCell align="right">
                        {row.type === 'buy' ? (
                          <TextField size="small" type="number" value={editTxForm.price} onChange={(e) => setEditTxForm((f) => ({ ...f, price: e.target.value }))} sx={{ width: 110 }} />
                        ) : '-'}
                      </TableCell>
                      <TableCell align="right">
                        {row.type === 'buy' ? (
                          <TextField size="small" type="number" value={editTxForm.quantity} onChange={(e) => setEditTxForm((f) => ({ ...f, quantity: e.target.value }))} sx={{ width: 80 }} />
                        ) : '-'}
                      </TableCell>
                      <TableCell align="right" sx={{ borderRight: '1px solid', borderColor: 'divider' }}>
                        {row.type === 'buy' ? formatAmount((Number(editTxForm.price) || 0) * (Number(editTxForm.quantity) || 0), detail.marketType) : '-'}
                      </TableCell>
                      {/* 매도 입력 */}
                      <TableCell align="right">
                        {row.type === 'sell' ? (
                          <TextField size="small" type="number" value={editTxForm.price} onChange={(e) => setEditTxForm((f) => ({ ...f, price: e.target.value }))} sx={{ width: 110 }} />
                        ) : '-'}
                      </TableCell>
                      <TableCell align="right">
                        {row.type === 'sell' ? (
                          <TextField size="small" type="number" value={editTxForm.quantity} onChange={(e) => setEditTxForm((f) => ({ ...f, quantity: e.target.value }))} sx={{ width: 80 }} />
                        ) : '-'}
                      </TableCell>
                      <TableCell align="right" sx={{ borderRight: '1px solid', borderColor: 'divider' }}>
                        {row.type === 'sell' ? formatAmount((Number(editTxForm.price) || 0) * (Number(editTxForm.quantity) || 0), detail.marketType) : '-'}
                      </TableCell>
                      <TableCell colSpan={5} />
                      <TableCell align="center">
                        <Stack direction="row" spacing={0.5}>
                          <IconButton size="small" color="primary" onClick={handleEditTransaction} disabled={editTxSaving || !editTxForm.price || !editTxForm.quantity}>
                            <CheckIcon fontSize="small" />
                          </IconButton>
                          <IconButton size="small" onClick={() => setEditingTx(null)}>
                            <CloseIcon fontSize="small" />
                          </IconButton>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  </LocalizationProvider>
                ) : (
                <TableRow key={row.id}>
                  <TableCell align="center" sx={{ borderRight: '1px solid', borderColor: 'divider' }}>
                    <Typography fontSize="inherit" fontWeight={600} color={row.type === 'buy' ? 'error.main' : 'primary.main'}>
                      {row.type === 'buy' ? '매수' : '매도'}
                    </Typography>
                  </TableCell>
                  <TableCell align="center" sx={{ borderRight: '1px solid', borderColor: 'divider' }}>
                    <Typography fontSize="inherit">{row.tradeDate}</Typography>
                  </TableCell>
                  {/* 매수 셀 */}
                  <TableCell align="right" sx={{ color: row.type === 'buy' ? 'text.primary' : 'text.disabled' }}>
                    {row.type === 'buy' ? formatPrice(row.price, detail.marketType) : '-'}
                  </TableCell>
                  <TableCell align="right" sx={{ color: row.type === 'buy' ? 'text.primary' : 'text.disabled' }}>
                    {row.type === 'buy' ? row.quantity.toLocaleString() : '-'}
                  </TableCell>
                  <TableCell align="right" sx={{ borderRight: '1px solid', borderColor: 'divider', color: row.type === 'buy' ? 'text.primary' : 'text.disabled' }}>
                    {row.type === 'buy' ? formatAmount(row.amount, detail.marketType) : '-'}
                  </TableCell>
                  {/* 매도 셀 */}
                  <TableCell align="right" sx={{ color: row.type === 'sell' ? 'text.primary' : 'text.disabled' }}>
                    {row.type === 'sell' ? formatPrice(row.price, detail.marketType) : '-'}
                  </TableCell>
                  <TableCell align="right" sx={{ color: row.type === 'sell' ? 'text.primary' : 'text.disabled' }}>
                    {row.type === 'sell' ? row.quantity.toLocaleString() : '-'}
                  </TableCell>
                  <TableCell align="right" sx={{ borderRight: '1px solid', borderColor: 'divider', color: row.type === 'sell' ? 'text.primary' : 'text.disabled' }}>
                    {row.type === 'sell' ? formatAmount(row.amount, detail.marketType) : '-'}
                  </TableCell>
                  {/* 자동 계산 셀 */}
                  <TableCell align="right">{row.holdingQty.toLocaleString()}</TableCell>
                  <TableCell align="right">{currentPrice ? formatPrice(currentPrice, detail.marketType) : '-'}</TableCell>
                  <TableCell align="right">{row.evalAmount !== null ? formatAmount(row.evalAmount, detail.marketType) : '-'}</TableCell>
                  <TableCell align="right" sx={{ color: row.profitLoss !== null ? profitColor(row.profitLoss) : 'text.secondary' }}>
                    {row.profitLoss !== null ? formatAmount(row.profitLoss, detail.marketType) : '-'}
                  </TableCell>
                  <TableCell align="right" sx={{ color: row.profitRate !== null ? profitColor(row.profitRate) : 'text.secondary' }}>
                    {row.profitRate !== null ? formatRate(row.profitRate) : '-'}
                  </TableCell>
                  <TableCell align="center">
                    <Stack direction="row" spacing={0.5}>
                      <IconButton size="small" onClick={() => startEditTx(row)} sx={{ opacity: 0.5, '&:hover': { opacity: 1 } }}>
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton size="small" onClick={() => setDeleteTarget(row.id)} sx={{ opacity: 0.5, '&:hover': { opacity: 1 } }}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Stack>
                  </TableCell>
                </TableRow>
                )
              ))}

              {/* 추가 입력 행 */}
              {adding && (
                <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="ko">
                  <TableRow sx={{ bgcolor: 'action.hover' }}>
                    <TableCell align="center" sx={{ borderRight: '1px solid', borderColor: 'divider' }}>
                      <FormControl size="small" sx={{ minWidth: 60 }}>
                        <Select value={addForm.type} onChange={(e) => setAddForm((f) => ({ ...f, type: e.target.value as 'buy' | 'sell' }))}>
                          <MenuItem value="buy">매수</MenuItem>
                          <MenuItem value="sell">매도</MenuItem>
                        </Select>
                      </FormControl>
                    </TableCell>
                    <TableCell align="center" sx={{ borderRight: '1px solid', borderColor: 'divider' }}>
                      <DatePicker
                        value={addForm.tradeDate}
                        onChange={(v) => setAddForm((f) => ({ ...f, tradeDate: v }))}
                        slotProps={{ textField: { size: 'small', sx: { width: 140, '& .MuiInputBase-input': { fontSize: '0.75rem' }, '& .MuiInputBase-root': { fontSize: '0.75rem' } } } }}
                      />
                    </TableCell>
                    {/* 매수 입력 */}
                    <TableCell align="right">
                      {addForm.type === 'buy' ? (
                        <TextField size="small" type="number" value={addForm.price} onChange={(e) => setAddForm((f) => ({ ...f, price: e.target.value }))} sx={{ width: 110 }} />
                      ) : '-'}
                    </TableCell>
                    <TableCell align="right">
                      {addForm.type === 'buy' ? (
                        <TextField size="small" type="number" value={addForm.quantity} onChange={(e) => setAddForm((f) => ({ ...f, quantity: e.target.value }))} sx={{ width: 80 }} />
                      ) : '-'}
                    </TableCell>
                    <TableCell align="right" sx={{ borderRight: '1px solid', borderColor: 'divider' }}>
                      {addForm.type === 'buy' ? formatAmount(addFormAmount, detail.marketType) : '-'}
                    </TableCell>
                    {/* 매도 입력 */}
                    <TableCell align="right">
                      {addForm.type === 'sell' ? (
                        <TextField size="small" type="number" value={addForm.price} onChange={(e) => setAddForm((f) => ({ ...f, price: e.target.value }))} sx={{ width: 110 }} />
                      ) : '-'}
                    </TableCell>
                    <TableCell align="right">
                      {addForm.type === 'sell' ? (
                        <TextField size="small" type="number" value={addForm.quantity} onChange={(e) => setAddForm((f) => ({ ...f, quantity: e.target.value }))} sx={{ width: 80 }} />
                      ) : '-'}
                    </TableCell>
                    <TableCell align="right" sx={{ borderRight: '1px solid', borderColor: 'divider' }}>
                      {addForm.type === 'sell' ? formatAmount(addFormAmount, detail.marketType) : '-'}
                    </TableCell>
                    <TableCell colSpan={5} />
                    <TableCell align="center">
                      <Stack direction="row" spacing={0.5}>
                        <IconButton size="small" color="primary" onClick={handleAddTransaction} disabled={addSaving || !addForm.price || !addForm.quantity}>
                          <CheckIcon fontSize="small" />
                        </IconButton>
                        <IconButton size="small" onClick={() => { setAdding(false); setAddForm(EMPTY_ADD); }}>
                          <CloseIcon fontSize="small" />
                        </IconButton>
                      </Stack>
                    </TableCell>
                  </TableRow>
                </LocalizationProvider>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>

      {/* 메모 영역 */}
      <Box>
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
          <Typography variant="subtitle1" fontWeight={600}>메모</Typography>
          {!editingMemo ? (
            <Button size="small" startIcon={detail.memo ? <EditIcon /> : <AddIcon />} onClick={() => setEditingMemo(true)}>
              {detail.memo ? '수정' : '추가'}
            </Button>
          ) : (
            <Stack direction="row" spacing={1}>
              <Button size="small" variant="contained" onClick={handleSaveMemo} disabled={memoSaving}>
                {memoSaving ? '저장 중...' : '저장'}
              </Button>
              <Button size="small" onClick={() => { setEditingMemo(false); setMemoValue(detail.memo || ''); }}>
                취소
              </Button>
            </Stack>
          )}
        </Stack>

        {editingMemo ? (
          <Box sx={{ position: 'relative', '.ql-container': { minHeight: 200 } }}>
            <ReactQuill theme="snow" value={memoValue} onChange={setMemoValue} modules={quillModules} />
            {imageUploading && (
              <Box sx={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'rgba(255,255,255,0.7)', zIndex: 10 }}>
                <Stack alignItems="center" spacing={1}>
                  <CircularProgress size={28} />
                  <Typography variant="caption" color="text.secondary">이미지 업로드 중...</Typography>
                </Stack>
              </Box>
            )}
          </Box>
        ) : detail.memo ? (
          <Paper sx={{ p: 2.5 }}>
            <Box sx={{ fontSize: 12, '& img': { maxWidth: '50%' }, '& p': { m: 0, minHeight: '1.4em' } }} dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(detail.memo) }} />
          </Paper>
        ) : (
          <Typography variant="body2" color="text.secondary">메모가 없습니다.</Typography>
        )}
      </Box>

      {/* 거래 삭제 확인 다이얼로그 */}
      <Dialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)}>
        <DialogTitle>거래 삭제</DialogTitle>
        <DialogContent>
          <DialogContentText>이 거래 기록을 삭제하시겠습니까?</DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteTarget(null)}>취소</Button>
          <Button onClick={handleDeleteTransaction} color="error" variant="contained">삭제</Button>
        </DialogActions>
      </Dialog>

      {/* 일지 삭제 확인 다이얼로그 */}
      <Dialog open={journalDeleteOpen} onClose={() => setJournalDeleteOpen(false)}>
        <DialogTitle>매매일지 삭제</DialogTitle>
        <DialogContent>
          <DialogContentText>
            &apos;{detail.stockName}&apos; 매매일지를 삭제하시겠습니까?
            모든 거래 기록과 메모가 함께 삭제됩니다.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setJournalDeleteOpen(false)}>취소</Button>
          <Button onClick={handleDeleteJournal} color="error" variant="contained">삭제</Button>
        </DialogActions>
      </Dialog>

      {/* 알림 */}
      <Snackbar open={!!snack} autoHideDuration={3000} onClose={() => setSnack(null)} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert severity={snack?.severity} onClose={() => setSnack(null)} variant="filled">{snack?.msg}</Alert>
      </Snackbar>
    </Container>
  );
}

export default function TradingJournalDetailPage() {
  return (
    <Suspense fallback={<Box sx={{ display: 'flex', justifyContent: 'center', py: 20 }}><CircularProgress /></Box>}>
      <TradingJournalDetail />
    </Suspense>
  );
}
