'use client';

import React, { useState, useEffect } from 'react';
import { Modal } from '@/components/common/Modal';
import { Input, Textarea, Select, Button } from '@/components/common';
import { MultiUserSelect } from '@/components/common/MultiUserSelect';
import { issuesAPI, usersAPI, sprintsAPI } from '@/lib/api';
import { Issue, IssueType, IssuePriority } from '@/types/issue';
import { User } from '@/types/user';
import { Sprint } from '@/types/sprint';
import toast from 'react-hot-toast';

interface SubIssueModalProps {
  isOpen: boolean;
  onClose: () => void;
  parentIssue: Issue;
  projectId: string;
  onSuccess: () => void;
}

export const SubIssueModal: React.FC<SubIssueModalProps> = ({
  isOpen,
  onClose,
  parentIssue,
  projectId,
  onSuccess,
}) => {
  const [creating, setCreating] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    type: IssueType.TASK,
    priority: IssuePriority.MEDIUM,
    assignees: [] as string[],
    sprintId: '',
    dueDate: '',
    labels: '',
  });

  // Fetch users and sprints when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchData();
      // Pre-populate fields from parent issue
      initializeFromParent();
    }
  }, [isOpen, parentIssue]);

  const initializeFromParent = () => {
    // Extract assignee IDs from parent issue
    const parentAssigneeIds = parentIssue.assignees?.map(a =>
      typeof a === 'string' ? a : a._id
    ) || [];

    // Extract sprint ID from parent issue
    const parentSprintId = parentIssue.sprintId
      ? (typeof parentIssue.sprintId === 'string' ? parentIssue.sprintId : parentIssue.sprintId._id)
      : '';

    // Format due date if exists
    const parentDueDate = parentIssue.dueDate
      ? new Date(parentIssue.dueDate).toISOString().split('T')[0]
      : '';

    // Extract labels from parent issue
    const parentLabels = parentIssue.labels?.join(', ') || '';

    setFormData({
      title: '',
      description: '',
      type: IssueType.TASK,
      priority: parentIssue.priority || IssuePriority.MEDIUM,
      assignees: parentAssigneeIds,
      sprintId: parentSprintId,
      dueDate: parentDueDate,
      labels: parentLabels,
    });
  };

  const fetchData = async () => {
    setLoadingData(true);
    try {
      const [usersRes, sprintsRes] = await Promise.all([
        usersAPI.getAll({ limit: 100 }),
        sprintsAPI.getAll({ projectId }),
      ]);
      setUsers(usersRes.data.items || usersRes.data);
      setSprints(sprintsRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoadingData(false);
    }
  };

  const handleCreate = async () => {
    if (!formData.title.trim()) {
      toast.error('Title is required');
      return;
    }

    try {
      setCreating(true);

      const issueData: any = {
        projectId,
        parentIssue: parentIssue._id,
        title: formData.title.trim(),
        description: formData.description.trim(),
        type: formData.type,
        priority: formData.priority,
      };

      if (formData.assignees.length > 0) {
        issueData.assignees = formData.assignees;
      }
      if (formData.sprintId) {
        issueData.sprintId = formData.sprintId;
      }
      if (formData.dueDate) {
        issueData.dueDate = new Date(formData.dueDate);
      }
      if (formData.labels.trim()) {
        issueData.labels = formData.labels.split(',').map(l => l.trim()).filter(l => l);
      }

      await issuesAPI.create(issueData);
      toast.success('Sub-issue created successfully');

      // Reset form
      setFormData({
        title: '',
        description: '',
        type: IssueType.TASK,
        priority: IssuePriority.MEDIUM,
        assignees: [],
        sprintId: '',
        dueDate: '',
        labels: '',
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

  const handleClose = () => {
    // Reset form on close
    setFormData({
      title: '',
      description: '',
      type: IssueType.TASK,
      priority: IssuePriority.MEDIUM,
      assignees: [],
      sprintId: '',
      dueDate: '',
      labels: '',
    });
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={`Create Sub-issue for ${parentIssue.key}`}
      size="lg"
      footer={
        <>
          <Button variant="outline" onClick={handleClose} disabled={creating}>
            Cancel
          </Button>
          <Button onClick={handleCreate} loading={creating} disabled={creating || loadingData}>
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
              This sub-issue will be created under <strong>{parentIssue.key}</strong>. Fields are pre-filled from the parent issue but can be changed.
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
            rows={3}
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

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Assignees
            </label>
            <MultiUserSelect
              users={users}
              selectedUserIds={formData.assignees}
              onChange={(userIds) => setFormData({ ...formData, assignees: userIds })}
              placeholder="Select assignees..."
              disabled={creating || loadingData}
            />
          </div>

          <div>
            <label htmlFor="sprint" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Sprint
            </label>
            <Select
              id="sprint"
              value={formData.sprintId}
              onChange={(e) => setFormData({ ...formData, sprintId: e.target.value })}
              disabled={creating || loadingData}
            >
              <option value="">No sprint</option>
              {sprints.map(sprint => (
                <option key={sprint._id} value={sprint._id}>
                  {sprint.name}
                </option>
              ))}
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="dueDate" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Due Date
            </label>
            <Input
              id="dueDate"
              type="date"
              value={formData.dueDate}
              onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
              disabled={creating}
            />
          </div>

          <div>
            <label htmlFor="labels" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Labels
            </label>
            <Input
              id="labels"
              value={formData.labels}
              onChange={(e) => setFormData({ ...formData, labels: e.target.value })}
              placeholder="e.g., frontend, urgent"
              disabled={creating}
            />
          </div>
        </div>
      </div>
    </Modal>
  );
};
