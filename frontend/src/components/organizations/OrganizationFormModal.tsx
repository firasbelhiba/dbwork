'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Modal } from '@/components/common/Modal';
import { Button, Input } from '@/components/common';
import { organizationsAPI } from '@/lib/api';
import { Organization } from '@/types/organization';
import toast from 'react-hot-toast';

interface OrganizationFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  organization?: Organization | null;
  onSuccess: () => void;
}

export function OrganizationFormModal({
  isOpen,
  onClose,
  organization,
  onSuccess,
}: OrganizationFormModalProps) {
  const [loading, setLoading] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    key: '',
    description: '',
  });
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isEditing = !!organization;

  useEffect(() => {
    if (organization) {
      setFormData({
        name: organization.name,
        key: organization.key,
        description: organization.description || '',
      });
      setLogoPreview(organization.logo || null);
    } else {
      setFormData({
        name: '',
        key: '',
        description: '',
      });
      setLogoPreview(null);
    }
  }, [organization, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast.error('Name is required');
      return;
    }

    if (!isEditing && !formData.key.trim()) {
      toast.error('Key is required');
      return;
    }

    try {
      setLoading(true);

      if (isEditing) {
        await organizationsAPI.update(organization._id, {
          name: formData.name,
          description: formData.description || undefined,
        });
        toast.success('Organization updated successfully');
      } else {
        await organizationsAPI.create({
          name: formData.name,
          key: formData.key.toUpperCase(),
          description: formData.description || undefined,
        });
        toast.success('Organization created successfully');
      }

      onSuccess();
    } catch (error: any) {
      console.error('Error saving organization:', error);
      toast.error(error.response?.data?.message || 'Failed to save organization');
    } finally {
      setLoading(false);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !organization) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size must be less than 5MB');
      return;
    }

    try {
      setUploadingLogo(true);
      const response = await organizationsAPI.uploadLogo(organization._id, file);
      setLogoPreview(response.data.logo);
      toast.success('Logo uploaded successfully');
      onSuccess();
    } catch (error: any) {
      console.error('Error uploading logo:', error);
      toast.error(error.response?.data?.message || 'Failed to upload logo');
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleRemoveLogo = async () => {
    if (!organization) return;

    try {
      setUploadingLogo(true);
      await organizationsAPI.removeLogo(organization._id);
      setLogoPreview(null);
      toast.success('Logo removed successfully');
      onSuccess();
    } catch (error: any) {
      console.error('Error removing logo:', error);
      toast.error(error.response?.data?.message || 'Failed to remove logo');
    } finally {
      setUploadingLogo(false);
    }
  };

  const generateKey = () => {
    if (formData.name && !isEditing) {
      const key = formData.name
        .split(' ')
        .map((word) => word.charAt(0).toUpperCase())
        .join('')
        .substring(0, 4);
      setFormData((prev) => ({ ...prev, key }));
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'Edit Organization' : 'Create Organization'}
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Logo Section (only for editing) */}
        {isEditing && (
          <div className="flex items-center gap-4">
            <div className="relative">
              {logoPreview ? (
                <img
                  src={logoPreview}
                  alt="Organization logo"
                  className="w-20 h-20 rounded-lg object-cover border border-gray-200 dark:border-dark-300"
                />
              ) : (
                <div className="w-20 h-20 rounded-lg bg-gray-100 dark:bg-dark-300 flex items-center justify-center border border-gray-200 dark:border-dark-300">
                  <span className="text-2xl font-bold text-gray-400">
                    {formData.key?.substring(0, 2) || '?'}
                  </span>
                </div>
              )}
            </div>
            <div className="flex flex-col gap-2">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleLogoUpload}
                accept="image/*"
                className="hidden"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                loading={uploadingLogo}
                disabled={uploadingLogo}
              >
                {logoPreview ? 'Change Logo' : 'Upload Logo'}
              </Button>
              {logoPreview && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleRemoveLogo}
                  disabled={uploadingLogo}
                  className="text-danger-600 hover:text-danger-700"
                >
                  Remove Logo
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Name */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Name <span className="text-danger-500">*</span>
          </label>
          <Input
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            onBlur={generateKey}
            placeholder="e.g., Dar Blockchain"
            disabled={loading}
          />
        </div>

        {/* Key (only for create) */}
        {!isEditing && (
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Key <span className="text-danger-500">*</span>
            </label>
            <Input
              value={formData.key}
              onChange={(e) => setFormData({ ...formData, key: e.target.value.toUpperCase() })}
              placeholder="e.g., DAR"
              disabled={loading}
              maxLength={10}
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              A unique identifier for the organization (will be uppercase)
            </p>
          </div>
        )}

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Description
          </label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Brief description of the organization..."
            disabled={loading}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 dark:border-dark-300 rounded-lg bg-white dark:bg-dark-400 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
          />
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4">
          <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button type="submit" loading={loading} disabled={loading}>
            {isEditing ? 'Update' : 'Create'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
