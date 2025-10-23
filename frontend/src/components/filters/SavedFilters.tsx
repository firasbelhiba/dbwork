'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Button, Badge, Dropdown, DropdownItem } from '@/components/common';
import { cn } from '@/lib/utils';
import type { FilterGroup } from './AdvancedFilterBuilder';

interface SavedFilter {
  id: string;
  name: string;
  filters: FilterGroup[];
  createdAt: string;
  isPinned?: boolean;
}

interface SavedFiltersProps {
  onApply: (filters: FilterGroup[]) => void;
  className?: string;
}

const STORAGE_KEY = 'dar-pm-saved-filters';

export const SavedFilters: React.FC<SavedFiltersProps> = ({
  onApply,
  className,
}) => {
  const [savedFilters, setSavedFilters] = useState<SavedFilter[]>([]);
  const [activeFilterId, setActiveFilterId] = useState<string | null>(null);
  const [showManageDialog, setShowManageDialog] = useState(false);

  // Load saved filters from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setSavedFilters(parsed);
      }
    } catch (error) {
      console.error('Failed to load saved filters:', error);
    }
  }, []);

  // Save filters to localStorage
  const persistFilters = useCallback((filters: SavedFilter[]) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(filters));
      setSavedFilters(filters);
    } catch (error) {
      console.error('Failed to save filters:', error);
    }
  }, []);

  // Save a new filter
  const saveFilter = useCallback((name: string, filters: FilterGroup[]) => {
    const newFilter: SavedFilter = {
      id: Math.random().toString(36).substr(2, 9),
      name,
      filters,
      createdAt: new Date().toISOString(),
      isPinned: false,
    };
    persistFilters([...savedFilters, newFilter]);
  }, [savedFilters, persistFilters]);

  // Apply a saved filter
  const applyFilter = useCallback((filter: SavedFilter) => {
    setActiveFilterId(filter.id);
    onApply(filter.filters);
  }, [onApply]);

  // Delete a saved filter
  const deleteFilter = useCallback((filterId: string) => {
    const updated = savedFilters.filter(f => f.id !== filterId);
    persistFilters(updated);
    if (activeFilterId === filterId) {
      setActiveFilterId(null);
    }
  }, [savedFilters, activeFilterId, persistFilters]);

  // Toggle pin status
  const togglePin = useCallback((filterId: string) => {
    const updated = savedFilters.map(f =>
      f.id === filterId ? { ...f, isPinned: !f.isPinned } : f
    );
    persistFilters(updated);
  }, [savedFilters, persistFilters]);

  // Rename filter
  const renameFilter = useCallback((filterId: string, newName: string) => {
    const updated = savedFilters.map(f =>
      f.id === filterId ? { ...f, name: newName } : f
    );
    persistFilters(updated);
  }, [savedFilters, persistFilters]);

  // Clear active filter
  const clearFilter = useCallback(() => {
    setActiveFilterId(null);
    onApply([]);
  }, [onApply]);

  // Get filter summary
  const getFilterSummary = (filter: SavedFilter): string => {
    const totalConditions = filter.filters.reduce(
      (sum, group) => sum + group.conditions.length,
      0
    );
    return `${filter.filters.length} group${filter.filters.length !== 1 ? 's' : ''}, ${totalConditions} condition${totalConditions !== 1 ? 's' : ''}`;
  };

  // Sort filters: pinned first, then by creation date
  const sortedFilters = [...savedFilters].sort((a, b) => {
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  // Expose save function globally for AdvancedFilterBuilder
  useEffect(() => {
    (window as any).__saveFilter = saveFilter;
    return () => {
      delete (window as any).__saveFilter;
    };
  }, [saveFilter]);

  if (savedFilters.length === 0) {
    return null;
  }

  return (
    <div className={cn('', className)}>
      <div className="flex items-center gap-2 flex-wrap">
        {sortedFilters.slice(0, 5).map(filter => (
          <Badge
            key={filter.id}
            variant={activeFilterId === filter.id ? 'primary' : 'default'}
            className={cn(
              'cursor-pointer hover:opacity-80 transition-opacity group relative',
              filter.isPinned && 'border-2 border-primary'
            )}
            onClick={() => applyFilter(filter)}
          >
            {filter.isPinned && (
              <span className="mr-1" title="Pinned">
                📌
              </span>
            )}
            {filter.name}
            {activeFilterId === filter.id && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  clearFilter();
                }}
                className="ml-2 hover:text-danger"
                title="Clear filter"
              >
                ×
              </button>
            )}
          </Badge>
        ))}

        {savedFilters.length > 5 && (
          <Dropdown
            trigger={
              <Badge variant="outline" className="cursor-pointer">
                +{savedFilters.length - 5} more
              </Badge>
            }
          >
            {sortedFilters.slice(5).map(filter => (
              <DropdownItem
                key={filter.id}
                onClick={() => applyFilter(filter)}
              >
                {filter.isPinned && '📌 '}
                {filter.name}
              </DropdownItem>
            ))}
          </Dropdown>
        )}

        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowManageDialog(true)}
        >
          Manage Filters
        </Button>
      </div>

      {activeFilterId && (
        <div className="mt-2 text-sm text-gray-600">
          Active filter: <strong>{savedFilters.find(f => f.id === activeFilterId)?.name}</strong>
        </div>
      )}

      {/* Manage Filters Dialog */}
      {showManageDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Manage Saved Filters</h3>
              <button
                onClick={() => setShowManageDialog(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto">
              {sortedFilters.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No saved filters yet
                </div>
              ) : (
                <div className="space-y-3">
                  {sortedFilters.map(filter => (
                    <div
                      key={filter.id}
                      className={cn(
                        'border rounded-lg p-4 hover:bg-gray-50 transition-colors',
                        activeFilterId === filter.id && 'border-primary bg-primary/5'
                      )}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-medium text-gray-900 truncate">
                              {filter.name}
                            </h4>
                            {filter.isPinned && (
                              <Badge variant="outline" className="text-xs">
                                Pinned
                              </Badge>
                            )}
                            {activeFilterId === filter.id && (
                              <Badge variant="primary" className="text-xs">
                                Active
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-gray-500">
                            {getFilterSummary(filter)}
                          </p>
                          <p className="text-xs text-gray-400 mt-1">
                            Created {new Date(filter.createdAt).toLocaleDateString()}
                          </p>
                        </div>

                        <div className="flex items-center gap-1 ml-4">
                          <button
                            onClick={() => togglePin(filter.id)}
                            className={cn(
                              'p-2 rounded hover:bg-gray-200 transition-colors',
                              filter.isPinned && 'text-primary'
                            )}
                            title={filter.isPinned ? 'Unpin' : 'Pin'}
                          >
                            📌
                          </button>
                          <button
                            onClick={() => applyFilter(filter)}
                            className="p-2 rounded hover:bg-gray-200 transition-colors"
                            title="Apply filter"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          </button>
                          <button
                            onClick={() => {
                              const newName = prompt('Enter new name:', filter.name);
                              if (newName && newName.trim()) {
                                renameFilter(filter.id, newName.trim());
                              }
                            }}
                            className="p-2 rounded hover:bg-gray-200 transition-colors"
                            title="Rename"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => {
                              if (confirm(`Delete filter "${filter.name}"?`)) {
                                deleteFilter(filter.id);
                              }
                            }}
                            className="p-2 rounded hover:bg-danger/10 text-danger transition-colors"
                            title="Delete"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="mt-4 pt-4 border-t flex justify-end">
              <Button variant="primary" onClick={() => setShowManageDialog(false)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Export save function helper for AdvancedFilterBuilder integration
export const useSavedFilters = () => {
  const saveFilter = useCallback((name: string, filters: FilterGroup[]) => {
    const saveFn = (window as any).__saveFilter;
    if (saveFn) {
      saveFn(name, filters);
    }
  }, []);

  return { saveFilter };
};
