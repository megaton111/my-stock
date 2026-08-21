'use client';

import { useState, useEffect } from 'react';
import { Paper, Box, Typography, Stack, Skeleton } from '@mui/material';
import { useTheme } from '@mui/material/styles';

interface FearGreedData {
  score: number;
  rating: string;
  previousClose: number;
  previous1Week: number;
  previous1Month: number;
  previous1Year: number;
}

const RATING_KO: Record<string, string> = {
  'extreme fear': '극도의 공포',
  'fear': '공포',
  'neutral': '중립',
  'greed': '탐욕',
  'extreme greed': '극도의 탐욕',
};

function getScoreColor(score: number): string {
  if (score < 25) return '#1565C0';
  if (score < 45) return '#42A5F5';
  if (score < 55) return '#9E9E9E';
  if (score < 75) return '#FF9800';
  return '#F44336';
}

const COMPARE_ITEMS: { label: string; key: keyof FearGreedData }[] = [
  { label: '전일', key: 'previousClose' },
  { label: '1주 전', key: 'previous1Week' },
  { label: '1달 전', key: 'previous1Month' },
  { label: '1년 전', key: 'previous1Year' },
];

export default function FearGreedWidget() {
  const theme = useTheme();
  const [data, setData] = useState<FearGreedData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/market/fear-greed')
      .then((r) => r.json())
      .then((d: FearGreedData) => setData(d))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <Skeleton variant="rectangular" animation="wave" width="100%" height={176} sx={{ borderRadius: 1 }} />;
  }

  if (!data || data.score === undefined) return null;

  const scoreColor = getScoreColor(data.score);
  const ratingKo = RATING_KO[data.rating.toLowerCase()] ?? data.rating;
  const thumbLeft = Math.min(Math.max(data.score, 2), 98);

  return (
    <Paper
      onClick={() => window.open('https://edition.cnn.com/markets/fear-and-greed', '_blank', 'noopener,noreferrer')}
      sx={{ width: 1, p: { xs: 2, sm: 2.5 }, borderRadius: 1, cursor: 'pointer', '&:hover': { opacity: 0.85 } }}
    >
      <Stack spacing={2}>
        <Typography variant="body2" color="gray5" fontWeight={600}>
          공포·탐욕 지수 (Fear & Greed)
        </Typography>

        <Stack direction="row" alignItems="flex-end" spacing={1.5}>
          <Typography
            variant="h3"
            fontWeight={700}
            sx={{ color: scoreColor, lineHeight: 1, letterSpacing: '-2px' }}
          >
            {Math.round(data.score)}
          </Typography>
          <Typography variant="body1" fontWeight={600} sx={{ color: scoreColor, pb: 0.5 }}>
            {ratingKo}
          </Typography>
        </Stack>

        <Box>
          <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.75 }}>
            <Typography variant="caption" color="gray5">극도 공포</Typography>
            <Typography variant="caption" color="gray5">중립</Typography>
            <Typography variant="caption" color="gray5">극도 탐욕</Typography>
          </Stack>
          <Box sx={{
            position: 'relative',
            height: 10,
            borderRadius: 5,
            background: 'linear-gradient(to right, #1565C0, #42A5F5, #9E9E9E, #FF9800, #F44336)',
          }}>
            <Box sx={{
              position: 'absolute',
              left: `${thumbLeft}%`,
              top: '50%',
              transform: 'translate(-50%, -50%)',
              width: 16,
              height: 16,
              borderRadius: '50%',
              bgcolor: 'background.paper',
              border: `2.5px solid ${scoreColor}`,
              boxShadow: `0 0 0 3px ${scoreColor}30`,
            }} />
          </Box>
        </Box>

        <Stack
          direction="row"
          sx={{ borderTop: '1px solid', borderColor: 'gray2', pt: 1.5 }}
        >
          {COMPARE_ITEMS.map(({ label, key }) => {
            const val = data[key] as number;
            const diff = data.score - val;
            const diffColor = diff > 0 ? theme.palette.error.main : diff < 0 ? theme.palette.primary.main : 'text.secondary';
            return (
              <Box key={key} sx={{ flex: 1, textAlign: 'center' }}>
                <Typography variant="caption" color="gray5" display="block">
                  {label}
                </Typography>
                <Typography variant="body2" fontWeight={600}>
                  {Math.round(val)}
                </Typography>
                <Typography variant="caption" sx={{ color: diffColor }} display="block">
                  {diff > 0 ? '+' : ''}{diff.toFixed(1)}
                </Typography>
              </Box>
            );
          })}
        </Stack>
      </Stack>
    </Paper>
  );
}
