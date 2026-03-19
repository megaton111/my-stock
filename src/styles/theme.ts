'use client';

import { createTheme } from '@mui/material/styles';

declare module '@mui/material/styles' {
  interface Palette {
    gray1: string;
    gray2: string;
    gray3: string;
    gray4: string;
    gray5: string;
    gray6: string;
    gray7: string;
    gray8: string;
    gray9: string;
    gray10: string;
  }
  interface PaletteOptions {
    gray1?: string;
    gray2?: string;
    gray3?: string;
    gray4?: string;
    gray5?: string;
    gray6?: string;
    gray7?: string;
    gray8?: string;
    gray9?: string;
    gray10?: string;
  }
}

/**
 * MUI v7 Theme Configuration
 * Using standard typography and palette for a premium feel.
 */
const theme = createTheme({
  breakpoints: {
    values: {
      xs: 0,
      sm: 600,
      md: 900,
      lg: 1200,
      xl: 1536,
    },
  },
  palette: {
    primary: {
      main: '#1976d2', // Professional Blue
    },
    secondary: {
      main: '#9c27b0', // Modern Purple
    },
    gray1: '#F7F7F7',
    gray2: '#E0E0E0',
    gray3: '#DEDEDE',
    gray4: '#C4C4C4',
    gray5: '#A3A3A3',
    gray6: '#999999',
    gray7: '#737373',
    gray8: '#666666',
    gray9: '#424242',
    gray10: '#333333',
    // Adding standard UI colors
    background: {
      default: '#f4f6f8',
      paper: '#ffffff',
    },
    text: {
      primary: '#1a1a1b',
      secondary: '#4f566b',
    },
  },
  typography: {
    fontFamily: [
      'var(--font-inter)',
      'Pretendard',
      'Inter',
      'Roboto',
      '"Helvetica Neue"',
      'Arial',
      'sans-serif',
    ].join(','),
    h1: {
      fontSize: '2.5rem',
      fontWeight: 700,
    },
    h2: {
      fontSize: '2rem',
      fontWeight: 600,
    },
    button: {
      textTransform: 'none', // More professional look
      fontWeight: 600,
    },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          fontVariantNumeric: 'tabular-nums', // Numbers won't shift when changing
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8, // Rounded corners for premium feel
          padding: '8px 20px',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          boxShadow: '0px 4px 20px rgba(0, 0, 0, 0.05)',
        },
      },
    },
  },
});

export default theme;
