'use client';

import React, { useState, useEffect } from 'react';
import { Button, Input, Select } from '@/components/common';
import { affectationsAPI, projectsAPI, usersAPI } from '@/lib/api';
import { Affectation, AFFECTATION_ROLES, AffectationStatus } from '@/types/affectation';
import { User } from '@/types/user';
import { Project } from '@/types/project';
import toast from 'react-hot-toast';

interface AffectationFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  affectation?: Affectation | null;
  onSuccess: () => void;
}

export const AffectationFormModal: React.FC<AffectationFormModalProps> = ({
  isOpen,
  onClose,
  affectation,
  onSuccess,
}) => {
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [formData, setFormData] = useState({
    userId: '',
    projectId: '',
    startDate: '',
    endDate: '',
    role: 'DEVELOPPEUR',
    allocationPercentage: 100,
    estimatedHours: 0,
    notes: '',
    status: 'planned' as AffectationStatus,
    isBillable: true,
  });

  const isEditing = !!affectation;

  useEffect(() => {
    if (isOpen) {
      fetchUsersAndProjects();
      if (affectation) {
        setFormData({
          userId: typeof affectation.userId === 'object' ? affectation.userId._id : affectation.userId,
          projectId: typeof affectation.projectId === 'object' ? affectation.projectId._id : affectation.projectId,
          startDate: affectation.startDate.split('T')[0],
          endDate: affectation.endDate.split('T')[0],
          role: affectation.role,
          allocationPercentage: affectation.allocationPercentage,
          estimatedHours: affectation.estimatedHours,
          notes: affectation.notes || '',
          status: affectation.status,
          isBillable: affectation.isBillable,
        });
      } else {
        setFormData({
          userId: '',
          projectId: '',
          startDate: '',
          endDate: '',
          role: 'DEVELOPPEUR',
          allocationPercentage: 100,
          estimatedHours: 0,
          notes: '',
          status: 'planned',
          isBillable: true,
        });
      }
    }
  }, [isOpen, affectation]);

  const fetchUsersAndProjects = async () => {
    try {
      const [usersRes, projectsRes] = await Promise.all([
        usersAPI.getAll(),
        projectsAPI.getAll(),
      ]);
      setUsers(usersRes.data || []);
      setProjects(projectsRes.data || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.userId || !formData.projectId || !formData.startDate || !formData.endDate) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (new Date(formData.startDate) >= new Date(formData.endDate)) {
      toast.error('Start date must be before end date');
      return;
    }

    try {
      setLoading(true);
      if (isEditing && affectation) {
        await affectationsAPI.update(affectation._id, formData);
        toast.success('Affectation updated successfully');
      } else {
        await affectationsAPI.create(formData);
        toast.success('Affectation created successfully');
      }
      onSuccess();
      onClose();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to save affectation');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white dark:bg-dark-400 rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-dark-300">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            {isEditing ? 'Edit Affectation' : 'Create Affectation'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* User & Project Selection */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                User <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.userId}
                onChange={(e) => setFormData({ ...formData, userId: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-dark-300 rounded-lg bg-white dark:bg-dark-500 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500"
                disabled={loading}
              >
                <option value="">Select user...</option>
                {users.map((user) => (
                  <option key={user._id} value={user._id}>
                    {user.firstName} {user.lastName}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Project <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.projectId}
                onChange={(e) => setFormData({ ...formData, projectId: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-dark-300 rounded-lg bg-white dark:bg-dark-500 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500"
                disabled={loading}
              >
                <option value="">Select project...</option>
                {projects.map((project) => (
                  <option key={project._id} value={project._id}>
                    {project.name} ({project.key})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Date Range */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Start Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-dark-300 rounded-lg bg-white dark:bg-dark-500 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500"
                disabled={loading}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                End Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={formData.endDate}
                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-dark-300 rounded-lg bg-white dark:bg-dark-500 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500"
                disabled={loading}
              />
            </div>
          </div>

          {/* Role & Status */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Role <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-dark-300 rounded-lg bg-white dark:bg-dark-500 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500"
                disabled={loading}
              >
                {AFFECTATION_ROLES.map((role) => (
                  <option key={role} value={role}>
                    {role}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Status
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as AffectationStatus })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-dark-300 rounded-lg bg-white dark:bg-dark-500 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500"
                disabled={loading}
              >
                <option value="planned">Planned</option>
                <option value="active">Active</option>
                <option value="completed">Completed</option>
              </select>
            </div>
          </div>

          {/* Allocation & Estimated Hours */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Allocation %
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="10"
                  value={formData.allocationPercentage}
                  onChange={(e) => setFormData({ ...formData, allocationPercentage: parseInt(e.target.value) })}
                  className="flex-1"
                  disabled={loading}
                />
                <span className="text-sm font-medium text-gray-900 dark:text-white w-12 text-right">
                  {formData.allocationPercentage}%
                </span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Estimated Hours
              </label>
              <input
                type="number"
                min="0"
                value={formData.estimatedHours}
                onChange={(e) => setFormData({ ...formData, estimatedHours: parseInt(e.target.value) || 0 })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-dark-300 rounded-lg bg-white dark:bg-dark-500 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500"
                disabled={loading}
              />
            </div>
          </div>

          {/* Billable Toggle */}
          <div className="flex items-center gap-3">
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={formData.isBillable}
                onChange={(e) => setFormData({ ...formData, isBillable: e.target.checked })}
                className="sr-only peer"
                disabled={loading}
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 dark:peer-focus:ring-primary-800 rounded-full peer dark:bg-dark-300 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary-600"></div>
            </label>
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Billable Time
            </span>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Notes
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 dark:border-dark-300 rounded-lg bg-white dark:bg-dark-500 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500"
              placeholder="Additional notes..."
              disabled={loading}
            />
          </div>

          {/* Buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-dark-300">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" loading={loading}>
              {isEditing ? 'Save Changes' : 'Create Affectation'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
