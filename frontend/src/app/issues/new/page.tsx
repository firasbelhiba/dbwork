'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button, Input, Select, Textarea, Breadcrumb } from '@/components/common';
import { MultiUserSelect } from '@/components/common/MultiUserSelect';
import { issuesAPI, projectsAPI, usersAPI, sprintsAPI } from '@/lib/api';
import { Project } from '@/types/project';
import { User } from '@/types/user';
import { Sprint } from '@/types/sprint';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import toast from 'react-hot-toast';

function NewIssueForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [sprints, setSprints] = useState<Sprint[]>([]);

  // Form state
  const [formData, setFormData] = useState({
    projectId: '',
    title: '',
    description: '',
    type: 'task',
    priority: 'medium',
    assignees: [] as string[],
    sprintId: '',
    storyPoints: 0,
    dueDate: '',
    labels: '',
    category: '',
  });

  const [error, setError] = useState('');

  useEffect(() => {
    fetchData();

    // Pre-select project from URL query parameter
    const projectIdFromUrl = searchParams.get('project');
    const parentIssueIdFromUrl = searchParams.get('parent');

    if (projectIdFromUrl) {
      setFormData(prev => ({ ...prev, projectId: projectIdFromUrl }));
    }

    // If parent issue is provided, fetch it to display info
    if (parentIssueIdFromUrl) {
      fetchParentIssue(parentIssueIdFromUrl);
    }
  }, [searchParams]);

  const [parentIssue, setParentIssue] = useState<any>(null);

  const fetchParentIssue = async (parentId: string) => {
    try {
      const response = await issuesAPI.getById(parentId);
      setParentIssue(response.data);
    } catch (error) {
      console.error('Error fetching parent issue:', error);
    }
  };

  useEffect(() => {
    if (formData.projectId) {
      fetchSprints(formData.projectId);
    }
  }, [formData.projectId]);

  const fetchData = async () => {
    try {
      const [projectsRes, usersRes] = await Promise.all([
        projectsAPI.getAll(),
        usersAPI.getAll({ limit: 100 }),
      ]);
      setProjects(projectsRes.data);
      // Handle paginated response - items contains the user array
      setUsers(usersRes.data.items || usersRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  // Get the selected project details
  const selectedProject = projects.find((p: Project) => p._id === formData.projectId);
  const isProjectPreselected = !!searchParams.get('project');

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
    setError('');

    // Validation
    if (!formData.projectId) {
      setError('Please select a project');
      return;
    }
    if (!formData.title.trim()) {
      setError('Please enter a title');
      return;
    }

    setLoading(true);

    try {
      // Prepare data
      const issueData: any = {
        projectId: formData.projectId,
        title: formData.title.trim(),
        description: formData.description.trim(),
        type: formData.type,
        priority: formData.priority,
      };

      if (formData.assignees && formData.assignees.length > 0) issueData.assignees = formData.assignees;
      if (formData.sprintId) issueData.sprintId = formData.sprintId;
      if (formData.storyPoints > 0) issueData.storyPoints = Number(formData.storyPoints);
      if (formData.dueDate) issueData.dueDate = new Date(formData.dueDate);
      if (formData.labels.trim()) {
        issueData.labels = formData.labels.split(',').map(l => l.trim()).filter(l => l);
      }
      if (formData.category) issueData.category = formData.category;

      // Add parent issue if provided
      const parentIssueIdFromUrl = searchParams.get('parent');
      if (parentIssueIdFromUrl) {
        issueData.parentIssue = parentIssueIdFromUrl;
      }

      const response = await issuesAPI.create(issueData);
      const createdIssue = response.data;

      toast.success('Issue created successfully!');

      // Redirect to the created issue
      router.push(`/issues/${createdIssue._id}`);
    } catch (err: any) {
      console.error('Error creating issue:', err);
      const errorMessage = err.response?.data?.message || 'Failed to create issue. Please try again.';
      toast.error(errorMessage);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="p-8 max-w-4xl mx-auto">
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
              label: 'Issues',
              href: '/issues',
              icon: (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              ),
            },
            {
              label: 'New Issue',
            },
          ]}
          className="mb-6"
        />
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
            {parentIssue ? 'Create Sub-issue' : 'Create New Issue'}
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            {parentIssue
              ? `Creating a sub-issue under ${parentIssue.key} - ${parentIssue.title}`
              : 'Fill in the details to create a new issue'}
          </p>
        </div>

        {/* Parent Issue Info */}
        {parentIssue && (
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6 flex items-start gap-3">
            <svg className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="flex-1">
              <p className="text-sm font-medium text-blue-900 dark:text-blue-200 mb-1">Parent Issue</p>
              <p className="text-sm text-blue-700 dark:text-blue-300">
                <strong>{parentIssue.key}:</strong> {parentIssue.title}
              </p>
            </div>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-8">
          {error && (
            <div className="mb-6 p-4 bg-danger-50 dark:bg-danger-900/20 border-2 border-danger-200 dark:border-danger-800 rounded-md">
              <p className="text-sm text-danger-700 dark:text-danger-300 font-medium">{error}</p>
            </div>
          )}

          <div className="space-y-6">
            {/* Project (Required) */}
            <div>
              <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-1.5">
                Project <span className="text-danger-500">*</span>
              </label>
              {isProjectPreselected && selectedProject ? (
                <div className="flex h-10 w-full items-center rounded-md border-2 border-gray-300 dark:border-dark-300 bg-gray-50 dark:bg-dark-400 px-3 py-2">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center flex-shrink-0">
                      <span className="text-xs font-bold text-primary-700 dark:text-primary-400">{selectedProject.key}</span>
                    </div>
                    <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{selectedProject.name}</span>
                  </div>
                </div>
              ) : (
                <Select
                  name="projectId"
                  value={formData.projectId}
                  onChange={handleChange}
                  required
                >
                  <option value="">Select a project</option>
                  {projects.map(project => (
                    <option key={project._id} value={project._id}>
                      {project.name}
                    </option>
                  ))}
                </Select>
              )}
            </div>

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

            {/* Type and Priority */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
            </div>

            {/* Category */}
            <div>
              <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-1.5">
                Category
              </label>
              <Select
                name="category"
                value={formData.category}
                onChange={handleChange}
              >
                <option value="">No category</option>
                <option value="frontend">Frontend</option>
                <option value="backend">Backend</option>
                <option value="design">Design</option>
                <option value="marketing">Marketing</option>
                <option value="devops">DevOps</option>
                <option value="qa">QA / Testing</option>
                <option value="documentation">Documentation</option>
                <option value="infrastructure">Infrastructure</option>
                <option value="security">Security</option>
                <option value="other">Other</option>
              </Select>
            </div>

            {/* Assignee and Sprint */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-1.5">
                  Assignees
                </label>
                <MultiUserSelect
                  users={users}
                  selectedUserIds={formData.assignees}
                  onChange={(userIds) => setFormData(prev => ({ ...prev, assignees: userIds }))}
                  placeholder="Select assignees..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-1.5">
                  Sprint
                </label>
                <Select
                  name="sprintId"
                  value={formData.sprintId}
                  onChange={handleChange}
                  disabled={!formData.projectId}
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
          <div className="flex items-center justify-end gap-3 mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              loading={loading}
              disabled={loading}
            >
              Create Issue
            </Button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
}

export default function NewIssuePage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <NewIssueForm />
    </Suspense>
  );
}
