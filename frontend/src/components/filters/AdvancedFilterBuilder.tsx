'use client';

import React, { useState, useCallback } from 'react';
import { Button, Select } from '@/components/common';
import { cn } from '@/lib/utils';

export interface FilterCondition {
  id: string;
  field: string;
  operator: string;
  value: string | string[];
}

export interface FilterGroup {
  id: string;
  operator: 'AND' | 'OR';
  conditions: FilterCondition[];
}

interface AdvancedFilterBuilderProps {
  filters: FilterGroup[];
  onChange: (filters: FilterGroup[]) => void;
  onApply: () => void;
  onSave?: (name: string) => void;
  className?: string;
}

// Available filter fields
const FILTER_FIELDS = [
  { value: 'status', label: 'Status' },
  { value: 'priority', label: 'Priority' },
  { value: 'type', label: 'Type' },
  { value: 'assignee', label: 'Assignee' },
  { value: 'reporter', label: 'Reporter' },
  { value: 'label', label: 'Label' },
  { value: 'sprint', label: 'Sprint' },
  { value: 'created', label: 'Created Date' },
  { value: 'updated', label: 'Updated Date' },
  { value: 'dueDate', label: 'Due Date' },
];

// Operators based on field type
const OPERATORS = {
  text: [
    { value: 'contains', label: 'Contains' },
    { value: 'notContains', label: 'Does not contain' },
    { value: 'equals', label: 'Equals' },
    { value: 'notEquals', label: 'Does not equal' },
  ],
  select: [
    { value: 'is', label: 'Is' },
    { value: 'isNot', label: 'Is not' },
    { value: 'isIn', label: 'Is any of' },
    { value: 'isNotIn', label: 'Is none of' },
  ],
  date: [
    { value: 'before', label: 'Before' },
    { value: 'after', label: 'After' },
    { value: 'between', label: 'Between' },
    { value: 'inLast', label: 'In the last' },
  ],
};

// Field type mapping
const FIELD_TYPES: Record<string, keyof typeof OPERATORS> = {
  status: 'select',
  priority: 'select',
  type: 'select',
  assignee: 'select',
  reporter: 'select',
  label: 'select',
  sprint: 'select',
  created: 'date',
  updated: 'date',
  dueDate: 'date',
};

// Options for select fields
const FIELD_OPTIONS: Record<string, { value: string; label: string }[]> = {
  status: [
    { value: 'todo', label: 'To Do' },
    { value: 'in_progress', label: 'In Progress' },
    { value: 'in_review', label: 'In Review' },
    { value: 'done', label: 'Done' },
  ],
  priority: [
    { value: 'lowest', label: 'Lowest' },
    { value: 'low', label: 'Low' },
    { value: 'medium', label: 'Medium' },
    { value: 'high', label: 'High' },
    { value: 'highest', label: 'Highest' },
  ],
  type: [
    { value: 'story', label: 'Story' },
    { value: 'task', label: 'Task' },
    { value: 'bug', label: 'Bug' },
    { value: 'epic', label: 'Epic' },
  ],
};

export const AdvancedFilterBuilder: React.FC<AdvancedFilterBuilderProps> = ({
  filters,
  onChange,
  onApply,
  onSave,
  className,
}) => {
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [filterName, setFilterName] = useState('');

  // Generate unique ID
  const generateId = () => Math.random().toString(36).substr(2, 9);

  // Add new filter group
  const addFilterGroup = useCallback(() => {
    const newGroup: FilterGroup = {
      id: generateId(),
      operator: 'AND',
      conditions: [
        {
          id: generateId(),
          field: 'status',
          operator: 'is',
          value: '',
        },
      ],
    };
    onChange([...filters, newGroup]);
  }, [filters, onChange]);

  // Add condition to group
  const addCondition = useCallback((groupId: string) => {
    const newCondition: FilterCondition = {
      id: generateId(),
      field: 'status',
      operator: 'is',
      value: '',
    };

    const updatedFilters = filters.map(group =>
      group.id === groupId
        ? { ...group, conditions: [...group.conditions, newCondition] }
        : group
    );
    onChange(updatedFilters);
  }, [filters, onChange]);

  // Update group operator
  const updateGroupOperator = useCallback((groupId: string, operator: 'AND' | 'OR') => {
    const updatedFilters = filters.map(group =>
      group.id === groupId ? { ...group, operator } : group
    );
    onChange(updatedFilters);
  }, [filters, onChange]);

  // Update condition
  const updateCondition = useCallback((
    groupId: string,
    conditionId: string,
    updates: Partial<FilterCondition>
  ) => {
    const updatedFilters = filters.map(group =>
      group.id === groupId
        ? {
            ...group,
            conditions: group.conditions.map(condition =>
              condition.id === conditionId
                ? { ...condition, ...updates }
                : condition
            ),
          }
        : group
    );
    onChange(updatedFilters);
  }, [filters, onChange]);

  // Remove condition
  const removeCondition = useCallback((groupId: string, conditionId: string) => {
    const updatedFilters = filters.map(group =>
      group.id === groupId
        ? {
            ...group,
            conditions: group.conditions.filter(c => c.id !== conditionId),
          }
        : group
    ).filter(group => group.conditions.length > 0);
    onChange(updatedFilters);
  }, [filters, onChange]);

  // Remove group
  const removeGroup = useCallback((groupId: string) => {
    onChange(filters.filter(group => group.id !== groupId));
  }, [filters, onChange]);

  // Clear all filters
  const clearAllFilters = useCallback(() => {
    onChange([]);
  }, [onChange]);

  // Handle save filter
  const handleSaveFilter = useCallback(() => {
    if (onSave && filterName.trim()) {
      onSave(filterName.trim());
      setFilterName('');
      setShowSaveDialog(false);
    }
  }, [onSave, filterName]);

  // Get operators for field
  const getOperatorsForField = (field: string) => {
    const fieldType = FIELD_TYPES[field] || 'text';
    return OPERATORS[fieldType];
  };

  // Render condition value input
  const renderValueInput = (groupId: string, condition: FilterCondition) => {
    const fieldType = FIELD_TYPES[condition.field];
    const options = FIELD_OPTIONS[condition.field];

    if (fieldType === 'select' && options) {
      const isMultiple = condition.operator === 'isIn' || condition.operator === 'isNotIn';

      if (isMultiple) {
        return (
          <Select
            value={Array.isArray(condition.value) ? condition.value[0] : condition.value}
            onChange={(e) => updateCondition(groupId, condition.id, { value: [e.target.value] })}
            className="flex-1"
          >
            <option value="">Select...</option>
            {options.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </Select>
        );
      }

      return (
        <Select
          value={condition.value as string}
          onChange={(e) => updateCondition(groupId, condition.id, { value: e.target.value })}
          className="flex-1"
        >
          <option value="">Select...</option>
          {options.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </Select>
      );
    }

    if (fieldType === 'date') {
      return (
        <input
          type="date"
          value={condition.value as string}
          onChange={(e) => updateCondition(groupId, condition.id, { value: e.target.value })}
          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
        />
      );
    }

    return (
      <input
        type="text"
        value={condition.value as string}
        onChange={(e) => updateCondition(groupId, condition.id, { value: e.target.value })}
        placeholder="Enter value..."
        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
      />
    );
  };

  return (
    <div className={cn('bg-white rounded-lg border border-gray-300 p-4', className)}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Advanced Filters</h3>
        <div className="flex gap-2">
          {filters.length > 0 && (
            <Button variant="ghost" size="sm" onClick={clearAllFilters}>
              Clear All
            </Button>
          )}
          {onSave && filters.length > 0 && (
            <Button variant="outline" size="sm" onClick={() => setShowSaveDialog(true)}>
              Save Filter
            </Button>
          )}
        </div>
      </div>

      {filters.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <p className="mb-4">No filters applied</p>
          <Button variant="outline" onClick={addFilterGroup}>
            Add Filter Group
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {filters.map((group, groupIndex) => (
            <div key={group.id} className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-700">Match</span>
                  <select
                    value={group.operator}
                    onChange={(e) => updateGroupOperator(group.id, e.target.value as 'AND' | 'OR')}
                    className="px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="AND">All</option>
                    <option value="OR">Any</option>
                  </select>
                  <span className="text-sm text-gray-700">of the following:</span>
                </div>
                <button
                  onClick={() => removeGroup(group.id)}
                  className="text-gray-400 hover:text-danger transition-colors"
                  title="Remove group"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="space-y-2">
                {group.conditions.map((condition, conditionIndex) => (
                  <div key={condition.id} className="flex items-center gap-2">
                    {conditionIndex > 0 && (
                      <span className="text-sm text-gray-500 w-12 text-center">
                        {group.operator}
                      </span>
                    )}
                    <Select
                      value={condition.field}
                      onChange={(e) => {
                        const newField = e.target.value;
                        const operators = getOperatorsForField(newField);
                        updateCondition(group.id, condition.id, {
                          field: newField,
                          operator: operators[0].value,
                          value: '',
                        });
                      }}
                      className="w-40"
                    >
                      {FILTER_FIELDS.map(field => (
                        <option key={field.value} value={field.value}>{field.label}</option>
                      ))}
                    </Select>

                    <Select
                      value={condition.operator}
                      onChange={(e) => updateCondition(group.id, condition.id, { operator: e.target.value })}
                      className="w-48"
                    >
                      {getOperatorsForField(condition.field).map(op => (
                        <option key={op.value} value={op.value}>{op.label}</option>
                      ))}
                    </Select>

                    {renderValueInput(group.id, condition)}

                    <button
                      onClick={() => removeCondition(group.id, condition.id)}
                      className="flex-shrink-0 text-gray-400 hover:text-danger transition-colors"
                      title="Remove condition"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => addCondition(group.id)}
                className="mt-3"
              >
                + Add Condition
              </Button>
            </div>
          ))}

          <div className="flex items-center justify-between pt-2">
            <Button variant="outline" onClick={addFilterGroup}>
              + Add Filter Group
            </Button>

            <Button variant="primary" onClick={onApply}>
              Apply Filters
            </Button>
          </div>
        </div>
      )}

      {/* Save Filter Dialog */}
      {showSaveDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Save Filter</h3>
            <input
              type="text"
              value={filterName}
              onChange={(e) => setFilterName(e.target.value)}
              placeholder="Enter filter name..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary mb-4"
              autoFocus
            />
            <div className="flex gap-2 justify-end">
              <Button variant="ghost" onClick={() => setShowSaveDialog(false)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleSaveFilter}
                disabled={!filterName.trim()}
              >
                Save
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
