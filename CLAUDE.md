# CLAUDE.md

이 파일은 Claude Code (claude.ai/code)가 이 저장소에서 작업할 때 참고하는 가이드입니다.

## 규칙

### 소통
- 항상 한국어로 답변해주세요
- 코드 수정 전에 계획을 투두리스트처럼 만들어서 먼저 알려주세요
- 파일을 삭제할 때는 반드시 먼저 확인해주세요
- git push는 절대 하지 마세요 — 사용자가 직접 합니다
- 커밋 메시지는 한국어로, 짧고 직관적으로 작성 (예: "적립식 투자 기능 추가")

### 코드 스타일
- 과도한 추상화 금지 — 동작하는 심플한 코드 우선. 헬퍼/유틸은 반복이 확실할 때만 추출
- 새 컴포넌트 파일은 최소한으로 — 재사용이 명확하지 않으면 페이지 내에서 처리
- 페이지 컴포넌트는 `'use client'` 클라이언트 사이드 패턴 유지
- 데이터 페칭 로직은 `src/hooks/`에 커스텀 훅으로 분리
- 계산/포맷 로직은 `src/utils/`에 분리
- UI 컴포넌트는 항상 MUI 컴포넌트 사용 (HTML 태그 직접 사용 금지 — `<div>` 대신 `<Box>`, `<button>` 대신 `<Button>` 등)
- 스타일링은 MUI `sx` prop 사용 (별도 CSS 파일 생성하지 않기)
- default export 사용 (Next.js 컨벤션)
- 타입은 간결하게 — 복잡한 제네릭이나 타입 계층 지양, 인라인 또는 `src/types/`에 정의
- 테스트 파일 작성하지 않기 (사용자가 요청하지 않는 한)
- 불필요한 주석, docstring, 타입 어노테이션 추가하지 않기

### API 라우트
- Supabase 클라이언트 사용: 서버 → `supabase-server.ts`, 브라우저 → `supabase-browser.ts`
- 에러 응답: `NextResponse.json({ error: message }, { status: code })` 패턴
- 입력 검증: 필수 파라미터 누락 시 400으로 즉시 반환
- 에러 메시지는 한국어로

## 프로젝트 개요

Next.js 16 App Router 기반의 한국어 주식 포트폴리오 트래커("My Stock"). Supabase(인증 + DB)를 백엔드로 사용하며, Yahoo Finance에서 실시간 시세를 가져와 보유 종목의 손익을 USD/KRW 환율을 적용해 원화로 표시합니다.

## 명령어

- `pnpm dev` — 개발 서버 실행 (localhost:3000)
- `pnpm build` — 프로덕션 빌드
- `pnpm lint` — ESLint 실행 (`eslint-config-next`의 core-web-vitals + typescript 설정 사용)

## 아키텍처

- **패키지 매니저**: pnpm (v10, `packageManager` 필드에 명시)
- **프레임워크**: Next.js 16 (App Router), React 19
- **UI 스택**: MUI v7 + Tailwind CSS v4 + Emotion (SSR은 `@mui/material-nextjs`의 AppRouterCacheProvider로 처리)
- **백엔드**: Supabase (인증 + PostgreSQL DB)
- **인증**: Google + Kakao OAuth (PKCE 플로우), `src/middleware.ts`에서 세션 관리
- **상태 관리**: 커스텀 훅(`useInvestments`, `useStockPrices`, `useUser`) + 컴포넌트 `useState`. Zustand은 설치됨(미사용)
- **스타일**: SCSS (`src/styles/global.scss`), MUI 테마 (`src/styles/theme.ts`)
- **폰트**: Inter (next/font/google) + Pretendard (global.scss에서 CSS import)
- **언어**: TypeScript strict 모드, 경로 별칭 `@/*` → `./src/*`

### 주요 의존성

| 패키지 | 용도 |
|---|---|
| `@supabase/supabase-js`, `@supabase/ssr` | DB + 인증 |
| `@mui/material`, `@mui/icons-material`, `@mui/x-date-pickers` | UI 컴포넌트 |
| `recharts` | 차트 (트리맵 등) |
| `yahoo-finance2` | Yahoo Finance 데이터 |
| `dayjs` | 날짜 처리 |
| `xlsx-js-style` | 엑셀 내보내기 |
| `sass` | SCSS 지원 |

### 페이지 구조

| 경로 | 설명 |
|---|---|
| `/` | 메인 대시보드 — 포트폴리오 보드/그래프 뷰 토글, 30초 간격 시세 조회 |
| `/login` | OAuth 로그인 (Google + Kakao) |
| `/investments` | 투자 기록 관리 (CRUD) |
| `/collect`, `/collect/detail` | 주식 모으기 |
| `/dca`, `/dca/detail` | 적립식 매수 (Dollar Cost Averaging) |
| `/market` | 시장 지수 (KOSPI, KOSDAQ, 다우, 나스닥, S&P 500, USD/KRW) |

### API 라우트

| 엔드포인트 | 메서드 | 설명 |
|---|---|---|
| `/api/stock/price` | GET | Yahoo Finance Chart API(v8) 프록시 → `{symbol, price, currency}[]` |
| `/api/investments` | GET, POST, PUT | 투자 기록 조회/생성/수정 (collect + dca 병합 조회) |
| `/api/investments/[id]` | PUT, DELETE | 개별 투자 기록 수정/삭제 |
| `/api/collect` | GET, DELETE | 주식 모으기 요약 (RPC: `get_collect_summary`) / 티커별 삭제 |
| `/api/collect/entries` | GET, POST | 주식 모으기 항목 조회/생성 |
| `/api/collect/entries/[id]` | PUT, DELETE | 주식 모으기 항목 수정/삭제 |
| `/api/dca` | GET, DELETE | 적립식 매수 요약 / 티커별 삭제 |
| `/api/dca/entries` | GET, POST | 적립식 매수 항목 조회/생성 |
| `/api/dca/entries/[id]` | PUT, DELETE | 적립식 매수 항목 수정/삭제 |
| `/api/market` | GET | 시장 지수 조회 |
| `/api/users` | POST | 사용자 조회/생성 |
| `/api/users/delete` | POST | 사용자 계정 삭제 |
| `/auth/callback` | GET | OAuth 콜백 핸들러 |

### 주요 디렉터리

```
src/
├── app/             # 페이지 + API 라우트 (App Router)
├── components/      # 공용 컴포넌트
│   ├── AppDrawer.tsx           — 네비게이션 드로어 + 사용자 메뉴
│   ├── InvestmentFormDialog.tsx — 투자 추가/수정 모달
│   ├── InvestmentTable.tsx     — 포트폴리오 테이블
│   ├── PageHeader.tsx          — 페이지 헤더
│   ├── PortfolioTreemap.tsx    — Recharts 트리맵
│   └── SummaryCards.tsx        — 포트폴리오 요약 카드
├── hooks/           # 커스텀 훅
│   ├── useInvestments.ts       — Supabase에서 투자 데이터 조회
│   ├── useStockPrices.ts       — 30초 폴링 시세 조회, 환율 포함
│   └── useUser.ts              — Supabase 인증 사용자 조회
├── lib/             # Supabase 클라이언트 + 암호화
│   ├── supabase.ts             — 서비스 클라이언트 (service_role_key)
│   ├── supabase-browser.ts     — 브라우저 클라이언트 (anon_key)
│   ├── supabase-server.ts      — 서버 클라이언트 (Route Handler용)
│   └── crypto.ts               — AES-256-GCM 이메일 암호화 + HMAC-SHA256 해싱
├── types/           # TypeScript 인터페이스
│   └── investment.ts           — Investment, InvestmentInput, PriceResult
├── utils/           # 유틸리티 함수
│   ├── calculator.ts           — 포트폴리오 계산 (투자금액, 현재가치, 수익률)
│   └── format.ts               — 통화/수익률 포매터, 수익 색상
├── data/            # 샘플 데이터 + 메모리 스토어 (폴백용)
├── styles/          # 테마 + 글로벌 스타일
└── middleware.ts    # 인증 미들웨어 (PKCE, 세션 체크, 로그인 리다이렉트)
```

### Supabase DB 테이블

| 테이블 | 주요 컬럼 |
|---|---|
| `users` | id, email, email_hash, created_at |
| `investments` | id, user_id, name, ticker, category, quantity, avg_price, currency |
| `collect_entries` | id, user_id, stock_name, ticker, target_quantity, quantity, purchase_date |
| `dca_entries` | id, user_id, stock_name, ticker, target_quantity, quantity, purchase_date, schedule_type, schedule_value, schedule_quantity |

### 컨벤션

- UI 텍스트는 한국어 (lang="ko")
- 통화 표시: USD는 `$` 접두사, KRW는 `원` 접미사
- 수익 색상: 양수 → `error.main` (빨강), 음수 → `primary.main` (파랑) — 한국 주식시장 관례를 따름
- 숫자는 `tabular-nums` 사용 (MUI CssBaseline 오버라이드에서 설정) — 열 정렬 안정성 확보
- SEO: `robots.ts`, `sitemap.ts` 설정 포함

### 환경 변수 (.env.local)

| 변수명 | 용도 |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase 프로젝트 URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase 공개 키 |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase 서비스 역할 키 (서버 전용) |
| `EMAIL_ENCRYPTION_KEY` | 이메일 암호화 키 (AES-256-GCM) |
