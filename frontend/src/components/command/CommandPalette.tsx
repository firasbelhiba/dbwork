'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { searchAPI } from '@/lib/api';
import { useDebounce } from '@/hooks';
import { useAuth } from '@/contexts/AuthContext';
import { UserRole } from '@/types/user';

// Types for search results
interface SearchResultItem {
  id: string;
  type: 'issue' | 'project' | 'user' | 'affectation';
  title: string;
  subtitle?: string;
  description?: string;
  avatar?: string;
  url: string;
  score: number;
  matchedFields: string[];
  metadata?: Record<string, any>;
}

interface SearchResponse {
  query: string;
  results: SearchResultItem[];
  total: number;
  took: number;
  suggestions?: string[];
}

// Recent item storage
const RECENT_SEARCHES_KEY = 'dbwork_recent_searches';
const RECENT_ITEMS_KEY = 'dbwork_recent_items';
const MAX_RECENT_SEARCHES = 5;
const MAX_RECENT_ITEMS = 8;

interface RecentSearch {
  query: string;
  timestamp: number;
}

interface RecentItem {
  id: string;
  type: 'issue' | 'project' | 'user' | 'affectation';
  title: string;
  subtitle?: string;
  avatar?: string;
  url: string;
  timestamp: number;
}

// Local storage helpers
const getRecentSearches = (): RecentSearch[] => {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(RECENT_SEARCHES_KEY) || '[]');
  } catch {
    return [];
  }
};

const saveRecentSearch = (query: string) => {
  if (typeof window === 'undefined' || !query.trim()) return;
  const searches = getRecentSearches().filter(s => s.query !== query);
  searches.unshift({ query, timestamp: Date.now() });
  localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(searches.slice(0, MAX_RECENT_SEARCHES)));
};

const getRecentItems = (): RecentItem[] => {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(RECENT_ITEMS_KEY) || '[]');
  } catch {
    return [];
  }
};

const saveRecentItem = (item: Omit<RecentItem, 'timestamp'>) => {
  if (typeof window === 'undefined') return;
  const items = getRecentItems().filter(i => i.id !== item.id);
  items.unshift({ ...item, timestamp: Date.now() });
  localStorage.setItem(RECENT_ITEMS_KEY, JSON.stringify(items.slice(0, MAX_RECENT_ITEMS)));
};

const clearRecentSearches = () => {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(RECENT_SEARCHES_KEY);
};

// Icons by type
const TypeIcon: React.FC<{ type: string; className?: string }> = ({ type, className = 'w-5 h-5' }) => {
  switch (type) {
    case 'issue':
      return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
      );
    case 'project':
      return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        </svg>
      );
    case 'user':
      return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      );
    case 'affectation':
      return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      );
    default:
      return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      );
  }
};

// Static commands
const staticCommands = [
  {
    id: 'new-project',
    title: 'Create New Project',
    subtitle: 'Start a new project',
    category: 'Actions',
    url: '/projects?create=true',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
      </svg>
    ),
  },
  {
    id: 'new-issue',
    title: 'Create New Issue',
    subtitle: 'Report a bug or create a task',
    category: 'Actions',
    url: '/issues/new',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
      </svg>
    ),
  },
  {
    id: 'dashboard',
    title: 'Go to Dashboard',
    category: 'Navigation',
    url: '/dashboard',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
    ),
  },
  {
    id: 'projects',
    title: 'Go to Projects',
    category: 'Navigation',
    url: '/projects',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
      </svg>
    ),
  },
  {
    id: 'reports',
    title: 'Go to Reports',
    category: 'Navigation',
    url: '/reports',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
  },
];

interface CommandPaletteProps {
  onClose?: () => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({ onClose }) => {
  const [search, setSearch] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [searchResults, setSearchResults] = useState<SearchResultItem[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTime, setSearchTime] = useState<number | null>(null);
  const [recentSearches, setRecentSearches] = useState<RecentSearch[]>([]);
  const [recentItems, setRecentItems] = useState<RecentItem[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const { user: currentUser } = useAuth();
  const debouncedSearch = useDebounce(search, 200);

  const isAdmin = currentUser?.role === UserRole.ADMIN;

  // Load recent items on mount
  useEffect(() => {
    setRecentSearches(getRecentSearches());
    setRecentItems(getRecentItems());
  }, []);

  // Keyboard shortcut to close
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
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Perform search
  useEffect(() => {
    if (debouncedSearch.trim().length < 2) {
      setSearchResults([]);
      setSuggestions([]);
      setSearchTime(null);
      return;
    }

    const performSearch = async () => {
      setIsLoading(true);
      try {
        const response = await searchAPI.global({ q: debouncedSearch, limit: 8 });
        const data: SearchResponse = response.data;
        setSearchResults(data.results);
        setSuggestions(data.suggestions || []);
        setSearchTime(data.took);
      } catch (error) {
        console.error('Search error:', error);
        setSearchResults([]);
      } finally {
        setIsLoading(false);
      }
    };

    performSearch();
  }, [debouncedSearch]);

  // Reset selected index when results change
  useEffect(() => {
    setSelectedIndex(0);
  }, [searchResults]);

  // Navigate to item
  const handleSelect = useCallback((url: string, item?: { id: string; type: string; title: string; subtitle?: string; avatar?: string }) => {
    if (search.trim()) {
      saveRecentSearch(search.trim());
    }
    if (item) {
      saveRecentItem({
        id: item.id,
        type: item.type as any,
        title: item.title,
        subtitle: item.subtitle,
        avatar: item.avatar,
        url,
      });
    }
    router.push(url);
    onClose?.();
  }, [router, onClose, search]);

  // Apply suggestion
  const applySuggestion = (suggestion: string) => {
    setSearch(suggestion);
    inputRef.current?.focus();
  };

  // Clear recent
  const handleClearRecent = () => {
    clearRecentSearches();
    setRecentSearches([]);
  };

  // Build display items
  const displayItems = useMemo(() => {
    const items: Array<{
      id: string;
      title: string;
      subtitle?: string;
      category: string;
      url: string;
      icon: React.ReactNode;
      avatar?: string;
      type?: string;
      score?: number;
      matchedFields?: string[];
    }> = [];

    // Show search results when searching
    if (search.trim().length >= 2) {
      searchResults.forEach((result) => {
        const typeLabels: Record<string, string> = {
          issue: 'Issues',
          project: 'Projects',
          user: 'Users',
          affectation: 'Affectations',
        };

        items.push({
          id: result.id,
          title: result.title,
          subtitle: result.subtitle,
          category: typeLabels[result.type] || 'Results',
          url: result.url,
          avatar: result.avatar,
          type: result.type,
          score: result.score,
          matchedFields: result.matchedFields,
          icon: result.avatar ? (
            <img src={result.avatar} alt="" className="w-6 h-6 rounded-full object-cover" />
          ) : (
            <TypeIcon type={result.type} />
          ),
        });
      });

      // Also filter static commands
      const searchLower = search.toLowerCase();
      staticCommands.forEach((cmd) => {
        if (cmd.title.toLowerCase().includes(searchLower)) {
          items.push({
            ...cmd,
            type: 'command',
          });
        }
      });
    } else {
      // Show recent items and commands when not searching
      if (recentItems.length > 0) {
        recentItems.forEach((item) => {
          items.push({
            id: `recent-${item.id}`,
            title: item.title,
            subtitle: item.subtitle,
            category: 'Recent',
            url: item.url,
            type: item.type,
            avatar: item.avatar,
            icon: item.avatar ? (
              <img src={item.avatar} alt="" className="w-6 h-6 rounded-full object-cover" />
            ) : (
              <TypeIcon type={item.type} />
            ),
          });
        });
      }

      // Add static commands
      staticCommands.forEach((cmd) => {
        items.push({
          ...cmd,
          type: 'command',
        });
      });
    }

    return items;
  }, [search, searchResults, recentItems]);

  // Group items by category
  const groupedItems = useMemo(() => {
    const groups: Record<string, typeof displayItems> = {};
    displayItems.forEach((item) => {
      if (!groups[item.category]) {
        groups[item.category] = [];
      }
      groups[item.category].push(item);
    });
    return groups;
  }, [displayItems]);

  // Keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % displayItems.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + displayItems.length) % displayItems.length);
    } else if (e.key === 'Enter' && displayItems[selectedIndex]) {
      e.preventDefault();
      const item = displayItems[selectedIndex];
      handleSelect(item.url, {
        id: item.id,
        type: item.type || 'command',
        title: item.title,
        subtitle: item.subtitle,
        avatar: item.avatar,
      });
    }
  }, [displayItems, selectedIndex, handleSelect]);

  // Get category color
  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'Issues':
        return 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30';
      case 'Projects':
        return 'text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/30';
      case 'Users':
        return 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/30';
      case 'Affectations':
        return 'text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/30';
      case 'Recent':
        return 'text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-700/50';
      default:
        return 'text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-700/50';
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 px-4 bg-black/50 backdrop-blur-sm"
      onClick={() => onClose?.()}
    >
      <div
        className="w-full max-w-2xl bg-white dark:bg-gray-800 rounded-xl shadow-2xl overflow-hidden border border-gray-200 dark:border-gray-700"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-200 dark:border-gray-700">
          <svg className="w-5 h-5 text-gray-400 dark:text-gray-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDown}
            placeholder={isAdmin ? "Search issues, projects, users, affectations..." : "Search issues, projects..."}
            className="flex-1 bg-transparent outline-none text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 text-sm"
            autoFocus
          />
          {isLoading && (
            <svg className="w-5 h-5 animate-spin text-primary-500" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
          )}
          <kbd className="hidden sm:inline-flex px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 rounded border border-gray-200 dark:border-gray-600">ESC</kbd>
        </div>

        {/* Suggestions */}
        {suggestions.length > 0 && (
          <div className="px-4 py-2 border-b border-gray-100 dark:border-gray-700 bg-yellow-50 dark:bg-yellow-900/20">
            <p className="text-xs text-yellow-700 dark:text-yellow-400">
              Did you mean:{' '}
              {suggestions.map((s, i) => (
                <button
                  key={s}
                  onClick={() => applySuggestion(s)}
                  className="font-medium underline hover:text-yellow-800 dark:hover:text-yellow-300"
                >
                  {s}
                  {i < suggestions.length - 1 && ', '}
                </button>
              ))}
            </p>
          </div>
        )}

        {/* Recent Searches */}
        {!search && recentSearches.length > 0 && (
          <div className="px-4 py-2 border-b border-gray-100 dark:border-gray-700">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Recent Searches</span>
              <button
                onClick={handleClearRecent}
                className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                Clear
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {recentSearches.map((rs) => (
                <button
                  key={rs.timestamp}
                  onClick={() => setSearch(rs.query)}
                  className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {rs.query}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Results */}
        <div className="max-h-[60vh] overflow-y-auto">
          {Object.entries(groupedItems).map(([category, items]) => (
            <div key={category}>
              <div className={`sticky top-0 px-4 py-2 text-xs font-semibold uppercase tracking-wider ${getCategoryColor(category)}`}>
                {category}
                {category !== 'Actions' && category !== 'Navigation' && category !== 'Recent' && (
                  <span className="ml-2 font-normal normal-case">({items.length})</span>
                )}
              </div>
              {items.map((item) => {
                const globalIndex = displayItems.indexOf(item);
                return (
                  <button
                    key={item.id}
                    onClick={() => handleSelect(item.url, {
                      id: item.id,
                      type: item.type || 'command',
                      title: item.title,
                      subtitle: item.subtitle,
                      avatar: item.avatar,
                    })}
                    onMouseEnter={() => setSelectedIndex(globalIndex)}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                      globalIndex === selectedIndex
                        ? 'bg-primary-50 dark:bg-primary-900/30'
                        : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'
                    }`}
                  >
                    <div className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center ${
                      globalIndex === selectedIndex
                        ? 'bg-primary-100 dark:bg-primary-800/50 text-primary-600 dark:text-primary-400'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                    }`}>
                      {item.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className={`font-medium truncate ${
                        globalIndex === selectedIndex
                          ? 'text-primary-700 dark:text-primary-300'
                          : 'text-gray-900 dark:text-gray-100'
                      }`}>
                        {item.title}
                      </div>
                      {item.subtitle && (
                        <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                          {item.subtitle}
                        </div>
                      )}
                    </div>
                    {item.score && (
                      <div className="flex-shrink-0 text-xs text-gray-400 dark:text-gray-500">
                        {item.score}%
                      </div>
                    )}
                    {globalIndex === selectedIndex && (
                      <kbd className="hidden sm:inline-flex flex-shrink-0 px-2 py-0.5 text-xs bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 rounded border border-gray-200 dark:border-gray-600">
                        Enter
                      </kbd>
                    )}
                  </button>
                );
              })}
            </div>
          ))}

          {displayItems.length === 0 && search.trim().length >= 2 && !isLoading && (
            <div className="px-4 py-12 text-center">
              <svg className="w-12 h-12 mx-auto mb-3 text-gray-300 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <p className="text-gray-500 dark:text-gray-400 font-medium">No results found</p>
              <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
                Try different keywords or check spelling
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-2 bg-gray-50 dark:bg-gray-700/50 border-t border-gray-200 dark:border-gray-700 text-xs text-gray-500 dark:text-gray-400">
          <div className="flex items-center gap-4">
            <span className="hidden sm:flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-white dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-600">↑</kbd>
              <kbd className="px-1.5 py-0.5 bg-white dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-600">↓</kbd>
              <span className="ml-1">navigate</span>
            </span>
            <span className="hidden sm:flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-white dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-600">Enter</kbd>
              <span className="ml-1">select</span>
            </span>
          </div>
          <div className="flex items-center gap-3">
            {searchTime !== null && search.trim().length >= 2 && (
              <span className="text-gray-400">
                {searchResults.length} results in {searchTime}ms
              </span>
            )}
            <span className="hidden sm:flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-white dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-600">ESC</kbd>
              <span className="ml-1">close</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
