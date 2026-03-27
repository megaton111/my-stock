import type { Metadata } from "next";
import Script from "next/script";
import { Inter } from "next/font/google";
import { AppRouterCacheProvider } from '@mui/material-nextjs/v15-appRouter';
import { ThemeProvider } from '@mui/material/styles';
import { CssBaseline } from '@mui/material';
import theme from '@/styles/theme';
import "@/styles/global.scss";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "주식 트래커 - 적립식 투자 일지 & 주식 투자 기록 관리",
  description: "적립식 투자 일지, 적립식 매매일지 작성을 한곳에서 관리하세요. 주식 모으기, 실시간 시세 조회, 수익률 계산, 매수 기록 추적까지 무료로 제공하는 주식 포트폴리오 트래커입니다.",
  keywords: ["적립식투자", "주식투자기록", "적립식투자일지", "적립식매매일지", "적립식투자일지작성", "적립식매매일지작성", "주식모으기", "주식포트폴리오", "투자일지", "주식트래커", "주식수익률"],
  openGraph: {
    title: "주식 트래커 - 적립식 투자 일지 & 주식 투자 기록 관리",
    description: "적립식 투자 일지, 적립식 매매일지 작성을 한곳에서 관리하세요. 주식 모으기, 실시간 시세 조회, 수익률 계산, 매수 기록 추적까지 무료로 제공합니다.",
    url: "https://stocktracker.co.kr",
    siteName: "주식 트래커",
    locale: "ko_KR",
    type: "website",
  },
  metadataBase: new URL("https://stocktracker.co.kr"),
  alternates: {
    canonical: "/",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <head>
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-26FTYKYGWH"
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-26FTYKYGWH');
          `}
        </Script>
      </head>
      <body
        className={`${inter.variable} antialiased`}
      >
        <AppRouterCacheProvider>
          <ThemeProvider theme={theme}>
            <CssBaseline />
            {children}
          </ThemeProvider>
        </AppRouterCacheProvider>
      </body>
    </html>
  );
}
