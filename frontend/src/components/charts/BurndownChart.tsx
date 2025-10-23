'use client';

import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

interface BurndownChartProps {
  data: Array<{
    date: string;
    ideal: number;
    actual: number;
  }>;
}

export const BurndownChart: React.FC<BurndownChartProps> = ({ data }) => {
  return (
    <ResponsiveContainer width="100%" height={400}>
      <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="date" />
        <YAxis label={{ value: 'Story Points', angle: -90, position: 'insideLeft' }} />
        <Tooltip />
        <Legend />
        <Line
          type="monotone"
          dataKey="ideal"
          stroke="#6B7280"
          strokeDasharray="5 5"
          name="Ideal Burndown"
        />
        <Line
          type="monotone"
          dataKey="actual"
          stroke="#0052CC"
          strokeWidth={2}
          name="Actual Progress"
        />
      </LineChart>
    </ResponsiveContainer>
  );
};
