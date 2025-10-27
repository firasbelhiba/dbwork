'use client';

import React, { useState, useEffect } from 'react';
import { Modal, Button, Input, Select, Textarea } from '@/components/common';
import { issuesAPI, projectsAPI, usersAPI, sprintsAPI } from '@/lib/api';
import { Issue } from '@/types/issue';
import { User } from '@/types/user';
import { Sprint } from '@/types/sprint';
import toast from 'react-hot-toast';

interface EditIssueModalProps {
  isOpen: boolean;
  onClose: () => void;
  issue: Issue;
  onSuccess: () => void;
}

export const EditIssueModal: React.FC<EditIssueModalProps> = ({
  isOpen,
  onClose,
  issue,
  onSuccess,
}) => {
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [sprints, setSprints] = useState<Sprint[]>([]);

  // Get initial values from issue
  const getInitialFormData = () => {
    const assigneeId = issue.assignee && typeof issue.assignee === 'object' ? issue.assignee._id : issue.assignee || '';
    const sprintId = issue.sprintId && typeof issue.sprintId === 'object' ? issue.sprintId._id : issue.sprintId || '';
    const projectId = typeof issue.projectId === 'object' ? issue.projectId._id : issue.projectId;

    return {
      projectId,
      title: issue.title || '',
      description: issue.description || '',
      type: issue.type || 'task',
      priority: issue.priority || 'medium',
      status: issue.status || 'todo',
      assignee: assigneeId,
      sprintId: sprintId,
      storyPoints: issue.storyPoints || 0,
      dueDate: issue.dueDate ? new Date(issue.dueDate).toISOString().split('T')[0] : '',
      labels: issue.labels?.join(', ') || '',
    };
  };

  const [formData, setFormData] = useState(getInitialFormData());

  useEffect(() => {
    if (isOpen) {
      setFormData(getInitialFormData());
      fetchData();
    }
  }, [isOpen, issue]);

  useEffect(() => {
    if (formData.projectId) {
      fetchSprints(formData.projectId);
    }
  }, [formData.projectId]);

  const fetchData = async () => {
    try {
      const usersRes = await usersAPI.getAll();
      setUsers(usersRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  const fetchSprints = async (projectId: string) => {
    try {
      const response = await sprintsAPI.getAll({ projectId });
      setSprints(response.data);
    } catch (error) {
      console.error('Error fetching sprints:', error);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title.trim()) {
      toast.error('Please enter a title');
      return;
    }

    setLoading(true);

    try {
      // Prepare update data
      const updateData: any = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        type: formData.type,
        priority: formData.priority,
        status: formData.status,
      };

      if (formData.assignee) {
        updateData.assignee = formData.assignee;
      } else {
        updateData.assignee = null;
      }

      if (formData.sprintId) {
        updateData.sprintId = formData.sprintId;
      } else {
        updateData.sprintId = null;
      }

      if (formData.storyPoints > 0) {
        updateData.storyPoints = Number(formData.storyPoints);
      }

      if (formData.dueDate) {
        updateData.dueDate = new Date(formData.dueDate);
      } else {
        updateData.dueDate = null;
      }

      if (formData.labels.trim()) {
        updateData.labels = formData.labels.split(',').map(l => l.trim()).filter(l => l);
      } else {
        updateData.labels = [];
      }

      await issuesAPI.update(issue._id, updateData);
      toast.success('Issue updated successfully!');
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Error updating issue:', err);
      const errorMessage = err.response?.data?.message || 'Failed to update issue. Please try again.';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Edit Issue"
      size="lg"
    >
      <form onSubmit={handleSubmit}>
        <div className="space-y-6">
          {/* Title (Required) */}
          <Input
            label="Title"
            name="title"
            value={formData.title}
            onChange={handleChange}
            placeholder="Enter issue title"
            required
          />

          {/* Description */}
          <Textarea
            label="Description"
            name="description"
            value={formData.description}
            onChange={handleChange}
            placeholder="Describe the issue in detail..."
            rows={6}
          />

          {/* Type, Priority, and Status */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-1.5">
                Type
              </label>
              <Select
                name="type"
                value={formData.type}
                onChange={handleChange}
              >
                <option value="task">Task</option>
                <option value="bug">Bug</option>
                <option value="story">Story</option>
                <option value="epic">Epic</option>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-1.5">
                Priority
              </label>
              <Select
                name="priority"
                value={formData.priority}
                onChange={handleChange}
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-1.5">
                Status
              </label>
              <Select
                name="status"
                value={formData.status}
                onChange={handleChange}
              >
                <option value="todo">To Do</option>
                <option value="in_progress">In Progress</option>
                <option value="in_review">In Review</option>
                <option value="done">Done</option>
              </Select>
            </div>
          </div>

          {/* Assignee and Sprint */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-1.5">
                Assignee
              </label>
              <Select
                name="assignee"
                value={formData.assignee}
                onChange={handleChange}
              >
                <option value="">Unassigned</option>
                {users.map(u => (
                  <option key={u._id} value={u._id}>
                    {u.firstName} {u.lastName}
                  </option>
                ))}
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-1.5">
                Sprint
              </label>
              <Select
                name="sprintId"
                value={formData.sprintId}
                onChange={handleChange}
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

          {/* Story Points and Due Date */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Story Points"
              name="storyPoints"
              type="number"
              value={formData.storyPoints}
              onChange={handleChange}
              placeholder="0"
              min="0"
            />

            <Input
              label="Due Date"
              name="dueDate"
              type="date"
              value={formData.dueDate}
              onChange={handleChange}
            />
          </div>

          {/* Labels */}
          <Input
            label="Labels"
            name="labels"
            value={formData.labels}
            onChange={handleChange}
            placeholder="Enter labels separated by commas"
            helperText="e.g., frontend, urgent, feature"
          />
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 mt-6 pt-6 border-t border-gray-200 dark:border-dark-300">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            loading={loading}
            disabled={loading}
          >
            Update Issue
          </Button>
        </div>
      </form>
    </Modal>
  );
};
