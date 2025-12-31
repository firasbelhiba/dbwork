'use client';

import React from 'react';
import Link from 'next/link';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface QueueIssue {
  _id: string;
  key: string;
  title: string;
  status: string;
  priority: string;
  type: string;
  projectId: {
    _id: string;
    name: string;
    key: string;
    logo?: string;
  };
}

interface SortableQueueItemProps {
  issue: QueueIssue;
  index: number;
  onRemove: () => void;
}

const priorityColors: Record<string, string> = {
  highest: 'text-danger-500',
  high: 'text-warning-500',
  medium: 'text-primary-500',
  low: 'text-success-500',
  lowest: 'text-gray-400',
};

export const SortableQueueItem: React.FC<SortableQueueItemProps> = ({
  issue,
  index,
  onRemove,
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: issue._id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group flex items-center gap-2 p-2 rounded-md bg-gray-50 dark:bg-dark-400 border border-gray-200 dark:border-dark-300 hover:bg-gray-100 dark:hover:bg-dark-350 transition-colors ${
        isDragging ? 'opacity-50 shadow-lg z-50' : ''
      }`}
    >
      {/* Drag handle */}
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing p-0.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 touch-none"
        aria-label="Drag to reorder"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 8h16M4 16h16"
          />
        </svg>
      </button>

      {/* Queue position */}
      <span className="w-4 text-[10px] font-medium text-gray-400 dark:text-gray-500 text-center flex-shrink-0">
        {index + 1}
      </span>

      {/* Issue content */}
      <Link
        href={`/issues/${issue._id}`}
        className="flex-1 min-w-0"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-1.5">
          {/* Project logo/initial */}
          {issue.projectId?.logo ? (
            <img
              src={issue.projectId.logo}
              alt=""
              className="w-4 h-4 rounded object-cover flex-shrink-0"
            />
          ) : (
            <div className="w-4 h-4 rounded bg-primary-500 text-white text-[8px] flex items-center justify-center flex-shrink-0">
              {issue.projectId?.key?.charAt(0) || '?'}
            </div>
          )}

          {/* Issue key */}
          <span className="text-xs font-medium text-primary-600 dark:text-primary-400">
            {issue.key}
          </span>

          {/* Priority indicator */}
          <svg
            className={`w-3 h-3 flex-shrink-0 ${priorityColors[issue.priority] || 'text-gray-400'}`}
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            {issue.priority === 'highest' || issue.priority === 'high' ? (
              <path
                fillRule="evenodd"
                d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 7.414V15a1 1 0 11-2 0V7.414L6.707 9.707a1 1 0 01-1.414 0z"
                clipRule="evenodd"
              />
            ) : issue.priority === 'low' || issue.priority === 'lowest' ? (
              <path
                fillRule="evenodd"
                d="M14.707 10.293a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L9 12.586V5a1 1 0 012 0v7.586l2.293-2.293a1 1 0 011.414 0z"
                clipRule="evenodd"
              />
            ) : (
              <path
                fillRule="evenodd"
                d="M3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z"
                clipRule="evenodd"
              />
            )}
          </svg>
        </div>

        {/* Title */}
        <p className="text-xs text-gray-600 dark:text-gray-400 truncate mt-0.5">
          {issue.title}
        </p>
      </Link>

      {/* Remove button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onRemove();
        }}
        className="p-1 opacity-0 group-hover:opacity-100 text-gray-400 hover:text-danger-500 transition-all"
        aria-label="Remove from queue"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
      </button>
    </div>
  );
};
