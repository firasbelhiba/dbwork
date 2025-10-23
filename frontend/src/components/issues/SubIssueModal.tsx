'use client';

import React, { useState } from 'react';
import { Modal } from '@/components/common/Modal';
import { Input, Textarea, Select, Button } from '@/components/common';
import { issuesAPI } from '@/lib/api';
import { IssueType, IssuePriority } from '@/types/issue';
import toast from 'react-hot-toast';

interface SubIssueModalProps {
  isOpen: boolean;
  onClose: () => void;
  parentIssueId: string;
  parentIssueKey: string;
  projectId: string;
  onSuccess: () => void;
}

export const SubIssueModal: React.FC<SubIssueModalProps> = ({
  isOpen,
  onClose,
  parentIssueId,
  parentIssueKey,
  projectId,
  onSuccess,
}) => {
  const [creating, setCreating] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    type: IssueType.TASK,
    priority: IssuePriority.MEDIUM,
  });

  const handleCreate = async () => {
    if (!formData.title.trim()) {
      toast.error('Title is required');
      return;
    }

    try {
      setCreating(true);
      await issuesAPI.create({
        ...formData,
        projectId,
        parentIssue: parentIssueId,
      });
      toast.success('Sub-issue created successfully');
      setFormData({
        title: '',
        description: '',
        type: IssueType.TASK,
        priority: IssuePriority.MEDIUM,
      });
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Error creating sub-issue:', error);
      const errorMessage = error.response?.data?.message || 'Failed to create sub-issue';
      toast.error(errorMessage);
    } finally {
      setCreating(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Create Sub-issue for ${parentIssueKey}`}
      size="lg"
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={creating}>
            Cancel
          </Button>
          <Button onClick={handleCreate} loading={creating} disabled={creating}>
            Create Sub-issue
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
          <div className="flex items-start gap-2">
            <svg className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-sm text-blue-800 dark:text-blue-300">
              This sub-issue will be created under <strong>{parentIssueKey}</strong> and will help break down the parent task into smaller, manageable pieces.
            </p>
          </div>
        </div>

        <div>
          <label htmlFor="title" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Title <span className="text-danger-500">*</span>
          </label>
          <Input
            id="title"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            placeholder="Enter sub-issue title"
            disabled={creating}
          />
        </div>

        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Description
          </label>
          <Textarea
            id="description"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Describe what needs to be done"
            rows={4}
            disabled={creating}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="type" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Type
            </label>
            <Select
              id="type"
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value as IssueType })}
              disabled={creating}
            >
              <option value={IssueType.TASK}>Task</option>
              <option value={IssueType.BUG}>Bug</option>
              <option value={IssueType.STORY}>Story</option>
            </Select>
          </div>

          <div>
            <label htmlFor="priority" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Priority
            </label>
            <Select
              id="priority"
              value={formData.priority}
              onChange={(e) => setFormData({ ...formData, priority: e.target.value as IssuePriority })}
              disabled={creating}
            >
              <option value={IssuePriority.LOW}>Low</option>
              <option value={IssuePriority.MEDIUM}>Medium</option>
              <option value={IssuePriority.HIGH}>High</option>
              <option value={IssuePriority.CRITICAL}>Critical</option>
            </Select>
          </div>
        </div>
      </div>
    </Modal>
  );
};
