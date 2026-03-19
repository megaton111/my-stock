'use client';

import { Box, Button, Container, Paper, Typography, Stack, Alert } from '@mui/material';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { createClient } from '@/lib/supabase-browser';

function LoginContent() {
  const searchParams = useSearchParams();
  const error = searchParams.get('error');
  const supabase = createClient();

  const handleLogin = async (provider: 'google' | 'kakao') => {
    await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
  };

  return (
    <Container maxWidth="sm">
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Paper
          sx={{
            p: 5,
            width: '100%',
            border: '1px solid',
            borderColor: 'gray2',
            boxShadow: 'none',
            textAlign: 'center',
          }}
        >
          <Typography variant="h4" fontWeight={800} sx={{ mb: 1 }}>
            My Stock
          </Typography>
          <Typography variant="body2" color="gray5" sx={{ mb: 4 }}>
            주식 포트폴리오 트래커
          </Typography>

          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              로그인에 실패했습니다. 다시 시도해주세요.
            </Alert>
          )}

          <Stack spacing={2}>
            <Button
              variant="outlined"
              size="large"
              fullWidth
              onClick={() => handleLogin('google')}
              sx={{
                py: 1.5,
                borderColor: 'gray3',
                color: 'text.primary',
                fontWeight: 600,
                '&:hover': { borderColor: 'gray5', bgcolor: 'gray1' },
              }}
            >
              Google로 로그인
            </Button>
            <Button
              variant="outlined"
              size="large"
              fullWidth
              onClick={() => handleLogin('kakao')}
              sx={{
                py: 1.5,
                borderColor: '#FEE500',
                bgcolor: '#FEE500',
                color: '#191919',
                fontWeight: 600,
                '&:hover': { bgcolor: '#FDD835', borderColor: '#FDD835' },
              }}
            >
              카카오로 로그인
            </Button>
          </Stack>
        </Paper>
      </Box>
    </Container>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginContent />
    </Suspense>
  );
}
