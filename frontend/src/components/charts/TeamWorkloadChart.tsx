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
} from 'recharts';

interface TeamWorkloadChartProps {
  data: Array<{
    name: string;
    todo: number;
    inProgress: number;
    done: number;
  }>;
}

export const TeamWorkloadChart: React.FC<TeamWorkloadChartProps> = ({ data }) => {
  return (
    <ResponsiveContainer width="100%" height={400}>
      <BarChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 80 }}>
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
        />
        <Legend />
        <Bar dataKey="todo" stackId="a" fill="#6B7280" name="To Do" />
        <Bar dataKey="inProgress" stackId="a" fill="#3B82F6" name="In Progress" />
        <Bar dataKey="done" stackId="a" fill="#10B981" name="Done" />
      </BarChart>
    </ResponsiveContainer>
  );
};
