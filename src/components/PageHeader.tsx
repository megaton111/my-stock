'use client';

import { useState } from 'react';
import { Box, IconButton, Typography, Stack } from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import AppDrawer from './AppDrawer';
import { useUser } from '@/hooks/useUser';

const iconButtonSx = {
  border: '1px solid',
  borderColor: 'gray2',
  borderRadius: '4px',
  bgcolor: 'background.paper',
  '&:hover': { bgcolor: 'gray1' },
  width: 40,
  height: 40,
} as const;

interface PageHeaderProps {
  left?: React.ReactNode;
}

export default function PageHeader({ left }: PageHeaderProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { user } = useUser();

  const displayName = user?.email?.split('@')[0] || '';

  return (
    <>
      {left && (
        <Box sx={{ position: 'absolute', top: 24, left: 24 }}>
          {left}
        </Box>
      )}

      <Stack
        direction="row"
        alignItems="center"
        spacing={1.5}
        sx={{ position: 'absolute', top: 24, right: 24, display: { lg: 'none' } }}
      >
        {displayName && (
          <Typography variant="body2" fontWeight={600} color="gray7">
            {displayName}님
          </Typography>
        )}
        <IconButton onClick={() => setDrawerOpen(true)} sx={iconButtonSx}>
          <MenuIcon fontSize="small" />
        </IconButton>
      </Stack>

      <AppDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </>
  );
}
