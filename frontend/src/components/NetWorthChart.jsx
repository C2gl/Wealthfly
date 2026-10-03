import React from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import { formatCompact, formatCurrency, formatDate } from '../utils';
import { CHART, axisTick, tooltipStyle } from '../lib/chartTheme';

export default function NetWorthChart({ data }) {
  return (
    <div className="panel panel-large">
      <div className="panel-header">
        <h2>Net worth</h2>
      </div>
      <ResponsiveContainer width="100%" height={280}>
        <AreaChart data={data} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id="netWorthFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" style={{ stopColor: CHART.primary, stopOpacity: 0.28 }} />
              <stop offset="100%" style={{ stopColor: CHART.primary, stopOpacity: 0 }} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke={CHART.grid} vertical={false} strokeDasharray="2 4" />
          <XAxis
            dataKey="date"
            tickFormatter={formatDate}
            axisLine={false}
            tickLine={false}
            tick={axisTick(11)}
            minTickGap={40}
          />
          <YAxis
            tickFormatter={formatCompact}
            axisLine={false}
            tickLine={false}
            tick={axisTick(11)}
            width={56}
          />
          <Tooltip
            cursor={false}
            contentStyle={tooltipStyle(12)}
            labelFormatter={formatDate}
            formatter={(value) => [formatCurrency(value), 'Net worth']}
          />
          <Area
            type="monotone"
            dataKey="total"
            stroke={CHART.primary}
            strokeWidth={2}
            fill="url(#netWorthFill)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
