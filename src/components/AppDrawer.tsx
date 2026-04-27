'use client';

import { useState } from 'react';
import {
  Drawer, Box, List, ListItem, ListItemButton, ListItemText, Collapse,
  Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions, Button,
  Typography, GlobalStyles, useMediaQuery,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { useRouter, usePathname } from 'next/navigation';
import { useUser } from '@/hooks/useUser';

interface MenuItem {
  label: string;
  path?: string;
  children?: { label: string; path: string }[];
}

const MENU_ITEMS: MenuItem[] = [
  { label: '대시보드', path: '/dashboard' },
  { label: '투자내역 관리', path: '/investments' },
  { label: '주식 모으기', path: '/collect' },
  { label: '적립식 매수', path: '/dca' },
  { label: 'MDD 분석', path: '/mdd' },
  {
    label: '공모주',
    children: [
      { label: '일정', path: '/ipo' },
      { label: '나의 공모주', path: '/ipo/my' },
    ],
  },
  { label: '주식정보', path: '/market' },
];

const SIDEBAR_WIDTH = 280;

interface AppDrawerProps {
  open: boolean;
  onClose: () => void;
}

export default function AppDrawer({ open, onClose }: AppDrawerProps) {
  const theme = useTheme();
  const isWideScreen = useMediaQuery(theme.breakpoints.up('lg'));
  const router = useRouter();
  const pathname = usePathname();
  const { user, signOut } = useUser();
  const [deleteOpen, setDeleteOpen] = useState(false);

  const handleDeleteAccount = async () => {
    if (!user) return;
    try {
      const supabase = (await import('@/lib/supabase-browser')).createClient();
      const { data: { session } } = await supabase.auth.getSession();
      const provider = session?.user?.app_metadata?.provider;
      const providerToken = session?.provider_token;
      const providerRefreshToken = session?.provider_refresh_token;

      await fetch('/api/users/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, provider, providerToken, providerRefreshToken }),
      });
      await signOut();
    } catch (err) {
      console.error('Failed to delete account:', err);
    }
  };

  const handleNavigate = (path: string) => {
    if (!isWideScreen) onClose();
    router.push(path);
  };

  const displayName = user?.email?.split('@')[0] || '';

  const mainMenu = (
    <List disablePadding>
      {MENU_ITEMS.map((item) => {
        if (item.children) {
          const defaultPath = item.children[0].path;
          const isGroupActive = item.children.some((c) => pathname === c.path);
          return (
            <Box key={item.label} sx={{ borderBottom: '1px solid', borderColor: 'gray2' }}>
              <ListItem disablePadding>
                <ListItemButton
                  selected={isGroupActive}
                  onClick={() => handleNavigate(defaultPath)}
                  sx={{
                    py: 1.5,
                    '&.Mui-selected': { bgcolor: 'gray1', color: 'primary.main' },
                  }}
                >
                  <ListItemText primary={item.label} />
                </ListItemButton>
              </ListItem>
              <Collapse in={isGroupActive}>
                <List disablePadding>
                  {item.children.map((child) => (
                    <ListItem key={child.label} disablePadding>
                      <ListItemButton
                        selected={pathname === child.path}
                        onClick={() => handleNavigate(child.path)}
                        sx={{
                          py: 0.75, pl: 4,
                          '&.Mui-selected': { bgcolor: 'gray1', color: 'primary.main' },
                        }}
                      >
                        <ListItemText primary={child.label} primaryTypographyProps={{ fontSize: '0.8125rem' }} />
                      </ListItemButton>
                    </ListItem>
                  ))}
                </List>
              </Collapse>
            </Box>
          );
        }
        return (
          <ListItem
            key={item.label}
            disablePadding
            sx={{ borderBottom: '1px solid', borderColor: 'gray2' }}
          >
            <ListItemButton
              selected={pathname === item.path}
              onClick={() => handleNavigate(item.path!)}
              sx={{
                py: 1.5,
                '&.Mui-selected': { bgcolor: 'gray1', color: 'primary.main' },
              }}
            >
              <ListItemText primary={item.label} />
            </ListItemButton>
          </ListItem>
        );
      })}
    </List>
  );

  const bottomMenu = (
    <List disablePadding>
      <ListItem disablePadding sx={{ borderTop: '1px solid', borderColor: 'gray2' }}>
        <ListItemButton
          onClick={() => handleNavigate('/privacy')}
          sx={{ py: 1.5, color: 'gray6' }}
        >
          <ListItemText primary="개인정보처리방침" />
        </ListItemButton>
      </ListItem>
      <ListItem disablePadding sx={{ borderTop: '1px solid', borderColor: 'gray2' }}>
        <ListItemButton
          onClick={() => { if (!isWideScreen) onClose(); signOut(); }}
          sx={{ py: 1.5, color: 'gray6' }}
        >
          <ListItemText primary="로그아웃" />
        </ListItemButton>
      </ListItem>
      <ListItem disablePadding sx={{ borderTop: '1px solid', borderColor: 'gray2' }}>
        <ListItemButton
          onClick={() => setDeleteOpen(true)}
          sx={{ py: 1.5, color: 'error.main' }}
        >
          <ListItemText primary="회원 탈퇴" />
        </ListItemButton>
      </ListItem>
    </List>
  );

  const deleteDialog = (
    <Dialog open={deleteOpen} onClose={() => setDeleteOpen(false)}>
      <DialogTitle>회원 탈퇴</DialogTitle>
      <DialogContent>
        <DialogContentText>
          탈퇴 시 모든 투자 데이터가 삭제되며 복구할 수 없습니다.
          정말 탈퇴하시겠습니까?
        </DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setDeleteOpen(false)}>취소</Button>
        <Button onClick={handleDeleteAccount} color="error" variant="contained">탈퇴</Button>
      </DialogActions>
    </Dialog>
  );

  if (isWideScreen) {
    return (
      <>
        <GlobalStyles styles={{
          body: { paddingRight: `${SIDEBAR_WIDTH}px !important` },
        }} />
        <Box
          component="nav"
          sx={{
            position: 'fixed',
            right: 0,
            top: 0,
            bottom: 0,
            width: SIDEBAR_WIDTH,
            borderLeft: '1px solid',
            borderColor: 'gray2',
            bgcolor: 'background.paper',
            overflowY: 'auto',
            zIndex: theme.zIndex.appBar,
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <Box sx={{ px: 2, pt: 3, pb: 2 }}>
            {displayName && (
              <Typography variant="body2" fontWeight={600} color="gray7">
                {displayName}님
              </Typography>
            )}
          </Box>
          <Box sx={{ flex: 1 }}>
            {mainMenu}
          </Box>
          <Box>
            {bottomMenu}
          </Box>
        </Box>
        {deleteDialog}
      </>
    );
  }

  return (
    <>
      <Drawer anchor="right" open={open} onClose={onClose}>
        <Box
          sx={{ width: 250, display: 'flex', flexDirection: 'column', height: '100%' }}
          role="presentation"
        >
          <Box sx={{ flex: 1 }}>
            {mainMenu}
          </Box>
          <Box>
            {bottomMenu}
          </Box>
        </Box>
      </Drawer>
      {deleteDialog}
    </>
  );
}
