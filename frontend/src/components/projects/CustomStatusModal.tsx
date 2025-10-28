'use client';

import React, { useState, useEffect } from 'react';
import { CustomStatus } from '@/types/project';
import { Button, Input } from '@/components/common';
import axios from 'axios';
import toast from 'react-hot-toast';

interface CustomStatusModalProps {
  projectId: string;
  statuses: CustomStatus[];
  isOpen: boolean;
  onClose: () => void;
  onUpdate: () => void;
}

const colorOptions = [
  { label: 'Gray', value: 'bg-gray-100', preview: 'bg-gray-200' },
  { label: 'Blue', value: 'bg-blue-100', preview: 'bg-blue-200' },
  { label: 'Green', value: 'bg-green-100', preview: 'bg-green-200' },
  { label: 'Yellow', value: 'bg-yellow-100', preview: 'bg-yellow-200' },
  { label: 'Red', value: 'bg-red-100', preview: 'bg-red-200' },
  { label: 'Purple', value: 'bg-purple-100', preview: 'bg-purple-200' },
  { label: 'Pink', value: 'bg-pink-100', preview: 'bg-pink-200' },
  { label: 'Indigo', value: 'bg-indigo-100', preview: 'bg-indigo-200' },
];

export const CustomStatusModal: React.FC<CustomStatusModalProps> = ({
  projectId,
  statuses,
  isOpen,
  onClose,
  onUpdate,
}) => {
  const [localStatuses, setLocalStatuses] = useState<CustomStatus[]>(statuses);
  const [newStatusName, setNewStatusName] = useState('');
  const [newStatusColor, setNewStatusColor] = useState('bg-gray-100');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLocalStatuses(statuses);
  }, [statuses]);

  const handleAddStatus = async () => {
    if (!newStatusName.trim()) {
      toast.error('Please enter a status name');
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('accessToken');
      await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/projects/${projectId}/statuses`,
        { name: newStatusName, color: newStatusColor },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      toast.success('Status added successfully!');
      setNewStatusName('');
      setNewStatusColor('bg-gray-100');
      onUpdate();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to add status');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteStatus = async (statusId: string) => {
    if (!confirm('Are you sure you want to delete this status?')) return;

    setLoading(true);
    try {
      const token = localStorage.getItem('accessToken');
      await axios.delete(
        `${process.env.NEXT_PUBLIC_API_URL}/projects/${projectId}/statuses/${statusId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      toast.success('Status deleted successfully!');
      onUpdate();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to delete status');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatusColor = async (statusId: string, color: string) => {
    setLoading(true);
    try {
      const token = localStorage.getItem('accessToken');
      await axios.patch(
        `${process.env.NEXT_PUBLIC_API_URL}/projects/${projectId}/statuses/${statusId}`,
        { color },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      toast.success('Status updated successfully!');
      onUpdate();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to update status');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-40 transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-dark-400 rounded-lg shadow-xl max-w-3xl w-full max-h-[80vh] overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-dark-300">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
              Manage Kanban Board Columns
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

          {/* Content */}
          <div className="p-6 overflow-y-auto max-h-[calc(80vh-140px)]">
            {/* Add New Status */}
            <div className="mb-6 p-4 bg-gray-50 dark:bg-dark-500 rounded-lg">
              <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-3">
                Add New Column
              </h3>
              <div className="flex gap-3">
                <div className="flex-1">
                  <Input
                    value={newStatusName}
                    onChange={(e) => setNewStatusName(e.target.value)}
                    placeholder="Column name (e.g., Testing, Review)"
                    disabled={loading}
                  />
                </div>
                <div className="w-40">
                  <select
                    value={newStatusColor}
                    onChange={(e) => setNewStatusColor(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-dark-200 rounded-md bg-white dark:bg-dark-300 text-gray-900 dark:text-gray-100"
                    disabled={loading}
                  >
                    {colorOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
                <Button onClick={handleAddStatus} disabled={loading || !newStatusName.trim()}>
                  Add
                </Button>
              </div>
            </div>

            {/* Existing Statuses */}
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-3">
                Current Columns
              </h3>
              {localStatuses.map((status) => (
                <div
                  key={status.id}
                  className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-dark-500 rounded-lg"
                >
                  <div className={`w-4 h-4 rounded ${status.color}`} />
                  <span className="flex-1 text-sm font-medium text-gray-900 dark:text-gray-100">
                    {status.name}
                  </span>
                  {status.isDefault && (
                    <span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-200 dark:bg-dark-300 px-2 py-1 rounded">
                      Default
                    </span>
                  )}
                  <select
                    value={status.color}
                    onChange={(e) => handleUpdateStatusColor(status.id, e.target.value)}
                    className="px-3 py-1.5 border border-gray-300 dark:border-dark-200 rounded-md bg-white dark:bg-dark-300 text-sm text-gray-900 dark:text-gray-100"
                    disabled={loading}
                  >
                    {colorOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                  {!status.isDefault && (
                    <button
                      onClick={() => handleDeleteStatus(status.id)}
                      disabled={loading}
                      className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 disabled:opacity-50"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                        />
                      </svg>
                    </button>
                  )}
                </div>
              ))}
            </div>

            <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <p className="text-sm text-blue-800 dark:text-blue-300">
                <strong>Note:</strong> Default columns cannot be deleted or renamed. You can only change their colors.
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-200 dark:border-dark-300">
            <Button variant="secondary" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      </div>
    </>
  );
};
