'use client';

import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button, Badge, Input, Breadcrumb, LogoLoader } from '@/components/common';
import { adminAPI } from '@/lib/api';
import { UserRole } from '@/types/user';
import { useAuth } from '@/contexts/AuthContext';
import toast from 'react-hot-toast';
import { useRouter } from 'next/navigation';

interface ProjectRoleDefinition {
  id: string;
  name: string;
  label: string;
  color: string;
  isDefault: boolean;
  order: number;
}

// Preset colors for quick selection
const PRESET_COLORS = [
  '#ef4444', // red
  '#f59e0b', // amber
  '#22c55e', // green
  '#3b82f6', // blue
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#14b8a6', // teal
  '#6b7280', // gray
  '#f97316', // orange
  '#06b6d4', // cyan
];

export default function AdminProjectRolesPage() {
  const router = useRouter();
  const { user: currentUser, loading: authLoading } = useAuth();
  const [roles, setRoles] = useState<ProjectRoleDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingRole, setEditingRole] = useState<ProjectRoleDefinition | null>(null);

  useEffect(() => {
    if (authLoading) return;

    if (!currentUser) {
      router.push('/login');
      return;
    }

    if (currentUser.role !== UserRole.ADMIN) {
      toast.error('Access denied. Admin role required.');
      router.push('/dashboard');
      return;
    }

    fetchRoles();
  }, [currentUser, authLoading, router]);

  const fetchRoles = async () => {
    try {
      setLoading(true);
      const response = await adminAPI.getProjectRoles();
      setRoles(response.data || []);
    } catch (error) {
      console.error('Error fetching project roles:', error);
      toast.error('Failed to load project roles');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (role: ProjectRoleDefinition) => {
    if (role.isDefault) {
      toast.error('Cannot delete default roles');
      return;
    }

    if (!confirm(`Are you sure you want to delete the "${role.label}" role?`)) {
      return;
    }

    try {
      const response = await adminAPI.deleteProjectRole(role.id);
      setRoles(response.data);
      toast.success('Role deleted successfully');
    } catch (error: any) {
      console.error('Error deleting role:', error);
      toast.error(error.response?.data?.message || 'Failed to delete role');
    }
  };

  if (currentUser?.role !== UserRole.ADMIN) {
    return null;
  }

  if (loading && roles.length === 0) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-full">
          <LogoLoader size="lg" text="Loading project roles" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="h-full overflow-auto">
        <div className="p-8">
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
                label: 'Admin',
                href: '/admin',
              },
              {
                label: 'Project Roles',
              },
            ]}
            className="mb-6"
          />

          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Project Roles</h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                Manage roles that can be assigned to project team members
              </p>
            </div>
            <Button onClick={() => setShowAddModal(true)}>
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Role
            </Button>
          </div>

          {/* Roles List */}
          <div className="bg-white dark:bg-dark-400 rounded-lg shadow-sm border border-gray-200 dark:border-dark-300">
            <div className="p-4 border-b border-gray-200 dark:border-dark-300">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                <span className="font-medium text-gray-900 dark:text-gray-100">
                  {roles.length} Role{roles.length !== 1 ? 's' : ''}
                </span>
              </div>
            </div>

            <div className="divide-y divide-gray-200 dark:divide-dark-300">
              {roles.map((role) => (
                <div
                  key={role.id}
                  className="p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-dark-300/50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    {/* Color indicator */}
                    <div
                      className="w-4 h-4 rounded-full flex-shrink-0"
                      style={{ backgroundColor: role.color }}
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900 dark:text-gray-100">
                          {role.label}
                        </span>
                        {role.isDefault && (
                          <Badge variant="secondary" className="text-xs">
                            Default
                          </Badge>
                        )}
                      </div>
                      <span className="text-sm text-gray-500 dark:text-gray-400 font-mono">
                        {role.name}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setEditingRole(role)}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </Button>
                    {!role.isDefault && (
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => handleDelete(role)}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </Button>
                    )}
                  </div>
                </div>
              ))}

              {roles.length === 0 && (
                <div className="p-12 text-center">
                  <svg className="w-12 h-12 mx-auto mb-3 text-gray-400 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  <p className="text-sm text-gray-500 dark:text-gray-400">No roles defined yet</p>
                </div>
              )}
            </div>
          </div>

          {/* Info section */}
          <div className="mt-6 p-4 bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800 rounded-lg">
            <div className="flex gap-3">
              <svg className="w-5 h-5 text-primary-600 dark:text-primary-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <p className="text-sm text-primary-800 dark:text-primary-200 font-medium">
                  About Project Roles
                </p>
                <p className="text-sm text-primary-700 dark:text-primary-300 mt-1">
                  Project roles define what function a team member performs within a specific project.
                  Unlike system roles (Admin, Developer, etc.), project roles are project-specific and
                  can be customized. Default roles cannot be deleted but can be renamed and recolored.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Add Role Modal */}
      {showAddModal && (
        <AddRoleModal
          onClose={() => setShowAddModal(false)}
          onSuccess={(newRoles) => {
            setRoles(newRoles);
            setShowAddModal(false);
          }}
        />
      )}

      {/* Edit Role Modal */}
      {editingRole && (
        <EditRoleModal
          role={editingRole}
          onClose={() => setEditingRole(null)}
          onSuccess={(updatedRoles) => {
            setRoles(updatedRoles);
            setEditingRole(null);
          }}
        />
      )}
    </DashboardLayout>
  );
}

// Add Role Modal
function AddRoleModal({
  onClose,
  onSuccess,
}: {
  onClose: () => void;
  onSuccess: (roles: ProjectRoleDefinition[]) => void;
}) {
  const [name, setName] = useState('');
  const [label, setLabel] = useState('');
  const [color, setColor] = useState(PRESET_COLORS[0]);
  const [saving, setSaving] = useState(false);

  // Auto-generate name from label
  const handleLabelChange = (value: string) => {
    setLabel(value);
    // Convert to lowercase with underscores
    const generatedName = value
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, '_');
    setName(generatedName);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim() || !label.trim()) {
      toast.error('Please fill in all fields');
      return;
    }

    try {
      setSaving(true);
      const response = await adminAPI.createProjectRole({
        name: name.trim(),
        label: label.trim(),
        color,
      });
      toast.success('Role created successfully');
      onSuccess(response.data);
    } catch (error: any) {
      console.error('Error creating role:', error);
      toast.error(error.response?.data?.message || 'Failed to create role');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white dark:bg-dark-400 rounded-xl shadow-2xl w-full max-w-md border border-gray-200 dark:border-dark-300">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-dark-300">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Add Project Role</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Display Label <span className="text-danger-500">*</span>
            </label>
            <Input
              value={label}
              onChange={(e) => handleLabelChange(e.target.value)}
              placeholder="e.g., Frontend Lead"
              disabled={saving}
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              The name shown to users
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              System Name <span className="text-danger-500">*</span>
            </label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
              placeholder="e.g., frontend_lead"
              disabled={saving}
              className="font-mono"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Lowercase letters, numbers, and underscores only
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Color
            </label>
            <div className="flex items-center gap-2 flex-wrap">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`w-8 h-8 rounded-full transition-all ${
                    color === c ? 'ring-2 ring-offset-2 ring-primary-500' : ''
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
              <input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="w-8 h-8 rounded-full cursor-pointer border-0"
              />
            </div>
          </div>

          {/* Preview */}
          <div className="p-4 bg-gray-50 dark:bg-dark-300 rounded-lg">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Preview</p>
            <div className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: color }}
              />
              <span className="font-medium text-gray-900 dark:text-gray-100">{label || 'Role Label'}</span>
              <span className="text-sm text-gray-500 font-mono">({name || 'role_name'})</span>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" loading={saving} disabled={saving || !name.trim() || !label.trim()}>
              Create Role
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Edit Role Modal
function EditRoleModal({
  role,
  onClose,
  onSuccess,
}: {
  role: ProjectRoleDefinition;
  onClose: () => void;
  onSuccess: (roles: ProjectRoleDefinition[]) => void;
}) {
  const [label, setLabel] = useState(role.label);
  const [color, setColor] = useState(role.color);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!label.trim()) {
      toast.error('Label is required');
      return;
    }

    try {
      setSaving(true);
      const response = await adminAPI.updateProjectRole(role.id, {
        label: label.trim(),
        color,
      });
      toast.success('Role updated successfully');
      onSuccess(response.data);
    } catch (error: any) {
      console.error('Error updating role:', error);
      toast.error(error.response?.data?.message || 'Failed to update role');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white dark:bg-dark-400 rounded-xl shadow-2xl w-full max-w-md border border-gray-200 dark:border-dark-300">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-dark-300">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Edit Project Role</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              System Name
            </label>
            <Input
              value={role.name}
              disabled
              className="font-mono bg-gray-100 dark:bg-dark-300"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              System name cannot be changed
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Display Label <span className="text-danger-500">*</span>
            </label>
            <Input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="e.g., Frontend Lead"
              disabled={saving}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Color
            </label>
            <div className="flex items-center gap-2 flex-wrap">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`w-8 h-8 rounded-full transition-all ${
                    color === c ? 'ring-2 ring-offset-2 ring-primary-500' : ''
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
              <input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="w-8 h-8 rounded-full cursor-pointer border-0"
              />
            </div>
          </div>

          {/* Preview */}
          <div className="p-4 bg-gray-50 dark:bg-dark-300 rounded-lg">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Preview</p>
            <div className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: color }}
              />
              <span className="font-medium text-gray-900 dark:text-gray-100">{label || 'Role Label'}</span>
              <span className="text-sm text-gray-500 font-mono">({role.name})</span>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" loading={saving} disabled={saving || !label.trim()}>
              Save Changes
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
