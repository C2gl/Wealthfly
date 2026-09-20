import React from 'react';
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { formatCurrency } from '../utils';

function formatDay(index) {
  return `Day ${index + 1}`;
}

export default function TrendsPanel({ current, previous, rangeLabel }) {
  const hasPrevious = previous && previous.length > 0;
  const chartData = Array.from({ length: Math.max(current.length, previous?.length || 0) }, (_, index) => ({
    day: index,
    current: Number(current[index]?.total || 0),
    previous: Number(previous?.[index]?.total || 0),
  }));
  const currentTotal = current.reduce((sum, row) => sum + Number(row.total || 0), 0);
  const previousTotal = (previous || []).reduce((sum, row) => sum + Number(row.total || 0), 0);
  const change = previousTotal ? ((currentTotal - previousTotal) / previousTotal) * 100 : null;

  return (
    <section className="panel trends-panel">
      <div className="panel-heading-row trends-heading">
        <div>
          <span className="eyebrow">Spending rhythm</span>
          <h2>Trends</h2>
        </div>
        <span>{rangeLabel} vs previous</span>
      </div>
      {!hasPrevious ? (
        <p className="empty-state">A previous period is not available for this range.</p>
      ) : (
        <>
          <div className="trend-summary">
            <div><span className="trend-current-dot" />Current <strong>{formatCurrency(currentTotal)}</strong></div>
            <div><span className="trend-previous-dot" />Previous <strong>{formatCurrency(previousTotal)}</strong></div>
            {change !== null && <span className={change <= 0 ? 'stat-positive' : 'stat-negative'}>{change > 0 ? '+' : ''}{change.toFixed(1)}%</span>}
          </div>
          <ResponsiveContainer width="100%" height={238}>
            <LineChart data={chartData} margin={{ top: 12, right: 8, bottom: 0, left: -12 }}>
              <CartesianGrid stroke="#d9ded1" vertical={false} strokeDasharray="2 4" />
              <XAxis dataKey="day" tickFormatter={formatDay} axisLine={false} tickLine={false} tick={{ fill: '#7a8177', fontSize: 10, fontFamily: 'IBM Plex Mono, monospace' }} minTickGap={28} />
              <YAxis hide />
              <Tooltip
                labelFormatter={formatDay}
                formatter={(value, name) => [formatCurrency(value), name === 'current' ? 'Current' : 'Previous']}
                contentStyle={{ background: '#fbfaf1', border: '1px solid #d9ded1', borderRadius: 8, color: '#20251f', fontFamily: 'IBM Plex Mono, monospace', fontSize: 11 }}
              />
              <Line type="monotone" dataKey="current" stroke="#39725a" strokeWidth={2} dot={false} connectNulls />
              <Line type="monotone" dataKey="previous" stroke="#c6a642" strokeWidth={2} strokeDasharray="5 4" dot={false} connectNulls />
            </LineChart>
          </ResponsiveContainer>
        </>
      )}
    </section>
  );
}
