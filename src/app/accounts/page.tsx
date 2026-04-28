'use client';

import { useMemo, useState, useCallback, useEffect } from 'react';
import {
  Container, Box, Typography, Paper, Stack, Skeleton, Divider,
  IconButton, Popover, TextField, Button,
} from '@mui/material';
import EditNoteIcon from '@mui/icons-material/EditNote';
import SwapVertIcon from '@mui/icons-material/SwapVert';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import PageHeader from '@/components/PageHeader';
import { useInvestments } from '@/hooks/useInvestments';
import { useStockPrices } from '@/hooks/useStockPrices';
import { useUser } from '@/hooks/useUser';
import { investedAmount, currentValue } from '@/utils/calculator';
import { isCash } from '@/utils/assetClass';
import { formatKRW, formatProfit, formatRate, profitColor } from '@/utils/format';
import { Investment } from '@/types/investment';

interface AccountGroup {
  accountName: string;
  accountNumber: string;
  items: Investment[];
  totalInvested: number;
  totalCurrent: number;
  totalProfit: number;
  totalRate: number;
}

interface BrokerGroup {
  broker: string;
  accounts: AccountGroup[];
  totalInvested: number;
  totalCurrent: number;
  totalProfit: number;
  totalRate: number;
}

interface SortOrder {
  broker: string;
  accountName: string;
  accountNumber: string;
  sortOrder: number;
}

function getSortKey(broker: string, accName: string, accNum: string) {
  return `${broker}||${accName}||${accNum}`;
}

function groupByBrokerAndAccount(
  investments: Investment[],
  prices: Record<string, number>,
  exchangeRate: number,
  sortOrders: SortOrder[],
): BrokerGroup[] {
  const filtered = investments.filter((item) => !isCash(item.ticker) && item.category !== '코인');

  const brokerMap = new Map<string, Map<string, Investment[]>>();
  for (const item of filtered) {
    const broker = item.broker || '미지정';
    const accName = item.accountName || '기본계좌';
    const accNum = item.accountNumber || '';
    const accountKey = `${accName}||${accNum}`;

    if (!brokerMap.has(broker)) brokerMap.set(broker, new Map());
    const accountMap = brokerMap.get(broker)!;
    if (!accountMap.has(accountKey)) accountMap.set(accountKey, []);
    accountMap.get(accountKey)!.push(item);
  }

  // 정렬 순서 맵
  const orderMap = new Map<string, number>();
  for (const o of sortOrders) {
    orderMap.set(getSortKey(o.broker, o.accountName, o.accountNumber), o.sortOrder);
  }

  const groups: BrokerGroup[] = [];
  for (const [broker, accountMap] of brokerMap) {
    const accounts: AccountGroup[] = [];
    let brokerInvested = 0;
    let brokerCurrent = 0;

    for (const [accountKey, items] of accountMap) {
      const [accountName, accountNumber] = accountKey.split('||');
      let totalInvested = 0;
      let totalCurrent = 0;
      for (const item of items) {
        totalInvested += investedAmount(item, exchangeRate);
        const price = prices[item.ticker] || item.avgPrice;
        totalCurrent += currentValue(item, price, exchangeRate);
      }
      const totalProfit = totalCurrent - totalInvested;
      const totalRate = totalInvested > 0 ? (totalProfit / totalInvested) * 100 : 0;
      accounts.push({ accountName, accountNumber, items, totalInvested, totalCurrent, totalProfit, totalRate });
      brokerInvested += totalInvested;
      brokerCurrent += totalCurrent;
    }

    // 계좌 정렬
    accounts.sort((a, b) => {
      const oa = orderMap.get(getSortKey(broker, a.accountName, a.accountNumber)) ?? 9999;
      const ob = orderMap.get(getSortKey(broker, b.accountName, b.accountNumber)) ?? 9999;
      return oa - ob;
    });

    const brokerProfit = brokerCurrent - brokerInvested;
    const brokerRate = brokerInvested > 0 ? (brokerProfit / brokerInvested) * 100 : 0;
    groups.push({ broker, accounts, totalInvested: brokerInvested, totalCurrent: brokerCurrent, totalProfit: brokerProfit, totalRate: brokerRate });
  }

  // 증권사 정렬: 각 증권사의 최소 sortOrder로
  groups.sort((a, b) => {
    if (a.broker === '미지정') return 1;
    if (b.broker === '미지정') return -1;
    const minA = Math.min(...a.accounts.map((acc) => orderMap.get(getSortKey(a.broker, acc.accountName, acc.accountNumber)) ?? 9999));
    const minB = Math.min(...b.accounts.map((acc) => orderMap.get(getSortKey(b.broker, acc.accountName, acc.accountNumber)) ?? 9999));
    if (minA !== minB) return minA - minB;
    return a.broker.localeCompare(b.broker);
  });

  return groups;
}

function StockCard({
  item,
  prices,
  exchangeRate,
}: {
  item: Investment;
  prices: Record<string, number>;
  exchangeRate: number;
}) {
  const price = prices[item.ticker] || item.avgPrice;
  const invested = investedAmount(item, exchangeRate);
  const current = currentValue(item, price, exchangeRate);
  const profit = current - invested;
  const rate = invested > 0 ? (profit / invested) * 100 : 0;

  return (
    <Paper
      variant="outlined"
      sx={{
        width: 280,
        minWidth: 280,
        p: 2,
        borderRadius: 2,
        borderColor: 'gray2',
        display: 'flex',
        flexDirection: 'column',
        gap: 0.75,
      }}
    >
      <Stack direction="row" justifyContent="space-between" alignItems="center">
        <Typography variant="subtitle2" fontWeight={700} noWrap>{item.name}</Typography>
        <Typography variant="h6" fontWeight={700} color={profitColor(rate)} sx={{ letterSpacing: '-0.5px' }}>
          {formatRate(rate)}
        </Typography>
      </Stack>

      <Divider />

      <Stack direction="row" justifyContent="space-between" alignItems="center">
        <Typography variant="body2" color="text.secondary">평가손익</Typography>
        <Typography variant="body2" fontWeight={600} color={profitColor(profit)}>
          {formatProfit(profit)}
        </Typography>
      </Stack>

      <Stack direction="row" justifyContent="space-between" alignItems="center">
        <Typography variant="body2" color="text.secondary">보유수량</Typography>
        <Typography variant="body2">{item.quantity}주</Typography>
      </Stack>

      <Stack direction="row" justifyContent="space-between" alignItems="center">
        <Typography variant="body2" color="text.secondary">매입금액</Typography>
        <Typography variant="body2">{formatKRW(invested)}</Typography>
      </Stack>

      <Stack direction="row" justifyContent="space-between" alignItems="center">
        <Typography variant="body2" color="text.secondary">평가금액</Typography>
        <Typography variant="body2" fontWeight={600}>{formatKRW(current)}</Typography>
      </Stack>
    </Paper>
  );
}

function AccountSection({
  account,
  broker,
  prices,
  exchangeRate,
  memo,
  onMemoChange,
  editing,
  isFirst,
  isLast,
  onMoveUp,
  onMoveDown,
}: {
  account: AccountGroup;
  broker: string;
  prices: Record<string, number>;
  exchangeRate: number;
  memo: string;
  onMemoChange: (key: string, memo: string) => void;
  editing: boolean;
  isFirst: boolean;
  isLast: boolean;
  onMoveUp: () => void;
  onMoveDown: () => void;
}) {
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const [draft, setDraft] = useState(memo);
  const memoKey = `${broker}||${account.accountName}||${account.accountNumber}`;

  const handleOpen = (e: React.MouseEvent<HTMLElement>) => {
    setDraft(memo);
    setAnchorEl(e.currentTarget);
  };

  const handleClose = () => {
    onMemoChange(memoKey, draft);
    setAnchorEl(null);
  };

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
        <Stack direction="row" alignItems="center" spacing={0.5}>
          {editing && (
            <Stack direction="row" spacing={0}>
              <IconButton size="small" onClick={onMoveUp} disabled={isFirst} sx={{ color: 'gray6' }}>
                <KeyboardArrowUpIcon sx={{ fontSize: 20 }} />
              </IconButton>
              <IconButton size="small" onClick={onMoveDown} disabled={isLast} sx={{ color: 'gray6' }}>
                <KeyboardArrowDownIcon sx={{ fontSize: 20 }} />
              </IconButton>
            </Stack>
          )}
          <Typography variant="body1" fontWeight={600}>
            {account.accountName}
            {account.accountNumber && (
              <Typography component="span" variant="body2" color="text.secondary" sx={{ ml: 0.75 }}>
                ({account.accountNumber})
              </Typography>
            )}
          </Typography>
          {memo && (
            <Typography variant="caption" color="text.secondary">
              · {memo}
            </Typography>
          )}
          {!editing && (
            <IconButton size="small" onClick={handleOpen}>
              <EditNoteIcon sx={{ fontSize: 18 }} />
            </IconButton>
          )}
        </Stack>
        <Typography variant="body2" fontWeight={600} color={profitColor(account.totalProfit)}>
          {formatProfit(account.totalProfit)} ({formatRate(account.totalRate)})
        </Typography>
      </Stack>
      <Popover
        open={!!anchorEl}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        transformOrigin={{ vertical: 'top', horizontal: 'left' }}
      >
        <Box sx={{ p: 2, width: 280 }}>
          <TextField
            label="메모"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            fullWidth
            size="small"
            placeholder="예: 미국주식 장기투자 계좌"
            autoFocus
          />
        </Box>
      </Popover>

      {!editing && (
        <Box
          sx={{
            display: 'flex',
            gap: 1.5,
            overflowX: 'auto',
            pb: 1,
            scrollSnapType: 'x mandatory',
            WebkitOverflowScrolling: 'touch',
            '&::-webkit-scrollbar': { height: 4 },
            '&::-webkit-scrollbar-thumb': { bgcolor: 'gray3', borderRadius: 2 },
          }}
        >
          {account.items.map((item) => (
            <Box key={item.id} sx={{ scrollSnapAlign: 'start', flexShrink: 0 }}>
              <StockCard item={item} prices={prices} exchangeRate={exchangeRate} />
            </Box>
          ))}
        </Box>
      )}
    </Box>
  );
}

function BrokerSection({
  group,
  prices,
  exchangeRate,
  memos,
  onMemoChange,
  editing,
  isFirstBroker,
  isLastBroker,
  onMoveAccountUp,
  onMoveAccountDown,
  onMoveBrokerUp,
  onMoveBrokerDown,
}: {
  group: BrokerGroup;
  prices: Record<string, number>;
  exchangeRate: number;
  memos: Record<string, string>;
  onMemoChange: (key: string, memo: string) => void;
  editing: boolean;
  isFirstBroker: boolean;
  isLastBroker: boolean;
  onMoveAccountUp: (broker: string, accountIdx: number) => void;
  onMoveAccountDown: (broker: string, accountIdx: number) => void;
  onMoveBrokerUp: (broker: string) => void;
  onMoveBrokerDown: (broker: string) => void;
}) {
  return (
    <Paper sx={{ p: { xs: 2, sm: 3 }, borderRadius: 3 }}>
      <Stack direction="row" alignItems="center" spacing={0.5} sx={{ mb: 1.5 }}>
        {editing && (
          <Stack direction="row" spacing={0}>
            <IconButton size="small" onClick={() => onMoveBrokerUp(group.broker)} disabled={isFirstBroker} sx={{ color: 'gray6' }}>
              <KeyboardArrowUpIcon />
            </IconButton>
            <IconButton size="small" onClick={() => onMoveBrokerDown(group.broker)} disabled={isLastBroker} sx={{ color: 'gray6' }}>
              <KeyboardArrowDownIcon />
            </IconButton>
          </Stack>
        )}
        <Typography variant="h6" fontWeight={700}>
          {group.broker}
        </Typography>
      </Stack>

      <Stack spacing={2.5} divider={<Divider />}>
        {group.accounts.map((account, idx) => {
          const memoKey = `${group.broker}||${account.accountName}||${account.accountNumber}`;
          return (
            <AccountSection
              key={`${account.accountName}-${account.accountNumber}`}
              account={account}
              broker={group.broker}
              prices={prices}
              exchangeRate={exchangeRate}
              memo={memos[memoKey] || ''}
              onMemoChange={onMemoChange}
              editing={editing}
              isFirst={idx === 0}
              isLast={idx === group.accounts.length - 1}
              onMoveUp={() => onMoveAccountUp(group.broker, idx)}
              onMoveDown={() => onMoveAccountDown(group.broker, idx)}
            />
          );
        })}
      </Stack>
    </Paper>
  );
}

export default function AccountsPage() {
  const { user } = useUser();
  const { investments, loading: investmentsLoading } = useInvestments();
  const { prices, exchangeRate, loading: pricesLoading } = useStockPrices(investments);
  const [memos, setMemos] = useState<Record<string, string>>({});
  const [sortOrders, setSortOrders] = useState<SortOrder[]>([]);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    if (!user?.id) return;
    Promise.all([
      fetch(`/api/account-memos?userId=${user.id}`).then((r) => r.json()),
      fetch(`/api/account-sort?userId=${user.id}`).then((r) => r.json()),
    ]).then(([memosData, sortData]) => {
      setMemos(memosData);
      if (Array.isArray(sortData)) {
        setSortOrders(sortData.map((r: Record<string, unknown>) => ({
          broker: r.broker as string,
          accountName: r.account_name as string,
          accountNumber: (r.account_number as string) || '',
          sortOrder: Number(r.sort_order),
        })));
      }
    }).catch(() => {});
  }, [user?.id]);

  const handleMemoChange = useCallback((key: string, memo: string) => {
    setMemos((prev) => ({ ...prev, [key]: memo }));
    if (!user?.id) return;
    const [broker, accountName, accountNumber] = key.split('||');
    fetch('/api/account-memos', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: user.id, broker, accountName, accountNumber: accountNumber || '', memo }),
    }).catch(() => {});
  }, [user?.id]);

  const groups = useMemo(
    () => groupByBrokerAndAccount(investments, prices, exchangeRate, sortOrders),
    [investments, prices, exchangeRate, sortOrders],
  );

  // 정렬 순서를 groups 기반으로 재생성
  const buildOrders = useCallback((updatedGroups: BrokerGroup[]): SortOrder[] => {
    const orders: SortOrder[] = [];
    let seq = 0;
    for (const g of updatedGroups) {
      for (const acc of g.accounts) {
        orders.push({ broker: g.broker, accountName: acc.accountName, accountNumber: acc.accountNumber, sortOrder: seq++ });
      }
    }
    return orders;
  }, []);

  const saveSortOrders = useCallback((orders: SortOrder[]) => {
    setSortOrders(orders);
    if (!user?.id) return;
    fetch('/api/account-sort', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: user.id,
        orders: orders.map((o) => ({
          broker: o.broker,
          accountName: o.accountName,
          accountNumber: o.accountNumber,
          sortOrder: o.sortOrder,
        })),
      }),
    }).catch(() => {});
  }, [user?.id]);

  const handleMoveAccountUp = useCallback((broker: string, accountIdx: number) => {
    if (accountIdx <= 0) return;
    const updated = groups.map((g) => {
      if (g.broker !== broker) return g;
      const accs = [...g.accounts];
      [accs[accountIdx - 1], accs[accountIdx]] = [accs[accountIdx], accs[accountIdx - 1]];
      return { ...g, accounts: accs };
    });
    saveSortOrders(buildOrders(updated));
  }, [groups, buildOrders, saveSortOrders]);

  const handleMoveAccountDown = useCallback((broker: string, accountIdx: number) => {
    const group = groups.find((g) => g.broker === broker);
    if (!group || accountIdx >= group.accounts.length - 1) return;
    const updated = groups.map((g) => {
      if (g.broker !== broker) return g;
      const accs = [...g.accounts];
      [accs[accountIdx], accs[accountIdx + 1]] = [accs[accountIdx + 1], accs[accountIdx]];
      return { ...g, accounts: accs };
    });
    saveSortOrders(buildOrders(updated));
  }, [groups, buildOrders, saveSortOrders]);

  const handleMoveBrokerUp = useCallback((broker: string) => {
    const idx = groups.findIndex((g) => g.broker === broker);
    if (idx <= 0) return;
    const updated = [...groups];
    [updated[idx - 1], updated[idx]] = [updated[idx], updated[idx - 1]];
    saveSortOrders(buildOrders(updated));
  }, [groups, buildOrders, saveSortOrders]);

  const handleMoveBrokerDown = useCallback((broker: string) => {
    const idx = groups.findIndex((g) => g.broker === broker);
    if (idx < 0 || idx >= groups.length - 1) return;
    const updated = [...groups];
    [updated[idx], updated[idx + 1]] = [updated[idx + 1], updated[idx]];
    saveSortOrders(buildOrders(updated));
  }, [groups, buildOrders, saveSortOrders]);

  const loading = investmentsLoading || pricesLoading;

  return (
    <Container maxWidth="md" sx={{ pt: 10, pb: 4 }}>
      <PageHeader />

      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
        <Typography variant="h5" fontWeight={700}>
          계좌별 현황
        </Typography>
        {!loading && groups.length > 0 && (
          <Button
            size="small"
            variant={editing ? 'contained' : 'outlined'}
            startIcon={<SwapVertIcon />}
            onClick={() => setEditing((prev) => !prev)}
            sx={!editing ? { color: 'gray7', borderColor: 'gray3' } : {}}
          >
            {editing ? '완료' : '순서 변경'}
          </Button>
        )}
      </Stack>

      {loading ? (
        <Stack spacing={2}>
          {[0, 1].map((i) => (
            <Box key={i}>
              <Skeleton variant="text" width={120} height={32} />
              <Skeleton variant="rectangular" height={80} sx={{ borderRadius: 2, mb: 1 }} />
              <Skeleton variant="rectangular" height={140} sx={{ borderRadius: 2 }} />
            </Box>
          ))}
        </Stack>
      ) : groups.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography color="text.secondary">등록된 투자 종목이 없습니다.</Typography>
        </Paper>
      ) : (
        <Stack spacing={3}>
          {groups.map((group, gIdx) => (
            <BrokerSection
              key={group.broker}
              group={group}
              prices={prices}
              exchangeRate={exchangeRate}
              memos={memos}
              onMemoChange={handleMemoChange}
              editing={editing}
              isFirstBroker={gIdx === 0}
              isLastBroker={gIdx === groups.length - 1}
              onMoveAccountUp={handleMoveAccountUp}
              onMoveAccountDown={handleMoveAccountDown}
              onMoveBrokerUp={handleMoveBrokerUp}
              onMoveBrokerDown={handleMoveBrokerDown}
            />
          ))}
        </Stack>
      )}
    </Container>
  );
}
