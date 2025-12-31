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
import { LogoLoader } from '@/components/common/LogoLoader';

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

interface TodoQueueSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  onCountChange?: (count: number) => void;
}

export const TodoQueueSidebar: React.FC<TodoQueueSidebarProps> = ({
  isOpen,
  onClose,
  onCountChange,
}) => {
  const { user } = useAuth();
  const [data, setData] = useState<TodoQueueData | null>(null);
  const [loading, setLoading] = useState(true);
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
      const count = (response.data?.queue?.length || 0) + (response.data?.currentInProgress ? 1 : 0);
      onCountChange?.(count);
    } catch (error) {
      console.error('Error fetching todo queue:', error);
    } finally {
      setLoading(false);
    }
  }, [user?._id, onCountChange]);

  useEffect(() => {
    if (isOpen) {
      fetchQueue();
    }
  }, [isOpen, fetchQueue]);

  useEffect(() => {
    // Initial fetch to get count
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
    const newQueue = data.queue.filter((item) => item._id !== issueId);
    setData({
      ...data,
      queue: newQueue,
    });
    onCountChange?.((newQueue.length || 0) + (data.currentInProgress ? 1 : 0));

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

  if (!user) return null;

  const queueCount = (data?.queue?.length || 0) + (data?.currentInProgress ? 1 : 0);

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/30 z-40 transition-opacity"
          onClick={onClose}
        />
      )}

      {/* Sidebar Panel */}
      <div
        className={`fixed top-0 right-0 h-full w-80 bg-white dark:bg-dark-500 shadow-xl z-50 transform transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-gray-200 dark:border-dark-400">
          <div className="flex items-center gap-2">
            <svg
              className="w-5 h-5 text-gray-600 dark:text-gray-400"
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
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              My Queue
            </h2>
            {queueCount > 0 && (
              <span className="inline-flex items-center justify-center px-2 py-0.5 text-xs font-medium rounded-full bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400">
                {queueCount}
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md hover:bg-gray-100 dark:hover:bg-dark-400 transition-colors"
          >
            <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4" style={{ height: 'calc(100vh - 140px)' }}>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <LogoLoader size="sm" text="Loading queue" />
            </div>
          ) : (
            <>
              {/* Current In Progress */}
              {data?.currentInProgress && (
                <div className="mb-4">
                  <div className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2 font-medium">
                    In Progress
                  </div>
                  <Link
                    href={`/issues/${data.currentInProgress._id}`}
                    className="block p-3 rounded-lg bg-success-50 dark:bg-success-900/20 border border-success-200 dark:border-success-800 hover:bg-success-100 dark:hover:bg-success-900/30 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      {data.currentInProgress.projectId?.logo ? (
                        <img
                          src={data.currentInProgress.projectId.logo}
                          alt=""
                          className="w-5 h-5 rounded object-cover flex-shrink-0"
                        />
                      ) : (
                        <div className="w-5 h-5 rounded bg-primary-500 text-white text-[10px] flex items-center justify-center flex-shrink-0">
                          {data.currentInProgress.projectId?.key?.charAt(0) || '?'}
                        </div>
                      )}
                      <span className="text-sm font-medium text-success-700 dark:text-success-400">
                        {data.currentInProgress.key}
                      </span>
                      <div className="w-2 h-2 rounded-full bg-success-500 animate-pulse" />
                    </div>
                    <p className="text-sm text-gray-700 dark:text-gray-300 mt-1.5 line-clamp-2">
                      {data.currentInProgress.title}
                    </p>
                  </Link>
                </div>
              )}

              {/* Queue */}
              {data?.queue && data.queue.length > 0 ? (
                <div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2 font-medium">
                    Up Next ({data.queue.length})
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
                      <div className="space-y-2">
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
                <div className="text-center py-12">
                  <svg
                    className="w-16 h-16 mx-auto text-gray-300 dark:text-gray-600 mb-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                    />
                  </svg>
                  <p className="text-gray-500 dark:text-gray-400 mb-2">
                    Your queue is empty
                  </p>
                  <p className="text-sm text-gray-400 dark:text-gray-500">
                    Add tickets to plan your work order
                  </p>
                </div>
              ) : null}
            </>
          )}
        </div>

        {/* Footer - Add Button */}
        <div className="absolute bottom-0 left-0 right-0 p-4 bg-white dark:bg-dark-500 border-t border-gray-200 dark:border-dark-400">
          <button
            onClick={() => setShowAddModal(true)}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-primary-500 hover:bg-primary-600 text-white font-medium rounded-lg transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add to Queue
          </button>
        </div>
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <AddToQueueModal
          isOpen={showAddModal}
          onClose={() => setShowAddModal(false)}
          onAdd={handleAddToQueue}
          userId={user._id}
        />
      )}
    </>
  );
};
