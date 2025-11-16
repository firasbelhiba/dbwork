import React from 'react';
import Link from 'next/link';
import { Feedback, FeedbackType, FeedbackStatus } from '@/types/feedback';
import { Badge } from '@/components/common';
import { getInitials } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

interface FeedbackCardProps {
  feedback: Feedback;
  onUpvote?: (id: string) => void;
  currentUserId?: string;
}

export const FeedbackCard: React.FC<FeedbackCardProps> = ({
  feedback,
  onUpvote,
  currentUserId,
}) => {
  const hasUpvoted = currentUserId && feedback.upvotedBy.some((id: string) => id === currentUserId);

  const getTypeColor = (type: FeedbackType) => {
    switch (type) {
      case FeedbackType.BUG:
        return 'danger';
      case FeedbackType.FEATURE_REQUEST:
        return 'primary';
      case FeedbackType.IMPROVEMENT:
        return 'warning';
      default:
        return 'secondary';
    }
  };

  const getTypeLabel = (type: FeedbackType) => {
    switch (type) {
      case FeedbackType.BUG:
        return 'Bug';
      case FeedbackType.FEATURE_REQUEST:
        return 'Feature Request';
      case FeedbackType.IMPROVEMENT:
        return 'Improvement';
      default:
        return 'Other';
    }
  };

  const handleUpvoteClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (onUpvote) {
      onUpvote(feedback._id);
    }
  };

  return (
    <Link
      href={`/feedback/${feedback._id}`}
      className="block bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 hover:shadow-md transition-all"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant={getTypeColor(feedback.type)}>
            {getTypeLabel(feedback.type)}
          </Badge>
          {feedback.status === FeedbackStatus.TO_TEST && (
            <Badge variant="warning">To Test</Badge>
          )}
          {feedback.status === FeedbackStatus.RESOLVED && (
            <Badge variant="success">Resolved</Badge>
          )}
        </div>

        {/* Upvote Button */}
        <button
          onClick={handleUpvoteClick}
          className={`flex flex-col items-center justify-center min-w-[48px] px-2 py-1 rounded-md border-2 transition-all ${
            hasUpvoted
              ? 'border-primary-600 bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400'
              : 'border-gray-300 dark:border-gray-600 hover:border-primary-400 dark:hover:border-primary-500'
          }`}
          title={hasUpvoted ? 'Remove upvote' : 'Upvote this feedback'}
        >
          <svg
            className="w-4 h-4"
            fill={hasUpvoted ? 'currentColor' : 'none'}
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 15l7-7 7 7"
            />
          </svg>
          <span className="text-xs font-semibold">{feedback.upvotes}</span>
        </button>
      </div>

      {/* Title */}
      <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-2 line-clamp-2">
        {feedback.title}
      </h3>

      {/* Description Preview */}
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 line-clamp-2">
        {feedback.description}
      </p>

      {/* Footer */}
      <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
        <div className="flex items-center gap-2">
          {/* User Avatar */}
          {feedback.userId && (
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-primary-600 dark:bg-primary-500 text-white flex items-center justify-center text-xs font-medium">
                {getInitials(
                  feedback.userId.firstName,
                  feedback.userId.lastName
                )}
              </div>
              <span>
                {feedback.userId.firstName} {feedback.userId.lastName}
              </span>
            </div>
          )}
        </div>

        {/* Date */}
        <span>
          {formatDistanceToNow(new Date(feedback.createdAt), {
            addSuffix: true,
          })}
        </span>
      </div>
    </Link>
  );
};
