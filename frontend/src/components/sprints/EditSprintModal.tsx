'use client';

import React, { useState, useEffect } from 'react';
import { Modal } from '@/components/common/Modal';
import { Button } from '@/components/common/Button';
import { sprintsAPI } from '@/lib/api';
import { Sprint } from '@/types/sprint';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

interface EditSprintModalProps {
  isOpen: boolean;
  onClose: () => void;
  sprint: Sprint | null;
  onSprintUpdated: () => void;
}

export const EditSprintModal: React.FC<EditSprintModalProps> = ({
  isOpen,
  onClose,
  sprint,
  onSprintUpdated,
}) => {
  const [formData, setFormData] = useState({
    name: '',
    goal: '',
    startDate: '',
    endDate: '',
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Populate form when sprint changes
  useEffect(() => {
    if (sprint) {
      setFormData({
        name: sprint.name || '',
        goal: sprint.goal || '',
        startDate: format(new Date(sprint.startDate), 'yyyy-MM-dd'),
        endDate: format(new Date(sprint.endDate), 'yyyy-MM-dd'),
      });
    }
  }, [sprint]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Sprint name is required';
    }

    if (!formData.startDate) {
      newErrors.startDate = 'Start date is required';
    }

    if (!formData.endDate) {
      newErrors.endDate = 'End date is required';
    }

    if (formData.startDate && formData.endDate) {
      const start = new Date(formData.startDate);
      const end = new Date(formData.endDate);
      if (end <= start) {
        newErrors.endDate = 'End date must be after start date';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!sprint || !validate()) {
      return;
    }

    setLoading(true);
    try {
      await sprintsAPI.update(sprint._id, {
        name: formData.name.trim(),
        goal: formData.goal.trim(),
        startDate: new Date(formData.startDate),
        endDate: new Date(formData.endDate),
      });

      toast.success('Sprint updated successfully');
      await onSprintUpdated();
      handleClose();
    } catch (error: any) {
      console.error('Error updating sprint:', error);
      toast.error(error?.response?.data?.message || 'Failed to update sprint');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setErrors({});
    onClose();
  };

  if (!sprint) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Edit Sprint"
      size="md"
      footer={
        <>
          <Button variant="outline" onClick={handleClose} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? 'Saving...' : 'Save Changes'}
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Sprint Name */}
        <div>
          <label htmlFor="edit-name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Sprint Name <span className="text-danger">*</span>
          </label>
          <input
            type="text"
            id="edit-name"
            name="name"
            value={formData.name}
            onChange={handleChange}
            placeholder="e.g., Sprint 1, Q1 2024"
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary dark:bg-gray-800 dark:text-white ${
              errors.name ? 'border-danger' : 'border-gray-300 dark:border-gray-600'
            }`}
          />
          {errors.name && <p className="mt-1 text-sm text-danger">{errors.name}</p>}
        </div>

        {/* Sprint Goal */}
        <div>
          <label htmlFor="edit-goal" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Sprint Goal
          </label>
          <textarea
            id="edit-goal"
            name="goal"
            value={formData.goal}
            onChange={handleChange}
            placeholder="What is the goal of this sprint?"
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary dark:bg-gray-800 dark:text-white"
          />
        </div>

        {/* Date Range */}
        <div className="grid grid-cols-2 gap-4">
          {/* Start Date */}
          <div>
            <label htmlFor="edit-startDate" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Start Date <span className="text-danger">*</span>
            </label>
            <input
              type="date"
              id="edit-startDate"
              name="startDate"
              value={formData.startDate}
              onChange={handleChange}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary dark:bg-gray-800 dark:text-white ${
                errors.startDate ? 'border-danger' : 'border-gray-300 dark:border-gray-600'
              }`}
            />
            {errors.startDate && <p className="mt-1 text-sm text-danger">{errors.startDate}</p>}
          </div>

          {/* End Date */}
          <div>
            <label htmlFor="edit-endDate" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              End Date <span className="text-danger">*</span>
            </label>
            <input
              type="date"
              id="edit-endDate"
              name="endDate"
              value={formData.endDate}
              onChange={handleChange}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary dark:bg-gray-800 dark:text-white ${
                errors.endDate ? 'border-danger' : 'border-gray-300 dark:border-gray-600'
              }`}
            />
            {errors.endDate && <p className="mt-1 text-sm text-danger">{errors.endDate}</p>}
          </div>
        </div>
      </form>
    </Modal>
  );
};
