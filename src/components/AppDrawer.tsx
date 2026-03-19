'use client';

import { Drawer, Box, List, ListItem, ListItemButton, ListItemIcon, ListItemText } from '@mui/material';
import DashboardIcon from '@mui/icons-material/Dashboard';
import ListAltIcon from '@mui/icons-material/ListAlt';
import ShowChartIcon from '@mui/icons-material/ShowChart';
import SavingsIcon from '@mui/icons-material/Savings';
import SettingsIcon from '@mui/icons-material/Settings';
import { useRouter, usePathname } from 'next/navigation';

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
        </List>
      </Box>
    </Drawer>
  );
}
