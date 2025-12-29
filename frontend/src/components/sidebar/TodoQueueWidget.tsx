'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';
import { useAuth } from '@/contexts/AuthContext';
import { usersAPI } from '@/lib/api';
import { SortableQueueItem } from './SortableQueueItem';
import { AddToQueueModal } from './AddToQueueModal';

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

interface TodoQueueData {
  currentInProgress: QueueIssue | null;
  queue: QueueIssue[];
}

export const TodoQueueWidget: React.FC = () => {
  const { user } = useAuth();
  const [data, setData] = useState<TodoQueueData | null>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const fetchQueue = useCallback(async () => {
    if (!user?._id) return;

    try {
      const response = await usersAPI.getTodoQueue(user._id);
      setData(response.data);
    } catch (error) {
      console.error('Error fetching todo queue:', error);
    } finally {
      setLoading(false);
    }
  }, [user?._id]);

  useEffect(() => {
    fetchQueue();
    // Refresh every 30 seconds
    const interval = setInterval(fetchQueue, 30000);
    return () => clearInterval(interval);
  }, [fetchQueue]);

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id || !data || !user?._id) return;

    const oldIndex = data.queue.findIndex((item) => item._id === active.id);
    const newIndex = data.queue.findIndex((item) => item._id === over.id);

    if (oldIndex === -1 || newIndex === -1) return;

    const newQueue = arrayMove(data.queue, oldIndex, newIndex);

    // Optimistic update
    setData({ ...data, queue: newQueue });

    try {
      await usersAPI.updateTodoQueue(
        user._id,
        newQueue.map((item) => item._id)
      );
    } catch (error) {
      console.error('Error updating queue order:', error);
      // Revert on error
      fetchQueue();
    }
  };

  const handleRemoveFromQueue = async (issueId: string) => {
    if (!user?._id || !data) return;

    // Optimistic update
    setData({
      ...data,
      queue: data.queue.filter((item) => item._id !== issueId),
    });

    try {
      await usersAPI.removeFromQueue(user._id, issueId);
    } catch (error) {
      console.error('Error removing from queue:', error);
      fetchQueue();
    }
  };

  const handleAddToQueue = async () => {
    setShowAddModal(false);
    fetchQueue();
  };

  if (!user || loading) {
    return null;
  }

  const queueCount = (data?.queue?.length || 0) + (data?.currentInProgress ? 1 : 0);

  return (
    <div className="border-t border-gray-200 dark:border-dark-400">
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-dark-400 transition-colors"
      >
        <div className="flex items-center gap-2">
          <svg
            className="w-4 h-4 text-gray-600 dark:text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
            />
          </svg>
          <span className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">
            My Queue
          </span>
          {queueCount > 0 && (
            <span className="inline-flex items-center justify-center w-5 h-5 text-xs font-medium rounded-full bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400">
              {queueCount}
            </span>
          )}
        </div>
        <svg
          className={`w-4 h-4 text-gray-400 transition-transform ${
            expanded ? 'rotate-180' : ''
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {/* Content */}
      {expanded && (
        <div className="px-3 pb-3">
          {/* Current In Progress */}
          {data?.currentInProgress && (
            <div className="mb-2">
              <div className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1 px-1">
                In Progress
              </div>
              <Link
                href={`/issues/${data.currentInProgress.key}`}
                className="block p-2 rounded-md bg-success-50 dark:bg-success-900/20 border border-success-200 dark:border-success-800 hover:bg-success-100 dark:hover:bg-success-900/30 transition-colors"
              >
                <div className="flex items-center gap-2">
                  {data.currentInProgress.projectId?.logo ? (
                    <img
                      src={data.currentInProgress.projectId.logo}
                      alt=""
                      className="w-4 h-4 rounded object-cover flex-shrink-0"
                    />
                  ) : (
                    <div className="w-4 h-4 rounded bg-primary-500 text-white text-[8px] flex items-center justify-center flex-shrink-0">
                      {data.currentInProgress.projectId?.key?.charAt(0) || '?'}
                    </div>
                  )}
                  <span className="text-xs font-medium text-success-700 dark:text-success-400">
                    {data.currentInProgress.key}
                  </span>
                  <div className="w-2 h-2 rounded-full bg-success-500 animate-pulse" />
                </div>
                <p className="text-xs text-gray-700 dark:text-gray-300 truncate mt-1">
                  {data.currentInProgress.title}
                </p>
              </Link>
            </div>
          )}

          {/* Queue */}
          {data?.queue && data.queue.length > 0 ? (
            <div>
              <div className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1 px-1">
                Up Next
              </div>
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={data.queue.map((item) => item._id)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="space-y-1 max-h-40 overflow-y-auto">
                    {data.queue.map((issue, index) => (
                      <SortableQueueItem
                        key={issue._id}
                        issue={issue}
                        index={index}
                        onRemove={() => handleRemoveFromQueue(issue._id)}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            </div>
          ) : !data?.currentInProgress ? (
            <div className="text-center py-4">
              <p className="text-xs text-gray-500 dark:text-gray-400">
                No tickets in queue
              </p>
            </div>
          ) : null}

          {/* Add Button */}
          <button
            onClick={() => setShowAddModal(true)}
            className="mt-2 w-full flex items-center justify-center gap-1 px-3 py-2 text-xs font-medium text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-md transition-colors"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
            Add to Queue
          </button>
        </div>
      )}

      {/* Add Modal */}
      {showAddModal && (
        <AddToQueueModal
          isOpen={showAddModal}
          onClose={() => setShowAddModal(false)}
          onAdd={handleAddToQueue}
          userId={user._id}
        />
      )}
    </div>
  );
};
