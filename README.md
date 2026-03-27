# 주식트래커

적립식 투자 일지, 주식 모으기, 실시간 수익률 조회까지 — 무료 주식 포트폴리오 트래커

> https://stocktracker.co.kr

## 주요 기능

- **투자 기록 관리** — 보유 종목, 매수 평균가, 수량을 한곳에서 관리
- **적립식 매수 추적** — DCA 전략의 매수 일정, 진행률, 미입력 알림
- **주식 모으기** — 목표 수량까지 매수 기록을 추적
- **실시간 시세 & 수익률** — Yahoo Finance 연동, 30초 자동 갱신, USD/KRW 환율 적용
- **포트폴리오 시각화** — 트리맵 차트로 자산 배분 한눈에 파악
- **시장 지수 조회** — KOSPI, KOSDAQ, 다우, 나스닥, S&P 500, 환율
- **엑셀 내보내기** — 투자 기록을 엑셀 파일로 다운로드

## 기술 스택

| 영역 | 기술 |
|---|---|
| **프레임워크** | Next.js 16 (App Router), React 19, TypeScript |
| **UI** | MUI v7, Tailwind CSS v4, Emotion, Recharts |
| **백엔드** | Supabase (PostgreSQL + Auth) |
| **인증** | Google OAuth, Kakao OAuth (PKCE) |
| **데이터** | Yahoo Finance API (실시간 시세) |
| **배포** | Vercel |
| **패키지 매니저** | pnpm |

## 시작하기

```bash
# 의존성 설치
pnpm install

# 환경 변수 설정
cp .env.example .env.local
# .env.local에 Supabase, 암호화 키 등 설정

# 개발 서버 실행
pnpm dev
```

## 환경 변수

| 변수명 | 설명 |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase 프로젝트 URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase 공개 키 |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase 서비스 역할 키 (서버 전용) |
| `EMAIL_ENCRYPTION_KEY` | 이메일 암호화 키 (AES-256-GCM) |

## 프로젝트 구조

```
src/
├── app/             # 페이지 + API 라우트 (App Router)
├── components/      # 공용 컴포넌트
├── hooks/           # 커스텀 훅 (useInvestments, useStockPrices, useUser)
├── lib/             # Supabase 클라이언트, 암호화 유틸
├── types/           # TypeScript 타입 정의
├── utils/           # 계산/포맷 유틸리티
├── styles/          # MUI 테마, 글로벌 스타일
└── middleware.ts    # 인증 미들웨어
```
