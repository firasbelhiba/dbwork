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
  Line,
  ComposedChart,
} from 'recharts';

interface VelocityChartProps {
  data: Array<{
    sprintName: string;
    velocity: number;
    committed: number;
  }>;
  averageVelocity?: number;
}

export const VelocityChart: React.FC<VelocityChartProps> = ({ data, averageVelocity }) => {
  return (
    <ResponsiveContainer width="100%" height={400}>
      <ComposedChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="sprintName" />
        <YAxis label={{ value: 'Story Points', angle: -90, position: 'insideLeft' }} />
        <Tooltip />
        <Legend />
        <Bar dataKey="committed" fill="#93C5FD" name="Committed" />
        <Bar dataKey="velocity" fill="#0052CC" name="Completed" />
        {averageVelocity && (
          <Line
            type="monotone"
            dataKey={() => averageVelocity}
            stroke="#00875A"
            strokeWidth={2}
            strokeDasharray="5 5"
            name="Average"
          />
        )}
      </ComposedChart>
    </ResponsiveContainer>
  );
};
