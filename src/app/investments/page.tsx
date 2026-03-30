'use client';

import { useState, useMemo } from 'react';
import {
  Container, Typography, Box, Button, Stack, Paper,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  TableSortLabel, IconButton, Chip,
  Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';

import { Investment, InvestmentInput } from '@/types/investment';
import { useInvestments } from '@/hooks/useInvestments';
import { useStockPrices } from '@/hooks/useStockPrices';
import { formatCurrency } from '@/utils/format';
import PageHeader from '@/components/PageHeader';
import InvestmentFormDialog from '@/components/InvestmentFormDialog';
import { useRouter } from 'next/navigation';

/** collect-* / dca-* 접두사 ID로 병합 항목 여부를 판별 */
function isMergedEntry(id: string): false | 'collect' | 'dca' {
  if (id.startsWith('collect-')) return 'collect';
  if (id.startsWith('dca-')) return 'dca';
  return false;
}

const headerCellSx = { color: 'gray7', fontWeight: 600 } as const;

type SortKey = 'name' | 'ticker' | 'category' | 'quantity' | 'avgPrice' | 'totalAmount' | 'currency';
type SortDirection = 'asc' | 'desc';

interface Column {
  label: string;
  key?: SortKey;
  align?: 'left' | 'right' | 'center';
}

const COLUMNS: Column[] = [
  { label: '종목명', key: 'name' },
  { label: '티커', key: 'ticker' },
  { label: '카테고리', key: 'category' },
  { label: '보유 수량', key: 'quantity', align: 'right' },
  { label: '매입가', key: 'avgPrice', align: 'right' },
  { label: '총 투자금액', key: 'totalAmount', align: 'right' },
  { label: '통화', key: 'currency' },
  { label: '', align: 'center' },
];

/** 통화를 KRW 기준으로 환산하여 비교 */
function toKRW(value: number, currency: string, exchangeRate: number): number {
  return currency === 'USD' ? value * exchangeRate : value;
}

function compare(a: Investment, b: Investment, key: SortKey, exchangeRate: number): number {
  if (key === 'avgPrice') {
    return toKRW(a.avgPrice, a.currency, exchangeRate) - toKRW(b.avgPrice, b.currency, exchangeRate);
  }
  if (key === 'totalAmount') {
    const totalA = toKRW(a.avgPrice * a.quantity, a.currency, exchangeRate);
    const totalB = toKRW(b.avgPrice * b.quantity, b.currency, exchangeRate);
    return totalA - totalB;
  }
  if (key === 'quantity') {
    return a.quantity - b.quantity;
  }
  const va = a[key];
  const vb = b[key];
  return String(va).localeCompare(String(vb), 'ko');
}

export default function InvestmentsPage() {
  const router = useRouter();
  const { investments, loading, userId, refetch } = useInvestments();
  const { exchangeRate } = useStockPrices(investments);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Investment | null>(null);
  const [deleting, setDeleting] = useState<Investment | null>(null);
  const [redirectTarget, setRedirectTarget] = useState<{ name: string; source: 'collect' | 'dca' } | null>(null);

  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDir, setSortDir] = useState<SortDirection>('asc');

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const sorted = useMemo(() => {
    if (!sortKey) return investments;
    const dir = sortDir === 'asc' ? 1 : -1;
    return [...investments].sort((a, b) => dir * compare(a, b, sortKey, exchangeRate));
  }, [investments, sortKey, sortDir, exchangeRate]);

  const handleAdd = async (data: InvestmentInput) => {
    await fetch('/api/investments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...data, userId }),
    });
    refetch();
  };

  const handleEdit = async (data: InvestmentInput) => {
    if (!editing) return;
    await fetch(`/api/investments/${editing.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    setEditing(null);
    refetch();
  };

  const handleDelete = async () => {
    if (!deleting) return;
    await fetch(`/api/investments/${deleting.id}`, { method: 'DELETE' });
    setDeleting(null);
    refetch();
  };

  const openEdit = (item: Investment) => {
    setEditing(item);
    setFormOpen(true);
  };

  const openAdd = () => {
    setEditing(null);
    setFormOpen(true);
  };

  return (
    <Container maxWidth="xl" sx={{ py: 10, position: 'relative' }}>
      <PageHeader />

      <Stack spacing={3} sx={{ alignItems: 'center' }}>
        <Box sx={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h5" fontWeight={700}>투자내역 관리</Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={openAdd}
          >
            종목 추가
          </Button>
        </Box>

        {/* 데스크탑: 테이블 */}
        <TableContainer
          component={Paper}
          sx={{ display: { xs: 'none', md: 'block' }, boxShadow: 'none', border: (theme) => `1px solid ${theme.palette.gray2}` }}
        >
          <Table>
            <TableHead sx={{ bgcolor: 'gray1' }}>
              <TableRow>
                {COLUMNS.map((col) => (
                  <TableCell key={col.label || '_actions'} align={col.align} sx={headerCellSx}>
                    {col.key ? (
                      <TableSortLabel
                        active={sortKey === col.key}
                        direction={sortKey === col.key ? sortDir : 'asc'}
                        onClick={() => handleSort(col.key!)}
                      >
                        {col.label}
                      </TableSortLabel>
                    ) : (
                      col.label
                    )}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={COLUMNS.length} align="center" sx={{ py: 6, color: 'gray5' }}>
                    불러오는 중...
                  </TableCell>
                </TableRow>
              ) : investments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={COLUMNS.length} align="center" sx={{ py: 6, color: 'gray5' }}>
                    등록된 종목이 없습니다. 종목을 추가해보세요.
                  </TableCell>
                </TableRow>
              ) : (
                sorted.map((item) => (
                  <TableRow key={item.id} sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                    <TableCell sx={{ fontWeight: 600 }}>{item.name}</TableCell>
                    <TableCell sx={{ color: 'gray6' }}>{item.ticker}</TableCell>
                    <TableCell>
                      <Chip label={item.category} size="small" variant="outlined" />
                    </TableCell>
                    <TableCell align="right">{item.quantity.toLocaleString()}</TableCell>
                    <TableCell align="right">{formatCurrency(item.avgPrice, item.currency)}</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 600 }}>
                      {formatCurrency(
                        item.currency === 'USD'
                          ? item.avgPrice * item.quantity * exchangeRate
                          : item.avgPrice * item.quantity,
                        'KRW',
                      )}
                    </TableCell>
                    <TableCell>{item.currency}</TableCell>
                    <TableCell align="center">
                      {(() => {
                        const source = isMergedEntry(item.id);
                        if (source) {
                          return (
                            <IconButton
                              size="small"
                              onClick={() => setRedirectTarget({ name: item.name, source })}
                              sx={{ color: 'gray6' }}
                            >
                              <EditIcon fontSize="small" />
                            </IconButton>
                          );
                        }
                        return (
                          <Stack direction="row" spacing={0.5} justifyContent="center">
                            <IconButton size="small" onClick={() => openEdit(item)} sx={{ color: 'gray6' }}>
                              <EditIcon fontSize="small" />
                            </IconButton>
                            <IconButton size="small" onClick={() => setDeleting(item)} sx={{ color: 'gray6' }}>
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Stack>
                        );
                      })()}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>

        {/* 모바일: 카드 리스트 */}
        <Box sx={{ display: { xs: 'block', md: 'none' }, width: 1 }}>
          {loading ? (
            <Typography textAlign="center" color="gray5" sx={{ py: 6 }}>불러오는 중...</Typography>
          ) : investments.length === 0 ? (
            <Typography textAlign="center" color="gray5" sx={{ py: 6 }}>등록된 종목이 없습니다. 종목을 추가해보세요.</Typography>
          ) : (
            <Stack spacing={1}>
              {sorted.map((item) => {
                const source = isMergedEntry(item.id);
                const totalAmount = item.currency === 'USD'
                  ? item.avgPrice * item.quantity * exchangeRate
                  : item.avgPrice * item.quantity;
                return (
                  <Paper
                    key={item.id}
                    sx={{ px: 1.5, py: 1, border: '1px solid', borderColor: 'gray2', boxShadow: 'none' }}
                  >
                    <Stack spacing={1}>
                      <Stack direction="row" alignItems="center" justifyContent="space-between">
                        <Typography fontWeight={700} fontSize={16}>{item.name}</Typography>
                        <Stack direction="row" alignItems="center" spacing={0.5}>
                          {source ? (
                            <IconButton
                              size="small"
                              onClick={() => setRedirectTarget({ name: item.name, source })}
                              sx={{ color: 'gray6' }}
                            >
                              <EditIcon fontSize="small" />
                            </IconButton>
                          ) : (
                            <Stack direction="row" spacing={0.5}>
                              <IconButton size="small" onClick={() => openEdit(item)} sx={{ color: 'gray6' }}>
                                <EditIcon fontSize="small" />
                              </IconButton>
                              <IconButton size="small" onClick={() => setDeleting(item)} sx={{ color: 'gray6' }}>
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            </Stack>
                          )}
                        </Stack>
                      </Stack>
                      <Stack spacing={0.25}>
                        <Stack direction="row" justifyContent="space-between">
                          <Typography sx={{ color: 'gray6', fontSize: '0.75rem' }}>보유 수량</Typography>
                          <Typography sx={{ fontSize: '0.75rem' }}>{item.quantity.toLocaleString()}</Typography>
                        </Stack>
                        <Stack direction="row" justifyContent="space-between">
                          <Typography sx={{ color: 'gray6', fontSize: '0.75rem' }}>매입가</Typography>
                          <Typography sx={{ fontSize: '0.75rem' }}>{formatCurrency(item.avgPrice, item.currency)}</Typography>
                        </Stack>
                        <Stack direction="row" justifyContent="space-between">
                          <Typography sx={{ color: 'gray6', fontSize: '0.75rem' }}>총 투자금액</Typography>
                          <Typography sx={{ fontSize: '0.75rem', fontWeight: 600 }}>{formatCurrency(totalAmount, 'KRW')}</Typography>
                        </Stack>
                      </Stack>
                    </Stack>
                  </Paper>
                );
              })}
            </Stack>
          )}
        </Box>
      </Stack>

      <Dialog open={!!deleting} onClose={() => setDeleting(null)}>
        <DialogTitle>종목 삭제</DialogTitle>
        <DialogContent>
          <DialogContentText>
            <strong>{deleting?.name}({deleting?.ticker})</strong> 종목을 삭제하시겠습니까?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleting(null)}>취소</Button>
          <Button onClick={handleDelete} color="error" variant="contained">삭제</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={!!redirectTarget} onClose={() => setRedirectTarget(null)}>
        <DialogTitle>수정 안내</DialogTitle>
        <DialogContent>
          <DialogContentText>
            <strong>{redirectTarget?.name}</strong> 종목은{' '}
            {redirectTarget?.source === 'collect' ? '주식 모으기' : '적립식 매수'} 항목입니다.
            해당 화면에서 수정할 수 있습니다.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRedirectTarget(null)}>닫기</Button>
          <Button
            variant="contained"
            onClick={() => {
              const path = redirectTarget?.source === 'collect' ? '/collect' : '/dca';
              setRedirectTarget(null);
              router.push(path);
            }}
          >
            이동하기
          </Button>
        </DialogActions>
      </Dialog>

      <InvestmentFormDialog
        open={formOpen}
        onClose={() => { setFormOpen(false); setEditing(null); }}
        onSubmit={editing ? handleEdit : handleAdd}
        initial={editing}
      />
    </Container>
  );
}
