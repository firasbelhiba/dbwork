'use client';

import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Badge, Button, Input, Select, Breadcrumb, LogoLoader } from '@/components/common';
import { issuesAPI, projectsAPI, usersAPI } from '@/lib/api';
import { Issue, IssueType, IssuePriority, IssueStatus } from '@/types/issue';
import { Project } from '@/types/project';
import { User, UserRole } from '@/types/user';
import { KanbanBoard } from '@/components/kanban';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

export default function IssuesPage() {
  const router = useRouter();
  const { user } = useAuth();
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
  const [selectedAssignees, setSelectedAssignees] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<'list' | 'board'>('list');
  const [showAssigneeDropdown, setShowAssigneeDropdown] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(100);

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user, selectedProject, selectedType, selectedStatus, selectedPriority, selectedAssignees]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const isAdmin = user?.role === UserRole.ADMIN;
      const params: any = {};

      if (selectedProject) params.projectId = selectedProject;
      if (selectedType) params.type = selectedType;
      if (selectedStatus) params.status = selectedStatus;
      if (selectedPriority) params.priority = selectedPriority;

      // Handle multiple assignees filter
      if (selectedAssignees.length > 0) {
        params.assignees = selectedAssignees;
      }

      const [issuesRes, projectsRes, usersRes] = await Promise.all([
        issuesAPI.getAll(params),
        // Admin sees all projects, regular users see only their projects
        isAdmin ? projectsAPI.getAll() : projectsAPI.getMyProjects(),
        usersAPI.getAll(),
      ]);

      // Handle different response formats - backend returns {items: [...], total, page, limit, pages}
      const issuesData = issuesRes.data.items || issuesRes.data.issues || issuesRes.data;
      const filteredIssues = Array.isArray(issuesData) ? issuesData : [];

      setIssues(filteredIssues);
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
      const issuesData = response.data.items || response.data.issues || response.data;
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
    setSelectedAssignees([]);
  };

  const toggleAssignee = (assigneeId: string) => {
    setSelectedAssignees(prev =>
      prev.includes(assigneeId)
        ? prev.filter(id => id !== assigneeId)
        : [...prev, assigneeId]
    );
  };

  const getAssigneeButtonText = () => {
    if (selectedAssignees.length === 0) return 'All Members';
    if (selectedAssignees.length === 1) {
      if (selectedAssignees[0] === user?._id) return 'Only Me';
      const assignee = availableAssignees.find((a: User) => a._id === selectedAssignees[0]);
      return assignee ? `${assignee.firstName} ${assignee.lastName}` : 'All Members';
    }
    return `${selectedAssignees.length} Members Selected`;
  };

  const getAssigneesNames = (assignees: any[]) => {
    if (!assignees || assignees.length === 0) return 'Unassigned';
    const names = assignees.map(a => {
      if (typeof a === 'string') {
        const user = users.find((u: User) => u._id === a);
        return user ? `${user.firstName} ${user.lastName}` : 'Unknown';
      }
      return `${a.firstName} ${a.lastName}`;
    });
    return names.join(', ');
  };

  const getProjectName = (projectId: any) => {
    if (typeof projectId === 'object') return projectId.name;
    const project = projects.find((p: Project) => p._id === projectId);
    return project ? project.name : 'Unknown';
  };

  // Get available assignees based on selected project
  const getAvailableAssignees = () => {
    if (!selectedProject) {
      // No project selected: show all users from user's projects
      const projectMemberIds = new Set<string>();
      projects.forEach(project => {
        project.members?.forEach(member => {
          const memberId = typeof member.userId === 'object' ? member.userId._id : member.userId;
          projectMemberIds.add(memberId);
        });
      });
      return users.filter(u => projectMemberIds.has(u._id));
    }

    // Project selected: show only members of that project
    const project = projects.find((p: Project) => p._id === selectedProject);
    if (!project || !project.members) return [];

    const memberIds = project.members.map(member =>
      typeof member.userId === 'object' ? member.userId._id : member.userId
    );
    return users.filter(u => memberIds.includes(u._id));
  };

  const availableAssignees = getAvailableAssignees();

  return (
    <DashboardLayout>
      <div className="p-4 md:p-6 lg:p-8">
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
          className="mb-4 md:mb-6"
        />
        {/* Header */}
        <div className="mb-6 md:mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-gray-100">Issues</h1>
            <p className="text-sm md:text-base text-gray-600 dark:text-gray-400 mt-1">Browse and manage all issues</p>
          </div>
          <Button onClick={() => router.push('/issues/new')} className="w-full sm:w-auto">
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Create Issue
          </Button>
        </div>

        {/* Filters */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 md:p-6 mb-4 md:mb-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
            {/* Search */}
            <div className="sm:col-span-2 lg:col-span-3">
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
              onChange={(e) => {
                setSelectedProject(e.target.value);
                // Clear assignee filter when project changes
                setSelectedAssignees([]);
              }}
            >
              <option value="">All Projects</option>
              {projects.map(project => (
                <option key={project._id} value={project._id}>{project.name}</option>
              ))}
            </Select>

            {/* Assignee Filter - Multi-select with Checkboxes */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowAssigneeDropdown(!showAssigneeDropdown)}
                className="w-full px-3 py-2 text-left bg-white dark:bg-dark-400 border border-gray-300 dark:border-dark-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors text-sm"
              >
                <div className="flex items-center justify-between">
                  <span className={selectedAssignees.length === 0 ? 'text-gray-500 dark:text-gray-400' : 'text-gray-900 dark:text-gray-100'}>
                    {getAssigneeButtonText()}
                  </span>
                  <svg
                    className={`w-5 h-5 text-gray-400 transition-transform ${showAssigneeDropdown ? 'transform rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </button>

              {showAssigneeDropdown && (
                <>
                  {/* Backdrop */}
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setShowAssigneeDropdown(false)}
                  />

                  {/* Dropdown */}
                  <div className="absolute z-20 mt-2 w-full bg-white dark:bg-dark-400 border border-gray-200 dark:border-dark-300 rounded-lg shadow-lg max-h-64 overflow-y-auto">
                    {/* Action Buttons */}
                    <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-200 dark:border-dark-300 bg-gray-50 dark:bg-dark-300">
                      <button
                        type="button"
                        onClick={() => setSelectedAssignees([])}
                        className="flex-1 px-3 py-1.5 text-xs font-medium text-danger-600 dark:text-danger-400 hover:bg-white dark:hover:bg-dark-400 rounded transition-colors"
                      >
                        <svg className="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                        Uncheck All
                      </button>
                      {availableAssignees.length > 0 && (
                        <button
                          type="button"
                          onClick={() => {
                            const allIds = [user?._id, ...availableAssignees.map(a => a._id)].filter(Boolean) as string[];
                            setSelectedAssignees(allIds);
                          }}
                          className="flex-1 px-3 py-1.5 text-xs font-medium text-primary-600 dark:text-primary-400 hover:bg-white dark:hover:bg-dark-400 rounded transition-colors"
                        >
                          <svg className="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          Select All
                        </button>
                      )}
                    </div>

                    {/* Only Me Option */}
                    {user && (
                      <label className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-dark-300 cursor-pointer transition-colors border-b border-gray-100 dark:border-dark-300">
                        <input
                          type="checkbox"
                          checked={selectedAssignees.includes(user._id)}
                          onChange={() => toggleAssignee(user._id)}
                          className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                        />
                        <div className="flex items-center gap-2 flex-1">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-500 to-primary-600 text-white flex items-center justify-center text-xs font-semibold">
                            {user.firstName[0]}{user.lastName[0]}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                              Only Me
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              {user.email}
                            </p>
                          </div>
                        </div>
                      </label>
                    )}

                    {/* Other Team Members */}
                    {availableAssignees
                      .filter(assignee => assignee._id !== user?._id)
                      .map(assignee => (
                        <label
                          key={assignee._id}
                          className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-dark-300 cursor-pointer transition-colors"
                        >
                          <input
                            type="checkbox"
                            checked={selectedAssignees.includes(assignee._id)}
                            onChange={() => toggleAssignee(assignee._id)}
                            className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                          />
                          <div className="flex items-center gap-2 flex-1">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-secondary-500 to-secondary-600 text-white flex items-center justify-center text-xs font-semibold">
                              {assignee.firstName[0]}{assignee.lastName[0]}
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                {assignee.firstName} {assignee.lastName}
                              </p>
                              <p className="text-xs text-gray-500 dark:text-gray-400">
                                {assignee.email}
                              </p>
                            </div>
                          </div>
                        </label>
                      ))}

                    {availableAssignees.length === 0 && (
                      <div className="px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                        No team members available
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>

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

          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mt-4">
            <Button variant="ghost" size="sm" onClick={clearFilters} className="w-full sm:w-auto">
              Clear Filters
            </Button>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Button
                variant={viewMode === 'list' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('list')}
                className="flex-1 sm:flex-none"
              >
                List
              </Button>
              <Button
                variant={viewMode === 'board' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('board')}
                className="flex-1 sm:flex-none"
              >
                Board
              </Button>
            </div>
          </div>
        </div>

        {/* Issues List */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <LogoLoader size="lg" text="Loading issues" />
          </div>
        ) : viewMode === 'list' ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
            {issues.length === 0 ? (
              <div className="px-4 md:px-6 py-8 md:py-12 text-center text-gray-500 dark:text-gray-400">
                <svg className="w-12 h-12 md:w-16 md:h-16 mx-auto text-gray-400 dark:text-gray-500 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                <p className="text-base md:text-lg font-medium dark:text-gray-100">No issues found</p>
                <p className="text-xs md:text-sm mt-1 dark:text-gray-400">Try adjusting your filters or create a new issue</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {issues.map((issue) => (
                  <Link
                    key={issue._id}
                    href={`/issues/${issue._id}`}
                    className="block px-4 md:px-6 py-3 md:py-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2 md:gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1 md:gap-2 mb-2 flex-wrap">
                          <Badge variant={issue.type as any}>{issue.type}</Badge>
                          <Badge variant={issue.priority as any}>{issue.priority}</Badge>
                          <span className="text-xs text-gray-500 dark:text-gray-400">{issue.key}</span>
                        </div>
                        <h3 className="text-xs md:text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">
                          {issue.title}
                        </h3>
                        <div className="flex items-center gap-2 md:gap-4 text-xs text-gray-500 dark:text-gray-400 flex-wrap">
                          <span className="truncate max-w-[120px] md:max-w-none">{getProjectName(issue.projectId)}</span>
                          <span className="hidden sm:inline">•</span>
                          <span className="truncate max-w-[120px] md:max-w-none">{getAssigneesNames(issue.assignees)}</span>
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
        ) : selectedProject ? (
          <KanbanBoard
            projectId={selectedProject}
            sprintId={undefined}
            zoomLevel={zoomLevel}
          />
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 md:p-8 text-center">
            <svg className="w-12 h-12 md:w-16 md:h-16 mx-auto text-gray-400 dark:text-gray-500 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
            </svg>
            <p className="text-base md:text-lg font-medium text-gray-900 dark:text-gray-100">Select a Project</p>
            <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400 mt-1">Choose a project from the filter above to view the board</p>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
