import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Issue } from '@/types/issue';
import { SortableIssueCard } from './SortableIssueCard';

interface KanbanColumnProps {
  id: string;
  title: string;
  color: string;
  issues: Issue[];
}

export const KanbanColumn: React.FC<KanbanColumnProps> = ({ id, title, color, issues }) => {
  const { setNodeRef } = useDroppable({ id });

  // Map Tailwind color classes to actual vibrant colors
  const colorMap: Record<string, string> = {
    // 100 shades (light) - map to vibrant 600 shades for better visibility
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

  // Get the background color - if it's already a hex color, use it directly
  const bgColor = color?.startsWith('#') ? color : (colorMap[color] || '#3B82F6');

  // Debug log to see what color is being used
  console.log(`[KanbanColumn] ${title}: color="${color}" -> bgColor="${bgColor}"`);

  return (
    <div className="flex-shrink-0 w-80">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        {/* Column Header with Color */}
        <div
          className="px-4 py-3 border-b border-white/20"
          style={{ backgroundColor: bgColor }}
        >
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-white">{title}</h3>
            <span className="text-xs text-white bg-white/20 px-2 py-1 rounded-full">{issues.length}</span>
          </div>
        </div>

        {/* Issues List */}
        <SortableContext items={issues.map((i) => i._id)} strategy={verticalListSortingStrategy}>
          <div ref={setNodeRef} className="space-y-3 min-h-[200px] p-4">
            {issues.length === 0 ? (
              <div className="text-center py-8 text-gray-400 dark:text-gray-500 text-sm">
                Drop issues here
              </div>
            ) : (
              issues.map((issue) => (
                <SortableIssueCard key={issue._id} issue={issue} />
              ))
            )}
          </div>
        </SortableContext>
      </div>
    </div>
  );
};
