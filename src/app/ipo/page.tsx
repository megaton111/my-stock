'use client';

import { useState } from 'react';
import {
  Container, Box, Typography, Paper, Stack, CircularProgress, Chip,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Dialog, DialogTitle, DialogContent, IconButton, Divider,
  ToggleButton, ToggleButtonGroup,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import PageHeader from '@/components/PageHeader';
import { useIpoSchedules } from '@/hooks/useIpoSchedules';
import { IpoSchedule } from '@/types/ipo';

type IpoStatus = '청약예정' | '청약중' | '청약완료' | '상장완료';

function parseDate(dateStr: string | null): Date | null {
  if (!dateStr) return null;
  const cleaned = dateStr.replace(/\s/g, '');
  const match = cleaned.match(/(\d{4})\.(\d{2})\.(\d{2})/);
  if (!match) return null;
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
}

function parseSubscriptionDates(dateStr: string | null): { start: Date | null; end: Date | null } {
  if (!dateStr) return { start: null, end: null };
  const cleaned = dateStr.replace(/\s/g, '');

  const parts = cleaned.split('~');
  const start = parseDate(parts[0]);
  if (!start || parts.length < 2) return { start, end: start };

  const endPart = parts[1];
  const endMatch = endPart.match(/(\d{2})\.(\d{2})/);
  if (!endMatch) return { start, end: start };

  const end = new Date(start.getFullYear(), Number(endMatch[1]) - 1, Number(endMatch[2]));
  return { start, end };
}

function getIpoStatus(item: IpoSchedule): IpoStatus {
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  const listing = parseDate(item.listing_date);
  if (listing && listing <= now) return '상장완료';

  const { start, end } = parseSubscriptionDates(item.subscription_date);
  if (start && end) {
    if (now < start) return '청약예정';
    if (now <= end) return '청약중';
    return '청약완료';
  }

  return '청약예정';
}

const STATUS_COLOR: Record<IpoStatus, 'default' | 'warning' | 'success' | 'info'> = {
  '청약예정': 'info',
  '청약중': 'warning',
  '청약완료': 'default',
  '상장완료': 'success',
};

function DetailRow({ label, value }: { label: string; value: string | null }) {
  if (!value || value === '-') return null;
  return (
    <Stack direction="row" sx={{ py: 0.75 }}>
      <Typography variant="body2" color="text.secondary" sx={{ minWidth: 110, flexShrink: 0 }}>
        {label}
      </Typography>
      <Typography variant="body2" fontWeight={500}>
        {value}
      </Typography>
    </Stack>
  );
}

function IpoDetailDialog({ item, open, onClose }: { item: IpoSchedule | null; open: boolean; onClose: () => void }) {
  if (!item) return null;

  const status = getIpoStatus(item);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, pr: 6 }}>
        {item.stock_name}
        <Chip label={status} color={STATUS_COLOR[status]} size="small" />
        <IconButton onClick={onClose} sx={{ position: 'absolute', right: 8, top: 8 }}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent>
        {item.stock_code && (
          <Typography variant="caption" color="text.secondary" sx={{ mb: 2, display: 'block' }}>
            {item.stock_code}{item.category ? ` · ${item.category}` : ''}
          </Typography>
        )}

        <Typography variant="subtitle2" color="primary" sx={{ mt: 1, mb: 0.5 }}>
          주요 일정
        </Typography>
        <Divider />
        <Box sx={{ mb: 2 }}>
          <DetailRow label="청약일" value={item.subscription_date} />
          <DetailRow label="환불일" value={item.refund_date} />
          <DetailRow label="신규상장일" value={item.listing_date} />
          <DetailRow label="IR일정" value={item.ir_date} />
        </Box>

        <Typography variant="subtitle2" color="primary" sx={{ mt: 1, mb: 0.5 }}>
          공모 사항
        </Typography>
        <Divider />
        <Box sx={{ mb: 2 }}>
          <DetailRow label="확정공모가" value={item.confirmed_price} />
          <DetailRow label="희망공모가" value={item.offering_price_range} />
          <DetailRow label="공모주식수" value={item.total_shares} />
          <DetailRow label="주관사" value={item.lead_underwriter} />
        </Box>

        <Typography variant="subtitle2" color="primary" sx={{ mt: 1, mb: 0.5 }}>
          수요예측 경과
        </Typography>
        <Divider />
        <Box>
          <DetailRow label="기관경쟁률" value={item.institutional_competition_rate} />
          <DetailRow label="의무보유확약" value={item.lock_up_rate} />
          <DetailRow label="청약경쟁률" value={item.subscription_competition_rate} />
        </Box>
      </DialogContent>
    </Dialog>
  );
}

function IpoCard({ item, onClick }: { item: IpoSchedule; onClick: () => void }) {
  const status = getIpoStatus(item);
  return (
    <Paper
      onClick={onClick}
      sx={{
        p: 2, cursor: 'pointer',
        '&:hover': { bgcolor: 'gray1' },
        transition: 'background-color 0.15s',
        ...(status === '상장완료' && { opacity: 0.45 }),
      }}
    >
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
        <Typography variant="subtitle2" fontWeight={600}>{item.stock_name}</Typography>
        <Chip label={status} color={STATUS_COLOR[status]} size="small" sx={{ fontSize: '0.6875rem' }} />
      </Stack>
      <Stack spacing={0.25}>
        <Typography variant="caption" color="text.secondary">
          청약일: {item.subscription_date || '-'}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          공모가: {item.confirmed_price || item.offering_price || '-'}
        </Typography>
        {item.institutional_competition_rate && (
          <Typography variant="caption" color="text.secondary">
            기관경쟁률: {item.institutional_competition_rate}
          </Typography>
        )}
        {item.lock_up_rate && (
          <Typography variant="caption" color="text.secondary">
            의무보유확약: {item.lock_up_rate}
          </Typography>
        )}
      </Stack>
    </Paper>
  );
}

export default function IpoPage() {
  const { items, loading } = useIpoSchedules();
  const [selected, setSelected] = useState<IpoSchedule | null>(null);
  const [statusFilter, setStatusFilter] = useState<IpoStatus | '전체'>('전체');

  const filteredItems = statusFilter === '전체'
    ? items
    : items.filter((item) => getIpoStatus(item) === statusFilter);

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

      <Typography variant="h5" fontWeight={700} sx={{ mb: 2 }}>
        공모주 일정
      </Typography>

      <ToggleButtonGroup
        value={statusFilter}
        exclusive
        onChange={(_, v) => { if (v !== null) setStatusFilter(v); }}
        size="small"
        sx={{ mb: 2, flexWrap: 'wrap', '& .MuiToggleButton-root': { fontSize: '0.75rem', px: 1.5, py: 0.5 } }}
      >
        {(['전체', '청약예정', '청약중', '청약완료', '상장완료'] as const).map((label) => (
          <ToggleButton key={label} value={label}>{label}</ToggleButton>
        ))}
      </ToggleButtonGroup>

      {filteredItems.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography color="text.secondary">
            {statusFilter === '전체' ? '등록된 공모주 일정이 없습니다.' : `${statusFilter} 상태의 종목이 없습니다.`}
          </Typography>
        </Paper>
      ) : (
        <>
          {/* 모바일: 카드 */}
          <Stack spacing={1.5} sx={{ display: { xs: 'flex', md: 'none' } }}>
            {filteredItems.map((item) => (
              <IpoCard key={item.id} item={item} onClick={() => setSelected(item)} />
            ))}
          </Stack>

          {/* PC: 테이블 */}
          <TableContainer component={Paper} sx={{ display: { xs: 'none', md: 'block' } }}>
            <Table size="small" sx={{ tableLayout: 'fixed', '& .MuiTableCell-root': { px: 1 } }}>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontSize: '0.8125rem', width: 75, whiteSpace: 'nowrap' }}>상태</TableCell>
                  <TableCell sx={{ fontSize: '0.8125rem' }}>종목명</TableCell>
                  <TableCell sx={{ fontSize: '0.8125rem', width: 125, whiteSpace: 'nowrap' }}>청약일</TableCell>
                  <TableCell sx={{ fontSize: '0.8125rem', width: 130, whiteSpace: 'nowrap' }} align="right">공모가</TableCell>
                  <TableCell sx={{ fontSize: '0.8125rem', width: 110, whiteSpace: 'nowrap' }} align="right">기관경쟁률</TableCell>
                  <TableCell sx={{ fontSize: '0.8125rem', width: 110, whiteSpace: 'nowrap' }} align="right">의무보유확약</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredItems.map((item) => {
                  const status = getIpoStatus(item);
                  return (
                    <TableRow
                      key={item.id}
                      hover
                      onClick={() => setSelected(item)}
                      sx={{ cursor: 'pointer', ...(status === '상장완료' && { opacity: 0.45 }) }}
                    >
                      <TableCell>
                        <Chip label={status} color={STATUS_COLOR[status]} size="small" sx={{ fontSize: '0.6875rem' }} />
                      </TableCell>
                      <TableCell sx={{ fontSize: '0.8125rem' }}>
                        <Typography variant="body2" fontWeight={600} fontSize="inherit">
                          {item.stock_name}
                        </Typography>
                      </TableCell>
                      <TableCell sx={{ fontSize: '0.8125rem' }}>{item.subscription_date || '-'}</TableCell>
                      <TableCell sx={{ fontSize: '0.8125rem' }} align="right">
                        {item.confirmed_price || item.offering_price || '-'}
                      </TableCell>
                      <TableCell sx={{ fontSize: '0.8125rem' }} align="right">
                        {item.institutional_competition_rate || '-'}
                      </TableCell>
                      <TableCell sx={{ fontSize: '0.8125rem' }} align="right">
                        {item.lock_up_rate || '-'}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        </>
      )}

      <IpoDetailDialog
        item={selected}
        open={!!selected}
        onClose={() => setSelected(null)}
      />
    </Container>
  );
}
