'use client';

import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Badge, Button, Input, Select, Breadcrumb } from '@/components/common';
import { issuesAPI, projectsAPI, usersAPI } from '@/lib/api';
import { Issue, IssueType, IssuePriority, IssueStatus } from '@/types/issue';
import { Project } from '@/types/project';
import { User } from '@/types/user';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function IssuesPage() {
  const router = useRouter();
  const [issues, setIssues] = useState<Issue[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProject, setSelectedProject] = useState<string>('');
  const [selectedType, setSelectedType] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [selectedPriority, setSelectedPriority] = useState<string>('');
  const [selectedAssignee, setSelectedAssignee] = useState<string>('');
  const [viewMode, setViewMode] = useState<'list' | 'board'>('list');

  useEffect(() => {
    fetchData();
  }, [selectedProject, selectedType, selectedStatus, selectedPriority, selectedAssignee]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (selectedProject) params.projectId = selectedProject;
      if (selectedType) params.type = selectedType;
      if (selectedStatus) params.status = selectedStatus;
      if (selectedPriority) params.priority = selectedPriority;
      if (selectedAssignee) params.assignee = selectedAssignee;

      const [issuesRes, projectsRes, usersRes] = await Promise.all([
        issuesAPI.getAll(params),
        projectsAPI.getAll(),
        usersAPI.getAll(),
      ]);

      // Handle different response formats
      const issuesData = issuesRes.data.issues || issuesRes.data;
      setIssues(Array.isArray(issuesData) ? issuesData : []);
      setProjects(Array.isArray(projectsRes.data) ? projectsRes.data : []);
      setUsers(Array.isArray(usersRes.data) ? usersRes.data : []);
    } catch (error) {
      console.error('Error fetching issues:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      fetchData();
      return;
    }
    try {
      setLoading(true);
      const response = await issuesAPI.search(searchQuery, selectedProject);
      const issuesData = response.data.issues || response.data;
      setIssues(Array.isArray(issuesData) ? issuesData : []);
    } catch (error) {
      console.error('Error searching issues:', error);
      setIssues([]);
    } finally {
      setLoading(false);
    }
  };

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedProject('');
    setSelectedType('');
    setSelectedStatus('');
    setSelectedPriority('');
    setSelectedAssignee('');
  };

  const getAssigneeName = (assignee: any) => {
    if (!assignee) return 'Unassigned';
    if (typeof assignee === 'string') {
      const user = users.find(u => u._id === assignee);
      return user ? `${user.firstName} ${user.lastName}` : 'Unknown';
    }
    return `${assignee.firstName} ${assignee.lastName}`;
  };

  const getProjectName = (projectId: any) => {
    if (typeof projectId === 'object') return projectId.name;
    const project = projects.find(p => p._id === projectId);
    return project ? project.name : 'Unknown';
  };

  return (
    <DashboardLayout>
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
              label: 'Issues',
              icon: (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              ),
            },
          ]}
          className="mb-6"
        />
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Issues</h1>
            <p className="text-gray-600 mt-1">Browse and manage all issues</p>
          </div>
          <Button onClick={() => router.push('/issues/new')}>
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Create Issue
          </Button>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
            {/* Search */}
            <div className="lg:col-span-2">
              <Input
                placeholder="Search issues..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                leftIcon={
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                }
              />
            </div>

            {/* Project Filter */}
            <Select
              value={selectedProject}
              onChange={(e) => setSelectedProject(e.target.value)}
            >
              <option value="">All Projects</option>
              {projects.map(project => (
                <option key={project._id} value={project._id}>{project.name}</option>
              ))}
            </Select>

            {/* Type Filter */}
            <Select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
            >
              <option value="">All Types</option>
              <option value="bug">Bug</option>
              <option value="task">Task</option>
              <option value="story">Story</option>
              <option value="epic">Epic</option>
            </Select>

            {/* Status Filter */}
            <Select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
            >
              <option value="">All Statuses</option>
              <option value="todo">To Do</option>
              <option value="in_progress">In Progress</option>
              <option value="in_review">In Review</option>
              <option value="testing">Testing</option>
              <option value="done">Done</option>
            </Select>

            {/* Priority Filter */}
            <Select
              value={selectedPriority}
              onChange={(e) => setSelectedPriority(e.target.value)}
            >
              <option value="">All Priorities</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </Select>
          </div>

          <div className="flex items-center justify-between mt-4">
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              Clear Filters
            </Button>
            <div className="flex items-center gap-2">
              <Button
                variant={viewMode === 'list' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('list')}
              >
                List
              </Button>
              <Button
                variant={viewMode === 'board' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('board')}
              >
                Board
              </Button>
            </div>
          </div>
        </div>

        {/* Issues List */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto"></div>
              <p className="mt-4 text-gray-600">Loading issues...</p>
            </div>
          </div>
        ) : viewMode === 'list' ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            {issues.length === 0 ? (
              <div className="px-6 py-12 text-center text-gray-500">
                <svg className="w-16 h-16 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                <p className="text-lg font-medium">No issues found</p>
                <p className="text-sm mt-1">Try adjusting your filters or create a new issue</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {issues.map((issue) => (
                  <Link
                    key={issue._id}
                    href={`/issues/${issue._id}`}
                    className="block px-6 py-4 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant={issue.type as any}>{issue.type}</Badge>
                          <Badge variant={issue.priority as any}>{issue.priority}</Badge>
                          <span className="text-xs text-gray-500">{issue.key}</span>
                        </div>
                        <h3 className="text-sm font-medium text-gray-900 mb-1">
                          {issue.title}
                        </h3>
                        <div className="flex items-center gap-4 text-xs text-gray-500">
                          <span>{getProjectName(issue.projectId)}</span>
                          <span>•</span>
                          <span>{getAssigneeName(issue.assignee)}</span>
                        </div>
                      </div>
                      <Badge variant={issue.status as any} dot>
                        {issue.status.replace(/_/g, ' ')}
                      </Badge>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-12 text-gray-500">
            <p>Board view coming soon!</p>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
