'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { issuesAPI, commentsAPI } from '@/lib/api';
import { Issue } from '@/types/issue';
import { Comment } from '@/types/comment';
import { UserRole } from '@/types/user';
import { Button, Badge, Select, Textarea, Breadcrumb, LogoLoader } from '@/components/common';
import { SubIssues, SubIssueModal, EditIssueModal } from '@/components/issues';
import { useAuth } from '@/contexts/AuthContext';
import { getInitials, formatDateTime, getRelativeTime } from '@/lib/utils';
import Link from 'next/link';
import toast from 'react-hot-toast';

export default function IssueDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const issueId = params.id as string;

  const [issue, setIssue] = useState<Issue | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showSubIssueModal, setShowSubIssueModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [unauthorized, setUnauthorized] = useState(false);

  useEffect(() => {
    if (issueId && !authLoading) {
      fetchIssueData();
    }
  }, [issueId, authLoading, user]);

  const fetchIssueData = async () => {
    // Wait for auth to finish loading before checking authorization
    if (authLoading) {
      return;
    }

    try {
      const [issueRes, commentsRes] = await Promise.all([
        issuesAPI.getById(issueId),
        commentsAPI.getByIssue(issueId),
      ]);

      const issueData = issueRes.data;

      // Check authorization: Admin can see all issues, non-admin must be assigned or be a project member
      if (user?.role !== UserRole.ADMIN) {
        // Check if user is assigned to this issue
        const assigneeId = typeof issueData.assignee === 'object' ? issueData.assignee._id : issueData.assignee;
        const isAssignee = assigneeId === user?._id;

        // Check if user is a member of the project
        const projectData = typeof issueData.projectId === 'object' ? issueData.projectId : null;
        const isMember = projectData?.members?.some((member: any) => {
          const memberId = typeof member.userId === 'object' ? member.userId._id : member.userId;
          return memberId === user?._id;
        });

        if (!isAssignee && !isMember) {
          setUnauthorized(true);
          setLoading(false);
          toast.error('You do not have access to this issue');
          return;
        }
      }

      setIssue(issueData);
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
      toast.success('Comment added successfully!');
      setNewComment('');
      fetchIssueData();
    } catch (error) {
      console.error('Error adding comment:', error);
      toast.error('Failed to add comment');
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!issue) return;

    try {
      await issuesAPI.update(issueId, { status: newStatus });
      setIssue({ ...issue, status: newStatus as any });
      toast.success('Status updated successfully!');
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Failed to update status');
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-full">
          <LogoLoader size="lg" text="Loading issue" />
        </div>
      </DashboardLayout>
    );
  }

  if (unauthorized) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <div className="w-16 h-16 bg-danger-100 dark:bg-danger-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-danger-600 dark:text-danger-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Access Denied</h2>
            <p className="text-gray-600 dark:text-gray-400 mt-2">You don't have permission to view this issue.</p>
            <Button onClick={() => router.push('/issues')} className="mt-4">
              Back to Issues
            </Button>
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
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Issue not found</h2>
            <p className="text-gray-600 dark:text-gray-400 mt-2">The issue you're looking for doesn't exist.</p>
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
              <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 flex-1">{issue.title}</h1>
              <Button
                variant="outline"
                onClick={() => setShowEditModal(true)}
                className="flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                Edit
              </Button>
            </div>

            {/* Parent Issue Link */}
            {issue.parentIssue && (
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 flex items-center gap-2">
                <svg className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
                <span className="text-sm text-blue-800 dark:text-blue-300">
                  Sub-issue of{' '}
                  <Link
                    href={`/issues/${typeof issue.parentIssue === 'object' ? issue.parentIssue._id : issue.parentIssue}`}
                    className="font-semibold hover:underline"
                  >
                    {typeof issue.parentIssue === 'object' ? issue.parentIssue.key : 'Parent Issue'}
                  </Link>
                  {typeof issue.parentIssue === 'object' && ` - ${issue.parentIssue.title}`}
                </span>
              </div>
            )}
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

              {/* Sub-issues Section - Only show if not a sub-issue itself */}
              {!issue.parentIssue && (
                <SubIssues
                  parentIssueId={issue._id}
                  parentIssueKey={issue.key}
                  onCreateSubIssue={() => setShowSubIssueModal(true)}
                />
              )}
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

                  {issue.storyPoints && issue.storyPoints > 0 && (
                    <div>
                      <span className="text-xs text-gray-600 block mb-1">Story Points</span>
                      <span className="text-sm text-gray-900 dark:text-gray-100">{issue.storyPoints}</span>
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
                    <span className="text-xs text-gray-600 block mb-1">Due Date</span>
                    <span className="text-sm text-gray-900 dark:text-gray-100">
                      {issue.dueDate ? formatDateTime(issue.dueDate) : 'No due date set'}
                    </span>
                  </div>

                  <div>
                    <span className="text-xs text-gray-600 block mb-1">Created</span>
                    <span className="text-sm text-gray-900 dark:text-gray-100">{formatDateTime(issue.createdAt)}</span>
                  </div>

                  <div>
                    <span className="text-xs text-gray-600 block mb-1">Updated</span>
                    <span className="text-sm text-gray-900 dark:text-gray-100">{getRelativeTime(issue.updatedAt)}</span>
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
                      <span className="text-gray-900">
                        {Math.max((issue.timeTracking.estimatedHours || 0) - issue.timeTracking.loggedHours, 0)}h
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                      <div
                        className="bg-primary h-2 rounded-full"
                        style={{
                          width: `${Math.min(
                            issue.timeTracking.estimatedHours
                              ? (issue.timeTracking.loggedHours / issue.timeTracking.estimatedHours) * 100
                              : 0,
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

      {/* Sub-issue Modal */}
      <SubIssueModal
        isOpen={showSubIssueModal}
        onClose={() => setShowSubIssueModal(false)}
        parentIssueId={issue._id}
        parentIssueKey={issue.key}
        projectId={typeof issue.projectId === 'object' ? issue.projectId._id : issue.projectId}
        onSuccess={() => {
          // Force re-render of SubIssues component by refreshing the page data
          fetchIssueData();
        }}
      />

      {/* Edit Issue Modal */}
      <EditIssueModal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        issue={issue}
        onSuccess={() => {
          // Refresh issue data after successful edit
          fetchIssueData();
        }}
      />
    </DashboardLayout>
  );
}
