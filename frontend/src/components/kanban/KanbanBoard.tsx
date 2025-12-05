'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
  pointerWithin,
  rectIntersection,
} from '@dnd-kit/core';
import {
  SortableContext,
  horizontalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';
import { Issue } from '@/types/issue';
import { IssueCard } from './IssueCard';
import { KanbanColumn } from './KanbanColumn';
import { SortableColumn } from './SortableColumn';
import { issuesAPI, projectsAPI } from '@/lib/api';
import { IssueStatus } from '@/types/issue';
import { LogoLoader } from '@/components/common';
import { Project, CustomStatus } from '@/types/project';
import toast from 'react-hot-toast';
import { useWebSocket } from '@/contexts/WebSocketContext';

interface KanbanBoardProps {
  projectId: string;
  sprintId?: string;
  zoomLevel: number;
  showArchived?: boolean;
  myTasksOnly?: boolean;
}

export const KanbanBoard: React.FC<KanbanBoardProps> = ({ projectId, sprintId, zoomLevel, showArchived = false, myTasksOnly = false }) => {
  const [issues, setIssues] = useState<Issue[]>([]);
  const [activeIssue, setActiveIssue] = useState<Issue | null>(null);
  const [loading, setLoading] = useState(true);
  const [columns, setColumns] = useState<CustomStatus[]>([]);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showArchiveModal, setShowArchiveModal] = useState(false);
  const [issueToDelete, setIssueToDelete] = useState<string | null>(null);
  const [issueToArchive, setIssueToArchive] = useState<string | null>(null);
  const { socket, joinProject, leaveProject } = useWebSocket();

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  useEffect(() => {
    fetchProject();
    fetchIssues();
  }, [projectId, sprintId, showArchived, myTasksOnly]);

  // Join project room for WebSocket updates
  useEffect(() => {
    if (projectId) {
      joinProject(projectId);
    }
    return () => {
      if (projectId) {
        leaveProject(projectId);
      }
    };
  }, [projectId, joinProject, leaveProject]);

  // Listen for timer:auto-stopped WebSocket events
  useEffect(() => {
    if (!socket) return;

    const handleTimerAutoStopped = (data: { issueId: string; issueKey: string; reason: string }) => {
      console.log('[KanbanBoard] Received timer:auto-stopped event:', data);
      toast(`Timer auto-stopped for ${data.issueKey} (end of day)`, {
        icon: '⏱️',
        duration: 5000,
      });

      // Update the issue to clear the active timer
      setIssues((prevIssues) =>
        prevIssues.map((issue) =>
          issue._id === data.issueId
            ? {
                ...issue,
                timeTracking: issue.timeTracking
                  ? {
                      ...issue.timeTracking,
                      activeTimeEntry: null,
                    }
                  : issue.timeTracking,
              }
            : issue
        )
      );
    };

    socket.on('timer:auto-stopped', handleTimerAutoStopped);

    return () => {
      socket.off('timer:auto-stopped', handleTimerAutoStopped);
    };
  }, [socket]);

  const fetchProject = async () => {
    try {
      const response = await projectsAPI.getById(projectId);
      const project = response.data;
      if (project.customStatuses && project.customStatuses.length > 0) {
        const sortedColumns = project.customStatuses.sort((a: CustomStatus, b: CustomStatus) => a.order - b.order);
        console.log('[KanbanBoard] Custom statuses:', sortedColumns.map((c: CustomStatus) => ({ id: c.id, name: c.name })));
        setColumns(sortedColumns);
      }
    } catch (error) {
      console.error('Error fetching project:', error);
    }
  };

  const fetchIssues = async () => {
    try {
      let response;
      const params: any = showArchived ? { isArchived: 'all' } : {};

      // Add myTasksOnly filter
      if (myTasksOnly) {
        params.assignedTo = 'me';
      }

      console.log('[KanbanBoard] fetchIssues called with showArchived:', showArchived, 'myTasksOnly:', myTasksOnly, 'params:', params);

      if (sprintId) {
        // For sprint view
        console.log('[KanbanBoard] Fetching sprint issues:', sprintId);
        response = await issuesAPI.getBySprint(sprintId, params);
      } else {
        // For project view
        console.log('[KanbanBoard] Fetching project issues:', projectId);
        response = await issuesAPI.getByProject(projectId, params);
      }

      console.log('[KanbanBoard] Fetched issues:', response.data.length, 'issues', showArchived ? '(including archived)' : '(active only)');
      console.log('[KanbanBoard] Sample issues:', response.data.slice(0, 5).map((i: any) => ({ key: i.key, status: i.status, isArchived: i.isArchived })));

      const archivedCount = response.data.filter((i: any) => i.isArchived).length;
      console.log('[KanbanBoard] Archived issues in response:', archivedCount);

      // DEBUG: Check assignees in API response
      console.log('[KanbanBoard] ASSIGNEES CHECK:', response.data.slice(0, 3).map((i: any) => ({
        key: i.key,
        assignees: i.assignees,
        assigneesLength: i.assignees?.length,
        firstAssigneeType: typeof i.assignees?.[0],
        firstAssigneeSample: i.assignees?.[0]
      })));

      setIssues(response.data);
    } catch (error) {
      console.error('Error fetching issues:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDragStart = (event: DragStartEvent) => {
    const issue = issues.find((i) => i._id === event.active.id);
    setActiveIssue(issue || null);
    console.log('[KanbanBoard] Drag started:', {
      activeId: event.active.id,
      isIssue: !!issue,
      isColumn: columns.some((col) => col.id === event.active.id)
    });
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveIssue(null);

    console.log('[KanbanBoard] Drag ended:', {
      activeId: active.id,
      overId: over?.id,
      hasOver: !!over
    });

    if (!over || active.id === over.id) return;

    // Check if dragging a column
    const isColumn = columns.some((col) => col.id === active.id);

    if (isColumn) {
      // Handle column reordering
      const oldIndex = columns.findIndex((col) => col.id === active.id);
      const newIndex = columns.findIndex((col) => col.id === over.id);

      if (oldIndex !== newIndex) {
        const reorderedColumns = arrayMove(columns, oldIndex, newIndex).map((col, index) => ({
          ...col,
          order: index,
        }));

        // Optimistic update
        setColumns(reorderedColumns);

        // Update on backend
        try {
          await projectsAPI.reorderColumns(projectId, {
            statusIds: reorderedColumns.map((col) => col.id),
          });
          toast.success('Column order updated');
        } catch (error) {
          console.error('Error reordering columns:', error);
          toast.error('Failed to update column order');
          // Revert on error
          fetchProject();
        }
      }
    } else {
      // Handle issue dragging (existing logic)
      const issueId = active.id as string;
      const overId = over.id as string;

      // Determine if we dropped on a column or an issue
      let newStatus: string;
      const isOverColumn = columns.some((col) => col.id === overId);

      if (isOverColumn) {
        // Dropped on a column droppable area
        newStatus = overId;
      } else {
        // Dropped on an issue - find which column that issue belongs to
        const targetIssue = issues.find((i) => i._id === overId);
        if (targetIssue) {
          newStatus = targetIssue.status;
        } else {
          console.error('Could not determine target column');
          return;
        }
      }

      // Validate that newStatus is a valid column ID
      const validStatuses = ['todo', 'in_progress', 'in_review', 'testing', 'done'];
      const isValidStatus = validStatuses.includes(newStatus) || columns.some((col) => col.id === newStatus);

      if (!isValidStatus) {
        console.error(`Invalid status: ${newStatus}. Not updating issue.`);
        toast.error('Invalid target column');
        return;
      }

      console.log(`[KanbanBoard] Moving issue ${issueId} to status: ${newStatus}`);

      // Optimistic update
      setIssues((prevIssues) =>
        prevIssues.map((issue) =>
          issue._id === issueId ? { ...issue, status: newStatus as any } : issue
        )
      );

      // Update on backend
      try {
        const updatedIssue = await issuesAPI.update(issueId, { status: newStatus as any });
        toast.success('Issue moved successfully');

        // Update the issue with full data from backend (includes timeTracking updates)
        setIssues((prevIssues) =>
          prevIssues.map((issue) =>
            issue._id === issueId ? updatedIssue.data : issue
          )
        );
      } catch (error) {
        console.error('Error updating issue:', error);
        toast.error('Failed to move issue');
        // Revert on error
        fetchIssues();
      }
    }
  };

  const getIssuesByStatus = (statusId: string) => {
    return issues.filter((issue) => issue.status === statusId);
  };

  const handleArchiveIssue = (issueId: string) => {
    setIssueToArchive(issueId);
    setShowArchiveModal(true);
  };

  const confirmArchiveIssue = async () => {
    if (!issueToArchive) return;

    try {
      await issuesAPI.archive(issueToArchive);
      toast.success('Issue archived successfully');
      // Remove from list
      setIssues((prevIssues) => prevIssues.filter((i) => i._id !== issueToArchive));
      setShowArchiveModal(false);
      setIssueToArchive(null);
    } catch (error: any) {
      console.error('Error archiving issue:', error);
      toast.error(error?.response?.data?.message || 'Failed to archive issue');
    }
  };

  const handleDeleteIssue = (issueId: string) => {
    setIssueToDelete(issueId);
    setShowDeleteModal(true);
  };

  const confirmDeleteIssue = async () => {
    if (!issueToDelete) return;

    try {
      await issuesAPI.delete(issueToDelete);
      toast.success('Issue deleted successfully');
      // Remove from list
      setIssues((prevIssues) => prevIssues.filter((i) => i._id !== issueToDelete));
      setShowDeleteModal(false);
      setIssueToDelete(null);
    } catch (error: any) {
      console.error('Error deleting issue:', error);
      toast.error(error?.response?.data?.message || 'Failed to delete issue');
    }
  };

  const handleArchiveAllInColumn = async (columnId: string, issueIds: string[]) => {
    try {
      // Archive all issues using the bulkUpdate endpoint
      await issuesAPI.bulkUpdate(issueIds, { isArchived: true });
      toast.success(`Successfully archived ${issueIds.length} issue${issueIds.length !== 1 ? 's' : ''}`);
      // Remove from list
      setIssues((prevIssues) => prevIssues.filter((i) => !issueIds.includes(i._id)));
    } catch (error: any) {
      console.error('Error archiving issues:', error);
      toast.error(error?.response?.data?.message || 'Failed to archive issues');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LogoLoader size="md" text="Loading board" />
      </div>
    );
  }

  if (columns.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <LogoLoader size="md" text="Loading columns" />
      </div>
    );
  }

  return (
    <div className="-mx-4 md:mx-0">
      <DndContext
          sensors={sensors}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          collisionDetection={pointerWithin}
        >
          <SortableContext items={columns.map((col) => col.id)} strategy={horizontalListSortingStrategy}>
            <div
              className="flex gap-3 md:gap-4 overflow-x-auto pb-4 px-4 md:px-0 snap-x snap-mandatory md:snap-none transition-transform origin-top-left scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600 scrollbar-track-transparent"
              style={{
                transform: `scale(${zoomLevel / 100})`,
                transformOrigin: 'top left',
                WebkitOverflowScrolling: 'touch'
              }}
            >
              {columns.map((column) => (
                <SortableColumn
                  key={column.id}
                  id={column.id}
                  title={column.name}
                  color={column.color}
                  issues={getIssuesByStatus(column.id)}
                  onArchiveIssue={handleArchiveIssue}
                  onDeleteIssue={handleDeleteIssue}
                  onArchiveAllInColumn={handleArchiveAllInColumn}
                />
              ))}
            </div>
          </SortableContext>

          <DragOverlay>
            {activeIssue ? (
              <div className="rotate-3 opacity-80">
                <IssueCard issue={activeIssue} />
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>

        {/* Delete Confirmation Modal */}
        {showDeleteModal && typeof window !== 'undefined' && createPortal(
          <div
            className="fixed inset-0 bg-black/50 flex items-center justify-center"
            style={{ zIndex: 9999 }}
            onClick={() => {
              setShowDeleteModal(false);
              setIssueToDelete(null);
            }}
          >
            <div
              className="bg-white dark:bg-dark-400 rounded-lg p-6 max-w-md w-full mx-4 shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0">
                  <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                    Delete Issue?
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                    Are you sure you want to delete this issue? This action cannot be undone and all data associated with this issue will be permanently removed.
                  </p>
                  <div className="flex justify-end gap-3">
                    <button
                      onClick={() => {
                        setShowDeleteModal(false);
                        setIssueToDelete(null);
                      }}
                      className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-dark-300 hover:bg-gray-200 dark:hover:bg-dark-200 rounded-lg transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={confirmDeleteIssue}
                      className="px-4 py-2 text-sm font-medium text-white bg-red-500 hover:bg-red-600 rounded-lg transition-colors"
                    >
                      Delete Issue
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}

        {/* Archive Confirmation Modal */}
        {showArchiveModal && typeof window !== 'undefined' && createPortal(
          <div
            className="fixed inset-0 bg-black/50 flex items-center justify-center"
            style={{ zIndex: 9999 }}
            onClick={() => {
              setShowArchiveModal(false);
              setIssueToArchive(null);
            }}
          >
            <div
              className="bg-white dark:bg-dark-400 rounded-lg p-6 max-w-md w-full mx-4 shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0">
                  <svg className="w-6 h-6 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                    Archive Issue?
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                    Are you sure you want to archive this issue? Archived issues can be restored later from the archived view.
                  </p>
                  <div className="flex justify-end gap-3">
                    <button
                      onClick={() => {
                        setShowArchiveModal(false);
                        setIssueToArchive(null);
                      }}
                      className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-dark-300 hover:bg-gray-200 dark:hover:bg-dark-200 rounded-lg transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={confirmArchiveIssue}
                      className="px-4 py-2 text-sm font-medium text-white bg-yellow-500 hover:bg-yellow-600 rounded-lg transition-colors"
                    >
                      Archive Issue
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
};
