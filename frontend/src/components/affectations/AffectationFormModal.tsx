'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Modal } from '@/components/common/Modal';
import { Button } from '@/components/common';
import { affectationsAPI, projectsAPI, usersAPI } from '@/lib/api';
import { Affectation, AFFECTATION_ROLES, AffectationStatus } from '@/types/affectation';
import { User } from '@/types/user';
import { Project } from '@/types/project';
import toast from 'react-hot-toast';

// Custom User Dropdown with avatars
interface UserDropdownProps {
  users: User[];
  value: string;
  onChange: (userId: string) => void;
  disabled?: boolean;
}

const UserDropdown: React.FC<UserDropdownProps> = ({ users, value, onChange, disabled }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedUser = users.find(u => u._id === value);

  const filteredUsers = users.filter(user =>
    `${user.firstName} ${user.lastName}`.toLowerCase().includes(search.toLowerCase()) ||
    user.email?.toLowerCase().includes(search.toLowerCase())
  );

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={`w-full px-3 py-2.5 border border-gray-300 dark:border-dark-300 rounded-lg bg-white dark:bg-dark-500 text-left focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
      >
        {selectedUser ? (
          <div className="flex items-center gap-3">
            {selectedUser.avatar ? (
              <img src={selectedUser.avatar} alt="" className="w-8 h-8 rounded-full object-cover" />
            ) : (
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center">
                <span className="text-sm font-bold text-white">{selectedUser.firstName?.charAt(0)}</span>
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="font-medium text-gray-900 dark:text-white truncate">
                {selectedUser.firstName} {selectedUser.lastName}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{selectedUser.email}</p>
            </div>
            <svg className={`w-5 h-5 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <span className="text-gray-500 dark:text-gray-400">Select team member...</span>
            <svg className={`w-5 h-5 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        )}
      </button>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white dark:bg-dark-500 border border-gray-200 dark:border-dark-300 rounded-lg shadow-lg max-h-64 overflow-hidden">
          {/* Search */}
          <div className="p-2 border-b border-gray-100 dark:border-dark-400">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or email..."
              className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-dark-400 rounded-md bg-gray-50 dark:bg-dark-600 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-primary-500"
              autoFocus
            />
          </div>
          {/* Options */}
          <div className="overflow-y-auto max-h-48">
            {filteredUsers.length === 0 ? (
              <p className="px-3 py-4 text-sm text-gray-500 dark:text-gray-400 text-center">No users found</p>
            ) : (
              filteredUsers.map(user => (
                <button
                  key={user._id}
                  type="button"
                  onClick={() => {
                    onChange(user._id);
                    setIsOpen(false);
                    setSearch('');
                  }}
                  className={`w-full px-3 py-2.5 flex items-center gap-3 hover:bg-gray-50 dark:hover:bg-dark-400 transition-colors ${value === user._id ? 'bg-primary-50 dark:bg-primary-900/20' : ''}`}
                >
                  {user.avatar ? (
                    <img src={user.avatar} alt="" className="w-9 h-9 rounded-full object-cover ring-2 ring-white dark:ring-dark-400" />
                  ) : (
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center ring-2 ring-white dark:ring-dark-400">
                      <span className="text-sm font-bold text-white">{user.firstName?.charAt(0)}</span>
                    </div>
                  )}
                  <div className="flex-1 min-w-0 text-left">
                    <p className="font-medium text-gray-900 dark:text-white truncate">
                      {user.firstName} {user.lastName}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{user.email}</p>
                  </div>
                  {value === user._id && (
                    <svg className="w-5 h-5 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// Custom Project Dropdown with logos
interface ProjectDropdownProps {
  projects: Project[];
  value: string;
  onChange: (projectId: string) => void;
  disabled?: boolean;
}

const ProjectDropdown: React.FC<ProjectDropdownProps> = ({ projects, value, onChange, disabled }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedProject = projects.find(p => p._id === value);

  const filteredProjects = projects.filter(project =>
    project.name.toLowerCase().includes(search.toLowerCase()) ||
    project.key?.toLowerCase().includes(search.toLowerCase())
  );

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={`w-full px-3 py-2.5 border border-gray-300 dark:border-dark-300 rounded-lg bg-white dark:bg-dark-500 text-left focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
      >
        {selectedProject ? (
          <div className="flex items-center gap-3">
            {selectedProject.logo ? (
              <img src={selectedProject.logo} alt="" className="w-8 h-8 rounded-lg object-cover" />
            ) : (
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-gray-200 to-gray-300 dark:from-dark-300 dark:to-dark-400 flex items-center justify-center">
                <span className="text-sm font-bold text-gray-600 dark:text-gray-300">{selectedProject.key?.substring(0, 2)}</span>
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="font-medium text-gray-900 dark:text-white truncate">{selectedProject.name}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">{selectedProject.key}</p>
            </div>
            <svg className={`w-5 h-5 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <span className="text-gray-500 dark:text-gray-400">Select project...</span>
            <svg className={`w-5 h-5 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        )}
      </button>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white dark:bg-dark-500 border border-gray-200 dark:border-dark-300 rounded-lg shadow-lg max-h-64 overflow-hidden">
          {/* Search */}
          <div className="p-2 border-b border-gray-100 dark:border-dark-400">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search projects..."
              className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-dark-400 rounded-md bg-gray-50 dark:bg-dark-600 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-primary-500"
              autoFocus
            />
          </div>
          {/* Options */}
          <div className="overflow-y-auto max-h-48">
            {filteredProjects.length === 0 ? (
              <p className="px-3 py-4 text-sm text-gray-500 dark:text-gray-400 text-center">No projects found</p>
            ) : (
              filteredProjects.map(project => (
                <button
                  key={project._id}
                  type="button"
                  onClick={() => {
                    onChange(project._id);
                    setIsOpen(false);
                    setSearch('');
                  }}
                  className={`w-full px-3 py-2.5 flex items-center gap-3 hover:bg-gray-50 dark:hover:bg-dark-400 transition-colors ${value === project._id ? 'bg-primary-50 dark:bg-primary-900/20' : ''}`}
                >
                  {project.logo ? (
                    <img src={project.logo} alt="" className="w-9 h-9 rounded-lg object-cover ring-1 ring-gray-200 dark:ring-dark-300" />
                  ) : (
                    <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-gray-200 to-gray-300 dark:from-dark-300 dark:to-dark-400 flex items-center justify-center ring-1 ring-gray-200 dark:ring-dark-300">
                      <span className="text-sm font-bold text-gray-600 dark:text-gray-300">{project.key?.substring(0, 2)}</span>
                    </div>
                  )}
                  <div className="flex-1 min-w-0 text-left">
                    <p className="font-medium text-gray-900 dark:text-white truncate">{project.name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{project.key}</p>
                  </div>
                  {value === project._id && (
                    <svg className="w-5 h-5 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

interface AffectationFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  affectation?: Affectation | null;
  onSuccess: () => void;
}

const statusConfig = {
  planned: { label: 'Planned', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400', icon: '📅' },
  active: { label: 'Active', color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400', icon: '🚀' },
  completed: { label: 'Completed', color: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300', icon: '✓' },
};

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

  // Get selected user and project for preview
  const selectedUser = users.find(u => u._id === formData.userId);
  const selectedProject = projects.find(p => p._id === formData.projectId);

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
      // usersAPI.getAll returns paginated data with { items, total, ... }
      setUsers(usersRes.data?.items || usersRes.data || []);
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

  // Calculate duration in days
  const getDurationDays = () => {
    if (!formData.startDate || !formData.endDate) return null;
    const start = new Date(formData.startDate);
    const end = new Date(formData.endDate);
    const diffTime = end.getTime() - start.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : null;
  };

  const durationDays = getDurationDays();

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'Edit Affectation' : 'New Affectation'}
      size="xl"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Preview Card - shows when user and project are selected */}
        {(selectedUser || selectedProject) && (
          <div className="bg-gradient-to-r from-primary-50 to-primary-100 dark:from-primary-900/20 dark:to-primary-800/20 rounded-xl p-4 border border-primary-200 dark:border-primary-800">
            <div className="flex items-center gap-4">
              {/* User Avatar */}
              {selectedUser && (
                <div className="flex items-center gap-3">
                  {selectedUser.avatar ? (
                    <img
                      src={selectedUser.avatar}
                      alt={`${selectedUser.firstName} ${selectedUser.lastName}`}
                      className="w-12 h-12 rounded-full object-cover ring-2 ring-white dark:ring-dark-400"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-primary-500 flex items-center justify-center ring-2 ring-white dark:ring-dark-400">
                      <span className="text-lg font-bold text-white">
                        {selectedUser.firstName?.charAt(0)}
                      </span>
                    </div>
                  )}
                  <div>
                    <p className="font-semibold text-gray-900 dark:text-white">
                      {selectedUser.firstName} {selectedUser.lastName}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {formData.role}
                    </p>
                  </div>
                </div>
              )}

              {/* Arrow */}
              {selectedUser && selectedProject && (
                <div className="flex-shrink-0">
                  <svg className="w-6 h-6 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </div>
              )}

              {/* Project */}
              {selectedProject && (
                <div className="flex items-center gap-3">
                  {selectedProject.logo ? (
                    <img
                      src={selectedProject.logo}
                      alt={selectedProject.name}
                      className="w-12 h-12 rounded-lg object-cover ring-2 ring-white dark:ring-dark-400"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-lg bg-gray-200 dark:bg-dark-400 flex items-center justify-center ring-2 ring-white dark:ring-dark-400">
                      <span className="text-lg font-bold text-gray-500 dark:text-gray-400">
                        {selectedProject.key?.substring(0, 2)}
                      </span>
                    </div>
                  )}
                  <div>
                    <p className="font-semibold text-gray-900 dark:text-white">
                      {selectedProject.name}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {selectedProject.key}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Duration and allocation summary */}
            {durationDays && (
              <div className="mt-3 pt-3 border-t border-primary-200 dark:border-primary-700 flex items-center gap-4 text-sm">
                <span className="text-gray-600 dark:text-gray-300">
                  <strong>{durationDays}</strong> days
                </span>
                <span className="text-gray-400">|</span>
                <span className="text-gray-600 dark:text-gray-300">
                  <strong>{formData.allocationPercentage}%</strong> allocation
                </span>
                <span className="text-gray-400">|</span>
                <span className="text-gray-600 dark:text-gray-300">
                  <strong>{formData.estimatedHours}h</strong> estimated
                </span>
              </div>
            )}
          </div>
        )}

        {/* Assignment Section */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            Assignment
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* User Select */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Team Member <span className="text-red-500">*</span>
              </label>
              <UserDropdown
                users={users}
                value={formData.userId}
                onChange={(userId) => setFormData({ ...formData, userId })}
                disabled={loading}
              />
            </div>

            {/* Project Select */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Project <span className="text-red-500">*</span>
              </label>
              <ProjectDropdown
                projects={projects}
                value={formData.projectId}
                onChange={(projectId) => setFormData({ ...formData, projectId })}
                disabled={loading}
              />
            </div>
          </div>

          {/* Role Select */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Role <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value })}
              className="w-full px-3 py-2.5 border border-gray-300 dark:border-dark-300 rounded-lg bg-white dark:bg-dark-500 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
              disabled={loading}
            >
              {AFFECTATION_ROLES.map((role) => (
                <option key={role} value={role}>
                  {role}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Period Section */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            Period
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Start Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                className="w-full px-3 py-2.5 border border-gray-300 dark:border-dark-300 rounded-lg bg-white dark:bg-dark-500 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
                disabled={loading}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                End Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={formData.endDate}
                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                min={formData.startDate}
                className="w-full px-3 py-2.5 border border-gray-300 dark:border-dark-300 rounded-lg bg-white dark:bg-dark-500 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
                disabled={loading}
              />
            </div>
          </div>

          {/* Duration indicator */}
          {durationDays && (
            <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Duration: <strong className="text-gray-700 dark:text-gray-300">{durationDays} days</strong>
              ({Math.round(durationDays / 7)} weeks)
            </div>
          )}
        </div>

        {/* Workload Section */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            Workload
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Allocation Percentage */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Allocation
              </label>
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="10"
                    value={formData.allocationPercentage}
                    onChange={(e) => setFormData({ ...formData, allocationPercentage: parseInt(e.target.value) })}
                    className="flex-1 h-2 bg-gray-200 dark:bg-dark-300 rounded-lg appearance-none cursor-pointer accent-primary-500"
                    disabled={loading}
                  />
                  <div className="w-16 px-2 py-1 bg-gray-100 dark:bg-dark-400 rounded-lg text-center">
                    <span className="text-lg font-bold text-gray-900 dark:text-white">
                      {formData.allocationPercentage}%
                    </span>
                  </div>
                </div>
                <div className="flex justify-between text-xs text-gray-400">
                  <span>Part-time</span>
                  <span>Half-time</span>
                  <span>Full-time</span>
                </div>
              </div>
            </div>

            {/* Estimated Hours */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Estimated Hours
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  value={formData.estimatedHours}
                  onChange={(e) => setFormData({ ...formData, estimatedHours: parseInt(e.target.value) || 0 })}
                  className="w-full px-3 py-2.5 pr-16 border border-gray-300 dark:border-dark-300 rounded-lg bg-white dark:bg-dark-500 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
                  disabled={loading}
                  placeholder="0"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 font-medium">
                  hours
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Status & Billing Section */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Status & Billing
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Status Selection - Visual Cards */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Status
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(Object.keys(statusConfig) as AffectationStatus[]).map((status) => (
                  <button
                    key={status}
                    type="button"
                    onClick={() => setFormData({ ...formData, status })}
                    className={`p-2 rounded-lg border-2 transition-all text-center ${
                      formData.status === status
                        ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/30'
                        : 'border-gray-200 dark:border-dark-300 hover:border-gray-300 dark:hover:border-dark-200'
                    }`}
                    disabled={loading}
                  >
                    <span className="text-lg">{statusConfig[status].icon}</span>
                    <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mt-1">
                      {statusConfig[status].label}
                    </p>
                  </button>
                ))}
              </div>
            </div>

            {/* Billable Toggle */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Billing Type
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, isBillable: true })}
                  className={`flex-1 p-3 rounded-lg border-2 transition-all ${
                    formData.isBillable
                      ? 'border-green-500 bg-green-50 dark:bg-green-900/30'
                      : 'border-gray-200 dark:border-dark-300 hover:border-gray-300'
                  }`}
                  disabled={loading}
                >
                  <div className="flex items-center justify-center gap-2">
                    <svg className="w-5 h-5 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="font-medium text-gray-700 dark:text-gray-300">Billable</span>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, isBillable: false })}
                  className={`flex-1 p-3 rounded-lg border-2 transition-all ${
                    !formData.isBillable
                      ? 'border-gray-500 bg-gray-50 dark:bg-gray-700/30'
                      : 'border-gray-200 dark:border-dark-300 hover:border-gray-300'
                  }`}
                  disabled={loading}
                >
                  <div className="flex items-center justify-center gap-2">
                    <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                    </svg>
                    <span className="font-medium text-gray-700 dark:text-gray-300">Non-Billable</span>
                  </div>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
            Notes <span className="text-gray-400 font-normal">(optional)</span>
          </label>
          <textarea
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            rows={2}
            className="w-full px-3 py-2.5 border border-gray-300 dark:border-dark-300 rounded-lg bg-white dark:bg-dark-500 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors resize-none"
            placeholder="Any additional notes about this assignment..."
            disabled={loading}
          />
        </div>

        {/* Action Buttons */}
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
    </Modal>
  );
};
