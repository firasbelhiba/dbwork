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
          {feedback.status === FeedbackStatus.CLOSED && (
            <Badge variant="secondary">Closed</Badge>
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
          {hasUpvoted ? (
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path d="M2 10.5a1.5 1.5 0 113 0v6a1.5 1.5 0 01-3 0v-6zM6 10.333v5.43a2 2 0 001.106 1.79l.05.025A4 4 0 008.943 18h5.416a2 2 0 001.962-1.608l1.2-6A2 2 0 0015.56 8H12V4a2 2 0 00-2-2 1 1 0 00-1 1v.667a4 4 0 01-.8 2.4L6.8 7.933a4 4 0 00-.8 2.4z" />
            </svg>
          ) : (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
            </svg>
          )}
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
              {feedback.userId.avatar ? (
                <img
                  src={feedback.userId.avatar}
                  alt={`${feedback.userId.firstName} ${feedback.userId.lastName}`}
                  className="w-6 h-6 rounded-full object-cover"
                />
              ) : (
                <div className="w-6 h-6 rounded-full bg-primary-600 dark:bg-primary-500 text-white flex items-center justify-center text-xs font-medium">
                  {getInitials(
                    feedback.userId.firstName,
                    feedback.userId.lastName
                  )}
                </div>
              )}
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
