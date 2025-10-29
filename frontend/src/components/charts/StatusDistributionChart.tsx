'use client';

import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from 'recharts';

interface StatusDistributionChartProps {
  data: Array<{
    name: string;
    count: number;
    color: string;
  }>;
}

export const StatusDistributionChart: React.FC<StatusDistributionChartProps> = ({ data }) => {
  return (
    <ResponsiveContainer width="100%" height={400}>
      <BarChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" className="dark:stroke-gray-700" />
        <XAxis
          dataKey="name"
          angle={-45}
          textAnchor="end"
          height={100}
          className="dark:fill-gray-300"
        />
        <YAxis label={{ value: 'Issues', angle: -90, position: 'insideLeft' }} className="dark:fill-gray-300" />
        <Tooltip
          contentStyle={{
            backgroundColor: 'rgba(255, 255, 255, 0.95)',
            border: '1px solid #ccc',
            borderRadius: '4px'
          }}
          cursor={{ fill: 'rgba(0, 0, 0, 0.1)' }}
        />
        <Legend />
        <Bar dataKey="count" fill="#8884d8" name="Issues">
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
};
