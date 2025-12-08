import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Issue } from '@/types/issue';
import { IssueCard } from './IssueCard';

interface SortableIssueCardProps {
  issue: Issue;
  onArchive?: (issueId: string) => void;
  onDelete?: (issueId: string) => void;
  onIssueUpdate?: (updatedIssue: Issue) => void;
}

export const SortableIssueCard: React.FC<SortableIssueCardProps> = ({ issue, onArchive, onDelete, onIssueUpdate }) => {
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
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <IssueCard issue={issue} onArchive={onArchive} onDelete={onDelete} onIssueUpdate={onIssueUpdate} />
    </div>
  );
};
