'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { issuesAPI, commentsAPI } from '@/lib/api';
import { Issue } from '@/types/issue';
import { Comment, CommentImage } from '@/types/comment';
import { UserRole } from '@/types/user';
import { Button, Badge, Select, Breadcrumb, LogoLoader, EmojiReactionPicker } from '@/components/common';
import { MentionTextarea } from '@/components/common/MentionTextarea';
import { SubIssues, SubIssueModal, EditIssueModal, AttachmentSection, TimeTracker } from '@/components/issues';
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
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [archiving, setArchiving] = useState(false);
  const [unauthorized, setUnauthorized] = useState(false);
  const [commentImages, setCommentImages] = useState<CommentImage[]>([]);
  const [uploadingImage, setUploadingImage] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const [replyingTo, setReplyingTo] = useState<Comment | null>(null);
  const [replyContent, setReplyContent] = useState('');

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
        const assigneeIds = issueData.assignees?.map((a: any) =>
          typeof a === 'object' ? a._id : a
        ) || [];
        const isAssignee = assigneeIds.includes(user?._id);

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
    if (!newComment.trim() && commentImages.length === 0) return;

    setSubmitting(true);
    try {
      await commentsAPI.create(issueId, {
        content: newComment || ' ', // Backend requires content, use space if empty but has images
        images: commentImages.length > 0 ? commentImages : undefined
      });
      toast.success('Comment added successfully!');
      setNewComment('');
      setCommentImages([]);
      fetchIssueData();
    } catch (error) {
      console.error('Error adding comment:', error);
      toast.error('Failed to add comment');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyContent.trim() || !replyingTo) return;

    setSubmitting(true);
    try {
      await commentsAPI.create(issueId, {
        content: replyContent,
        parentCommentId: replyingTo._id,
      });
      toast.success('Reply added successfully!');
      setReplyContent('');
      setReplyingTo(null);
      fetchIssueData();
    } catch (error) {
      console.error('Error adding reply:', error);
      toast.error('Failed to add reply');
    } finally {
      setSubmitting(false);
    }
  };

  const cancelReply = () => {
    setReplyingTo(null);
    setReplyContent('');
  };

  const handleAddReaction = async (commentId: string, emoji: string) => {
    try {
      await commentsAPI.addReaction(commentId, emoji);
      // Update local state optimistically
      setComments((prevComments) =>
        prevComments.map((comment) =>
          comment._id === commentId
            ? {
                ...comment,
                reactions: [
                  ...comment.reactions,
                  { userId: user?._id || '', reaction: emoji },
                ],
              }
            : comment
        )
      );
    } catch (error) {
      console.error('Error adding reaction:', error);
      toast.error('Failed to add reaction');
    }
  };

  const handleRemoveReaction = async (commentId: string, emoji: string) => {
    try {
      await commentsAPI.removeReaction(commentId, emoji);
      // Update local state optimistically
      setComments((prevComments) =>
        prevComments.map((comment) =>
          comment._id === commentId
            ? {
                ...comment,
                reactions: comment.reactions.filter(
                  (r) => {
                    const reactionUserId = typeof r.userId === 'object' ? r.userId._id : r.userId;
                    return !(reactionUserId === user?._id && r.reaction === emoji);
                  }
                ),
              }
            : comment
        )
      );
    } catch (error) {
      console.error('Error removing reaction:', error);
      toast.error('Failed to remove reaction');
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Please upload an image file (JPEG, PNG, GIF, or WebP)');
      return;
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size must be less than 5MB');
      return;
    }

    setUploadingImage(true);
    try {
      const response = await commentsAPI.uploadImage(file);
      setCommentImages([...commentImages, response.data]);
      toast.success('Image uploaded successfully');
    } catch (error: any) {
      console.error('Error uploading image:', error);
      toast.error(error.response?.data?.message || 'Failed to upload image');
    } finally {
      setUploadingImage(false);
      // Reset the input
      if (imageInputRef.current) {
        imageInputRef.current.value = '';
      }
    }
  };

  const handlePasteImage = async (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        e.preventDefault();
        const file = items[i].getAsFile();
        if (file) {
          // Validate file size (5MB max)
          if (file.size > 5 * 1024 * 1024) {
            toast.error('Image size must be less than 5MB');
            return;
          }

          setUploadingImage(true);
          try {
            const response = await commentsAPI.uploadImage(file);
            setCommentImages([...commentImages, response.data]);
            toast.success('Image pasted successfully');
          } catch (error: any) {
            console.error('Error uploading pasted image:', error);
            toast.error(error.response?.data?.message || 'Failed to upload image');
          } finally {
            setUploadingImage(false);
          }
        }
        break;
      }
    }
  };

  const removeCommentImage = (index: number) => {
    setCommentImages(commentImages.filter((_, i) => i !== index));
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

  const handleDeleteIssue = async () => {
    if (!issue) return;

    setDeleting(true);
    try {
      await issuesAPI.delete(issueId);
      toast.success('Issue deleted successfully!');
      // Redirect to project page or issues list
      const projectId = typeof issue.projectId === 'object' ? issue.projectId._id : issue.projectId;
      router.push(`/projects/${projectId}`);
    } catch (error: any) {
      console.error('Error deleting issue:', error);
      const errorMessage = error.response?.data?.message || 'Failed to delete issue';
      toast.error(errorMessage);
      setDeleting(false);
      setShowDeleteModal(false);
    }
  };

  const handleArchiveIssue = async () => {
    if (!issue) return;

    setArchiving(true);
    try {
      const response = await issuesAPI.archive(issueId);
      setIssue(response.data);
      toast.success('Issue archived successfully!');
    } catch (error: any) {
      console.error('Error archiving issue:', error);
      toast.error(error?.response?.data?.message || 'Failed to archive issue');
    } finally {
      setArchiving(false);
    }
  };

  const handleRestoreIssue = async () => {
    if (!issue) return;

    setArchiving(true);
    try {
      const response = await issuesAPI.restore(issueId);
      setIssue(response.data);
      toast.success('Issue restored successfully!');
    } catch (error: any) {
      console.error('Error restoring issue:', error);
      toast.error(error?.response?.data?.message || 'Failed to restore issue');
    } finally {
      setArchiving(false);
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

  const assignees = issue.assignees
    ?.filter(a => typeof a === 'object')
    .map(a => a as any) || [];
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
                  label: issue.key,
                },
              ]}
              className="mb-4"
            />
            <div className="mb-4">
              <div className="flex items-start gap-3 mb-3">
                <Badge variant={issue.type as any}>{issue.type}</Badge>
                {issue.isArchived && (
                  <Badge variant="default" className="bg-gray-500 text-white">ARCHIVED</Badge>
                )}
                <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 flex-1">{issue.title}</h1>
                <div className="flex items-center gap-2">
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
                {(user?.role === UserRole.ADMIN || user?.role === UserRole.PROJECT_MANAGER) && (
                  <>
                    {issue.isArchived ? (
                      <Button
                        variant="outline"
                        onClick={handleRestoreIssue}
                        disabled={archiving}
                        className="flex items-center gap-2"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        {archiving ? 'Restoring...' : 'Restore'}
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        onClick={handleArchiveIssue}
                        disabled={archiving}
                        className="flex items-center gap-2"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                        </svg>
                        {archiving ? 'Archiving...' : 'Archive'}
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      onClick={() => setShowDeleteModal(true)}
                      className="flex items-center gap-2 text-danger-600 hover:text-danger-700 hover:border-danger-600 dark:text-danger-400 dark:hover:text-danger-300 dark:hover:border-danger-400"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                      Delete
                    </Button>
                  </>
                )}
              </div>
              </div>

              {/* Sub-issue Progress Bar - Only show for parent issues */}
              {!issue.parentIssue && issue.subIssueCount && issue.subIssueCount > 0 && (
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                  <div className="flex items-center justify-between text-sm mb-2">
                    <div className="flex items-center gap-2">
                      <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                      </svg>
                      <span className="text-blue-800 dark:text-blue-300 font-medium">
                        Sub-issues Progress: {issue.completedSubIssues || 0}/{issue.subIssueCount} completed
                      </span>
                    </div>
                    <span className="font-semibold text-blue-900 dark:text-blue-200">{issue.subIssueProgress || 0}%</span>
                  </div>
                  <div className="w-full bg-blue-200 dark:bg-blue-900/40 rounded-full h-3">
                    <div
                      className={`h-3 rounded-full transition-all duration-300 ${
                        (issue.subIssueProgress || 0) === 100 ? 'bg-green-500' :
                        (issue.subIssueProgress || 0) >= 50 ? 'bg-blue-500' : 'bg-yellow-500'
                      }`}
                      style={{ width: `${issue.subIssueProgress || 0}%` }}
                    ></div>
                  </div>
                </div>
              )}
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
              <div className="bg-white dark:bg-dark-600 rounded-lg border border-gray-200 dark:border-dark-400 p-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Description</h2>
                <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{issue.description || 'No description provided.'}</p>
              </div>

              {/* Comments */}
              <div className="bg-white dark:bg-dark-600 rounded-lg border border-gray-200 dark:border-dark-400 p-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Comments ({comments.length})
                </h2>

                {/* Add Comment */}
                <form onSubmit={handleAddComment} className="mb-6">
                  <div className="flex gap-3">
                    {user?.avatar ? (
                      <img
                        src={user.avatar}
                        alt={`${user.firstName} ${user.lastName}`}
                        className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center text-sm font-medium flex-shrink-0">
                        {user && getInitials(user.firstName, user.lastName)}
                      </div>
                    )}
                    <div className="flex-1">
                      <div onPaste={handlePasteImage}>
                        <MentionTextarea
                          value={newComment}
                          onChange={setNewComment}
                          placeholder="Add a comment... Use @ to mention someone, paste or upload images"
                          rows={3}
                        />
                      </div>

                      {/* Image Preview */}
                      {commentImages.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-2">
                          {commentImages.map((image, index) => (
                            <div key={index} className="relative group">
                              <img
                                src={image.url}
                                alt={image.fileName || 'Uploaded image'}
                                className="w-20 h-20 object-cover rounded-lg border border-gray-200 dark:border-dark-400"
                              />
                              <button
                                type="button"
                                onClick={() => removeCommentImage(index)}
                                className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              </button>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Upload indicator */}
                      {uploadingImage && (
                        <div className="flex items-center gap-2 mt-2 text-sm text-gray-500 dark:text-gray-400">
                          <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                          </svg>
                          Uploading image...
                        </div>
                      )}

                      <div className="flex items-center justify-between mt-2">
                        <div className="flex items-center gap-2">
                          <input
                            type="file"
                            ref={imageInputRef}
                            onChange={handleImageUpload}
                            accept="image/jpeg,image/png,image/gif,image/webp"
                            className="hidden"
                            disabled={uploadingImage}
                          />
                          <button
                            type="button"
                            onClick={() => imageInputRef.current?.click()}
                            disabled={uploadingImage}
                            className="flex items-center gap-1 px-2 py-1 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-dark-500 rounded transition-colors disabled:opacity-50"
                            title="Upload image"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            <span>Add image</span>
                          </button>
                          <span className="text-xs text-gray-400">or paste from clipboard</span>
                        </div>
                        <Button type="submit" loading={submitting} disabled={!newComment.trim() && commentImages.length === 0}>
                          Add Comment
                        </Button>
                      </div>
                    </div>
                  </div>
                </form>

                {/* Comments List */}
                <div className="space-y-4">
                  {comments.length === 0 ? (
                    <p className="text-gray-500 dark:text-gray-400 text-center py-8">No comments yet</p>
                  ) : (
                    comments
                      .filter((comment) => !comment.parentCommentId) // Only show root comments
                      .map((comment) => {
                        const commentUser = typeof comment.userId === 'object' ? comment.userId : null;
                        // Get replies for this comment
                        const replies = comments.filter(
                          (c) => c.parentCommentId && (typeof c.parentCommentId === 'string' ? c.parentCommentId : c.parentCommentId._id) === comment._id
                        );
                        return (
                          <div key={comment._id} className="flex gap-3">
                            {commentUser?.avatar ? (
                              <img
                                src={commentUser.avatar}
                                alt={`${commentUser.firstName} ${commentUser.lastName}`}
                                className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                              />
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center text-sm font-medium flex-shrink-0">
                                {commentUser && getInitials(commentUser.firstName, commentUser.lastName)}
                              </div>
                            )}
                            <div className="flex-1">
                              <div className="bg-gray-50 dark:bg-dark-500 rounded-lg p-4">
                                <div className="flex items-center justify-between mb-2">
                                  <span className="font-medium text-gray-900 dark:text-white">
                                    {commentUser ? `${commentUser.firstName} ${commentUser.lastName}` : 'User'}
                                  </span>
                                  <span className="text-xs text-gray-500 dark:text-gray-400">
                                    {getRelativeTime(comment.createdAt)}
                                  </span>
                                </div>
                                <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{comment.content}</p>
                                {/* Comment Images */}
                                {comment.images && comment.images.length > 0 && (
                                  <div className="flex flex-wrap gap-2 mt-3">
                                    {comment.images.map((image, imgIndex) => (
                                      <a
                                        key={imgIndex}
                                        href={image.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="block"
                                      >
                                        <img
                                          src={image.url}
                                          alt={image.fileName || 'Comment image'}
                                          className="max-w-xs max-h-48 object-contain rounded-lg border border-gray-200 dark:border-dark-400 hover:opacity-90 transition-opacity"
                                        />
                                      </a>
                                    ))}
                                  </div>
                                )}
                                {comment.isEdited && (
                                  <span className="text-xs text-gray-500 dark:text-gray-400 mt-2 block">(edited)</span>
                                )}
                              </div>
                              {/* Actions: Reactions and Reply */}
                              <div className="flex items-center gap-3 mt-2">
                                {/* Emoji Reactions */}
                                <EmojiReactionPicker
                                  reactions={comment.reactions || []}
                                  currentUserId={user?._id}
                                  onAddReaction={(emoji) => handleAddReaction(comment._id, emoji)}
                                  onRemoveReaction={(emoji) => handleRemoveReaction(comment._id, emoji)}
                                />
                                {/* Reply Button */}
                                <button
                                  type="button"
                                  onClick={() => setReplyingTo(comment)}
                                  className="text-sm text-gray-500 dark:text-gray-400 hover:text-primary dark:hover:text-primary-400 flex items-center gap-1"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                                  </svg>
                                  Reply
                                </button>
                              </div>

                              {/* Reply Form */}
                              {replyingTo?._id === comment._id && (
                                <form onSubmit={handleReply} className="mt-3 pl-4 border-l-2 border-gray-200 dark:border-dark-400">
                                  <div className="flex gap-2">
                                    {user?.avatar ? (
                                      <img
                                        src={user.avatar}
                                        alt={`${user.firstName} ${user.lastName}`}
                                        className="w-6 h-6 rounded-full object-cover flex-shrink-0"
                                      />
                                    ) : (
                                      <div className="w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center text-xs font-medium flex-shrink-0">
                                        {user && getInitials(user.firstName, user.lastName)}
                                      </div>
                                    )}
                                    <div className="flex-1">
                                      <MentionTextarea
                                        value={replyContent}
                                        onChange={setReplyContent}
                                        placeholder={`Reply to ${commentUser?.firstName || 'User'}...`}
                                        rows={2}
                                      />
                                      <div className="flex items-center justify-end gap-2 mt-2">
                                        <button
                                          type="button"
                                          onClick={cancelReply}
                                          className="px-3 py-1 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
                                        >
                                          Cancel
                                        </button>
                                        <Button type="submit" size="sm" loading={submitting} disabled={!replyContent.trim()}>
                                          Reply
                                        </Button>
                                      </div>
                                    </div>
                                  </div>
                                </form>
                              )}

                              {/* Replies */}
                              {replies.length > 0 && (
                                <div className="mt-3 pl-4 border-l-2 border-gray-200 dark:border-dark-400 space-y-3">
                                  {replies.map((reply) => {
                                    const replyUser = typeof reply.userId === 'object' ? reply.userId : null;
                                    return (
                                      <div key={reply._id} className="flex gap-2">
                                        {replyUser?.avatar ? (
                                          <img
                                            src={replyUser.avatar}
                                            alt={`${replyUser.firstName} ${replyUser.lastName}`}
                                            className="w-6 h-6 rounded-full object-cover flex-shrink-0"
                                          />
                                        ) : (
                                          <div className="w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center text-xs font-medium flex-shrink-0">
                                            {replyUser && getInitials(replyUser.firstName, replyUser.lastName)}
                                          </div>
                                        )}
                                        <div className="flex-1">
                                          <div className="bg-gray-100 dark:bg-dark-400 rounded-lg p-3">
                                            <div className="flex items-center justify-between mb-1">
                                              <span className="font-medium text-sm text-gray-900 dark:text-white">
                                                {replyUser ? `${replyUser.firstName} ${replyUser.lastName}` : 'User'}
                                              </span>
                                              <span className="text-xs text-gray-500 dark:text-gray-400">
                                                {getRelativeTime(reply.createdAt)}
                                              </span>
                                            </div>
                                            <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{reply.content}</p>
                                            {reply.isEdited && (
                                              <span className="text-xs text-gray-500 dark:text-gray-400 mt-1 block">(edited)</span>
                                            )}
                                          </div>
                                          {/* Reply Reactions */}
                                          <div className="mt-1.5">
                                            <EmojiReactionPicker
                                              reactions={reply.reactions || []}
                                              currentUserId={user?._id}
                                              onAddReaction={(emoji) => handleAddReaction(reply._id, emoji)}
                                              onRemoveReaction={(emoji) => handleRemoveReaction(reply._id, emoji)}
                                            />
                                          </div>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })
                  )}
                </div>
              </div>

              {/* Attachments Section */}
              <AttachmentSection issueId={issue._id} />

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
              <div className="bg-white dark:bg-dark-600 rounded-lg border border-gray-200 dark:border-dark-400 p-4">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Status</h3>
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
              <div className="bg-white dark:bg-dark-600 rounded-lg border border-gray-200 dark:border-dark-400 p-4">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Details</h3>
                <div className="space-y-3">
                  <div>
                    <span className="text-xs text-gray-600 dark:text-gray-400 block mb-1">Assignees</span>
                    {assignees.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {assignees.map((assignee: any) => (
                          <div key={assignee._id} className="flex items-center gap-2 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded-md">
                            {assignee.avatar ? (
                              <img
                                src={assignee.avatar}
                                alt={`${assignee.firstName} ${assignee.lastName}`}
                                className="w-5 h-5 rounded-full object-cover"
                              />
                            ) : (
                              <div className="w-5 h-5 rounded-full bg-primary text-white flex items-center justify-center text-xs font-medium">
                                {getInitials(assignee.firstName, assignee.lastName)}
                              </div>
                            )}
                            <span className="text-xs text-gray-900 dark:text-white">
                              {assignee.firstName} {assignee.lastName}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <span className="text-sm text-gray-500 dark:text-gray-400">Unassigned</span>
                    )}
                  </div>

                  <div>
                    <span className="text-xs text-gray-600 dark:text-gray-400 block mb-1">Reporter</span>
                    {reporter && (
                      <div className="flex items-center gap-2">
                        {reporter.avatar ? (
                          <img
                            src={reporter.avatar}
                            alt={`${reporter.firstName} ${reporter.lastName}`}
                            className="w-6 h-6 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-6 h-6 rounded-full bg-secondary text-white flex items-center justify-center text-xs font-medium">
                            {getInitials(reporter.firstName, reporter.lastName)}
                          </div>
                        )}
                        <span className="text-sm text-gray-900 dark:text-white">
                          {reporter.firstName} {reporter.lastName}
                        </span>
                      </div>
                    )}
                  </div>

                  <div>
                    <span className="text-xs text-gray-600 dark:text-gray-400 block mb-1">Priority</span>
                    <Badge variant={issue.priority as any}>{issue.priority}</Badge>
                  </div>

                  <div>
                    <span className="text-xs text-gray-600 dark:text-gray-400 block mb-1">Category</span>
                    <span className="text-sm text-gray-900 dark:text-white">
                      {issue.category || 'Not categorized'}
                    </span>
                  </div>

                  {issue.storyPoints && issue.storyPoints > 0 && (
                    <div>
                      <span className="text-xs text-gray-600 dark:text-gray-400 block mb-1">Story Points</span>
                      <span className="text-sm text-gray-900 dark:text-white">{issue.storyPoints}</span>
                    </div>
                  )}

                  {issue.labels && issue.labels.length > 0 && (
                    <div>
                      <span className="text-xs text-gray-600 dark:text-gray-400 block mb-1">Labels</span>
                      <div className="flex flex-wrap gap-1">
                        {issue.labels.map((label, index) => (
                          <Badge key={index} variant="default">{label}</Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  <div>
                    <span className="text-xs text-gray-600 dark:text-gray-400 block mb-1">Start Date</span>
                    <span className="text-sm text-gray-900 dark:text-white">
                      {issue.startDate ? formatDateTime(issue.startDate) : 'No start date set'}
                    </span>
                  </div>

                  <div>
                    <span className="text-xs text-gray-600 dark:text-gray-400 block mb-1">Due Date</span>
                    <span className="text-sm text-gray-900 dark:text-white">
                      {issue.dueDate ? formatDateTime(issue.dueDate) : 'No due date set'}
                    </span>
                  </div>

                  <div>
                    <span className="text-xs text-gray-600 dark:text-gray-400 block mb-1">Created</span>
                    <span className="text-sm text-gray-900 dark:text-white">{formatDateTime(issue.createdAt)}</span>
                  </div>

                  <div>
                    <span className="text-xs text-gray-600 dark:text-gray-400 block mb-1">Updated</span>
                    <span className="text-sm text-gray-900 dark:text-white">{getRelativeTime(issue.updatedAt)}</span>
                  </div>
                </div>
              </div>

              {/* Time Tracking */}
              <TimeTracker
                issueId={issue._id}
                timeTracking={issue.timeTracking}
                onUpdate={fetchIssueData}
                hasSubIssues={!issue.parentIssue && (issue.subIssueCount || 0) > 0}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Sub-issue Modal */}
      <SubIssueModal
        isOpen={showSubIssueModal}
        onClose={() => setShowSubIssueModal(false)}
        parentIssue={issue}
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

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center p-4">
            {/* Backdrop */}
            <div
              className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
              onClick={() => !deleting && setShowDeleteModal(false)}
            />

            {/* Modal */}
            <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6">
              {/* Icon */}
              <div className="flex items-center justify-center w-12 h-12 mx-auto mb-4 bg-danger-100 dark:bg-danger-900/30 rounded-full">
                <svg className="w-6 h-6 text-danger-600 dark:text-danger-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>

              {/* Title */}
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 text-center mb-2">
                Delete Issue
              </h3>

              {/* Description */}
              <p className="text-sm text-gray-600 dark:text-gray-400 text-center mb-6">
                Are you sure you want to delete <span className="font-semibold text-gray-900 dark:text-gray-100">{issue?.key}</span>?
                <br />
                This action cannot be undone.
              </p>

              {/* Actions */}
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => setShowDeleteModal(false)}
                  disabled={deleting}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleDeleteIssue}
                  disabled={deleting}
                  className="flex-1 bg-danger-600 hover:bg-danger-700 text-white"
                >
                  {deleting ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Deleting...
                    </>
                  ) : (
                    'Delete Issue'
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
