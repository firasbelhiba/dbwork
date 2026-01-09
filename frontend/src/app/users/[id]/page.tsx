'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Badge, Breadcrumb, Button, LogoLoader } from '@/components/common';
import { UserAvatar } from '@/components/common/UserAvatar';
import { TicketCalendar } from '@/components/users/TicketCalendar';
import { usersAPI, issuesAPI, organizationsAPI, achievementsAPI } from '@/lib/api';
import { User, UserRole } from '@/types/user';
import { Organization } from '@/types/organization';
import { formatDateTime, getRelativeTime } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import toast from 'react-hot-toast';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

interface WorkloadData {
  totalInProgress: number;
  byProject: Array<{
    projectId: string;
    projectName: string;
    projectKey: string;
    issues: Array<{
      _id: string;
      key: string;
      title: string;
      status: string;
      priority: string;
      type: string;
    }>;
  }>;
}

interface BandwidthData {
  projects: Array<{
    _id: string;
    key: string;
    name: string;
    logo?: string;
  }>;
  bandwidth: {
    daily: { worked: number; target: number; remaining: number; percentage: number };
    weekly: { worked: number; target: number; remaining: number; percentage: number };
    monthly: { worked: number; target: number; remaining: number; percentage: number };
  };
  activeTimer: {
    issueKey: string;
    issueTitle: string;
    projectKey: string;
    startedAt: string;
    isPaused: boolean;
  } | null;
}

interface AchievementData {
  _id: string;
  key: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  rarity: string;
}

interface UserAchievement {
  achievementId: AchievementData;
  unlocked: boolean;
  unlockedAt?: string;
  progress: number;
  viewed: boolean;
}

interface CategoryStats {
  categories: Array<{
    name: string;
    count: number;
    percentage: number;
    color: string;
  }>;
  total: number;
}

export default function UserProfilePage() {
  const params = useParams();
  const router = useRouter();
  const { user: currentUser } = useAuth();
  const userId = params.id as string;

  const [user, setUser] = useState<User | null>(null);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [workload, setWorkload] = useState<WorkloadData | null>(null);
  const [bandwidth, setBandwidth] = useState<BandwidthData | null>(null);
  const [achievements, setAchievements] = useState<UserAchievement[]>([]);
  const [categoryStats, setCategoryStats] = useState<CategoryStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingWorkload, setLoadingWorkload] = useState(false);
  const [loadingBandwidth, setLoadingBandwidth] = useState(false);
  const [loadingAchievements, setLoadingAchievements] = useState(false);
  const [loadingCategoryStats, setLoadingCategoryStats] = useState(false);

  useEffect(() => {
    if (userId) {
      fetchUserData();
    }
  }, [userId]);

  const fetchUserData = async () => {
    try {
      setLoading(true);
      const [userRes, orgsRes] = await Promise.all([
        usersAPI.getById(userId),
        organizationsAPI.getAll(),
      ]);
      setUser(userRes.data);
      setOrganizations(orgsRes.data || []);

      // Fetch additional data
      fetchWorkload();
      fetchBandwidth();
      fetchAchievements();
      fetchCategoryStats();
    } catch (error: any) {
      console.error('Error fetching user:', error);
      if (error.response?.status === 404) {
        toast.error('User not found');
        router.push('/users');
      } else {
        toast.error('Failed to load user profile');
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchWorkload = async () => {
    setLoadingWorkload(true);
    try {
      const response = await issuesAPI.getUserWorkload(userId);
      setWorkload(response.data);
    } catch (error) {
      console.error('Error fetching workload:', error);
    } finally {
      setLoadingWorkload(false);
    }
  };

  const fetchBandwidth = async () => {
    setLoadingBandwidth(true);
    try {
      const response = await issuesAPI.getUserBandwidth(userId);
      setBandwidth(response.data);
    } catch (error) {
      console.error('Error fetching bandwidth:', error);
    } finally {
      setLoadingBandwidth(false);
    }
  };

  const fetchAchievements = async () => {
    setLoadingAchievements(true);
    try {
      const response = await achievementsAPI.getUserAchievements(userId);
      setAchievements(response.data || []);
    } catch (error) {
      console.error('Error fetching achievements:', error);
    } finally {
      setLoadingAchievements(false);
    }
  };

  const fetchCategoryStats = async () => {
    setLoadingCategoryStats(true);
    try {
      const response = await issuesAPI.getUserCategoryStats(userId);
      setCategoryStats(response.data);
    } catch (error) {
      console.error('Error fetching category stats:', error);
    } finally {
      setLoadingCategoryStats(false);
    }
  };

  const formatCategoryName = (name: string): string => {
    return name.charAt(0).toUpperCase() + name.slice(1).replace(/_/g, ' ');
  };

  const formatHours = (hours: number): string => {
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    if (h === 0 && m === 0) return '0h';
    if (h === 0) return `${m}m`;
    if (m === 0) return `${h}h`;
    return `${h}h ${m}m`;
  };

  const getBandwidthColor = (percentage: number): string => {
    if (percentage >= 100) return 'bg-success-500';
    if (percentage >= 75) return 'bg-primary-500';
    if (percentage >= 50) return 'bg-warning-500';
    return 'bg-gray-300 dark:bg-gray-600';
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'admin': return 'critical';
      case 'project_manager': return 'high';
      case 'developer': return 'medium';
      case 'viewer': return 'low';
      default: return 'default';
    }
  };

  const formatRole = (role: string) => {
    return role.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'bug':
        return <svg className="w-4 h-4 text-danger-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M6.56 1.14a.75.75 0 01.177 1.045 3.989 3.989 0 00-.464.86c.185.17.382.329.59.473A3.993 3.993 0 0110 2c1.272 0 2.405.594 3.137 1.518.208-.144.405-.302.59-.473a3.989 3.989 0 00-.464-.86.75.75 0 011.222-.869c.369.519.65 1.105.822 1.736a.75.75 0 01-.174.707 7.03 7.03 0 01-1.299 1.098A4 4 0 0114 6c0 .52-.301.963-.723 1.187a6.961 6.961 0 01-.172 3.223 6.87 6.87 0 01-1.267 2.37l1.108 1.109a.75.75 0 01-1.06 1.06l-1.109-1.108a6.87 6.87 0 01-2.37 1.267 6.961 6.961 0 01-3.223.172A1.28 1.28 0 016 16a4 4 0 01-.166-1.833 7.03 7.03 0 01-1.098-1.299.75.75 0 01.707-.174c.631.172 1.217.453 1.736.822a.75.75 0 01-.869 1.222 3.989 3.989 0 00-.86-.464c.144.208.302.405.473.59A3.993 3.993 0 012 10c0-1.272.594-2.405 1.518-3.137a5.023 5.023 0 01-.473-.59 3.989 3.989 0 00.86.464.75.75 0 01.869-1.222 4.97 4.97 0 01-1.736-.822.75.75 0 01-.174-.707c.172-.631.453-1.217.822-1.736a.75.75 0 011.045-.177z" clipRule="evenodd" /></svg>;
      case 'task':
        return <svg className="w-4 h-4 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>;
      case 'story':
        return <svg className="w-4 h-4 text-success-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>;
      default:
        return <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>;
    }
  };

  const getRarityColor = (rarity: string) => {
    switch (rarity) {
      case 'legendary': return 'text-yellow-500 bg-yellow-500/10 border-yellow-500/30';
      case 'epic': return 'text-purple-500 bg-purple-500/10 border-purple-500/30';
      case 'rare': return 'text-blue-500 bg-blue-500/10 border-blue-500/30';
      default: return 'text-gray-500 bg-gray-500/10 border-gray-500/30';
    }
  };

  // Get user's organizations
  const userOrganizations = organizations.filter(org => user?.organizationIds?.includes(org._id));

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-full">
          <LogoLoader size="lg" text="Loading profile" />
        </div>
      </DashboardLayout>
    );
  }

  if (!user) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center h-full">
          <svg className="w-16 h-16 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">User Not Found</h2>
          <p className="text-gray-500 dark:text-gray-400 mb-4">The user you're looking for doesn't exist.</p>
          <Button onClick={() => router.push('/users')}>Go Back</Button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="h-full overflow-auto">
        <div className="p-8 max-w-7xl mx-auto">
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
              { label: 'Users', href: '/users' },
              { label: `${user.firstName} ${user.lastName}` },
            ]}
            className="mb-6"
          />

          {/* Profile Header */}
          <div className="bg-white dark:bg-dark-400 rounded-xl shadow-sm border border-gray-200 dark:border-dark-300 p-8 mb-6">
            <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
              <UserAvatar
                userId={user._id}
                avatar={user.avatar}
                firstName={user.firstName}
                lastName={user.lastName}
                size="2xl"
                showOnlineStatus={true}
                className="shadow-lg"
              />
              <div className="flex-1 text-center md:text-left">
                <div className="flex flex-col md:flex-row md:items-center gap-3 mb-2">
                  <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                    {user.firstName} {user.lastName}
                  </h1>
                  <Badge variant={getRoleBadgeVariant(user.role) as any} className="w-fit mx-auto md:mx-0">
                    {formatRole(user.role)}
                  </Badge>
                </div>
                <p className="text-gray-600 dark:text-gray-400 mb-4">{user.email}</p>
                <div className="flex flex-wrap items-center justify-center md:justify-start gap-4">
                  <div className="flex items-center gap-2">
                    <div className={`w-2.5 h-2.5 rounded-full ${user.isActive ? 'bg-success-500' : 'bg-gray-400'}`} />
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      {user.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  {user.lastLoginAt && (
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      Last seen {getRelativeTime(user.lastLoginAt)}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column - Account Info & Organizations */}
            <div className="space-y-6">
              {/* Account Information */}
              <div className="bg-white dark:bg-dark-400 rounded-xl shadow-sm border border-gray-200 dark:border-dark-300 p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  Account Information
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">Email</label>
                    <p className="text-sm text-gray-900 dark:text-gray-100 mt-1">{user.email}</p>
                  </div>
                  {user.gmailEmail && user.gmailEmail !== user.email && (
                    <div>
                      <label className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">Gmail Email</label>
                      <p className="text-sm text-gray-900 dark:text-gray-100 mt-1 flex items-center gap-2">
                        <svg className="w-4 h-4 text-red-500" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M20 18h-2V9.25L12 13 6 9.25V18H4V6h1.2l6.8 4.25L18.8 6H20m0-2H4c-1.11 0-2 .89-2 2v12a2 2 0 002 2h16a2 2 0 002-2V6a2 2 0 00-2-2z"/>
                        </svg>
                        {user.gmailEmail}
                      </p>
                    </div>
                  )}
                  <div>
                    <label className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">Role</label>
                    <p className="text-sm text-gray-900 dark:text-gray-100 mt-1">{formatRole(user.role)}</p>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">Member Since</label>
                    <p className="text-sm text-gray-900 dark:text-gray-100 mt-1">{formatDateTime(user.createdAt)}</p>
                  </div>
                  {user.lastLoginAt && (
                    <div>
                      <label className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">Last Login</label>
                      <p className="text-sm text-gray-900 dark:text-gray-100 mt-1">{formatDateTime(user.lastLoginAt)}</p>
                    </div>
                  )}
                  <div>
                    <label className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">Last Updated</label>
                    <p className="text-sm text-gray-900 dark:text-gray-100 mt-1">{formatDateTime(user.updatedAt)}</p>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">Account Status</label>
                    <div className="mt-1">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        user.isActive
                          ? 'bg-success-100 text-success-800 dark:bg-success-900/30 dark:text-success-400'
                          : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400'
                      }`}>
                        {user.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Organizations */}
              <div className="bg-white dark:bg-dark-400 rounded-xl shadow-sm border border-gray-200 dark:border-dark-300 p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                  Organizations
                </h3>
                {userOrganizations.length > 0 ? (
                  <div className="space-y-2">
                    {userOrganizations.map((org) => (
                      <div
                        key={org._id}
                        className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-dark-300 rounded-lg"
                      >
                        {org.logo ? (
                          <img src={org.logo} alt={org.name} className="w-10 h-10 rounded-lg object-cover" />
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
                            <span className="text-sm font-bold text-primary-600 dark:text-primary-400">
                              {org.key.substring(0, 2)}
                            </span>
                          </div>
                        )}
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{org.name}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">{org.key}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6">
                    <svg className="w-10 h-10 text-gray-400 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Not part of any organization</p>
                  </div>
                )}
              </div>

              {/* Expertise Distribution */}
              <div className="bg-white dark:bg-dark-400 rounded-xl shadow-sm border border-gray-200 dark:border-dark-300 p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
                  </svg>
                  Expertise
                </h3>
                {loadingCategoryStats ? (
                  <div className="flex items-center justify-center py-8">
                    <LogoLoader size="sm" text="Loading" />
                  </div>
                ) : categoryStats && categoryStats.categories.length > 0 ? (
                  <div className="flex flex-col items-center">
                    <div className="w-full h-48">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={categoryStats.categories}
                            cx="50%"
                            cy="50%"
                            innerRadius={45}
                            outerRadius={70}
                            paddingAngle={2}
                            dataKey="count"
                            nameKey="name"
                          >
                            {categoryStats.categories.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip
                            content={({ active, payload }) => {
                              if (active && payload && payload.length) {
                                const data = payload[0].payload;
                                return (
                                  <div className="bg-white dark:bg-dark-300 px-3 py-2 rounded-lg shadow-lg border border-gray-200 dark:border-dark-200">
                                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                      {formatCategoryName(data.name)}
                                    </p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">
                                      {data.count} issues ({data.percentage}%)
                                    </p>
                                  </div>
                                );
                              }
                              return null;
                            }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="w-full mt-2 space-y-1.5">
                      {categoryStats.categories.slice(0, 5).map((cat) => (
                        <div key={cat.name} className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2">
                            <div
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: cat.color }}
                            />
                            <span className="text-gray-700 dark:text-gray-300">
                              {formatCategoryName(cat.name)}
                            </span>
                          </div>
                          <span className="font-medium text-gray-900 dark:text-gray-100">
                            {cat.percentage}%
                          </span>
                        </div>
                      ))}
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-3">
                      Based on {categoryStats.total} completed issues
                    </p>
                  </div>
                ) : (
                  <div className="text-center py-6">
                    <svg className="w-10 h-10 text-gray-400 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
                    </svg>
                    <p className="text-sm text-gray-500 dark:text-gray-400">No completed issues yet</p>
                  </div>
                )}
              </div>
            </div>

            {/* Middle Column - Availability & Projects */}
            <div className="space-y-6">
              {/* Availability */}
              <div className="bg-white dark:bg-dark-400 rounded-xl shadow-sm border border-gray-200 dark:border-dark-300 p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Availability
                </h3>
                {loadingBandwidth ? (
                  <div className="flex items-center justify-center py-8">
                    <LogoLoader size="sm" text="Loading" />
                  </div>
                ) : bandwidth ? (
                  <div className="space-y-4">
                    {/* Daily */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm text-gray-600 dark:text-gray-400">Today</span>
                        <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          {formatHours(bandwidth.bandwidth.daily.worked)} / {bandwidth.bandwidth.daily.target}h
                        </span>
                      </div>
                      <div className="h-2.5 bg-gray-200 dark:bg-dark-200 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${getBandwidthColor(bandwidth.bandwidth.daily.percentage)}`}
                          style={{ width: `${Math.min(100, bandwidth.bandwidth.daily.percentage)}%` }}
                        />
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {bandwidth.bandwidth.daily.remaining > 0
                          ? `${formatHours(bandwidth.bandwidth.daily.remaining)} remaining`
                          : 'Target reached!'}
                      </p>
                    </div>

                    {/* Weekly */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm text-gray-600 dark:text-gray-400">This Week</span>
                        <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          {formatHours(bandwidth.bandwidth.weekly.worked)} / {bandwidth.bandwidth.weekly.target}h
                        </span>
                      </div>
                      <div className="h-2.5 bg-gray-200 dark:bg-dark-200 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${getBandwidthColor(bandwidth.bandwidth.weekly.percentage)}`}
                          style={{ width: `${Math.min(100, bandwidth.bandwidth.weekly.percentage)}%` }}
                        />
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {bandwidth.bandwidth.weekly.remaining > 0
                          ? `${formatHours(bandwidth.bandwidth.weekly.remaining)} remaining`
                          : 'Target reached!'}
                      </p>
                    </div>

                    {/* Monthly */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm text-gray-600 dark:text-gray-400">This Month</span>
                        <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          {formatHours(bandwidth.bandwidth.monthly.worked)} / {bandwidth.bandwidth.monthly.target}h
                        </span>
                      </div>
                      <div className="h-2.5 bg-gray-200 dark:bg-dark-200 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${getBandwidthColor(bandwidth.bandwidth.monthly.percentage)}`}
                          style={{ width: `${Math.min(100, bandwidth.bandwidth.monthly.percentage)}%` }}
                        />
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {bandwidth.bandwidth.monthly.remaining > 0
                          ? `${formatHours(bandwidth.bandwidth.monthly.remaining)} remaining`
                          : 'Target reached!'}
                      </p>
                    </div>

                    {/* Active Timer */}
                    {bandwidth.activeTimer && (
                      <div className="mt-4 p-3 bg-primary-50 dark:bg-primary-900/20 rounded-lg border border-primary-200 dark:border-primary-800">
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${bandwidth.activeTimer.isPaused ? 'bg-warning-500' : 'bg-success-500 animate-pulse'}`} />
                          <span className="text-xs font-medium text-primary-700 dark:text-primary-300">
                            {bandwidth.activeTimer.isPaused ? 'Timer Paused' : 'Timer Running'}
                          </span>
                        </div>
                        <Link
                          href={`/issues/${bandwidth.activeTimer.issueKey}`}
                          className="text-sm text-primary-600 dark:text-primary-400 hover:underline mt-1 block truncate"
                        >
                          {bandwidth.activeTimer.issueKey}: {bandwidth.activeTimer.issueTitle}
                        </Link>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">No data available</p>
                )}
              </div>

              {/* Assigned Projects */}
              <div className="bg-white dark:bg-dark-400 rounded-xl shadow-sm border border-gray-200 dark:border-dark-300 p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                  </svg>
                  Assigned Projects ({bandwidth?.projects.length || 0})
                </h3>
                {loadingBandwidth ? (
                  <div className="flex items-center justify-center py-8">
                    <LogoLoader size="sm" text="Loading" />
                  </div>
                ) : bandwidth && bandwidth.projects.length > 0 ? (
                  <div className="space-y-2">
                    {bandwidth.projects.map((project) => (
                      <Link
                        key={project._id}
                        href={`/projects/${project._id}`}
                        className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-dark-300 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-200 transition-colors group"
                      >
                        {project.logo ? (
                          <img src={project.logo} alt={project.name} className="w-10 h-10 rounded-lg object-cover" />
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
                            <span className="text-sm font-bold text-primary-600 dark:text-primary-400">
                              {project.key.charAt(0)}
                            </span>
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate group-hover:text-primary-600 dark:group-hover:text-primary-400">
                            {project.name}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">{project.key}</p>
                        </div>
                        <svg className="w-5 h-5 text-gray-400 group-hover:text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6">
                    <svg className="w-10 h-10 text-gray-400 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                    </svg>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Not assigned to any projects</p>
                  </div>
                )}
              </div>

              {/* Ticket Calendar */}
              <div className="bg-white dark:bg-dark-400 rounded-xl shadow-sm border border-gray-200 dark:border-dark-300 p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  Ticket Calendar
                </h3>
                <TicketCalendar userId={user._id} />
              </div>
            </div>

            {/* Right Column - Active Tasks & Achievements */}
            <div className="space-y-6">
              {/* Active Tasks */}
              <div className="bg-white dark:bg-dark-400 rounded-xl shadow-sm border border-gray-200 dark:border-dark-300 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                    </svg>
                    Active Tasks
                  </h3>
                  {workload && (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary-100 text-primary-800 dark:bg-primary-900/30 dark:text-primary-400">
                      {workload.totalInProgress}
                    </span>
                  )}
                </div>
                {loadingWorkload ? (
                  <div className="flex items-center justify-center py-8">
                    <LogoLoader size="sm" text="Loading" />
                  </div>
                ) : workload && workload.byProject.length > 0 ? (
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {workload.byProject.map((project) => (
                      <div key={project.projectId}>
                        <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
                          {project.projectName}
                        </h4>
                        <div className="space-y-1">
                          {project.issues.map((issue) => (
                            <Link
                              key={issue._id}
                              href={`/issues/${issue._id}`}
                              className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-dark-300 transition-colors group"
                            >
                              {getTypeIcon(issue.type)}
                              <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                                {issue.key}
                              </span>
                              <span className="text-sm text-gray-700 dark:text-gray-300 truncate flex-1 group-hover:text-primary-600 dark:group-hover:text-primary-400">
                                {issue.title}
                              </span>
                            </Link>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6">
                    <svg className="w-10 h-10 text-gray-400 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p className="text-sm text-gray-500 dark:text-gray-400">No active tasks</p>
                  </div>
                )}
              </div>

              {/* Achievements */}
              <div className="bg-white dark:bg-dark-400 rounded-xl shadow-sm border border-gray-200 dark:border-dark-300 p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                  </svg>
                  Achievements ({achievements.filter(a => a.unlocked).length})
                </h3>
                {loadingAchievements ? (
                  <div className="flex items-center justify-center py-8">
                    <LogoLoader size="sm" text="Loading" />
                  </div>
                ) : achievements.filter(a => a.unlocked).length > 0 ? (
                  <div className="grid grid-cols-2 gap-3 max-h-96 overflow-y-auto">
                    {achievements.filter(a => a.unlocked).map((userAchievement) => {
                      const achievement = userAchievement.achievementId;
                      if (!achievement) return null;
                      return (
                        <div
                          key={achievement._id}
                          className={`p-3 rounded-lg border ${getRarityColor(achievement.rarity)}`}
                          title={achievement.description}
                        >
                          <div className="text-2xl mb-1">{achievement.icon}</div>
                          <p className="text-xs font-medium truncate">{achievement.name}</p>
                          <p className="text-xs opacity-70 capitalize">{achievement.rarity}</p>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-6">
                    <svg className="w-10 h-10 text-gray-400 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                    </svg>
                    <p className="text-sm text-gray-500 dark:text-gray-400">No achievements yet</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
