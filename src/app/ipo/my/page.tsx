'use client';

import { useState } from 'react';
import {
  Container, Box, Typography, Paper, Stack, CircularProgress, Button, IconButton,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import CloseIcon from '@mui/icons-material/Close';
import PageHeader from '@/components/PageHeader';
import { useMyIpo } from '@/hooks/useMyIpo';
import { MyIpoEntry } from '@/types/ipo';
import { formatKRW, formatProfit, profitColor } from '@/utils/format';

interface FormState {
  stockName: string;
  ipoPrice: string;
  allocatedQuantity: string;
  sellPrice: string;
  sellDate: string;
  fee: string;
}

const EMPTY_FORM: FormState = { stockName: '', ipoPrice: '', allocatedQuantity: '', sellPrice: '', sellDate: '', fee: '' };

function toForm(entry: MyIpoEntry): FormState {
  return {
    stockName: entry.stockName,
    ipoPrice: String(entry.ipoPrice),
    allocatedQuantity: String(entry.allocatedQuantity),
    sellPrice: entry.sellPrice != null ? String(entry.sellPrice) : '',
    sellDate: entry.sellDate || '',
    fee: entry.fee ? String(entry.fee) : '',
  };
}

export default function MyIpoPage() {
  const { entries, loading, userId, totalProfit, refetch } = useMyIpo();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<MyIpoEntry | null>(null);

  const handleOpen = (entry?: MyIpoEntry) => {
    if (entry) {
      setEditingId(entry.id);
      setForm(toForm(entry));
    } else {
      setEditingId(null);
      setForm(EMPTY_FORM);
    }
    setDialogOpen(true);
  };

  const handleClose = () => {
    setDialogOpen(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
  };

  const handleChange = (field: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
  };

  const isValid = form.stockName && form.ipoPrice && form.allocatedQuantity;

  const handleSubmit = async () => {
    if (!isValid || !userId) return;
    setSaving(true);
    const payload = {
      userId,
      stockName: form.stockName,
      ipoPrice: Number(form.ipoPrice),
      allocatedQuantity: Number(form.allocatedQuantity),
      sellPrice: form.sellPrice ? Number(form.sellPrice) : null,
      sellDate: form.sellDate || null,
      fee: form.fee ? Number(form.fee) : 0,
    };

    if (editingId) {
      await fetch(`/api/ipo/my/${editingId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    } else {
      await fetch('/api/ipo/my', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    }

    setSaving(false);
    handleClose();
    refetch();
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await fetch(`/api/ipo/my/${deleteTarget.id}`, { method: 'DELETE' });
    setDeleteTarget(null);
    refetch();
  };

  if (loading) {
    return (
      <Container maxWidth="md" sx={{ pt: 10, textAlign: 'center' }}>
        <PageHeader />
        <CircularProgress />
      </Container>
    );
  }

  return (
    <Container maxWidth="md" sx={{ pt: 10, pb: 4 }}>
      <PageHeader />

      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
        <Typography variant="h5" fontWeight={700}>나의 공모주</Typography>
        <Button variant="contained" size="small" startIcon={<AddIcon />} onClick={() => handleOpen()}>
          추가
        </Button>
      </Stack>

      {/* 누적 수익금 */}
      <Paper sx={{ p: 2.5, mb: 2 }}>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
          총 누적 수익금
        </Typography>
        <Typography variant="h5" fontWeight={700} color={profitColor(totalProfit)}>
          {formatProfit(totalProfit)}
        </Typography>
      </Paper>

      {entries.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography color="text.secondary">등록된 공모주가 없습니다.</Typography>
        </Paper>
      ) : (
        <>
          {/* 모바일: 카드 */}
          <Stack spacing={1.5} sx={{ display: { xs: 'flex', md: 'none' } }}>
            {entries.map((entry) => (
              <Paper key={entry.id} sx={{ p: 2 }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 0.5 }}>
                  <Typography variant="subtitle2" fontWeight={600}>{entry.stockName}</Typography>
                  <Stack direction="row" spacing={0.5}>
                    <IconButton size="small" onClick={() => handleOpen(entry)}><EditIcon fontSize="small" /></IconButton>
                    <IconButton size="small" onClick={() => setDeleteTarget(entry)}><DeleteIcon fontSize="small" /></IconButton>
                  </Stack>
                </Stack>
                <Stack spacing={0.25}>
                  <Typography variant="caption" color="text.secondary">
                    공모가: {formatKRW(entry.ipoPrice)} · 배정: {entry.allocatedQuantity}주
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    매도가: {entry.sellPrice != null ? formatKRW(entry.sellPrice) : '-'}
                    {entry.sellDate ? ` (${entry.sellDate})` : ''}
                  </Typography>
                  <Typography variant="body2" fontWeight={600} color={profitColor(entry.profit)}>
                    {formatProfit(entry.profit)}
                  </Typography>
                </Stack>
              </Paper>
            ))}
          </Stack>

          {/* PC: 테이블 */}
          <TableContainer component={Paper} sx={{ display: { xs: 'none', md: 'block' } }}>
            <Table size="small" sx={{ tableLayout: 'fixed', '& .MuiTableCell-root': { px: 1 } }}>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontSize: '0.8125rem' }}>종목명</TableCell>
                  <TableCell sx={{ fontSize: '0.8125rem', width: 120, whiteSpace: 'nowrap' }} align="right">공모가</TableCell>
                  <TableCell sx={{ fontSize: '0.8125rem', width: 100, whiteSpace: 'nowrap' }} align="right">배정수량</TableCell>
                  <TableCell sx={{ fontSize: '0.8125rem', width: 120, whiteSpace: 'nowrap' }} align="right">매도가</TableCell>
                  <TableCell sx={{ fontSize: '0.8125rem', width: 160, whiteSpace: 'nowrap' }} align="right">매도일</TableCell>
                  <TableCell sx={{ fontSize: '0.8125rem', width: 140, whiteSpace: 'nowrap' }} align="right">수익금</TableCell>
                  <TableCell sx={{ width: 72 }} />
                </TableRow>
              </TableHead>
              <TableBody>
                {entries.map((entry) => (
                  <TableRow key={entry.id} hover>
                    <TableCell sx={{ fontSize: '0.8125rem', fontWeight: 600 }}>{entry.stockName}</TableCell>
                    <TableCell sx={{ fontSize: '0.8125rem' }} align="right">{formatKRW(entry.ipoPrice)}</TableCell>
                    <TableCell sx={{ fontSize: '0.8125rem' }} align="right">{entry.allocatedQuantity}주</TableCell>
                    <TableCell sx={{ fontSize: '0.8125rem' }} align="right">
                      {entry.sellPrice != null ? formatKRW(entry.sellPrice) : '-'}
                    </TableCell>
                    <TableCell sx={{ fontSize: '0.8125rem' }} align="right">{entry.sellDate || '-'}</TableCell>
                    <TableCell sx={{ fontSize: '0.8125rem', fontWeight: 600 }} align="right">
                      <Typography variant="body2" fontSize="inherit" fontWeight={600} color={profitColor(entry.profit)}>
                        {formatProfit(entry.profit)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Stack direction="row" spacing={0.25}>
                        <IconButton size="small" onClick={() => handleOpen(entry)}><EditIcon fontSize="small" /></IconButton>
                        <IconButton size="small" onClick={() => setDeleteTarget(entry)}><DeleteIcon fontSize="small" /></IconButton>
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </>
      )}

      {/* 추가/수정 다이얼로그 */}
      <Dialog open={dialogOpen} onClose={handleClose} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ pr: 6 }}>
          {editingId ? '공모주 수정' : '공모주 추가'}
          <IconButton onClick={handleClose} sx={{ position: 'absolute', right: 8, top: 8 }}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField label="종목명" value={form.stockName} onChange={handleChange('stockName')} fullWidth size="small" />
            <TextField label="공모가 (원)" value={form.ipoPrice} onChange={handleChange('ipoPrice')} fullWidth size="small" type="number" />
            <TextField label="배정수량 (주)" value={form.allocatedQuantity} onChange={handleChange('allocatedQuantity')} fullWidth size="small" type="number" />
            <TextField label="매도가 (원)" value={form.sellPrice} onChange={handleChange('sellPrice')} fullWidth size="small" type="number" />
            <TextField label="매도일" value={form.sellDate} onChange={handleChange('sellDate')} fullWidth size="small" type="date" slotProps={{ inputLabel: { shrink: true } }} />
            <TextField label="수수료 (원)" value={form.fee} onChange={handleChange('fee')} fullWidth size="small" type="number" />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>취소</Button>
          <Button onClick={handleSubmit} variant="contained" disabled={!isValid || saving}>
            {saving ? '저장 중...' : '저장'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* 삭제 확인 다이얼로그 */}
      <Dialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)}>
        <DialogTitle>삭제 확인</DialogTitle>
        <DialogContent>
          <Typography>{deleteTarget?.stockName}을(를) 삭제하시겠습니까?</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteTarget(null)}>취소</Button>
          <Button onClick={handleDelete} color="error" variant="contained">삭제</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
