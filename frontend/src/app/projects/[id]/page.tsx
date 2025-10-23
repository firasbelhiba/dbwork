'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { projectsAPI, sprintsAPI, issuesAPI } from '@/lib/api';
import { Project } from '@/types/project';
import { Sprint } from '@/types/sprint';
import { Issue } from '@/types/issue';
import { KanbanBoard } from '@/components/kanban';
import { Button, Badge, Select, Breadcrumb } from '@/components/common';
import Link from 'next/link';
import { getInitials } from '@/lib/utils';

export default function ProjectDetailPage() {
  const params = useParams();
  const projectId = params.id as string;

  const [project, setProject] = useState<Project | null>(null);
  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [activeSprint, setActiveSprint] = useState<Sprint | null>(null);
  const [selectedSprintId, setSelectedSprintId] = useState<string>('all');
  const [view, setView] = useState<'board' | 'list'>('board');
  const [loading, setLoading] = useState(true);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [loadingIssues, setLoadingIssues] = useState(false);

  useEffect(() => {
    if (projectId) {
      fetchProjectData();
    }
  }, [projectId]);

  useEffect(() => {
    if (projectId && view === 'list') {
      fetchIssues();
    }
  }, [projectId, selectedSprintId, view]);

  const fetchProjectData = async () => {
    try {
      const [projectRes, sprintsRes, activeSprintRes] = await Promise.all([
        projectsAPI.getById(projectId),
        sprintsAPI.getByProject(projectId),
        sprintsAPI.getActiveSprint(projectId).catch(() => ({ data: null })),
      ]);

      setProject(projectRes.data);
      setSprints(sprintsRes.data);
      setActiveSprint(activeSprintRes.data);

      if (activeSprintRes.data) {
        setSelectedSprintId(activeSprintRes.data._id);
      }
    } catch (error) {
      console.error('Error fetching project data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchIssues = async () => {
    setLoadingIssues(true);
    try {
      const params: any = { projectId };
      if (selectedSprintId !== 'all') {
        params.sprintId = selectedSprintId;
      }
      const response = await issuesAPI.getAll(params);
      const issuesData = response.data.items || response.data.issues || response.data;
      setIssues(Array.isArray(issuesData) ? issuesData : []);
    } catch (error) {
      console.error('Error fetching issues:', error);
      setIssues([]);
    } finally {
      setLoadingIssues(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading project...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!project) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900">Project not found</h2>
            <p className="text-gray-600 mt-2">The project you're looking for doesn't exist.</p>
            <Link href="/projects">
              <Button className="mt-4">Back to Projects</Button>
            </Link>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="h-full flex flex-col">
        {/* Project Header */}
        <div className="bg-white border-b border-gray-200 px-8 py-6">
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
                label: 'Projects',
                href: '/projects',
                icon: (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                ),
              },
              {
                label: project.name,
              },
            ]}
            className="mb-4"
          />
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded bg-primary/20 flex items-center justify-center">
                <span className="text-lg font-bold text-primary">{project.key}</span>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{project.name}</h1>
                <p className="text-gray-600 text-sm">{project.description}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Link href={`/projects/${projectId}/settings`}>
                <Button variant="outline">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </Button>
              </Link>
            </div>
          </div>

          {/* Team Members */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">Team:</span>
              <div className="flex -space-x-2">
                {project.members?.slice(0, 5).map((member, index) => {
                  const user = typeof member.userId === 'object' ? member.userId : null;
                  return user ? (
                    <div
                      key={index}
                      className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center text-xs font-medium border-2 border-white"
                      title={`${user.firstName} ${user.lastName}`}
                    >
                      {getInitials(user.firstName, user.lastName)}
                    </div>
                  ) : null;
                })}
                {project.members && project.members.length > 5 && (
                  <div className="w-8 h-8 rounded-full bg-gray-200 text-gray-600 flex items-center justify-center text-xs font-medium border-2 border-white">
                    +{project.members.length - 5}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Toolbar */}
        <div className="bg-white border-b border-gray-200 px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {/* Sprint Selector */}
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-700">Sprint:</span>
                <select
                  value={selectedSprintId}
                  onChange={(e) => setSelectedSprintId(e.target.value)}
                  className="px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="all">All Issues</option>
                  {sprints.map((sprint) => (
                    <option key={sprint._id} value={sprint._id}>
                      {sprint.name} {sprint.status === 'active' && '(Active)'}
                    </option>
                  ))}
                </select>
              </div>

              {/* View Toggle */}
              <div className="flex items-center gap-1 bg-gray-100 rounded-md p-1">
                <button
                  onClick={() => setView('board')}
                  className={`px-3 py-1.5 text-sm font-medium rounded transition-colors ${
                    view === 'board'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Board
                </button>
                <button
                  onClick={() => setView('list')}
                  className={`px-3 py-1.5 text-sm font-medium rounded transition-colors ${
                    view === 'list'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  List
                </button>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Link href={`/issues/new?project=${projectId}`}>
                <Button>
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Create Issue
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto bg-gray-50 p-8">
          {view === 'board' ? (
            <KanbanBoard
              projectId={projectId}
              sprintId={selectedSprintId === 'all' ? undefined : selectedSprintId}
            />
          ) : loadingIssues ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto"></div>
                <p className="mt-4 text-gray-600">Loading issues...</p>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              {issues.length === 0 ? (
                <div className="px-6 py-12 text-center text-gray-500">
                  <svg className="w-16 h-16 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  <p className="text-lg font-medium">No issues found</p>
                  <p className="text-sm mt-1">Create your first issue to get started</p>
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
                            {issue.assignee && (
                              <span>
                                Assigned to: {typeof issue.assignee === 'object'
                                  ? `${issue.assignee.firstName} ${issue.assignee.lastName}`
                                  : 'Unknown'}
                              </span>
                            )}
                            {!issue.assignee && <span>Unassigned</span>}
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
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
