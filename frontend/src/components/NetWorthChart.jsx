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
              <stop offset="0%" stopColor="var(--chart-networth-assets)" stopOpacity={0.35} />
              <stop offset="100%" stopColor="var(--chart-networth-assets)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="var(--led-border)" vertical={false} />
          <XAxis
            dataKey="date"
            tickFormatter={formatDate}
            stroke="var(--led-gray-500)"
            tick={{ fontSize: 11, fontFamily: 'IBM Plex Mono, monospace' }}
            minTickGap={40}
          />
          <YAxis
            tickFormatter={formatCompact}
            stroke="var(--led-gray-500)"
            tick={{ fontSize: 11, fontFamily: 'IBM Plex Mono, monospace' }}
            width={56}
          />
          <Tooltip
            cursor={false}
            contentStyle={{
              background: 'var(--led-panel)',
              border: '1px solid var(--led-border)',
              borderRadius: 4,
              fontFamily: 'IBM Plex Mono, monospace',
              fontSize: 12,
            }}
            labelFormatter={formatDate}
            formatter={(value) => [formatCurrency(value), 'Net worth']}
          />
          <Area
            type="monotone"
            dataKey="total"
            stroke="var(--chart-networth-liabilities)"
            strokeWidth={2}
            fill="url(#netWorthFill)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}