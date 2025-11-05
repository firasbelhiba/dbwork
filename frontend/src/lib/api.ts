import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

// Create axios instance
const api: AxiosInstance = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - Add auth token to requests
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem('accessToken');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor - Handle token refresh
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    // If error is 401 and we haven't retried yet
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem('refreshToken');
        if (!refreshToken) {
          // No refresh token, redirect to login
          window.location.href = '/login';
          return Promise.reject(error);
        }

        // Try to refresh the token
        const response = await axios.post(`${API_URL}/auth/refresh`, {
          refreshToken,
        });

        const { accessToken, refreshToken: newRefreshToken } = response.data;

        // Update tokens
        localStorage.setItem('accessToken', accessToken);
        localStorage.setItem('refreshToken', newRefreshToken);

        // Retry original request with new token
        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        }
        return api(originalRequest);
      } catch (refreshError) {
        // Refresh failed, clear tokens and redirect to login
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  register: (data: any) => api.post('/auth/register', data),
  login: (email: string, password: string) => api.post('/auth/login', { email, password }),
  logout: () => api.post('/auth/logout'),
  getMe: () => api.get('/auth/me'),
  refreshToken: (refreshToken: string) => api.post('/auth/refresh', { refreshToken }),
  changePassword: (data: { currentPassword: string; newPassword: string }) =>
    api.post('/auth/change-password', data),
};

// Users API
export const usersAPI = {
  getAll: (params?: any) => api.get('/users', { params }),
  getById: (id: string) => api.get(`/users/${id}`),
  search: (query: string) => api.get(`/users/search?q=${query}`),
  update: (id: string, data: any) => api.patch(`/users/${id}`, data),
  delete: (id: string) => api.delete(`/users/${id}`),
  uploadAvatar: (id: string, file: File) => {
    const formData = new FormData();
    formData.append('avatar', file);
    return api.post(`/users/${id}/avatar`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};

// Projects API
export const projectsAPI = {
  getAll: (params?: any) => api.get('/projects', { params }),
  getMyProjects: () => api.get('/projects/my-projects'),
  getById: (id: string) => api.get(`/projects/${id}`),
  getByKey: (key: string) => api.get(`/projects/key/${key}`),
  getStats: (id: string) => api.get(`/projects/${id}/stats`),
  create: (data: any) => api.post('/projects', data),
  update: (id: string, data: any) => api.patch(`/projects/${id}`, data),
  delete: (id: string) => api.delete(`/projects/${id}`),
  archive: (id: string) => api.post(`/projects/${id}/archive`),
  restore: (id: string) => api.post(`/projects/${id}/restore`),
  addMember: (id: string, data: any) => api.post(`/projects/${id}/members`, data),
  removeMember: (id: string, userId: string) => api.delete(`/projects/${id}/members/${userId}`),
  reorderColumns: (id: string, data: any) => api.post(`/projects/${id}/statuses/reorder`, data),
};

// Issues API
export const issuesAPI = {
  getAll: (params?: any) => api.get('/issues', { params }),
  getById: (id: string) => api.get(`/issues/${id}`),
  getSubIssues: (parentIssueId: string) => api.get(`/issues/${parentIssueId}/sub-issues`),
  getByProject: (projectId: string, params?: any) => api.get(`/issues/project/${projectId}`, { params }),
  getBySprint: (sprintId: string) => api.get(`/issues/sprint/${sprintId}`),
  getBacklog: (projectId: string) => api.get(`/issues/project/${projectId}/backlog`),
  search: (query: string, projectId?: string) => {
    const params = new URLSearchParams({ q: query });
    if (projectId) params.append('projectId', projectId);
    return api.get(`/issues/search?${params.toString()}`);
  },
  create: (data: any) => api.post('/issues', data),
  update: (id: string, data: any) => api.patch(`/issues/${id}`, data),
  delete: (id: string) => api.delete(`/issues/${id}`),
  bulkUpdate: (issueIds: string[], data: any) => api.patch('/issues/bulk-update', { issueIds, ...data }),
  updateOrder: (id: string, order: number) => api.patch(`/issues/${id}/order`, { order }),
  addTimeLog: (id: string, data: any) => api.post(`/issues/${id}/time-logs`, data),
  addWatcher: (id: string, userId: string) => api.post(`/issues/${id}/watchers`, { userId }),
  removeWatcher: (id: string, userId: string) => api.delete(`/issues/${id}/watchers/${userId}`),
  addBlocker: (id: string, blockerIssueId: string) => api.post(`/issues/${id}/blockers/${blockerIssueId}`),
  removeBlocker: (id: string, blockerIssueId: string) => api.delete(`/issues/${id}/blockers/${blockerIssueId}`),
};

// Sprints API
export const sprintsAPI = {
  getAll: (params?: any) => api.get('/sprints', { params }),
  getById: (id: string) => api.get(`/sprints/${id}`),
  getByProject: (projectId: string) => api.get('/sprints', { params: { projectId } }),
  getActiveSprint: (projectId: string) => api.get(`/sprints/project/${projectId}/active`),
  getVelocity: (id: string) => api.get(`/sprints/${id}/velocity`),
  getBurndown: (id: string) => api.get(`/sprints/${id}/burndown`),
  getProjectVelocity: (projectId: string, limit?: number) => {
    const params = limit ? { limit } : {};
    return api.get(`/sprints/project/${projectId}/velocity`, { params });
  },
  create: (data: any) => api.post('/sprints', data),
  update: (id: string, data: any) => api.patch(`/sprints/${id}`, data),
  delete: (id: string) => api.delete(`/sprints/${id}`),
  start: (id: string) => api.post(`/sprints/${id}/start`),
  complete: (id: string) => api.post(`/sprints/${id}/complete`),
  addIssue: (id: string, issueId: string) => api.post(`/sprints/${id}/issues/${issueId}`),
  removeIssue: (id: string, issueId: string) => api.delete(`/sprints/${id}/issues/${issueId}`),
};

// Comments API
export const commentsAPI = {
  getByIssue: (issueId: string) => api.get(`/comments/issue/${issueId}`),
  getReplies: (commentId: string) => api.get(`/comments/${commentId}/replies`),
  create: (issueId: string, data: any) => api.post(`/comments/issue/${issueId}`, data),
  update: (id: string, data: any) => api.patch(`/comments/${id}`, data),
  delete: (id: string) => api.delete(`/comments/${id}`),
  addReaction: (id: string, reaction: string) => api.post(`/comments/${id}/reactions`, { reaction }),
  removeReaction: (id: string, reaction: string) => api.delete(`/comments/${id}/reactions`, { data: { reaction } }),
};

// Notifications API
export const notificationsAPI = {
  getAll: (unreadOnly?: boolean) => {
    const params = unreadOnly ? { unreadOnly } : {};
    return api.get('/notifications', { params });
  },
  getUnreadCount: () => api.get('/notifications/unread-count'),
  markAsRead: (id: string) => api.patch(`/notifications/${id}/read`),
  markAllAsRead: () => api.post('/notifications/mark-all-read'),
  clearAll: () => api.delete('/notifications/clear-all'),
};

// Attachments API
export const attachmentsAPI = {
  getByIssue: (issueId: string) => api.get(`/attachments/issue/${issueId}`),
  upload: (issueId: string, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post(`/attachments/issue/${issueId}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  download: (id: string) => api.get(`/attachments/${id}/download`, { responseType: 'blob' }),
  delete: (id: string) => api.delete(`/attachments/${id}`),
};

// Reports API
export const reportsAPI = {
  getProjectProgress: (projectId: string) => api.get(`/reports/project/${projectId}/progress`),
  getTeamPerformance: (projectId?: string) => {
    const params = projectId ? { projectId } : {};
    return api.get('/reports/team/performance', { params });
  },
  getIssueStatistics: (projectId?: string) => {
    const params = projectId ? { projectId } : {};
    return api.get('/reports/issues/statistics', { params });
  },
  getSprintBurndown: (sprintId: string) => api.get(`/reports/sprint/${sprintId}/burndown`),
  getVelocityTrend: (projectId: string, sprintCount?: number) => {
    const params = sprintCount ? { sprintCount } : {};
    return api.get(`/reports/project/${projectId}/velocity`, { params });
  },
  getTimeTracking: (projectId?: string) => {
    const params = projectId ? { projectId } : {};
    return api.get('/reports/time-tracking', { params });
  },
  getStatusDistribution: (projectId: string) => api.get(`/reports/project/${projectId}/status-distribution`),
  getTeamWorkloadBreakdown: (projectId: string) => api.get(`/reports/project/${projectId}/team-workload`),
  getIssueCreationTrend: (projectId: string, days?: number) => {
    const params = days ? { days } : {};
    return api.get(`/reports/project/${projectId}/issue-creation-trend`, { params });
  },
};

// Activities API
export const activitiesAPI = {
  getAll: (params?: any) => api.get('/activities', { params }),
  getRecent: () => api.get('/activities/recent'),
  getStats: () => api.get('/activities/stats'),
};

// Feedback API
export const feedbackAPI = {
  getAll: (params?: any) => api.get('/feedback', { params }),
  getById: (id: string) => api.get(`/feedback/${id}`),
  create: (data: any) => api.post('/feedback', data),
  update: (id: string, data: any) => api.patch(`/feedback/${id}`, data),
  delete: (id: string) => api.delete(`/feedback/${id}`),
  upvote: (id: string) => api.post(`/feedback/${id}/upvote`),
  resolve: (id: string) => api.patch(`/feedback/${id}/resolve`),
  reopen: (id: string) => api.patch(`/feedback/${id}/reopen`),
  getStats: () => api.get('/feedback/stats'),
};

// Changelogs API
export const changelogsAPI = {
  getAll: (params?: any) => api.get('/changelogs', { params }),
  getById: (id: string) => api.get(`/changelogs/${id}`),
  getLatest: () => api.get('/changelogs/latest'),
  create: (data: any) => api.post('/changelogs', data),
  update: (id: string, data: any) => api.patch(`/changelogs/${id}`, data),
  delete: (id: string) => api.delete(`/changelogs/${id}`),
};

export default api;
