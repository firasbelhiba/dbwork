'use client';

import React, { useState, useEffect } from 'react';
import { Modal } from '@/components/common/Modal';
import { Button } from '@/components/common/Button';
import { IChangelog, CreateChangelogDto, UpdateChangelogDto } from '@/types';
import { changelogsAPI } from '@/lib/api';
import { toast } from 'react-hot-toast';

interface ChangelogFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  changelog?: IChangelog | null;
}

export const ChangelogFormModal: React.FC<ChangelogFormModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  changelog,
}) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<CreateChangelogDto>({
    version: '',
    title: '',
    description: '',
    releaseDate: new Date().toISOString().split('T')[0],
    features: [],
    improvements: [],
    bugFixes: [],
  });

  const [featureInput, setFeatureInput] = useState('');
  const [improvementInput, setImprovementInput] = useState('');
  const [bugFixInput, setBugFixInput] = useState('');

  useEffect(() => {
    if (changelog) {
      setFormData({
        version: changelog.version,
        title: changelog.title,
        description: changelog.description,
        releaseDate: changelog.releaseDate.split('T')[0],
        features: changelog.features || [],
        improvements: changelog.improvements || [],
        bugFixes: changelog.bugFixes || [],
      });
    } else {
      setFormData({
        version: '',
        title: '',
        description: '',
        releaseDate: new Date().toISOString().split('T')[0],
        features: [],
        improvements: [],
        bugFixes: [],
      });
    }
  }, [changelog, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.version || !formData.title || !formData.description) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      setLoading(true);
      if (changelog) {
        await changelogsAPI.update(changelog._id, formData);
        toast.success('Changelog updated successfully');
      } else {
        await changelogsAPI.create(formData);
        toast.success('Changelog created successfully');
      }
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Error saving changelog:', error);
      toast.error(error.response?.data?.message || 'Failed to save changelog');
    } finally {
      setLoading(false);
    }
  };

  const addFeature = () => {
    if (featureInput.trim()) {
      setFormData({ ...formData, features: [...formData.features, featureInput.trim()] });
      setFeatureInput('');
    }
  };

  const removeFeature = (index: number) => {
    setFormData({
      ...formData,
      features: formData.features.filter((_, i) => i !== index),
    });
  };

  const addImprovement = () => {
    if (improvementInput.trim()) {
      setFormData({
        ...formData,
        improvements: [...(formData.improvements || []), improvementInput.trim()],
      });
      setImprovementInput('');
    }
  };

  const removeImprovement = (index: number) => {
    setFormData({
      ...formData,
      improvements: formData.improvements?.filter((_, i) => i !== index) || [],
    });
  };

  const addBugFix = () => {
    if (bugFixInput.trim()) {
      setFormData({
        ...formData,
        bugFixes: [...(formData.bugFixes || []), bugFixInput.trim()],
      });
      setBugFixInput('');
    }
  };

  const removeBugFix = (index: number) => {
    setFormData({
      ...formData,
      bugFixes: formData.bugFixes?.filter((_, i) => i !== index) || [],
    });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={changelog ? 'Edit Changelog' : 'Create Changelog'}
      size="xl"
      closeOnOverlayClick={!loading}
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Info */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Version *
            </label>
            <input
              type="text"
              value={formData.version}
              onChange={(e) => setFormData({ ...formData, version: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-dark-400 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-dark-600 text-gray-900 dark:text-white"
              placeholder="e.g., 1.0.0"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Release Date *
            </label>
            <input
              type="date"
              value={formData.releaseDate}
              onChange={(e) => setFormData({ ...formData, releaseDate: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-dark-400 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-dark-600 text-gray-900 dark:text-white"
              required
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Title *
          </label>
          <input
            type="text"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 dark:border-dark-400 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-dark-600 text-gray-900 dark:text-white"
            placeholder="e.g., Major Feature Release"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Description *
          </label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 dark:border-dark-400 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-dark-600 text-gray-900 dark:text-white"
            placeholder="Brief description of this release"
            required
          />
        </div>

        {/* Features */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            New Features *
          </label>
          <div className="flex gap-2 mb-2">
            <input
              type="text"
              value={featureInput}
              onChange={(e) => setFeatureInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addFeature())}
              className="flex-1 px-3 py-2 border border-gray-300 dark:border-dark-400 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-dark-600 text-gray-900 dark:text-white"
              placeholder="Add a new feature"
            />
            <Button type="button" onClick={addFeature} variant="secondary">
              Add
            </Button>
          </div>
          <div className="space-y-2">
            {formData.features.map((feature, index) => (
              <div
                key={index}
                className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-dark-500 rounded-lg"
              >
                <span className="flex-1 text-sm text-gray-700 dark:text-gray-300">{feature}</span>
                <button
                  type="button"
                  onClick={() => removeFeature(index)}
                  className="text-red-500 hover:text-red-700"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                      clipRule="evenodd"
                    />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Improvements */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Improvements
          </label>
          <div className="flex gap-2 mb-2">
            <input
              type="text"
              value={improvementInput}
              onChange={(e) => setImprovementInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addImprovement())}
              className="flex-1 px-3 py-2 border border-gray-300 dark:border-dark-400 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-dark-600 text-gray-900 dark:text-white"
              placeholder="Add an improvement"
            />
            <Button type="button" onClick={addImprovement} variant="secondary">
              Add
            </Button>
          </div>
          <div className="space-y-2">
            {formData.improvements?.map((improvement, index) => (
              <div
                key={index}
                className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-dark-500 rounded-lg"
              >
                <span className="flex-1 text-sm text-gray-700 dark:text-gray-300">
                  {improvement}
                </span>
                <button
                  type="button"
                  onClick={() => removeImprovement(index)}
                  className="text-red-500 hover:text-red-700"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                      clipRule="evenodd"
                    />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Bug Fixes */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Bug Fixes
          </label>
          <div className="flex gap-2 mb-2">
            <input
              type="text"
              value={bugFixInput}
              onChange={(e) => setBugFixInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addBugFix())}
              className="flex-1 px-3 py-2 border border-gray-300 dark:border-dark-400 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-dark-600 text-gray-900 dark:text-white"
              placeholder="Add a bug fix"
            />
            <Button type="button" onClick={addBugFix} variant="secondary">
              Add
            </Button>
          </div>
          <div className="space-y-2">
            {formData.bugFixes?.map((bugFix, index) => (
              <div
                key={index}
                className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-dark-500 rounded-lg"
              >
                <span className="flex-1 text-sm text-gray-700 dark:text-gray-300">{bugFix}</span>
                <button
                  type="button"
                  onClick={() => removeBugFix(index)}
                  className="text-red-500 hover:text-red-700"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                      clipRule="evenodd"
                    />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-dark-400">
          <Button type="button" variant="secondary" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={loading}>
            {loading ? 'Saving...' : changelog ? 'Update' : 'Create'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
