# CLAUDE.md

이 파일은 Claude Code (claude.ai/code)가 이 저장소에서 작업할 때 참고하는 가이드입니다.

## 프로젝트 개요

Next.js 16 App Router 기반의 한국어 주식 포트폴리오 트래커("My Stock"). Yahoo Finance에서 실시간 시세를 가져와 보유 종목의 손익을 USD/KRW 환율을 적용해 원화로 표시합니다.

## 명령어

- `pnpm dev` — 개발 서버 실행 (localhost:3000)
- `pnpm build` — 프로덕션 빌드
- `pnpm lint` — ESLint 실행 (`eslint-config-next`의 core-web-vitals + typescript 설정 사용)

## 아키텍처

- **패키지 매니저**: pnpm (v10, `packageManager` 필드에 명시)
- **UI 스택**: MUI v7 + Tailwind CSS v4 + Emotion (SSR은 `@mui/material-nextjs`의 AppRouterCacheProvider로 처리)
- **상태 관리**: Zustand (설치됨, 아직 미연결); 현재 페이지에서 `useState`로 로컬 상태 관리 중
- **폰트**: Inter (next/font/google) + Pretendard (globals.css에서 CSS import)
- **언어**: TypeScript strict 모드, 경로 별칭 `@/*` → `./src/*`

### 주요 파일

- `src/styles/theme.ts` — MUI 테마 설정. `gray1`~`gray10` 커스텀 팔레트 토큰 포함 (`declare module`로 타입 확장)
- `src/app/layout.tsx` — 루트 레이아웃. `AppRouterCacheProvider > ThemeProvider > CssBaseline` 순서로 래핑
- `src/app/page.tsx` — 메인 대시보드 (`'use client'`). 하드코딩된 `INVESTMENT_DATA` 배열, 30초 간격 시세 조회, 보드/그래프 뷰 토글
- `src/app/api/stock/price/route.ts` — Next.js Route Handler. Yahoo Finance Chart API (v8)를 프록시하여 `{symbol, price, currency}[]` 반환

### 컨벤션

- UI 텍스트는 한국어 (lang="ko")
- 통화 표시: USD는 `$` 접두사, KRW는 `원` 접미사
- 수익 색상: 양수 → `error.main` (빨강), 음수 → `primary.main` (파랑) — 한국 주식시장 관례를 따름
- 숫자는 `tabular-nums` 사용 (MUI CssBaseline 오버라이드에서 설정) — 열 정렬 안정성 확보
