'use client';

import React, { useState, useEffect } from 'react';
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

interface KanbanBoardProps {
  projectId: string;
  sprintId?: string;
  zoomLevel: number;
  showArchived?: boolean;
}

export const KanbanBoard: React.FC<KanbanBoardProps> = ({ projectId, sprintId, zoomLevel, showArchived = false }) => {
  const [issues, setIssues] = useState<Issue[]>([]);
  const [activeIssue, setActiveIssue] = useState<Issue | null>(null);
  const [loading, setLoading] = useState(true);
  const [columns, setColumns] = useState<CustomStatus[]>([]);

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
  }, [projectId, sprintId, showArchived]);

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
      const params = showArchived ? { isArchived: 'all' } : {};

      console.log('[KanbanBoard] fetchIssues called with showArchived:', showArchived, 'params:', params);

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
        await issuesAPI.update(issueId, { status: newStatus as any });
        toast.success('Issue moved successfully');
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

  const handleArchiveIssue = async (issueId: string) => {
    if (!confirm('Are you sure you want to archive this issue?')) return;

    try {
      await issuesAPI.archive(issueId);
      toast.success('Issue archived successfully');
      // Remove from list
      setIssues((prevIssues) => prevIssues.filter((i) => i._id !== issueId));
    } catch (error: any) {
      console.error('Error archiving issue:', error);
      toast.error(error?.response?.data?.message || 'Failed to archive issue');
    }
  };

  const handleDeleteIssue = async (issueId: string) => {
    if (!confirm('Are you sure you want to delete this issue? This action cannot be undone.')) return;

    try {
      await issuesAPI.delete(issueId);
      toast.success('Issue deleted successfully');
      // Remove from list
      setIssues((prevIssues) => prevIssues.filter((i) => i._id !== issueId));
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
    <div>
      <DndContext
          sensors={sensors}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          collisionDetection={pointerWithin}
        >
          <SortableContext items={columns.map((col) => col.id)} strategy={horizontalListSortingStrategy}>
            <div
              className="flex gap-4 overflow-x-auto pb-4 transition-transform origin-top-left"
              style={{
                transform: `scale(${zoomLevel / 100})`,
                transformOrigin: 'top left'
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
    </div>
  );
};
