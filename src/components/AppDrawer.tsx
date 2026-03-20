'use client';

import { useState } from 'react';
import {
  Drawer, Box, List, ListItem, ListItemButton, ListItemIcon, ListItemText,
  Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions, Button,
} from '@mui/material';
import DashboardIcon from '@mui/icons-material/Dashboard';
import ListAltIcon from '@mui/icons-material/ListAlt';
import ShowChartIcon from '@mui/icons-material/ShowChart';
import SavingsIcon from '@mui/icons-material/Savings';
import LogoutIcon from '@mui/icons-material/Logout';
import PersonRemoveIcon from '@mui/icons-material/PersonRemove';
import { useRouter, usePathname } from 'next/navigation';
import { useUser } from '@/hooks/useUser';

const MENU_ITEMS = [
  { label: '대시보드', path: '/', icon: <DashboardIcon fontSize="small" /> },
  { label: '투자 내역', path: '/investments', icon: <ListAltIcon fontSize="small" /> },
  { label: '적립식 매수', path: '/dca', icon: <SavingsIcon fontSize="small" /> },
  { label: '주식정보', path: '/market', icon: <ShowChartIcon fontSize="small" /> },
  // { label: '설정', path: '/settings', icon: <SettingsIcon fontSize="small" /> },
];

interface AppDrawerProps {
  open: boolean;
  onClose: () => void;
}

export default function AppDrawer({ open, onClose }: AppDrawerProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, signOut } = useUser();
  const [deleteOpen, setDeleteOpen] = useState(false);

  const handleDeleteAccount = async () => {
    if (!user) return;
    try {
      // 현재 세션에서 provider 정보와 토큰 가져오기
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
    onClose();
    router.push(path);
  };

  return (
    <Drawer anchor="right" open={open} onClose={onClose}>
      <Box sx={{ width: 250, p: 2 }} role="presentation">
        <List>
          {MENU_ITEMS.map((item) => (
            <ListItem key={item.label} disablePadding>
              <ListItemButton
                selected={pathname === item.path}
                onClick={() => handleNavigate(item.path)}
                sx={{
                  borderRadius: 1,
                  '&.Mui-selected': { bgcolor: 'gray1', color: 'primary.main' },
                }}
              >
                <ListItemIcon sx={{ minWidth: 36, color: 'inherit' }}>
                  {item.icon}
                </ListItemIcon>
                <ListItemText primary={item.label} />
              </ListItemButton>
            </ListItem>
          ))}
          <ListItem disablePadding sx={{ mt: 2, borderTop: '1px solid', borderColor: 'gray2', pt: 2 }}>
            <ListItemButton
              onClick={() => { onClose(); signOut(); }}
              sx={{ borderRadius: 1, color: 'gray6' }}
            >
              <ListItemIcon sx={{ minWidth: 36, color: 'inherit' }}>
                <LogoutIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText primary="로그아웃" />
            </ListItemButton>
          </ListItem>
          <ListItem disablePadding>
            <ListItemButton
              onClick={() => setDeleteOpen(true)}
              sx={{ borderRadius: 1, color: 'error.main' }}
            >
              <ListItemIcon sx={{ minWidth: 36, color: 'inherit' }}>
                <PersonRemoveIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText primary="회원 탈퇴" />
            </ListItemButton>
          </ListItem>
        </List>
      </Box>

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
    </Drawer>
  );
}
