'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  Box, Paper, Typography, Stack, Checkbox, Chip, LinearProgress,
  Accordion, AccordionSummary, AccordionDetails, IconButton, Tooltip,
  FormControlLabel,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';
import BugReportIcon from '@mui/icons-material/BugReport';
import ReplayIcon from '@mui/icons-material/Replay';

interface TestCase {
  id: string;
  scenario: string;
  expected: string;
  caution?: boolean;
}

interface TestSection {
  title: string;
  subtitle?: string;
  cases: TestCase[];
}

interface TestGroup {
  id: string;
  title: string;
  path: string;
  sections: TestSection[];
}

const TEST_DATA: TestGroup[] = [
  {
    id: 'login',
    title: '1. 로그인',
    path: '/login',
    sections: [
      {
        title: '인증',
        cases: [
          { id: '1-1', scenario: '카카오 로그인 버튼 클릭', expected: 'OAuth 플로우 → 대시보드 이동' },
          { id: '1-2', scenario: '구글 로그인 버튼 클릭', expected: 'OAuth 플로우 → 대시보드 이동' },
          { id: '1-3', scenario: '비로그인 상태에서 /dashboard 직접 접근', expected: '/login으로 리다이렉트' },
          { id: '1-4', scenario: '개인정보처리방침 링크 클릭', expected: '/privacy 페이지 이동' },
        ],
      },
    ],
  },
  {
    id: 'dashboard',
    title: '2. 대시보드',
    path: '/dashboard',
    sections: [
      {
        title: '요약 및 위젯',
        cases: [
          { id: '2-1', scenario: '로그인 직후 대시보드 진입', expected: '요약 카드 3개 표시 (총 평가금액, 수익률, 총 투자금액)' },
          { id: '2-2', scenario: '투자 종목이 없는 상태', expected: '"투자 내역 작성하기" 안내 버튼 표시' },
          { id: '2-3', scenario: '포트폴리오 비중 트리맵 확인', expected: '종목별 크기·색상이 비중·수익률 반영' },
          { id: '2-4', scenario: '30초 대기 후 시세 확인', expected: '가격 자동 갱신' },
        ],
      },
      {
        title: '자산추이 차트',
        cases: [
          { id: '2-5', scenario: '기간 토글 클릭 (1주→1개월→3개월→1년→전체)', expected: '기간별 그래프 갱신, 변동 금액/% 업데이트' },
          { id: '2-6', scenario: 'ℹ️ 아이콘 클릭', expected: '툴팁으로 기간 비교 설명 표시' },
          { id: '2-7', scenario: '"종목별 변동 자세히 보기" 클릭', expected: '종목별 전일 대비 변동 목록 펼침' },
        ],
      },
      {
        title: '반응형',
        cases: [
          { id: '2-8', scenario: '모바일 화면 크기로 확인', expected: '카드형 레이아웃으로 전환, 터치 정상' },
        ],
      },
    ],
  },
  {
    id: 'investments',
    title: '3. 투자내역 관리',
    path: '/investments',
    sections: [
      {
        title: 'A. 종목 등록',
        cases: [
          { id: '3-1', scenario: '"등록" → 미국주식, Apple, AAPL, 수량:10, 매입가:200', expected: '저장 성공, 테이블에 USD로 표시' },
          { id: '3-2', scenario: '"등록" → 코스피, 삼성전자, 005930, 수량:50, 매입가:70000', expected: '티커에 .KS 자동 추가, KRW 통화' },
          { id: '3-3', scenario: '"등록" → ETF, VOO, VOO, 수량:5, 매입가:500', expected: 'USD 통화로 등록' },
          { id: '3-4', scenario: '"등록" → 현금, 계좌명:비상금, 금액:5000000', expected: '현금 계좌 등록 (티커/매입가 필드 없음)' },
          { id: '3-5', scenario: '존재하지 않는 티커 입력 (예: XXXYYY)', expected: '"유효하지 않은 티커" 에러 메시지' },
          { id: '3-6', scenario: '필수 항목 비우고 등록 시도', expected: '등록 버튼 비활성화 또는 에러' },
        ],
      },
      {
        title: 'B. 종목 수정',
        cases: [
          { id: '3-7', scenario: '등록한 종목 "수정" → 수량 변경', expected: '수량 업데이트 반영' },
          { id: '3-8', scenario: '카테고리 변경 (미국주식→ETF)', expected: '카테고리 변경 저장' },
          { id: '3-9', scenario: '증권사 선택 후 저장', expected: '증권사 정보 반영' },
        ],
      },
      {
        title: 'C. 매수 거래',
        cases: [
          { id: '3-10', scenario: '"매수" → 오늘 날짜, 수량:5, 단가:$210', expected: '보유수량 증가, 평균단가 재계산' },
          { id: '3-11', scenario: 'KRW 종목 "매수" → 수량:10, 단가:72000', expected: '환율 필드 없이 정상 등록' },
          { id: '3-12', scenario: 'USD 종목 매수 시 환율 입력 확인', expected: '환율 필드 표시, 기본값 자동 세팅' },
          { id: '3-13', scenario: '종목 행 클릭 → 거래내역 펼침', expected: '매수 이력 테이블 표시' },
          { id: '3-14', scenario: '거래내역에서 수정 아이콘 → 단가 변경', expected: '평균단가 재계산 반영' },
        ],
      },
      {
        title: 'D. 매도',
        cases: [
          { id: '3-15', scenario: '"매도" → 수량:3, 단가:$220', expected: '실현손익 미리보기 표시, 수량 감소' },
          { id: '3-16', scenario: '"전량" 버튼 클릭', expected: '보유수량 전체 자동 입력, 전량 매도 경고' },
          { id: '3-17', scenario: '보유수량 초과 매도 시도 (예: 100주)', expected: '검증 에러 (최대 수량 초과)' },
          { id: '3-18', scenario: '전량 매도 실행', expected: '"매도 완료 종목" 섹션으로 이동' },
        ],
      },
      {
        title: 'E. 삭제',
        cases: [
          { id: '3-19', scenario: '종목 "삭제" → 확인 다이얼로그에서 확인', expected: '테이블에서 제거' },
          { id: '3-20', scenario: '삭제 확인 다이얼로그에서 취소', expected: '아무 변화 없음' },
        ],
      },
      {
        title: 'F. 정렬',
        cases: [
          { id: '3-21', scenario: '종목명 컬럼 헤더 클릭', expected: '가나다/ABC 순 정렬 토글' },
          { id: '3-22', scenario: '총 평가금액 컬럼 헤더 클릭', expected: '금액 기준 오름/내림차순' },
          { id: '3-23', scenario: '수익률 컬럼 헤더 클릭', expected: '수익률 기준 정렬' },
        ],
      },
    ],
  },
  {
    id: 'collect',
    title: '4. 주식 모으기',
    path: '/collect',
    sections: [
      {
        title: 'A. 신규 등록',
        cases: [
          { id: '4-1', scenario: '"등록" → 미국주식, NVIDIA, NVDA, 목표수량:100', expected: '등록 성공, 상세 화면 진입' },
          { id: '4-2', scenario: '이미 등록된 티커 재등록 시도', expected: '"이미 등록된 종목" 에러' },
          { id: '4-3', scenario: '유효하지 않은 티커 입력', expected: '에러 메시지 표시' },
        ],
      },
      {
        title: 'B. 매수 기록',
        cases: [
          { id: '4-4', scenario: '"매수 추가" → 날짜:4/10, 금액:$1200, 수량:10', expected: '테이블에 추가, 누적 계산' },
          { id: '4-5', scenario: '"매수 추가" → 날짜:4/15, 금액:$600, 수량:5', expected: '누적수량 15, 누적평단가 재계산' },
          { id: '4-6', scenario: '동일 날짜 매수 추가 시도', expected: '"날짜당 1건만 가능" 에러' },
          { id: '4-7', scenario: '요약 카드 확인 (현재수량, 평균단가, 총투자금액, 현재가, 수익률)', expected: '모든 값 정확히 계산' },
          { id: '4-8', scenario: '"원금 vs 평가금액" 차트 확인', expected: '2건 이상이면 차트 표시' },
        ],
      },
      {
        title: 'C. 수정/삭제',
        cases: [
          { id: '4-9', scenario: '기존 매수 기록 수정 → 수량 변경', expected: '누적 값 재계산' },
          { id: '4-10', scenario: '매수 기록 삭제', expected: '해당 행 삭제, 누적 재계산' },
        ],
      },
      {
        title: 'D. 목표수량 변경',
        cases: [
          { id: '4-11', scenario: '"목표수량 변경" → 100→200', expected: '진행률 바 비율 변경' },
          { id: '4-12', scenario: '현재 보유수량보다 적게 변경 (예: 5)', expected: '경고 메시지 표시' },
        ],
      },
      {
        title: 'E. 투자 종료',
        cases: [
          { id: '4-13', scenario: '"투자 종료" → 확인', expected: '모든 기록 삭제, 목록으로 복귀' },
          { id: '4-14', scenario: '목록 카드에서 진행률 바 확인', expected: '0~100% 시각적으로 정확' },
          { id: '4-15', scenario: '목표 달성(100%) 시 진행률 바', expected: '초록색 표시' },
        ],
      },
    ],
  },
  {
    id: 'dca',
    title: '5. 적립식 매수',
    path: '/dca',
    sections: [
      {
        title: 'A. 신규 등록',
        cases: [
          { id: '5-1', scenario: '"등록" → SCHD, 목표:500, 매주 월요일, 1회 수량:2', expected: '등록 성공, 주간 스케줄 표시' },
          { id: '5-2', scenario: '"등록" → VOO, 목표:100, 매달 15일, 1회 수량:1', expected: '월별 스케줄 생성' },
          { id: '5-3', scenario: '이미 등록된 티커 재등록', expected: '중복 에러' },
        ],
      },
      {
        title: 'B. 스케줄 매수 기록',
        cases: [
          { id: '5-4', scenario: '미입력 스케줄 행(파란 강조) → 금액/수량 입력', expected: '해당 날짜 기록, 미입력 배지 감소' },
          { id: '5-5', scenario: '미입력 스케줄 "건너뛰기" 클릭', expected: '0원 기록, 미입력에서 제외' },
          { id: '5-6', scenario: '목록 화면에서 "N건 미입력" 배지 확인', expected: '미기록 스케줄 수 정확히 표시' },
        ],
      },
      {
        title: 'C. 수정/삭제',
        cases: [
          { id: '5-7', scenario: '기존 매수 기록 수정', expected: '누적 재계산' },
          { id: '5-8', scenario: '기존 매수 기록 삭제', expected: '해당 행 제거' },
        ],
      },
      {
        title: 'D. 투자 종료',
        cases: [
          { id: '5-9', scenario: '"투자 종료" → 확인', expected: '모든 기록 삭제, 목록 복귀' },
        ],
      },
    ],
  },
  {
    id: 'mdd',
    title: '6. MDD 분석',
    path: '/mdd',
    sections: [
      {
        title: '종목 관리 및 분석',
        cases: [
          { id: '6-1', scenario: '"등록" → 티커: NVDA', expected: '카드 생성, MDD/ATH/현재가/고점대비 표시' },
          { id: '6-2', scenario: '기간 토글 (1Y→5Y→10Y)', expected: '데이터 갱신, MDD 재계산' },
          { id: '6-3', scenario: '종목 5개까지 등록', expected: '정상 등록' },
          { id: '6-4', scenario: '6번째 종목 등록 시도', expected: '"최대 5개" 에러' },
          { id: '6-5', scenario: '중복 티커 등록 시도', expected: '중복 에러' },
          { id: '6-6', scenario: '카드 삭제 → 확인', expected: '카드 제거' },
          { id: '6-7', scenario: '드로다운 차트 확인', expected: 'MDD 기준선 + 하락폭 시각화' },
          { id: '6-8', scenario: '카드 접기/펼치기', expected: '차트·상세 데이터 토글' },
        ],
      },
    ],
  },
  {
    id: 'market',
    title: '7. 주식정보',
    path: '/market',
    sections: [
      {
        title: '시장 지수',
        cases: [
          { id: '7-1', scenario: '페이지 진입', expected: '6개 지수 카드 표시 (코스피, 코스닥, 다우, 나스닥, S&P500, 환율)' },
          { id: '7-2', scenario: '가격 옆 등락 색상 확인', expected: '상승: 빨강, 하락: 파랑, 보합: 회색' },
          { id: '7-3', scenario: '30초 대기', expected: '자동 갱신' },
          { id: '7-4', scenario: '모바일 화면 확인', expected: '1열 카드 레이아웃' },
        ],
      },
    ],
  },
  {
    id: 'nav',
    title: '8. 네비게이션',
    path: '',
    sections: [
      {
        title: '사이드 드로어',
        cases: [
          { id: '8-1', scenario: '메뉴 아이콘 클릭', expected: '드로어 열림' },
          { id: '8-2', scenario: '각 메뉴 항목 클릭', expected: '해당 페이지 이동, 현재 메뉴 하이라이트' },
          { id: '8-3', scenario: '로그아웃 클릭', expected: '세션 종료 → 로그인 페이지' },
          { id: '8-4', scenario: '회원 탈퇴 → 확인', expected: '계정 삭제 → 로그인 페이지', caution: true },
        ],
      },
    ],
  },
  {
    id: 'common',
    title: '9. 공통 체크',
    path: '',
    sections: [
      {
        title: '통화 및 색상',
        cases: [
          { id: '9-1', scenario: 'USD 종목 금액 표시', expected: '$ 접두사' },
          { id: '9-2', scenario: 'KRW 종목 금액 표시', expected: '원 접미사' },
          { id: '9-3', scenario: '수익 양수 색상', expected: '빨간색 (error.main)' },
          { id: '9-4', scenario: '수익 음수 색상', expected: '파란색 (primary.main)' },
          { id: '9-5', scenario: '모바일(< 600px) 전체 화면', expected: '테이블→카드 전환, 터치 정상' },
          { id: '9-6', scenario: '브라우저 콘솔 에러 확인', expected: '에러 없음' },
        ],
      },
    ],
  },
];

const STORAGE_KEY = 'test-checklist-state';
const BUG_STORAGE_KEY = 'test-checklist-bugs';

type CheckState = Record<string, boolean>;
type BugState = Record<string, boolean>;

export default function TestPage() {
  const [checked, setChecked] = useState<CheckState>({});
  const [bugs, setBugs] = useState<BugState>({});
  const [expanded, setExpanded] = useState<string | false>(false);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) setChecked(JSON.parse(saved));
    const savedBugs = localStorage.getItem(BUG_STORAGE_KEY);
    if (savedBugs) setBugs(JSON.parse(savedBugs));
  }, []);

  useEffect(() => {
    if (Object.keys(checked).length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(checked));
    }
  }, [checked]);

  useEffect(() => {
    if (Object.keys(bugs).length > 0) {
      localStorage.setItem(BUG_STORAGE_KEY, JSON.stringify(bugs));
    }
  }, [bugs]);

  const handleCheck = (id: string) => {
    setChecked((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleBug = (id: string) => {
    setBugs((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleReset = () => {
    setChecked({});
    setBugs({});
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(BUG_STORAGE_KEY);
  };

  const stats = useMemo(() => {
    let total = 0;
    let done = 0;
    let bugCount = 0;
    TEST_DATA.forEach((g) =>
      g.sections.forEach((s) =>
        s.cases.forEach((c) => {
          total++;
          if (checked[c.id]) done++;
          if (bugs[c.id]) bugCount++;
        }),
      ),
    );
    return { total, done, bugCount, rate: total > 0 ? (done / total) * 100 : 0 };
  }, [checked, bugs]);

  const getGroupStats = (group: TestGroup) => {
    let total = 0;
    let done = 0;
    let bugCount = 0;
    group.sections.forEach((s) =>
      s.cases.forEach((c) => {
        total++;
        if (checked[c.id]) done++;
        if (bugs[c.id]) bugCount++;
      }),
    );
    return { total, done, bugCount };
  };

  return (
    <Box sx={{ maxWidth: 900, mx: 'auto', p: { xs: 2, sm: 3 }, pb: 10 }}>
      <Stack spacing={3}>
        {/* Header */}
        <Box>
          <Typography variant="h5" fontWeight={700} gutterBottom>
            테스트 체크리스트
          </Typography>
          <Typography variant="body2" color="text.secondary">
            투자자 관점의 기능 테스트 시나리오입니다. 체크박스로 진행상황을 추적하세요.
          </Typography>
        </Box>

        {/* Summary */}
        <Paper sx={{ p: 2.5, borderRadius: 2 }}>
          <Stack spacing={1.5}>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Stack direction="row" spacing={1.5} alignItems="center">
                <Chip
                  label={`${stats.done} / ${stats.total}`}
                  color="primary"
                  size="small"
                  variant="outlined"
                />
                <Typography variant="body2" color="text.secondary">
                  완료 ({stats.rate.toFixed(0)}%)
                </Typography>
                {stats.bugCount > 0 && (
                  <Chip
                    icon={<BugReportIcon sx={{ fontSize: 16 }} />}
                    label={`버그 ${stats.bugCount}건`}
                    color="error"
                    size="small"
                    variant="outlined"
                  />
                )}
              </Stack>
              <Tooltip title="전체 초기화">
                <IconButton size="small" onClick={handleReset} sx={{ color: 'text.secondary' }}>
                  <ReplayIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Stack>
            <LinearProgress
              variant="determinate"
              value={stats.rate}
              sx={{
                height: 8,
                borderRadius: 4,
                bgcolor: 'action.hover',
                '& .MuiLinearProgress-bar': {
                  borderRadius: 4,
                  bgcolor: stats.rate === 100 ? 'success.main' : 'primary.main',
                },
              }}
            />
          </Stack>
        </Paper>

        {/* Test Groups */}
        {TEST_DATA.map((group) => {
          const gs = getGroupStats(group);
          const allDone = gs.done === gs.total;
          return (
            <Accordion
              key={group.id}
              expanded={expanded === group.id}
              onChange={(_, isExpanded) => setExpanded(isExpanded ? group.id : false)}
              sx={{
                borderRadius: '12px !important',
                '&:before': { display: 'none' },
                boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
                border: '1px solid',
                borderColor: allDone ? 'success.light' : gs.bugCount > 0 ? 'error.light' : 'divider',
              }}
            >
              <AccordionSummary
                expandIcon={<ExpandMoreIcon />}
                sx={{ px: 2.5, '& .MuiAccordionSummary-content': { alignItems: 'center', gap: 1.5 } }}
              >
                {allDone ? (
                  <CheckCircleIcon sx={{ color: 'success.main', fontSize: 20 }} />
                ) : (
                  <RadioButtonUncheckedIcon sx={{ color: 'text.disabled', fontSize: 20 }} />
                )}
                <Typography fontWeight={600} sx={{ flex: 1 }}>
                  {group.title}
                </Typography>
                {group.path && (
                  <Chip label={group.path} size="small" sx={{ fontSize: '0.7rem', height: 22 }} />
                )}
                <Chip
                  label={`${gs.done}/${gs.total}`}
                  size="small"
                  color={allDone ? 'success' : 'default'}
                  variant={allDone ? 'filled' : 'outlined'}
                  sx={{ fontSize: '0.7rem', height: 22, minWidth: 45 }}
                />
                {gs.bugCount > 0 && (
                  <Chip
                    icon={<BugReportIcon sx={{ fontSize: 14 }} />}
                    label={gs.bugCount}
                    size="small"
                    color="error"
                    variant="outlined"
                    sx={{ fontSize: '0.7rem', height: 22 }}
                  />
                )}
              </AccordionSummary>
              <AccordionDetails sx={{ px: 2.5, pt: 0, pb: 2 }}>
                <Stack spacing={2}>
                  {group.sections.map((section) => (
                    <Box key={section.title}>
                      {group.sections.length > 1 && (
                        <Typography
                          variant="caption"
                          fontWeight={700}
                          color="text.secondary"
                          sx={{
                            display: 'block',
                            mb: 0.5,
                            px: 1,
                            py: 0.5,
                            bgcolor: 'action.hover',
                            borderRadius: 1,
                          }}
                        >
                          {section.title}
                        </Typography>
                      )}
                      <Stack spacing={0}>
                        {section.cases.map((tc) => (
                          <Stack
                            key={tc.id}
                            direction="row"
                            alignItems="flex-start"
                            sx={{
                              py: 0.75,
                              px: 1,
                              borderRadius: 1,
                              bgcolor: checked[tc.id]
                                ? 'action.hover'
                                : bugs[tc.id]
                                  ? 'error.50'
                                  : 'transparent',
                              opacity: checked[tc.id] && !bugs[tc.id] ? 0.6 : 1,
                              transition: 'all 0.15s',
                              '&:hover': { bgcolor: 'action.hover' },
                            }}
                          >
                            <FormControlLabel
                              control={
                                <Checkbox
                                  checked={!!checked[tc.id]}
                                  onChange={() => handleCheck(tc.id)}
                                  size="small"
                                  sx={{ p: 0.5 }}
                                />
                              }
                              label=""
                              sx={{ mr: 0, ml: 0 }}
                            />
                            <Box sx={{ flex: 1, minWidth: 0, pt: 0.25 }}>
                              <Stack direction="row" spacing={0.75} alignItems="center">
                                <Typography
                                  variant="caption"
                                  sx={{
                                    color: 'text.disabled',
                                    fontFamily: 'monospace',
                                    minWidth: 28,
                                  }}
                                >
                                  {tc.id}
                                </Typography>
                                <Typography
                                  variant="body2"
                                  sx={{
                                    textDecoration: checked[tc.id] ? 'line-through' : 'none',
                                    color: checked[tc.id] ? 'text.secondary' : 'text.primary',
                                  }}
                                >
                                  {tc.scenario}
                                </Typography>
                              </Stack>
                              <Typography
                                variant="caption"
                                sx={{ color: 'text.secondary', display: 'block', ml: 4.25 }}
                              >
                                → {tc.expected}
                              </Typography>
                            </Box>
                            <Tooltip title={bugs[tc.id] ? '버그 해제' : '버그 표시'}>
                              <IconButton
                                size="small"
                                onClick={() => handleBug(tc.id)}
                                sx={{
                                  color: bugs[tc.id] ? 'error.main' : 'text.disabled',
                                  mt: 0.25,
                                  '&:hover': { color: 'error.main' },
                                }}
                              >
                                <BugReportIcon sx={{ fontSize: 18 }} />
                              </IconButton>
                            </Tooltip>
                            {tc.caution && (
                              <Chip
                                label="주의"
                                size="small"
                                color="warning"
                                variant="outlined"
                                sx={{ fontSize: '0.65rem', height: 20, mt: 0.5 }}
                              />
                            )}
                          </Stack>
                        ))}
                      </Stack>
                    </Box>
                  ))}
                </Stack>
              </AccordionDetails>
            </Accordion>
          );
        })}

        {/* Legend */}
        <Paper sx={{ p: 2, borderRadius: 2, bgcolor: 'action.hover' }}>
          <Typography variant="caption" color="text.secondary" component="div">
            <Stack direction="row" spacing={3} flexWrap="wrap">
              <Stack direction="row" spacing={0.5} alignItems="center">
                <Checkbox size="small" checked disabled sx={{ p: 0 }} />
                <Typography variant="caption">테스트 통과</Typography>
              </Stack>
              <Stack direction="row" spacing={0.5} alignItems="center">
                <BugReportIcon sx={{ fontSize: 16, color: 'error.main' }} />
                <Typography variant="caption">버그 발견</Typography>
              </Stack>
              <Stack direction="row" spacing={0.5} alignItems="center">
                <CheckCircleIcon sx={{ fontSize: 16, color: 'success.main' }} />
                <Typography variant="caption">그룹 완료</Typography>
              </Stack>
            </Stack>
          </Typography>
        </Paper>
      </Stack>
    </Box>
  );
}
