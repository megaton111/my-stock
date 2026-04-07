'use client';

import { useMemo } from 'react';
import { Box, Paper, Stack, Typography } from '@mui/material';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { Investment } from '@/types/investment';
import { currentValue } from '@/utils/calculator';
import { getAssetClass, ASSET_CLASS_ORDER, ASSET_CLASS_COLORS, AssetClass } from '@/utils/assetClass';
import { formatKRW } from '@/utils/format';

interface AssetAllocationWidgetProps {
  investments: Investment[];
  prices: Record<string, number>;
  exchangeRate: number;
}

interface BucketRow {
  name: AssetClass;
  value: number;
  color: string;
  percent: number;
}

export default function AssetAllocationWidget({ investments, prices, exchangeRate }: AssetAllocationWidgetProps) {
  const { rows, total } = useMemo(() => {
    const totals: Record<AssetClass, number> = {
      한국주식: 0, 미국주식: 0, 코인: 0, 현금: 0,
    };

    for (const item of investments) {
      const cls = getAssetClass(item);
      const price = prices[item.ticker] || item.avgPrice;
      totals[cls] += currentValue(item, price, exchangeRate);
    }

    const sum = Object.values(totals).reduce((a, b) => a + b, 0);
    const list: BucketRow[] = ASSET_CLASS_ORDER
      .map((name) => ({
        name,
        value: totals[name],
        color: ASSET_CLASS_COLORS[name],
        percent: sum > 0 ? (totals[name] / sum) * 100 : 0,
      }))
      .filter((row) => row.value > 0);

    return { rows: list, total: sum };
  }, [investments, prices, exchangeRate]);

  if (rows.length === 0) return null;

  return (
    <Paper sx={{ width: 1, p: { xs: 1.5, sm: 2 }, border: '1px solid', borderColor: 'gray2', boxShadow: 'none' }}>
      <Typography variant="body2" color="gray5" gutterBottom>
        자산 현황
      </Typography>

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center">
        <Box sx={{ width: { xs: '100%', sm: 200 }, height: 180, position: 'relative' }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={rows}
                dataKey="value"
                nameKey="name"
                innerRadius={50}
                outerRadius={80}
                paddingAngle={2}
                stroke="none"
              >
                {rows.map((row) => (
                  <Cell key={row.name} fill={row.color} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value) => formatKRW(Number(value))}
                contentStyle={{ fontSize: '0.75rem', borderRadius: 4 }}
              />
            </PieChart>
          </ResponsiveContainer>
          <Box sx={{
            position: 'absolute', inset: 0,
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            pointerEvents: 'none',
          }}>
            <Typography sx={{ fontSize: '0.65rem', color: 'gray6' }}>총 자산</Typography>
            <Typography sx={{ fontSize: '0.85rem', fontWeight: 700 }}>{formatKRW(total)}</Typography>
          </Box>
        </Box>

        <Stack spacing={0.75} sx={{ flex: 1, width: 1 }}>
          {rows.map((row) => (
            <Stack key={row.name} direction="row" alignItems="center" spacing={1}>
              <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: row.color, flexShrink: 0 }} />
              <Typography sx={{ fontSize: '0.8rem', flex: 1 }}>{row.name}</Typography>
              <Typography sx={{ fontSize: '0.8rem', fontWeight: 700, minWidth: 48, textAlign: 'right' }}>
                {row.percent.toFixed(1)}%
              </Typography>
              <Typography sx={{ fontSize: '0.75rem', color: 'gray6', minWidth: 90, textAlign: 'right' }}>
                {formatKRW(row.value)}
              </Typography>
            </Stack>
          ))}
        </Stack>
      </Stack>
    </Paper>
  );
}
