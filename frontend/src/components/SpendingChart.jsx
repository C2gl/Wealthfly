import React from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { formatCurrency, formatDate } from '../utils';

function shortDate(value) {
  return new Date(`${value}T00:00:00`).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

export default function SpendingChart({ data }) {
  return (
    <section className="spending-chart panel panel-large">
      <div className="chart-heading">
        <div>
          <span className="eyebrow">Spent · selected period</span>
          <h2>{formatCurrency(data.reduce((sum, row) => sum + Number(row.total || 0), 0))}</h2>
        </div>
        <div className="chart-legend"><span className="legend-dot" /> Spending</div>
      </div>
      <ResponsiveContainer width="100%" height={240}>
        <BarChart data={data} margin={{ top: 12, right: 8, bottom: 0, left: -12 }}>
          <CartesianGrid stroke="#d9ded1" vertical={false} strokeDasharray="2 4" />
          <XAxis
            dataKey="date"
            tickFormatter={shortDate}
            axisLine={false}
            tickLine={false}
            tick={{ fill: '#7a8177', fontSize: 10, fontFamily: 'IBM Plex Mono, monospace' }}
            minTickGap={28}
          />
          <YAxis hide />
          <Tooltip
            cursor={false}
            contentStyle={{
              background: '#fbfaf1',
              border: '1px solid #d9ded1',
              borderRadius: 8,
              color: '#20251f',
              fontFamily: 'IBM Plex Mono, monospace',
              fontSize: 11,
            }}
            labelFormatter={formatDate}
            formatter={(value) => [formatCurrency(value), 'Spent']}
          />
          <Bar dataKey="total" fill="#39725a" radius={[4, 4, 0, 0]} maxBarSize={18} />
        </BarChart>
      </ResponsiveContainer>
    </section>
  );
}
