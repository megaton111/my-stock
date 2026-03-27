'use client';

import { Box, Button, Container, Paper, Typography, Stack, Alert, SvgIcon, Link as MuiLink } from '@mui/material';
import { useSearchParams, useRouter } from 'next/navigation';
import { Suspense } from 'react';
import { createClient } from '@/lib/supabase-browser';

function GoogleIcon() {
  return (
    <SvgIcon sx={{ fontSize: 20 }}>
      <svg viewBox="0 0 24 24">
        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
      </svg>
    </SvgIcon>
  );
}

function KakaoIcon() {
  return (
    <SvgIcon sx={{ fontSize: 20 }}>
      <svg viewBox="0 0 24 24">
        <path d="M12 3C6.48 3 2 6.36 2 10.44c0 2.62 1.75 4.93 4.38 6.24l-1.12 4.1c-.1.36.3.65.62.45l4.83-3.2c.42.04.85.07 1.29.07 5.52 0 10-3.36 10-7.66S17.52 3 12 3z" fill="#191919"/>
      </svg>
    </SvgIcon>
  );
}

function LoginContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const error = searchParams.get('error');
  const supabase = createClient();

  const handleLogin = async (provider: 'google' | 'kakao') => {
    await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        queryParams: provider === 'google'
          ? { prompt: 'select_account', scope: 'email' }
          : { prompt: 'login', scope: 'account_email' },
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
          <Typography variant="body1" color="gray5" sx={{ mb: 4 }}>
            주식트래커
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
                position: 'relative',
                borderColor: 'gray3',
                color: 'text.primary',
                fontWeight: 600,
                '&:hover': { borderColor: 'gray5', bgcolor: 'gray1' },
              }}
            >
              <Box sx={{ position: 'absolute', left: 16, display: 'flex', alignItems: 'center' }}>
                <GoogleIcon />
              </Box>
              Google로 로그인
            </Button>
            <Button
              variant="outlined"
              size="large"
              fullWidth
              onClick={() => handleLogin('kakao')}
              sx={{
                py: 1.5,
                position: 'relative',
                borderColor: '#FEE500',
                bgcolor: '#FEE500',
                color: '#191919',
                fontWeight: 600,
                '&:hover': { bgcolor: '#FDD835', borderColor: '#FDD835' },
              }}
            >
              <Box sx={{ position: 'absolute', left: 16, display: 'flex', alignItems: 'center' }}>
                <KakaoIcon />
              </Box>
              카카오로 로그인
            </Button>
          </Stack>

          <MuiLink
            component="button"
            variant="caption"
            color="text.secondary"
            underline="hover"
            onClick={() => router.push('/privacy')}
            sx={{ mt: 3, display: 'inline-block' }}
          >
            개인정보처리방침
          </MuiLink>
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
