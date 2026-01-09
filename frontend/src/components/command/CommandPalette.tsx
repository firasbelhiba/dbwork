'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Modal } from '@/components/common';
import { projectsAPI, issuesAPI, usersAPI } from '@/lib/api';
import { useDebounce } from '@/hooks';
import { useAuth } from '@/contexts/AuthContext';
import { UserRole } from '@/types/user';

interface CommandItem {
  id: string;
  title: string;
  subtitle?: string;
  icon: React.ReactNode;
  onSelect: () => void;
  category: string;
}

interface CommandPaletteProps {
  onClose?: () => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({ onClose }) => {
  const [search, setSearch] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [recentItems, setRecentItems] = useState<any[]>([]);
  const router = useRouter();
  const { user: currentUser } = useAuth();
  const debouncedSearch = useDebounce(search, 300);

  const isAdmin = currentUser?.role === UserRole.ADMIN;

  // Open/close with Cmd+K or Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        onClose?.();
      }
      if (e.key === 'Escape') {
        onClose?.();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  // Fetch search results
  useEffect(() => {
    if (debouncedSearch) {
      fetchSearchResults();
    } else {
      // Clear search results when search is empty
      setRecentItems([]);
    }
  }, [debouncedSearch]);

  const fetchSearchResults = async () => {
    try {
      // Check if search starts with "/" for direct ticket lookup
      const isDirectTicketSearch = debouncedSearch.startsWith('/');
      const ticketKey = isDirectTicketSearch ? debouncedSearch.substring(1).trim().toUpperCase() : '';

      // Check if search looks like a ticket key pattern (e.g., "TAI-", "TAI-1", "DBWR-5")
      // Pattern: 2-5 uppercase letters followed by a dash (with optional numbers)
      // This prevents normal words from being treated as ticket keys
      const ticketKeyPattern = /^[A-Z]{2,5}-\d*$/i;
      const isTicketKeyPattern = ticketKeyPattern.test(debouncedSearch.trim());

      if (isDirectTicketSearch && ticketKey) {
        // Direct ticket search mode - search by key with "/" prefix
        const issuesRes = await issuesAPI.search(ticketKey);
        const items: any[] = [];

        // Add matching issues
        issuesRes.data.slice(0, 10).forEach((issue: any) => {
          const projectKey = typeof issue.projectId === 'object' ? issue.projectId.key : '';
          const issueKey = issue.key || `${projectKey}-${issue._id.slice(-4)}`;

          items.push({
            id: `issue-${issue._id}`,
            title: issue.title,
            subtitle: issueKey,
            category: 'Tickets',
            data: issue,
          });
        });

        setRecentItems(items);
      } else if (isTicketKeyPattern) {
        // Smart ticket key detection mode - prioritize issue search
        const searchQuery = debouncedSearch.trim().toUpperCase();
        const issuesRes = await issuesAPI.search(searchQuery);
        const items: any[] = [];

        // Add matching issues prominently
        issuesRes.data.slice(0, 15).forEach((issue: any) => {
          const projectKey = typeof issue.projectId === 'object' ? issue.projectId.key : '';
          const issueKey = issue.key || `${projectKey}-${issue._id.slice(-4)}`;

          items.push({
            id: `issue-${issue._id}`,
            title: issue.title,
            subtitle: issueKey,
            category: 'Tickets',
            data: issue,
          });
        });

        setRecentItems(items);
      } else {
        // Normal search mode - search projects, issues, and users (admin only)
        const searchPromises: Promise<any>[] = [
          projectsAPI.getAll(),
          issuesAPI.search(debouncedSearch),
        ];

        // Only search users if admin
        if (isAdmin) {
          searchPromises.push(usersAPI.getAll());
        }

        const results = await Promise.all(searchPromises);
        const [projectsRes, issuesRes] = results;
        const usersRes = isAdmin ? results[2] : null;

        const items: any[] = [];

        // Add users (admin only) - prioritize user search results
        if (isAdmin && usersRes?.data) {
          const searchLower = debouncedSearch.toLowerCase();
          const matchingUsers = usersRes.data.filter((user: any) => {
            const fullName = `${user.firstName} ${user.lastName}`.toLowerCase();
            const email = user.email?.toLowerCase() || '';
            return fullName.includes(searchLower) || email.includes(searchLower);
          });

          matchingUsers.slice(0, 5).forEach((user: any) => {
            items.push({
              id: `user-${user._id}`,
              title: `${user.firstName} ${user.lastName}`,
              subtitle: user.email,
              category: 'Users',
              data: user,
            });
          });
        }

        // Add projects (filter by search term)
        const searchLowerForProjects = debouncedSearch.toLowerCase();
        const matchingProjects = projectsRes.data.filter((project: any) => {
          const projectName = project.name?.toLowerCase() || '';
          const projectKey = project.key?.toLowerCase() || '';
          return projectName.includes(searchLowerForProjects) || projectKey.includes(searchLowerForProjects);
        });

        matchingProjects.slice(0, 3).forEach((project: any) => {
          items.push({
            id: `project-${project._id}`,
            title: project.name,
            subtitle: project.key,
            category: 'Projects',
            data: project,
          });
        });

        // Add issues
        issuesRes.data.slice(0, 5).forEach((issue: any) => {
          const projectKey = typeof issue.projectId === 'object' ? issue.projectId.key : '';
          items.push({
            id: `issue-${issue._id}`,
            title: issue.title,
            subtitle: `${projectKey}-${issue._id.slice(-4)}`,
            category: 'Issues',
            data: issue,
          });
        });

        setRecentItems(items);
      }
    } catch (error) {
      console.error('Error searching:', error);
    }
  };

  const staticCommands: CommandItem[] = useMemo(() => [
    {
      id: 'new-project',
      title: 'Create New Project',
      subtitle: 'Start a new project',
      category: 'Actions',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
      ),
      onSelect: () => {
        router.push('/projects?create=true');
        onClose?.();
      },
    },
    {
      id: 'new-issue',
      title: 'Create New Issue',
      subtitle: 'Report a bug or create a task',
      category: 'Actions',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
      ),
      onSelect: () => {
        router.push('/issues/new');
        onClose?.();
      },
    },
    {
      id: 'dashboard',
      title: 'Go to Dashboard',
      category: 'Navigation',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      ),
      onSelect: () => {
        router.push('/dashboard');
        onClose?.();
      },
    },
    {
      id: 'projects',
      title: 'Go to Projects',
      category: 'Navigation',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        </svg>
      ),
      onSelect: () => {
        router.push('/projects');
        onClose?.();
      },
    },
    {
      id: 'reports',
      title: 'Go to Reports',
      category: 'Navigation',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
      onSelect: () => {
        router.push('/reports');
        onClose?.();
      },
    },
  ], [router, onClose]);

  const allItems = useMemo(() => {
    const items = [...staticCommands];

    if (recentItems.length > 0) {
      recentItems.forEach((item) => {
        if (item.category === 'Users') {
          // User search results (admin only)
          items.push({
            id: item.id,
            title: item.title,
            subtitle: item.subtitle,
            category: 'Users',
            icon: (
              <div className="w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                {item.data.avatar ? (
                  <img src={item.data.avatar} alt={item.title} className="w-5 h-5 rounded-full" />
                ) : (
                  <span className="text-xs font-medium text-blue-600 dark:text-blue-400">
                    {item.data.firstName?.charAt(0)}
                  </span>
                )}
              </div>
            ),
            onSelect: () => {
              router.push(`/users/${item.data._id}`);
              onClose?.();
            },
          });
        } else if (item.category === 'Projects') {
          items.push({
            id: item.id,
            title: item.title,
            subtitle: item.subtitle,
            category: 'Projects',
            icon: (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            ),
            onSelect: () => {
              router.push(`/projects/${item.data._id}`);
              onClose?.();
            },
          });
        } else if (item.category === 'Issues' || item.category === 'Tickets') {
          items.push({
            id: item.id,
            title: item.title,
            subtitle: item.subtitle,
            category: item.category === 'Tickets' ? 'Tickets' : 'Issues',
            icon: (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            ),
            onSelect: () => {
              router.push(`/issues/${item.data._id}`);
              onClose?.();
            },
          });
        }
      });
    }

    return items;
  }, [staticCommands, recentItems, router, onClose]);

  const filteredItems = useMemo(() => {
    if (!search) return allItems;

    // Check if we're in ticket search mode
    const isDirectTicketSearch = search.startsWith('/');
    // Pattern: 2-5 uppercase letters followed by a dash (with optional numbers)
    const ticketKeyPattern = /^[A-Z]{2,5}-\d*$/i;
    const isTicketKeyPattern = ticketKeyPattern.test(search.trim());

    // Skip title filtering for ticket search modes
    if (isDirectTicketSearch || isTicketKeyPattern) {
      return allItems;
    }

    // Apply title filtering for normal search mode
    // But skip filtering for dynamic search results (Users, Projects, Issues, Tickets)
    // as they are already filtered at fetch time
    const searchResultCategories = ['Users', 'Projects', 'Issues', 'Tickets'];
    return allItems.filter((item) =>
      searchResultCategories.includes(item.category) ||
      item.title.toLowerCase().includes(search.toLowerCase()) ||
      item.subtitle?.toLowerCase().includes(search.toLowerCase())
    );
  }, [allItems, search]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % filteredItems.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + filteredItems.length) % filteredItems.length);
    } else if (e.key === 'Enter' && filteredItems[selectedIndex]) {
      e.preventDefault();
      filteredItems[selectedIndex].onSelect();
    }
  }, [filteredItems, selectedIndex]);

  const groupedItems = useMemo(() => {
    const groups: { [key: string]: CommandItem[] } = {};
    filteredItems.forEach((item) => {
      if (!groups[item.category]) {
        groups[item.category] = [];
      }
      groups[item.category].push(item);
    });
    return groups;
  }, [filteredItems]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-20 bg-black/50"
      onClick={() => {
        onClose?.();
      }}
    >
      <div
        className="w-full max-w-2xl bg-white dark:bg-gray-800 rounded-lg shadow-2xl overflow-hidden border border-gray-200 dark:border-gray-700"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-200 dark:border-gray-700">
          <svg className="w-5 h-5 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDown}
            placeholder={isAdmin ? "Search projects, issues, users..." : "Search projects, issues, or type ticket key (e.g., TAI-1)"}
            className="flex-1 bg-transparent outline-none text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
            autoFocus
          />
          <kbd className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded border border-gray-300 dark:border-gray-600">ESC</kbd>
        </div>

        {/* Results */}
        <div className="max-h-96 overflow-y-auto">
          {Object.entries(groupedItems).map(([category, items]) => (
            <div key={category}>
              <div className="px-4 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-700/50">
                {category}
              </div>
              {items.map((item, index) => {
                const globalIndex = filteredItems.indexOf(item);
                return (
                  <button
                    key={item.id}
                    onClick={item.onSelect}
                    onMouseEnter={() => setSelectedIndex(globalIndex)}
                    className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                      globalIndex === selectedIndex
                        ? 'bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary-400'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                    }`}
                  >
                    <div className="flex-shrink-0">{item.icon}</div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{item.title}</div>
                      {item.subtitle && (
                        <div className="text-sm text-gray-500 dark:text-gray-400 truncate">{item.subtitle}</div>
                      )}
                    </div>
                    {globalIndex === selectedIndex && (
                      <kbd className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded border border-gray-300 dark:border-gray-600">
                        ↵
                      </kbd>
                    )}
                  </button>
                );
              })}
            </div>
          ))}

          {filteredItems.length === 0 && (
            <div className="px-4 py-12 text-center text-gray-500 dark:text-gray-400">
              <svg className="w-12 h-12 mx-auto mb-3 text-gray-300 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <p>No results found</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-2 bg-gray-50 dark:bg-gray-700/50 border-t border-gray-200 dark:border-gray-700 text-xs text-gray-500 dark:text-gray-400">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 rounded border border-gray-300 dark:border-gray-600">↑</kbd>
              <kbd className="px-1.5 py-0.5 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 rounded border border-gray-300 dark:border-gray-600">↓</kbd>
              to navigate
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 rounded border border-gray-300 dark:border-gray-600">↵</kbd>
              to select
            </span>
          </div>
          <span>
            <kbd className="px-1.5 py-0.5 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 rounded border border-gray-300 dark:border-gray-600">ESC</kbd>
            to close
          </span>
        </div>
      </div>
    </div>
  );
};
