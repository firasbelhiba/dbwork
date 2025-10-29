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

// Map Tailwind color classes to vibrant hex values
const colorMap: Record<string, string> = {
  // 100 shades mapped to vibrant 600 shades
  'bg-gray-100': '#4B5563',
  'bg-red-100': '#DC2626',
  'bg-orange-100': '#EA580C',
  'bg-amber-100': '#D97706',
  'bg-yellow-100': '#CA8A04',
  'bg-lime-100': '#65A30D',
  'bg-green-100': '#16A34A',
  'bg-emerald-100': '#059669',
  'bg-teal-100': '#0D9488',
  'bg-cyan-100': '#0891B2',
  'bg-sky-100': '#0284C7',
  'bg-blue-100': '#2563EB',
  'bg-indigo-100': '#4F46E5',
  'bg-violet-100': '#7C3AED',
  'bg-purple-100': '#9333EA',
  'bg-fuchsia-100': '#C026D3',
  'bg-pink-100': '#DB2777',
  'bg-rose-100': '#E11D48',
  // 500 shades
  'bg-gray-500': '#6B7280',
  'bg-red-500': '#EF4444',
  'bg-orange-500': '#F97316',
  'bg-amber-500': '#F59E0B',
  'bg-yellow-500': '#EAB308',
  'bg-lime-500': '#84CC16',
  'bg-green-500': '#22C55E',
  'bg-emerald-500': '#10B981',
  'bg-teal-500': '#14B8A6',
  'bg-cyan-500': '#06B6D4',
  'bg-sky-500': '#0EA5E9',
  'bg-blue-500': '#3B82F6',
  'bg-indigo-500': '#6366F1',
  'bg-violet-500': '#8B5CF6',
  'bg-purple-500': '#A855F7',
  'bg-fuchsia-500': '#D946EF',
  'bg-pink-500': '#EC4899',
  'bg-rose-500': '#F43F5E',
};

const getBarColor = (color: string): string => {
  // If it's already a hex color, use it directly
  if (color.startsWith('#')) {
    return color;
  }

  // If it's a Tailwind class, map to hex
  if (colorMap[color]) {
    return colorMap[color];
  }

  // Default to vibrant blue
  return '#3B82F6';
};

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
            <Cell key={`cell-${index}`} fill={getBarColor(entry.color)} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
};
