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
  Area,
  AreaChart,
} from 'recharts';

interface IssueCreationTrendChartProps {
  data: Array<{
    date: string;
    count: number;
    cumulative: number;
  }>;
}

export const IssueCreationTrendChart: React.FC<IssueCreationTrendChartProps> = ({ data }) => {
  return (
    <ResponsiveContainer width="100%" height={400}>
      <AreaChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
        <defs>
          <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.8}/>
            <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.1}/>
          </linearGradient>
          <linearGradient id="colorCumulative" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#10B981" stopOpacity={0.8}/>
            <stop offset="95%" stopColor="#10B981" stopOpacity={0.1}/>
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" className="dark:stroke-gray-700" />
        <XAxis dataKey="date" className="dark:fill-gray-300" />
        <YAxis className="dark:fill-gray-300" />
        <Tooltip
          contentStyle={{
            backgroundColor: 'rgba(255, 255, 255, 0.95)',
            border: '1px solid #ccc',
            borderRadius: '4px'
          }}
        />
        <Legend />
        <Area
          type="monotone"
          dataKey="count"
          stroke="#3B82F6"
          fill="url(#colorCount)"
          name="Created"
        />
        <Area
          type="monotone"
          dataKey="cumulative"
          stroke="#10B981"
          fill="url(#colorCumulative)"
          name="Total"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
};
