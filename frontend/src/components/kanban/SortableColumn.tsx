import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { KanbanColumn } from './KanbanColumn';
import { Issue } from '@/types/issue';

interface SortableColumnProps {
  id: string;
  title: string;
  color: string;
  issues: Issue[];
  onArchiveIssue?: (issueId: string) => void;
  onDeleteIssue?: (issueId: string) => void;
}

export const SortableColumn: React.FC<SortableColumnProps> = ({ id, title, color, issues, onArchiveIssue, onDeleteIssue }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
    setActivatorNodeRef,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <KanbanColumn
        id={id}
        title={title}
        color={color}
        issues={issues}
        dragHandleProps={{ ...attributes, ...listeners }}
        dragHandleRef={setActivatorNodeRef}
        onArchiveIssue={onArchiveIssue}
        onDeleteIssue={onDeleteIssue}
      />
    </div>
  );
};
