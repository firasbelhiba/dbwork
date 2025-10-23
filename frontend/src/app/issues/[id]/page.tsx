'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { issuesAPI, commentsAPI } from '@/lib/api';
import { Issue } from '@/types/issue';
import { Comment } from '@/types/comment';
import { Button, Badge, Select, Textarea, Breadcrumb } from '@/components/common';
import { useAuth } from '@/contexts/AuthContext';
import { getInitials, formatDateTime, getRelativeTime } from '@/lib/utils';
import Link from 'next/link';

export default function IssueDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const issueId = params.id as string;

  const [issue, setIssue] = useState<Issue | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (issueId) {
      fetchIssueData();
    }
  }, [issueId]);

  const fetchIssueData = async () => {
    try {
      const [issueRes, commentsRes] = await Promise.all([
        issuesAPI.getById(issueId),
        commentsAPI.getByIssue(issueId),
      ]);

      setIssue(issueRes.data);
      setComments(commentsRes.data);
    } catch (error) {
      console.error('Error fetching issue data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    setSubmitting(true);
    try {
      await commentsAPI.create(issueId, { content: newComment });
      setNewComment('');
      fetchIssueData();
    } catch (error) {
      console.error('Error adding comment:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!issue) return;

    try {
      await issuesAPI.update(issueId, { status: newStatus });
      setIssue({ ...issue, status: newStatus as any });
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading issue...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!issue) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900">Issue not found</h2>
            <p className="text-gray-600 mt-2">The issue you're looking for doesn't exist.</p>
            <Button onClick={() => router.back()} className="mt-4">Go Back</Button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  const projectKey = typeof issue.projectId === 'object' ? issue.projectId.key : '';
  const assignee = typeof issue.assignee === 'object' ? issue.assignee : null;
  const reporter = typeof issue.reporter === 'object' ? issue.reporter : null;

  return (
    <DashboardLayout>
      <div className="h-full overflow-auto">
        <div className="max-w-6xl mx-auto p-8">
          {/* Header */}
          <div className="mb-6">
            <Breadcrumb
              items={[
                {
                  label: 'Home',
                  href: '/dashboard',
                  icon: (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                    </svg>
                  ),
                },
                {
                  label: 'Projects',
                  href: '/projects',
                  icon: (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                  ),
                },
                {
                  label: typeof issue.projectId === 'object' ? issue.projectId.name : 'Project',
                  href: `/projects/${typeof issue.projectId === 'object' ? issue.projectId._id : issue.projectId}`,
                },
                {
                  label: `${projectKey}-${issue._id.slice(-4)}`,
                },
              ]}
              className="mb-4"
            />
            <div className="flex items-start gap-3 mb-4">
              <Badge variant={issue.type as any}>{issue.type}</Badge>
              <h1 className="text-3xl font-bold text-gray-900 flex-1">{issue.title}</h1>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-8">
            {/* Main Content */}
            <div className="col-span-2 space-y-6">
              {/* Description */}
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Description</h2>
                <p className="text-gray-700 whitespace-pre-wrap">{issue.description || 'No description provided.'}</p>
              </div>

              {/* Comments */}
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">
                  Comments ({comments.length})
                </h2>

                {/* Add Comment */}
                <form onSubmit={handleAddComment} className="mb-6">
                  <div className="flex gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center text-sm font-medium flex-shrink-0">
                      {user && getInitials(user.firstName, user.lastName)}
                    </div>
                    <div className="flex-1">
                      <Textarea
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        placeholder="Add a comment..."
                        rows={3}
                      />
                      <div className="flex justify-end mt-2">
                        <Button type="submit" loading={submitting} disabled={!newComment.trim()}>
                          Add Comment
                        </Button>
                      </div>
                    </div>
                  </div>
                </form>

                {/* Comments List */}
                <div className="space-y-4">
                  {comments.length === 0 ? (
                    <p className="text-gray-500 text-center py-8">No comments yet</p>
                  ) : (
                    comments.map((comment) => {
                      const commentUser = typeof comment.userId === 'object' ? comment.userId : null;
                      return (
                        <div key={comment._id} className="flex gap-3">
                          <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center text-sm font-medium flex-shrink-0">
                            {commentUser && getInitials(commentUser.firstName, commentUser.lastName)}
                          </div>
                          <div className="flex-1">
                            <div className="bg-gray-50 rounded-lg p-4">
                              <div className="flex items-center justify-between mb-2">
                                <span className="font-medium text-gray-900">
                                  {commentUser ? `${commentUser.firstName} ${commentUser.lastName}` : 'User'}
                                </span>
                                <span className="text-xs text-gray-500">
                                  {getRelativeTime(comment.createdAt)}
                                </span>
                              </div>
                              <p className="text-gray-700 whitespace-pre-wrap">{comment.content}</p>
                              {comment.isEdited && (
                                <span className="text-xs text-gray-500 mt-2 block">(edited)</span>
                              )}
                            </div>
                            {/* Reactions */}
                            {comment.reactions && comment.reactions.length > 0 && (
                              <div className="flex gap-2 mt-2">
                                {comment.reactions.map((reaction, index) => (
                                  <span key={index} className="text-sm">
                                    {reaction.reaction}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Status */}
              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <h3 className="text-sm font-semibold text-gray-900 mb-3">Status</h3>
                <Select
                  value={issue.status}
                  onChange={(e) => handleStatusChange(e.target.value)}
                  options={[
                    { value: 'todo', label: 'To Do' },
                    { value: 'in_progress', label: 'In Progress' },
                    { value: 'in_review', label: 'In Review' },
                    { value: 'done', label: 'Done' },
                  ]}
                />
              </div>

              {/* Details */}
              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <h3 className="text-sm font-semibold text-gray-900 mb-3">Details</h3>
                <div className="space-y-3">
                  <div>
                    <span className="text-xs text-gray-600 block mb-1">Assignee</span>
                    {assignee ? (
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center text-xs font-medium">
                          {getInitials(assignee.firstName, assignee.lastName)}
                        </div>
                        <span className="text-sm text-gray-900">
                          {assignee.firstName} {assignee.lastName}
                        </span>
                      </div>
                    ) : (
                      <span className="text-sm text-gray-500">Unassigned</span>
                    )}
                  </div>

                  <div>
                    <span className="text-xs text-gray-600 block mb-1">Reporter</span>
                    {reporter && (
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-secondary text-white flex items-center justify-center text-xs font-medium">
                          {getInitials(reporter.firstName, reporter.lastName)}
                        </div>
                        <span className="text-sm text-gray-900">
                          {reporter.firstName} {reporter.lastName}
                        </span>
                      </div>
                    )}
                  </div>

                  <div>
                    <span className="text-xs text-gray-600 block mb-1">Priority</span>
                    <Badge variant={issue.priority as any}>{issue.priority}</Badge>
                  </div>

                  {issue.storyPoints && (
                    <div>
                      <span className="text-xs text-gray-600 block mb-1">Story Points</span>
                      <span className="text-sm text-gray-900">{issue.storyPoints}</span>
                    </div>
                  )}

                  {issue.labels && issue.labels.length > 0 && (
                    <div>
                      <span className="text-xs text-gray-600 block mb-1">Labels</span>
                      <div className="flex flex-wrap gap-1">
                        {issue.labels.map((label, index) => (
                          <Badge key={index} variant="default">{label}</Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  <div>
                    <span className="text-xs text-gray-600 block mb-1">Created</span>
                    <span className="text-sm text-gray-900">{formatDateTime(issue.createdAt)}</span>
                  </div>

                  <div>
                    <span className="text-xs text-gray-600 block mb-1">Updated</span>
                    <span className="text-sm text-gray-900">{getRelativeTime(issue.updatedAt)}</span>
                  </div>
                </div>
              </div>

              {/* Time Tracking */}
              {issue.timeTracking && (
                <div className="bg-white rounded-lg border border-gray-200 p-4">
                  <h3 className="text-sm font-semibold text-gray-900 mb-3">Time Tracking</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Estimated:</span>
                      <span className="text-gray-900">{issue.timeTracking.estimatedHours}h</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Logged:</span>
                      <span className="text-gray-900">{issue.timeTracking.loggedHours}h</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Remaining:</span>
                      <span className="text-gray-900">{issue.timeTracking.remainingHours}h</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                      <div
                        className="bg-primary h-2 rounded-full"
                        style={{
                          width: `${Math.min(
                            (issue.timeTracking.loggedHours / issue.timeTracking.estimatedHours) * 100,
                            100
                          )}%`,
                        }}
                      ></div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
