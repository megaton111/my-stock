'use client';

import React, { useState, useMemo, useEffect } from 'react';
import {
  Container, Typography, Box, Button, Stack, Paper,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  TableSortLabel, Chip, Collapse, IconButton,
  Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import { formatProfit, profitColor } from '@/utils/format';
import type { ClosedPositionItem } from '@/app/api/positions/route';

import { Investment, InvestmentInput } from '@/types/investment';
import { useInvestments } from '@/hooks/useInvestments';
import { useStockPrices } from '@/hooks/useStockPrices';
import { formatCurrency } from '@/utils/format';
import { isCash } from '@/utils/assetClass';
import PageHeader from '@/components/PageHeader';
import InvestmentFormDialog from '@/components/InvestmentFormDialog';
import SellDialog, { SellSubmitData } from '@/components/SellDialog';
import BuyDialog, { BuySubmitData, BuyEditInitial } from '@/components/BuyDialog';
import PositionHistory from '@/components/PositionHistory';
import type { TransactionItem } from '@/app/api/positions/[id]/transactions/route';
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
  const { prices, exchangeRate } = useStockPrices(investments);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Investment | null>(null);
  const [deleting, setDeleting] = useState<Investment | null>(null);
  const [selling, setSelling] = useState<Investment | null>(null);
  const [buying, setBuying] = useState<Investment | null>(null);
  const [editingBuyTx, setEditingBuyTx] = useState<BuyEditInitial | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [positionRefreshKey, setPositionRefreshKey] = useState(0);
  const [redirectTarget, setRedirectTarget] = useState<{ name: string; source: 'collect' | 'dca' } | null>(null);
  const [closedPositions, setClosedPositions] = useState<ClosedPositionItem[]>([]);
  const [closedLoading, setClosedLoading] = useState(true);
  const [closedOpen, setClosedOpen] = useState(false);
  const [expandedClosedId, setExpandedClosedId] = useState<number | null>(null);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    fetch(`/api/positions?userId=${userId}&status=closed`)
      .then((res) => res.ok ? res.json() : [])
      .then((data: ClosedPositionItem[]) => {
        if (!cancelled) {
          setClosedPositions(data);
          setClosedLoading(false);
        }
      })
      .catch(() => { if (!cancelled) setClosedLoading(false); });
    return () => { cancelled = true; };
  }, [userId, investments]);

  const toggleExpand = (item: Investment) => {
    if (!item.positionId) return;
    setExpandedId((prev) => (prev === item.id ? null : item.id));
  };

  const stopPropagation = (e: React.MouseEvent) => e.stopPropagation();

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

  const handleBuy = async (data: BuySubmitData) => {
    if (!buying) return;
    const isEdit = !!editingBuyTx;
    const url = isEdit
      ? `/api/buy-transactions/${editingBuyTx!.id}`
      : `/api/investments/${buying.id}/buy`;
    const res = await fetch(url, {
      method: isEdit ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const { error } = await res.json().catch(() => ({
        error: isEdit ? '매수 수정 처리 중 오류가 발생했습니다.' : '추가매수 처리 중 오류가 발생했습니다.',
      }));
      throw new Error(error || (isEdit ? '매수 수정 실패' : '추가매수 처리 실패'));
    }
    setBuying(null);
    setEditingBuyTx(null);
    setPositionRefreshKey((k) => k + 1);
    refetch();
  };

  const openEditBuy = (item: Investment, tx: TransactionItem) => {
    setBuying(item);
    setEditingBuyTx({
      id: tx.id,
      date: tx.date,
      quantity: tx.quantity,
      price: tx.price,
      exchangeRate: tx.exchangeRate ?? exchangeRate,
    });
  };

  const handleSell = async (data: SellSubmitData) => {
    if (!selling) return;
    const res = await fetch(`/api/investments/${selling.id}/sell`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const { error } = await res.json().catch(() => ({ error: '매도 처리 중 오류가 발생했습니다.' }));
      throw new Error(error || '매도 처리 실패');
    }
    setSelling(null);
    setPositionRefreshKey((k) => k + 1);
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
    <Container maxWidth="md" sx={{ py: 10, position: 'relative' }}>
      <PageHeader />

      <Stack spacing={3} sx={{ alignItems: 'center' }}>
        <Box sx={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h5" fontWeight={700}>투자내역 관리</Typography>
          <Button
            variant="contained"
            onClick={openAdd}
          >
            등록
          </Button>
        </Box>

        {/* 데스크탑: 테이블 */}
        <TableContainer
          component={Paper}
          sx={{
            display: { xs: 'none', md: 'block' },
            boxShadow: 'none',
            border: (theme) => `1px solid ${theme.palette.gray2}`,
            '& .MuiTableCell-root': {
              fontSize: '0.8rem',
              padding: '8px 10px',
            },
          }}
        >
          <Table>
            <TableHead sx={{ bgcolor: 'gray1' }}>
              <TableRow>
                {COLUMNS.map((col) => (
                  <TableCell key={col.label || '_actions'} align={col.align} sx={{ ...headerCellSx, fontSize: '0.75rem' }}>
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
                sorted.map((item) => {
                  const cash = isCash(item.ticker);
                  const canExpand = !!item.positionId && !cash;
                  const expanded = expandedId === item.id;
                  return (
                  <React.Fragment key={item.id}>
                  <TableRow
                    sx={{
                      '& > td': { borderBottom: expanded ? 'none' : undefined },
                      cursor: canExpand ? 'pointer' : 'default',
                      '&:hover': canExpand ? { bgcolor: 'gray1' } : undefined,
                    }}
                    onClick={() => canExpand && toggleExpand(item)}
                  >
                    <TableCell>
                      <Typography fontWeight={600} fontSize="0.8rem" lineHeight={1.25}>{item.name}</Typography>
                      <Typography color="gray6" fontSize="0.65rem" lineHeight={1.2}>{cash ? '현금' : item.ticker}</Typography>
                    </TableCell>
                    <TableCell>
                      <Chip label={item.category} size="small" variant="outlined" sx={{ height: 20, fontSize: '0.65rem' }} />
                    </TableCell>
                    <TableCell align="right">
                      {cash ? formatCurrency(item.quantity, item.currency) : item.quantity.toLocaleString()}
                    </TableCell>
                    <TableCell align="right">{cash ? '-' : formatCurrency(item.avgPrice, item.currency)}</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 600 }}>
                      {formatCurrency(
                        item.currency === 'USD'
                          ? item.avgPrice * item.quantity * exchangeRate
                          : item.avgPrice * item.quantity,
                        'KRW',
                      )}
                    </TableCell>
                    <TableCell>{item.currency}</TableCell>
                    <TableCell align="center" onClick={stopPropagation}>
                      {(() => {
                        const source = isMergedEntry(item.id);
                        if (source) {
                          return (
                            <Button
                              size="small"
                              variant="text"
                              onClick={() => setRedirectTarget({ name: item.name, source })}
                              sx={{ minWidth: 'auto', px: 1, py: 0.25, fontSize: '0.75rem' }}
                            >
                              이동
                            </Button>
                          );
                        }
                        return (
                          <Stack direction="row" spacing={0.25} justifyContent="center">
                            <Button
                              size="small"
                              variant="text"
                              onClick={() => openEdit(item)}
                              sx={{ minWidth: 'auto', px: 1, py: 0.25, fontSize: '0.75rem', color: 'gray8' }}
                            >
                              수정
                            </Button>
                            {!cash && (
                              <Button
                                size="small"
                                variant="text"
                                onClick={() => setBuying(item)}
                                sx={{ minWidth: 'auto', px: 1, py: 0.25, fontSize: '0.75rem', color: 'primary.main' }}
                              >
                                매수
                              </Button>
                            )}
                            {!cash && (
                              <Button
                                size="small"
                                variant="text"
                                onClick={() => setSelling(item)}
                                sx={{ minWidth: 'auto', px: 1, py: 0.25, fontSize: '0.75rem', color: 'error.main' }}
                              >
                                매도
                              </Button>
                            )}
                            <Button
                              size="small"
                              variant="text"
                              onClick={() => setDeleting(item)}
                              sx={{ minWidth: 'auto', px: 1, py: 0.25, fontSize: '0.75rem', color: 'gray8' }}
                            >
                              삭제
                            </Button>
                          </Stack>
                        );
                      })()}
                    </TableCell>
                  </TableRow>
                  {expanded && item.positionId && (
                    <TableRow>
                      <TableCell colSpan={COLUMNS.length} sx={{ p: 0, bgcolor: 'gray1' }}>
                        <PositionHistory
                          positionId={item.positionId}
                          refreshKey={positionRefreshKey}
                          onEditBuy={(tx) => openEditBuy(item, tx)}
                        />
                      </TableCell>
                    </TableRow>
                  )}
                  </React.Fragment>
                  );
                })
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
                const cash = isCash(item.ticker);
                const canExpand = !!item.positionId && !cash;
                const expanded = expandedId === item.id;
                const totalAmount = item.currency === 'USD'
                  ? item.avgPrice * item.quantity * exchangeRate
                  : item.avgPrice * item.quantity;
                return (
                  <Paper
                    key={item.id}
                    sx={{
                      px: 1.5, py: 1, border: '1px solid', borderColor: 'gray2', boxShadow: 'none',
                      cursor: canExpand ? 'pointer' : 'default',
                    }}
                    onClick={() => canExpand && toggleExpand(item)}
                  >
                    <Stack spacing={1}>
                      <Stack direction="row" alignItems="center" justifyContent="space-between">
                        <Typography fontWeight={700} fontSize={16}>{item.name}</Typography>
                        <Stack direction="row" alignItems="center" spacing={0.25} onClick={stopPropagation}>
                          {source ? (
                            <Button
                              size="small"
                              variant="text"
                              onClick={() => setRedirectTarget({ name: item.name, source })}
                              sx={{ minWidth: 'auto', px: 1, py: 0.25, fontSize: '0.75rem' }}
                            >
                              이동
                            </Button>
                          ) : (
                            <Stack direction="row" spacing={0.25}>
                              <Button
                                size="small"
                                variant="text"
                                onClick={() => openEdit(item)}
                                sx={{ minWidth: 'auto', px: 1, py: 0.25, fontSize: '0.75rem', color: 'gray8' }}
                              >
                                수정
                              </Button>
                              {!cash && (
                                <Button
                                  size="small"
                                  variant="text"
                                  onClick={() => setBuying(item)}
                                  sx={{ minWidth: 'auto', px: 1, py: 0.25, fontSize: '0.75rem', color: 'primary.main' }}
                                >
                                  매수
                                </Button>
                              )}
                              {!cash && (
                                <Button
                                  size="small"
                                  variant="text"
                                  onClick={() => setSelling(item)}
                                  sx={{ minWidth: 'auto', px: 1, py: 0.25, fontSize: '0.75rem', color: 'error.main' }}
                                >
                                  매도
                                </Button>
                              )}
                              <Button
                                size="small"
                                variant="text"
                                onClick={() => setDeleting(item)}
                                sx={{ minWidth: 'auto', px: 1, py: 0.25, fontSize: '0.75rem', color: 'gray8' }}
                              >
                                삭제
                              </Button>
                            </Stack>
                          )}
                        </Stack>
                      </Stack>
                      <Stack spacing={0.25}>
                        <Stack direction="row" justifyContent="space-between">
                          <Typography sx={{ color: 'gray6', fontSize: '0.75rem' }}>{cash ? '금액' : '보유 수량'}</Typography>
                          <Typography sx={{ fontSize: '0.75rem' }}>
                            {cash ? formatCurrency(item.quantity, item.currency) : item.quantity.toLocaleString()}
                          </Typography>
                        </Stack>
                        {!cash && (
                          <Stack direction="row" justifyContent="space-between">
                            <Typography sx={{ color: 'gray6', fontSize: '0.75rem' }}>매입가</Typography>
                            <Typography sx={{ fontSize: '0.75rem' }}>{formatCurrency(item.avgPrice, item.currency)}</Typography>
                          </Stack>
                        )}
                        <Stack direction="row" justifyContent="space-between">
                          <Typography sx={{ color: 'gray6', fontSize: '0.75rem' }}>총 투자금액</Typography>
                          <Typography sx={{ fontSize: '0.75rem', fontWeight: 600 }}>{formatCurrency(totalAmount, 'KRW')}</Typography>
                        </Stack>
                      </Stack>
                      {expanded && item.positionId && (
                        <Box sx={{ mx: -1.5, mb: -1, mt: 0.5 }} onClick={stopPropagation}>
                          <PositionHistory
                            positionId={item.positionId}
                            refreshKey={positionRefreshKey}
                            onEditBuy={(tx) => openEditBuy(item, tx)}
                          />
                        </Box>
                      )}
                    </Stack>
                  </Paper>
                );
              })}
            </Stack>
          )}
        </Box>
        {/* 매도 완료 종목 접힘 섹션 */}
        <Box sx={{ width: '100%', mt: 2 }}>
          <Paper
            variant="outlined"
            sx={{ borderColor: 'gray2', boxShadow: 'none' }}
          >
            <Box
              onClick={() => setClosedOpen((v) => !v)}
              sx={{
                px: 2, py: 1.5,
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                cursor: 'pointer',
                '&:hover': { bgcolor: 'gray1' },
              }}
            >
              <Stack direction="row" spacing={1} alignItems="center">
                <Typography variant="subtitle1" fontWeight={700}>매도 완료 종목</Typography>
                <Chip
                  label={closedPositions.length}
                  size="small"
                  sx={{ height: 20, fontSize: '0.7rem' }}
                />
              </Stack>
              <IconButton size="small">
                {closedOpen ? <ExpandLessIcon /> : <ExpandMoreIcon />}
              </IconButton>
            </Box>
            <Collapse in={closedOpen}>
              <Box sx={{ borderTop: '1px solid', borderColor: 'gray2' }}>
                {closedLoading ? (
                  <Typography textAlign="center" color="gray5" sx={{ py: 4 }}>
                    불러오는 중...
                  </Typography>
                ) : closedPositions.length === 0 ? (
                  <Typography textAlign="center" color="gray5" sx={{ py: 4 }}>
                    매도 완료된 종목이 없습니다.
                  </Typography>
                ) : (
                  <Stack>
                    {closedPositions.map((pos) => {
                      const expanded = expandedClosedId === pos.id;
                      return (
                        <Box key={pos.id}>
                          <Box
                            onClick={() => setExpandedClosedId((prev) => (prev === pos.id ? null : pos.id))}
                            sx={{
                              px: 2, py: 1.5,
                              display: 'grid',
                              gridTemplateColumns: { xs: '1fr auto', sm: '1.2fr 1fr 1fr auto' },
                              gap: { xs: 0.5, sm: 2 },
                              alignItems: 'center',
                              cursor: 'pointer',
                              borderTop: '1px solid',
                              borderColor: 'gray2',
                              '&:hover': { bgcolor: 'gray1' },
                              '&:first-of-type': { borderTop: 'none' },
                            }}
                          >
                            <Box>
                              <Typography fontWeight={600} sx={{ fontSize: '0.875rem' }}>
                                {pos.stockName}
                              </Typography>
                              <Typography color="gray6" sx={{ fontSize: '0.7rem' }}>
                                {pos.ticker} · {pos.category}
                              </Typography>
                            </Box>
                            <Typography
                              color="gray6"
                              sx={{ fontSize: '0.75rem', display: { xs: 'none', sm: 'block' } }}
                            >
                              {pos.openedAt} ~ {pos.closedAt}
                            </Typography>
                            <Typography
                              fontWeight={700}
                              color={profitColor(pos.totalRealizedPlKrw)}
                              sx={{ fontSize: '0.875rem', textAlign: { xs: 'right', sm: 'right' } }}
                            >
                              {formatProfit(pos.totalRealizedPlKrw)}
                            </Typography>
                            <IconButton size="small" sx={{ display: { xs: 'none', sm: 'inline-flex' } }}>
                              {expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                            </IconButton>
                          </Box>
                          <Collapse in={expanded}>
                            <PositionHistory positionId={pos.id} />
                          </Collapse>
                        </Box>
                      );
                    })}
                  </Stack>
                )}
              </Box>
            </Collapse>
          </Paper>
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

      <SellDialog
        open={!!selling}
        onClose={() => setSelling(null)}
        onSubmit={handleSell}
        investment={selling}
        currentPrice={selling ? prices[selling.ticker] : undefined}
        currentExchangeRate={exchangeRate}
      />

      <BuyDialog
        open={!!buying}
        onClose={() => { setBuying(null); setEditingBuyTx(null); }}
        onSubmit={handleBuy}
        investment={buying}
        currentPrice={buying ? prices[buying.ticker] : undefined}
        currentExchangeRate={exchangeRate}
        editTransaction={editingBuyTx}
      />
    </Container>
  );
}
