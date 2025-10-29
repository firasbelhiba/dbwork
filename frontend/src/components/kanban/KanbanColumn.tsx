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

  return (
    <div className="flex-shrink-0 w-80">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        {/* Column Header with Color */}
        <div className={`${color} px-4 py-3 border-b border-gray-200 dark:border-gray-700`}>
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
