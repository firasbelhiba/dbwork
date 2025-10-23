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
      <div className="bg-gray-50 rounded-lg p-4">
        {/* Column Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${color}`}></div>
            <h3 className="font-semibold text-gray-900">{title}</h3>
            <span className="text-sm text-gray-500">{issues.length}</span>
          </div>
          <button className="text-gray-400 hover:text-gray-600">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </button>
        </div>

        {/* Issues List */}
        <SortableContext items={issues.map((i) => i._id)} strategy={verticalListSortingStrategy}>
          <div ref={setNodeRef} className="space-y-3 min-h-[200px]">
            {issues.length === 0 ? (
              <div className="text-center py-8 text-gray-400 text-sm">
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
