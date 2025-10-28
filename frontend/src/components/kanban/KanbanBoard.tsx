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
} from '@dnd-kit/core';
import { Issue } from '@/types/issue';
import { IssueCard } from './IssueCard';
import { KanbanColumn } from './KanbanColumn';
import { issuesAPI, projectsAPI } from '@/lib/api';
import { IssueStatus } from '@/types/issue';
import { LogoLoader } from '@/components/common';
import { Project, CustomStatus } from '@/types/project';

interface KanbanBoardProps {
  projectId: string;
  sprintId?: string;
}

export const KanbanBoard: React.FC<KanbanBoardProps> = ({ projectId, sprintId }) => {
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
  }, [projectId, sprintId]);

  const fetchProject = async () => {
    try {
      const response = await projectsAPI.getById(projectId);
      const project = response.data;
      if (project.customStatuses && project.customStatuses.length > 0) {
        setColumns(project.customStatuses.sort((a, b) => a.order - b.order));
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
  };

  const getIssuesByStatus = (statusId: string) => {
    return issues.filter((issue) => issue.status === statusId);
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
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-4 overflow-x-auto pb-4">
        {columns.map((column) => (
          <KanbanColumn
            key={column.id}
            id={column.id}
            title={column.name}
            color={column.color}
            issues={getIssuesByStatus(column.id)}
          />
        ))}
      </div>

      <DragOverlay>
        {activeIssue ? (
          <div className="rotate-3 opacity-80">
            <IssueCard issue={activeIssue} />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
};
