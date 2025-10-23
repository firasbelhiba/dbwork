'use client';

import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

interface IssueStatsPieChartProps {
  data: Array<{
    name: string;
    value: number;
  }>;
  colors?: string[];
}

const DEFAULT_COLORS = ['#0052CC', '#00875A', '#FF991F', '#DE350B', '#6554C0'];

export const IssueStatsPieChart: React.FC<IssueStatsPieChartProps> = ({
  data,
  colors = DEFAULT_COLORS,
}) => {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          labelLine={false}
          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
          outerRadius={80}
          fill="#8884d8"
          dataKey="value"
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
          ))}
        </Pie>
        <Tooltip />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  );
};
