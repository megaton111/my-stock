'use client';

import { useState, useEffect } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, Typography, Stack, Checkbox, FormControlLabel,
} from '@mui/material';
import CelebrationIcon from '@mui/icons-material/Celebration';
import { useUser } from '@/hooks/useUser';
import { MyIpoEntry } from '@/types/ipo';

function getToday() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function isDismissed(entryId: string) {
  try {
    return localStorage.getItem(`ipo_listing_dismissed_${entryId}`) === 'true';
  } catch {
    return false;
  }
}

function dismiss(entryId: string) {
  try {
    localStorage.setItem(`ipo_listing_dismissed_${entryId}`, 'true');
  } catch { /* noop */ }
}

interface Props {
  testEntries?: { stockName: string; broker: string | null }[];
}

export default function IpoListingAlert({ testEntries }: Props) {
  const { user } = useUser();
  const [listings, setListings] = useState<MyIpoEntry[]>([]);
  const [open, setOpen] = useState(false);
  const [dontShowAgain, setDontShowAgain] = useState(false);

  useEffect(() => {
    if (testEntries && testEntries.length > 0) {
      const fakeEntries = testEntries.map((t, i) => ({
        id: `test-${i}`,
        stockName: t.stockName,
        broker: t.broker,
        listingDate: getToday(),
        ipoPrice: 0,
        allocatedQuantity: 0,
        sellPrice: null,
        sellDate: null,
        fee: 0,
        profit: 0,
      }));
      setListings(fakeEntries);
      setOpen(true);
      return;
    }

    if (!user) return;

    fetch(`/api/ipo/my?userId=${user.id}`)
      .then((res) => res.json())
      .then((data: MyIpoEntry[]) => {
        const today = getToday();
        const todayListings = data.filter(
          (e) => e.listingDate === today && !isDismissed(e.id),
        );
        if (todayListings.length > 0) {
          setListings(todayListings);
          setOpen(true);
        }
      })
      .catch(() => {});
  }, [user, testEntries]);

  const handleClose = () => {
    if (dontShowAgain) {
      listings.forEach((e) => dismiss(e.id));
    }
    setOpen(false);
  };

  if (!open || listings.length === 0) return null;

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <CelebrationIcon color="warning" />
        공모주 상장 알림
      </DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          {listings.map((entry) => (
            <Typography key={entry.id} variant="body1" fontWeight={600}>
              {entry.stockName} 상장날입니다! 증권사 {entry.broker || '미입력'} 입니다.
            </Typography>
          ))}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ justifyContent: 'space-between', px: 3, pb: 2 }}>
        <FormControlLabel
          control={
            <Checkbox
              size="small"
              checked={dontShowAgain}
              onChange={(e) => setDontShowAgain(e.target.checked)}
            />
          }
          label={<Typography variant="caption">더이상 보지 않기</Typography>}
        />
        <Button onClick={handleClose} variant="contained" size="small">
          확인
        </Button>
      </DialogActions>
    </Dialog>
  );
}
