'use client';

import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  List,
  ListItemButton,
  ListItemText,
  Stack,
  CircularProgress,
  Typography,
  Box,
  ToggleButton,
  ToggleButtonGroup,
} from '@mui/material';

type Market = 'KR' | 'US' | 'CRYPTO';

interface SearchResult {
  symbol: string;
  name: string;
  exchange?: string;
  type?: string;
}

interface WatchlistAddDialogProps {
  open: boolean;
  onClose: () => void;
  onAdd: (ticker: string, stockName: string, exchange?: string, stockType?: string) => Promise<void>;
}

const MARKET_PLACEHOLDER: Record<Market, string> = {
  KR: '예: 삼성전자, 005930',
  US: '예: apple, AAPL',
  CRYPTO: '예: bitcoin, BTC',
};

const MARKET_EMPTY_HINT: Record<Market, string> = {
  KR: '한글 종목명 또는 종목코드를 입력하세요.',
  US: '영문 종목명 또는 티커를 입력하세요.',
  CRYPTO: '코인 이름 또는 티커를 입력하세요.',
};

export default function WatchlistAddDialog({ open, onClose, onAdd }: WatchlistAddDialogProps) {
  const [market, setMarket] = useState<Market>('KR');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState<string | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) {
      setMarket('KR');
      setQuery('');
      setResults([]);
      setError('');
      setSubmitting(null);
    }
  }, [open]);

  // 시장 변경 시 결과 초기화
  useEffect(() => {
    setResults([]);
    setError('');
  }, [market]);

  // 디바운스 검색
  useEffect(() => {
    if (!open) return;
    const q = query.trim();
    if (!q) {
      setResults([]);
      return;
    }
    setLoading(true);
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/stock/search?market=${market}&q=${encodeURIComponent(q)}`,
        );
        if (!res.ok) throw new Error('검색 실패');
        const data: SearchResult[] = await res.json();
        setResults(data);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [query, open, market]);

  const handleAdd = async (item: SearchResult) => {
    setSubmitting(item.symbol);
    setError('');
    try {
      await onAdd(item.symbol, item.name, item.exchange, item.type);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : '등록 실패');
    } finally {
      setSubmitting(null);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>관심종목 추가</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <ToggleButtonGroup
            value={market}
            exclusive
            size="small"
            fullWidth
            onChange={(_, next) => next && setMarket(next as Market)}
          >
            <ToggleButton value="KR">한국</ToggleButton>
            <ToggleButton value="US">미국</ToggleButton>
            <ToggleButton value="CRYPTO">코인</ToggleButton>
          </ToggleButtonGroup>

          <TextField
            autoFocus
            fullWidth
            size="small"
            label="종목 검색"
            placeholder={MARKET_PLACEHOLDER[market]}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {error && (
            <Typography variant="body2" color="error">
              {error}
            </Typography>
          )}
          <Box sx={{ minHeight: 200 }}>
            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                <CircularProgress size={24} />
              </Box>
            ) : results.length === 0 ? (
              <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
                {query.trim() ? '검색 결과가 없습니다.' : MARKET_EMPTY_HINT[market]}
              </Typography>
            ) : (
              <List dense disablePadding>
                {results.map((item) => (
                  <ListItemButton
                    key={item.symbol}
                    onClick={() => handleAdd(item)}
                    disabled={submitting !== null}
                  >
                    <ListItemText
                      primary={
                        <Stack direction="row" spacing={1} alignItems="center">
                          <Typography variant="body2" fontWeight={600}>
                            {item.symbol}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {item.name}
                          </Typography>
                        </Stack>
                      }
                      secondary={[item.exchange, item.type].filter(Boolean).join(' · ')}
                    />
                    {submitting === item.symbol && <CircularProgress size={16} />}
                  </ListItemButton>
                ))}
              </List>
            )}
          </Box>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>닫기</Button>
      </DialogActions>
    </Dialog>
  );
}
