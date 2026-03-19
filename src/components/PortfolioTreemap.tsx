'use client';

import { useMemo } from 'react';
import { ResponsiveContainer, Treemap } from 'recharts';
import { Box, Typography } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { Investment } from '@/types/investment';
import { investedAmount, currentValue } from '@/utils/calculator';
import { formatRate, formatKRW } from '@/utils/format';

interface PortfolioTreemapProps {
  investments: Investment[];
  prices: Record<string, number>;
  exchangeRate: number;
}

interface TreemapNode {
  [key: string]: string | number;
  name: string;
  ticker: string;
  size: number;
  weight: number;
  rate: number;
  value: number;
}

/** 수익률에 따른 배경색 생성 — 양수: 빨강 계열, 음수: 파랑 계열 */
function rateToColor(rate: number): string {
  const intensity = Math.min(Math.abs(rate) / 30, 1); // 30% 이상이면 최대 채도
  const alpha = 0.3 + intensity * 0.5; // 0.3 ~ 0.8

  if (rate >= 0) {
    return `rgba(211, 47, 47, ${alpha})`; // 빨강 (MUI error)
  }
  return `rgba(25, 118, 210, ${alpha})`; // 파랑 (MUI primary)
}

/** 수익률에 따른 텍스트 색상 — 진한 배경일 때 흰색 */
function rateToTextColor(rate: number): string {
  const intensity = Math.min(Math.abs(rate) / 30, 1);
  return intensity > 0.4 ? '#ffffff' : '#1a1a1b';
}

interface CustomContentProps {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  name?: string;
  ticker?: string;
  weight?: number;
  rate?: number;
  value?: number;
}

function TreemapCell({ x = 0, y = 0, width = 0, height = 0, name, ticker, weight, rate, value }: CustomContentProps) {
  if (width < 2 || height < 2 || !name) return null;

  const bgColor = rateToColor(rate ?? 0);
  const textColor = rateToTextColor(rate ?? 0);
  const isLarge = width >= 100 && height >= 80;
  const isMedium = width >= 60 && height >= 50;

  // 셀 크기에 따라 폰트 크기 조정
  const nameFontSize = isLarge ? 15 : isMedium ? 12 : 10;
  const subFontSize = isLarge ? 13 : isMedium ? 11 : 9;

  return (
    <g>
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        rx={6}
        fill={bgColor}
        stroke="#ffffff"
        strokeWidth={2}
      />
      {/* 종목명 — 항상 표시 */}
      <text
        x={x + width / 2}
        y={y + height / 2 - (isLarge ? 16 : 6)}
        textAnchor="middle"
        fill={textColor}
        stroke="none"
        fontSize={nameFontSize}
        fontWeight={700}
      >
        {name}
      </text>
      {/* 비중 — 항상 표시 */}
      <text
        x={x + width / 2}
        y={y + height / 2 + (isLarge ? 4 : 10)}
        textAnchor="middle"
        fill={textColor}
        stroke="none"
        fontSize={subFontSize}
        opacity={0.85}
      >
        {(weight ?? 0).toFixed(1)}%
      </text>
      {/* 수익률 — 충분한 공간이 있을 때만 */}
      {isLarge && (
        <text
          x={x + width / 2}
          y={y + height / 2 + 22}
          textAnchor="middle"
          fill={textColor}
          stroke="none"
          fontSize={12}
          fontWeight={600}
        >
          {formatRate(rate ?? 0)}
        </text>
      )}
    </g>
  );
}

export default function PortfolioTreemap({ investments, prices, exchangeRate }: PortfolioTreemapProps) {
  const theme = useTheme();

  const { data, totalValue } = useMemo(() => {
    let total = 0;
    const items: TreemapNode[] = [];

    for (const item of investments) {
      const price = prices[item.ticker] || item.avgPrice;
      const current = currentValue(item, price, exchangeRate);
      const invested = investedAmount(item, exchangeRate);
      const rate = invested > 0 ? ((current - invested) / invested) * 100 : 0;

      total += current;
      items.push({
        name: item.name,
        ticker: item.ticker,
        size: current,
        weight: 0, // 아래에서 계산
        rate,
        value: current,
      });
    }

    // 비중 계산
    for (const item of items) {
      item.weight = total > 0 ? (item.size / total) * 100 : 0;
    }

    return { data: items, totalValue: total };
  }, [investments, prices, exchangeRate]);

  return (
    <Box sx={{ width: '100%' }}>
      {/* <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', mb: 2 }}>
        <Typography variant="body2" color="gray5">
          포트폴리오 비중
        </Typography>
        <Typography variant="body2" color="gray6">
          총 평가금액: {formatKRW(totalValue)}
        </Typography>
      </Box> */}
      <Box
        sx={{
          width: '100%',
          aspectRatio: '16 / 9',
          bgcolor: 'background.paper',
          borderRadius: 3,
          overflow: 'hidden',
          border: `1px solid ${theme.palette.gray2}`,
        }}
      >
        <ResponsiveContainer width="100%" height="100%">
          <Treemap
            data={data}
            dataKey="size"
            stroke="#ffffff"
            content={<TreemapCell />}
            isAnimationActive={false}
          />
        </ResponsiveContainer>
      </Box>
      {/* 범례 */}
      <Box sx={{ display: 'flex', gap: 3, mt: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
        {data.map((item) => (
          <Box key={item.ticker} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Box
              sx={{
                width: 12,
                height: 12,
                borderRadius: '2px',
                bgcolor: rateToColor(item.rate),
              }}
            />
            <Typography variant="caption" color="gray7">
              {item.name} {item.weight.toFixed(1)}%
            </Typography>
          </Box>
        ))}
      </Box>
    </Box>
  );
}
