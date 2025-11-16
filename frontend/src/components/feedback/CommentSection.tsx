'use client';

import React, { useState, useEffect } from 'react';
import { feedbackAPI } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { getInitials } from '@/lib/utils';
import { toast } from 'react-hot-toast';
import { UserRole } from '@/types/user';
import { MentionTextarea } from '@/components/common/MentionTextarea';

interface Comment {
  _id: string;
  feedbackId: string;
  userId: {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
    avatar?: string;
  };
  content: string;
  isEdited: boolean;
  editedAt?: string;
  createdAt: string;
  updatedAt: string;
}

interface CommentSectionProps {
  feedbackId: string;
}

export const CommentSection: React.FC<CommentSectionProps> = ({ feedbackId }) => {
  const { user } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');

  useEffect(() => {
    loadComments();
  }, [feedbackId]);

  const loadComments = async () => {
    try {
      const response = await feedbackAPI.getComments(feedbackId);
      setComments(response.data);
    } catch (error) {
      console.error('Failed to load comments:', error);
      toast.error('Failed to load comments');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || submitting) return;

    setSubmitting(true);
    try {
      const response = await feedbackAPI.createComment(feedbackId, { content: newComment.trim() });
      setComments([...comments, response.data]);
      setNewComment('');
      toast.success('Comment added successfully');
    } catch (error) {
      console.error('Failed to add comment:', error);
      toast.error('Failed to add comment');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = async (commentId: string) => {
    if (!editContent.trim()) return;

    try {
      const response = await feedbackAPI.updateComment(commentId, { content: editContent.trim() });
      setComments(comments.map(c => c._id === commentId ? response.data : c));
      setEditingId(null);
      setEditContent('');
      toast.success('Comment updated successfully');
    } catch (error) {
      console.error('Failed to update comment:', error);
      toast.error('Failed to update comment');
    }
  };

  const handleDelete = async (commentId: string) => {
    if (!confirm('Are you sure you want to delete this comment?')) return;

    try {
      await feedbackAPI.deleteComment(commentId);
      setComments(comments.filter(c => c._id !== commentId));
      toast.success('Comment deleted successfully');
    } catch (error) {
      console.error('Failed to delete comment:', error);
      toast.error('Failed to delete comment');
    }
  };

  const startEdit = (comment: Comment) => {
    setEditingId(comment._id);
    setEditContent(comment.content);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditContent('');
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return 'just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;

    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-20 bg-gray-200 dark:bg-dark-300 rounded"></div>
        <div className="h-20 bg-gray-200 dark:bg-dark-300 rounded"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          Comments ({comments.length})
        </h3>
      </div>

      {/* Comment form */}
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="flex items-start gap-3">
          {user && (
            <div className="flex-shrink-0">
              <div className="w-10 h-10 rounded-full bg-primary-600 dark:bg-primary-500 text-white flex items-center justify-center text-sm font-medium">
                {getInitials(user.firstName, user.lastName)}
              </div>
            </div>
          )}
          <div className="flex-1">
            <MentionTextarea
              value={newComment}
              onChange={setNewComment}
              placeholder="Write a comment... Use @ to mention someone"
              rows={3}
              disabled={submitting}
            />
            <div className="flex items-center justify-between mt-2">
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {newComment.length}/1000
              </span>
              <button
                type="submit"
                disabled={!newComment.trim() || submitting}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
              >
                {submitting ? 'Posting...' : 'Post Comment'}
              </button>
            </div>
          </div>
        </div>
      </form>

      {/* Comments list */}
      <div className="space-y-4">
        {comments.length === 0 ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            No comments yet. Be the first to comment!
          </div>
        ) : (
          comments.map((comment) => (
            <div key={comment._id} className="flex items-start gap-3 bg-gray-50 dark:bg-dark-300 p-4 rounded-lg">
              <div className="flex-shrink-0">
                <div className="w-10 h-10 rounded-full bg-primary-600 dark:bg-primary-500 text-white flex items-center justify-center text-sm font-medium">
                  {getInitials(comment.userId.firstName, comment.userId.lastName)}
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-900 dark:text-gray-100">
                      {comment.userId.firstName} {comment.userId.lastName}
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {formatDate(comment.createdAt)}
                      {comment.isEdited && ' (edited)'}
                    </span>
                  </div>
                  {(user?._id === comment.userId._id || user?.role === UserRole.ADMIN) && (
                    <div className="flex items-center gap-2">
                      {user._id === comment.userId._id && editingId !== comment._id && (
                        <button
                          onClick={() => startEdit(comment)}
                          className="text-xs text-gray-600 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-500"
                        >
                          Edit
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(comment._id)}
                        className="text-xs text-red-600 dark:text-red-500 hover:text-red-700 dark:hover:text-red-600"
                      >
                        Delete
                      </button>
                    </div>
                  )}
                </div>

                {editingId === comment._id ? (
                  <div className="space-y-2">
                    <MentionTextarea
                      value={editContent}
                      onChange={setEditContent}
                      placeholder="Edit your comment..."
                      rows={3}
                    />
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleEdit(comment._id)}
                        className="px-3 py-1 bg-primary-600 text-white rounded text-xs hover:bg-primary-700"
                      >
                        Save
                      </button>
                      <button
                        onClick={cancelEdit}
                        className="px-3 py-1 bg-gray-300 dark:bg-dark-200 text-gray-700 dark:text-gray-300 rounded text-xs hover:bg-gray-400 dark:hover:bg-dark-100"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap break-words">
                    {comment.content}
                  </p>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
