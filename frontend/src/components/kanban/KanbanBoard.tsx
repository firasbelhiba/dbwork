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
}

export const KanbanBoard: React.FC<KanbanBoardProps> = ({ projectId, sprintId }) => {
  const [issues, setIssues] = useState<Issue[]>([]);
  const [activeIssue, setActiveIssue] = useState<Issue | null>(null);
  const [loading, setLoading] = useState(true);
  const [columns, setColumns] = useState<CustomStatus[]>([]);
  const [zoomLevel, setZoomLevel] = useState(100); // Zoom level in percentage

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
  }, [projectId, sprintId]);

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
      const response = sprintId
        ? await issuesAPI.getBySprint(sprintId)
        : await issuesAPI.getByProject(projectId);
      console.log('[KanbanBoard] Fetched issues:', response.data.length, 'issues');
      console.log('[KanbanBoard] Sample issue statuses:', response.data.slice(0, 5).map((i: any) => ({ key: i.key, status: i.status })));
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
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveIssue(null);

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
      const newStatus = over.id as string;

      // Optimistic update
      setIssues((prevIssues) =>
        prevIssues.map((issue) =>
          issue._id === issueId ? { ...issue, status: newStatus as any } : issue
        )
      );

      // Update on backend
      try {
        await issuesAPI.update(issueId, { status: newStatus as any });
      } catch (error) {
        console.error('Error updating issue:', error);
        // Revert on error
        fetchIssues();
      }
    }
  };

  const getIssuesByStatus = (statusId: string) => {
    return issues.filter((issue) => issue.status === statusId);
  };

  const handleZoomIn = () => {
    setZoomLevel((prev) => Math.min(prev + 10, 150)); // Max 150%
  };

  const handleZoomOut = () => {
    setZoomLevel((prev) => Math.max(prev - 10, 50)); // Min 50%
  };

  const handleResetZoom = () => {
    setZoomLevel(100);
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
    <div className="relative">
      {/* Zoom Controls */}
      <div className="absolute top-0 right-0 z-10 flex items-center gap-2 bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 p-2">
        <button
          onClick={handleZoomOut}
          disabled={zoomLevel <= 50}
          className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          title="Zoom Out"
        >
          <svg className="w-5 h-5 text-gray-700 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
          </svg>
        </button>

        <button
          onClick={handleResetZoom}
          className="px-3 py-1 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
          title="Reset Zoom"
        >
          {zoomLevel}%
        </button>

        <button
          onClick={handleZoomIn}
          disabled={zoomLevel >= 150}
          className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          title="Zoom In"
        >
          <svg className="w-5 h-5 text-gray-700 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        </button>
      </div>

      {/* Kanban Board with Zoom */}
      <div className="mt-12">
        <DndContext
          sensors={sensors}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          collisionDetection={closestCorners}
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
    </div>
  );
};
