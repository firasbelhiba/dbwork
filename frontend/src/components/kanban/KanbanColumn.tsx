import React, { useState } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Issue } from '@/types/issue';
import { SortableIssueCard } from './SortableIssueCard';
import { Dropdown, DropdownItem } from '@/components/common';
import { useAuth } from '@/contexts/AuthContext';
import { UserRole } from '@/types/user';

interface KanbanColumnProps {
  id: string;
  title: string;
  color: string;
  issues: Issue[];
  dragHandleProps?: any;
  dragHandleRef?: (node: HTMLElement | null) => void;
  onArchiveIssue?: (issueId: string) => void;
  onDeleteIssue?: (issueId: string) => void;
  onArchiveAllInColumn?: (columnId: string, issueIds: string[]) => void;
}

export const KanbanColumn: React.FC<KanbanColumnProps> = ({ id, title, color, issues, dragHandleProps, dragHandleRef, onArchiveIssue, onDeleteIssue, onArchiveAllInColumn }) => {
  const { setNodeRef } = useDroppable({ id });
  const { user } = useAuth();
  const [showArchiveModal, setShowArchiveModal] = useState(false);

  // Check if user can manage (Admin or PM only)
  const canManage = user?.role === UserRole.ADMIN || user?.role === UserRole.PROJECT_MANAGER;

  const handleArchiveAll = () => {
    if (issues.length === 0) {
      return;
    }
    setShowArchiveModal(true);
  };

  const confirmArchiveAll = () => {
    if (onArchiveAllInColumn) {
      const issueIds = issues.map(issue => issue._id);
      onArchiveAllInColumn(id, issueIds);
    }
    setShowArchiveModal(false);
  };

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
          className="px-4 py-3 border-b border-white/20 relative group"
          style={{ backgroundColor: bgColor }}
        >
          <div className="flex items-center justify-between">
            <div ref={dragHandleRef} className="flex-1 cursor-grab active:cursor-grabbing" {...dragHandleProps}>
              <h3 className="font-semibold text-white">{title}</h3>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-white bg-white/20 px-2 py-1 rounded-full">{issues.length}</span>

              {/* 3-Dot Menu */}
              {canManage && issues.length > 0 && (
                <div onClick={(e) => e.stopPropagation()}>
                  <Dropdown
                    align="right"
                    trigger={
                      <button className="p-1 rounded hover:bg-white/20 transition-colors">
                        <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 16 16">
                          <circle cx="8" cy="2" r="1.5" />
                          <circle cx="8" cy="8" r="1.5" />
                          <circle cx="8" cy="14" r="1.5" />
                        </svg>
                      </button>
                    }
                  >
                    <DropdownItem onClick={handleArchiveAll}>
                      <div className="flex items-center gap-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                        </svg>
                        <span>Archive All ({issues.length})</span>
                      </div>
                    </DropdownItem>
                  </Dropdown>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Issues List */}
        <SortableContext items={issues.map((i) => i._id)} strategy={verticalListSortingStrategy}>
          <div ref={setNodeRef} className="space-y-3 min-h-[400px] p-4" style={{ minHeight: '400px' }}>
            {issues.length === 0 ? (
              <div className="text-center py-8 text-gray-400 dark:text-gray-500 text-sm">
                Drop issues here
              </div>
            ) : (
              issues.map((issue) => (
                <SortableIssueCard
                  key={issue._id}
                  issue={issue}
                  onArchive={onArchiveIssue}
                  onDelete={onDeleteIssue}
                />
              ))
            )}
          </div>
        </SortableContext>
      </div>

      {/* Archive All Confirmation Modal */}
      {showArchiveModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowArchiveModal(false)}>
          <div className="bg-white dark:bg-dark-400 rounded-lg p-6 max-w-md w-full mx-4 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0">
                <svg className="w-6 h-6 text-warning" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                  Archive All Issues in "{title}"?
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  You are about to archive <span className="font-semibold">{issues.length} issue{issues.length !== 1 ? 's' : ''}</span> from this column.
                  Archived issues can be restored later from the archived view.
                </p>
                <div className="flex justify-end gap-3">
                  <button
                    onClick={() => setShowArchiveModal(false)}
                    className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-dark-300 hover:bg-gray-200 dark:hover:bg-dark-200 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={confirmArchiveAll}
                    className="px-4 py-2 text-sm font-medium text-white bg-warning hover:bg-warning/90 rounded-lg transition-colors"
                  >
                    Archive All
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
