'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Button, Modal, Input, Textarea, Select, Badge } from '@/components/common';
import { cn } from '@/lib/utils';

interface IssueTemplate {
  id: string;
  name: string;
  description: string;
  type: 'story' | 'task' | 'bug' | 'epic';
  priority: 'lowest' | 'low' | 'medium' | 'high' | 'highest';
  defaultTitle: string;
  defaultDescription: string;
  defaultLabels: string[];
  defaultAssignee?: string;
  defaultStoryPoints?: number;
  isDefault?: boolean;
  createdAt: string;
}

interface IssueTemplatesProps {
  onSelectTemplate: (template: IssueTemplate) => void;
  projectId?: string;
  className?: string;
}

const STORAGE_KEY = 'dar-pm-issue-templates';

// Default templates
const DEFAULT_TEMPLATES: IssueTemplate[] = [
  {
    id: 'bug-report',
    name: 'Bug Report',
    description: 'Report a bug or issue',
    type: 'bug',
    priority: 'high',
    defaultTitle: '[BUG] ',
    defaultDescription: `## Description
A clear and concise description of what the bug is.

## Steps to Reproduce
1. Go to '...'
2. Click on '...'
3. Scroll down to '...'
4. See error

## Expected Behavior
A clear and concise description of what you expected to happen.

## Actual Behavior
A clear and concise description of what actually happened.

## Screenshots
If applicable, add screenshots to help explain your problem.

## Environment
- Browser: [e.g. Chrome, Safari]
- Version: [e.g. 22]
- OS: [e.g. iOS]

## Additional Context
Add any other context about the problem here.`,
    defaultLabels: ['bug'],
    isDefault: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'feature-request',
    name: 'Feature Request',
    description: 'Propose a new feature',
    type: 'story',
    priority: 'medium',
    defaultTitle: '[FEATURE] ',
    defaultDescription: `## User Story
As a [type of user], I want [an action] so that [a benefit/value].

## Acceptance Criteria
- [ ] Criterion 1
- [ ] Criterion 2
- [ ] Criterion 3

## Description
A clear and concise description of what the feature is.

## Proposed Solution
Describe the solution you'd like.

## Alternatives Considered
Describe any alternative solutions or features you've considered.

## Additional Context
Add any other context or screenshots about the feature request here.`,
    defaultLabels: ['enhancement'],
    isDefault: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'task',
    name: 'Task',
    description: 'General task template',
    type: 'task',
    priority: 'medium',
    defaultTitle: '',
    defaultDescription: `## Objective
What needs to be accomplished?

## Tasks
- [ ] Task 1
- [ ] Task 2
- [ ] Task 3

## Notes
Any additional notes or context.`,
    defaultLabels: [],
    isDefault: true,
    createdAt: new Date().toISOString(),
  },
];

export const IssueTemplates: React.FC<IssueTemplatesProps> = ({
  onSelectTemplate,
  projectId,
  className,
}) => {
  const [templates, setTemplates] = useState<IssueTemplate[]>(DEFAULT_TEMPLATES);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showManageDialog, setShowManageDialog] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<IssueTemplate | null>(null);

  // Form state for creating/editing templates
  const [formData, setFormData] = useState<Partial<IssueTemplate>>({
    name: '',
    description: '',
    type: 'task',
    priority: 'medium',
    defaultTitle: '',
    defaultDescription: '',
    defaultLabels: [],
  });

  // Load templates from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Merge with default templates
        const customTemplates = parsed.filter((t: IssueTemplate) => !t.isDefault);
        setTemplates([...DEFAULT_TEMPLATES, ...customTemplates]);
      }
    } catch (error) {
      console.error('Failed to load templates:', error);
    }
  }, []);

  // Save templates to localStorage
  const persistTemplates = useCallback((templates: IssueTemplate[]) => {
    try {
      // Only save custom templates (not default ones)
      const customTemplates = templates.filter(t => !t.isDefault);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(customTemplates));
      setTemplates([...DEFAULT_TEMPLATES, ...customTemplates]);
    } catch (error) {
      console.error('Failed to save templates:', error);
    }
  }, []);

  // Create new template
  const createTemplate = useCallback(() => {
    if (!formData.name || !formData.defaultDescription) {
      alert('Please fill in all required fields');
      return;
    }

    const newTemplate: IssueTemplate = {
      id: Math.random().toString(36).substr(2, 9),
      name: formData.name!,
      description: formData.description || '',
      type: formData.type || 'task',
      priority: formData.priority || 'medium',
      defaultTitle: formData.defaultTitle || '',
      defaultDescription: formData.defaultDescription!,
      defaultLabels: formData.defaultLabels || [],
      defaultAssignee: formData.defaultAssignee,
      defaultStoryPoints: formData.defaultStoryPoints,
      isDefault: false,
      createdAt: new Date().toISOString(),
    };

    persistTemplates([...templates.filter(t => !t.isDefault), newTemplate]);
    setFormData({
      name: '',
      description: '',
      type: 'task',
      priority: 'medium',
      defaultTitle: '',
      defaultDescription: '',
      defaultLabels: [],
    });
    setShowCreateDialog(false);
  }, [formData, templates, persistTemplates]);

  // Update template
  const updateTemplate = useCallback(() => {
    if (!editingTemplate || !formData.name || !formData.defaultDescription) {
      alert('Please fill in all required fields');
      return;
    }

    const updatedTemplates = templates.map(t =>
      t.id === editingTemplate.id
        ? {
            ...t,
            name: formData.name!,
            description: formData.description || '',
            type: formData.type || 'task',
            priority: formData.priority || 'medium',
            defaultTitle: formData.defaultTitle || '',
            defaultDescription: formData.defaultDescription!,
            defaultLabels: formData.defaultLabels || [],
            defaultAssignee: formData.defaultAssignee,
            defaultStoryPoints: formData.defaultStoryPoints,
          }
        : t
    );

    persistTemplates(updatedTemplates.filter(t => !t.isDefault));
    setEditingTemplate(null);
    setFormData({
      name: '',
      description: '',
      type: 'task',
      priority: 'medium',
      defaultTitle: '',
      defaultDescription: '',
      defaultLabels: [],
    });
    setShowCreateDialog(false);
  }, [editingTemplate, formData, templates, persistTemplates]);

  // Delete template
  const deleteTemplate = useCallback((templateId: string) => {
    const template = templates.find(t => t.id === templateId);
    if (template?.isDefault) {
      alert('Cannot delete default templates');
      return;
    }

    if (confirm('Are you sure you want to delete this template?')) {
      const updated = templates.filter(t => t.id !== templateId);
      persistTemplates(updated.filter(t => !t.isDefault));
    }
  }, [templates, persistTemplates]);

  // Start editing template
  const startEdit = useCallback((template: IssueTemplate) => {
    if (template.isDefault) {
      alert('Cannot edit default templates. Create a copy instead.');
      return;
    }

    setEditingTemplate(template);
    setFormData({
      name: template.name,
      description: template.description,
      type: template.type,
      priority: template.priority,
      defaultTitle: template.defaultTitle,
      defaultDescription: template.defaultDescription,
      defaultLabels: template.defaultLabels,
      defaultAssignee: template.defaultAssignee,
      defaultStoryPoints: template.defaultStoryPoints,
    });
    setShowCreateDialog(true);
  }, []);

  // Duplicate template
  const duplicateTemplate = useCallback((template: IssueTemplate) => {
    setFormData({
      name: `${template.name} (Copy)`,
      description: template.description,
      type: template.type,
      priority: template.priority,
      defaultTitle: template.defaultTitle,
      defaultDescription: template.defaultDescription,
      defaultLabels: template.defaultLabels,
      defaultAssignee: template.defaultAssignee,
      defaultStoryPoints: template.defaultStoryPoints,
    });
    setShowCreateDialog(true);
  }, []);

  return (
    <div className={cn('', className)}>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {templates.map(template => (
          <div
            key={template.id}
            className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer group"
            onClick={() => onSelectTemplate(template)}
          >
            <div className="flex items-start justify-between mb-2">
              <div className="flex-1 min-w-0">
                <h4 className="font-semibold text-gray-900 truncate">
                  {template.name}
                </h4>
                {template.description && (
                  <p className="text-sm text-gray-500 mt-1">
                    {template.description}
                  </p>
                )}
              </div>
              {template.isDefault && (
                <Badge variant="outline" className="text-xs ml-2 flex-shrink-0">
                  Default
                </Badge>
              )}
            </div>

            <div className="flex items-center gap-2 mt-3 text-xs">
              <Badge variant="default">{template.type}</Badge>
              <Badge
                variant={
                  template.priority === 'highest' || template.priority === 'high'
                    ? 'danger'
                    : template.priority === 'medium'
                    ? 'warning'
                    : 'default'
                }
              >
                {template.priority}
              </Badge>
              {template.defaultLabels.length > 0 && (
                <span className="text-gray-500">
                  +{template.defaultLabels.length} label{template.defaultLabels.length !== 1 ? 's' : ''}
                </span>
              )}
            </div>

            <div className="flex gap-2 mt-4 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  duplicateTemplate(template);
                }}
                className="flex-1"
              >
                Duplicate
              </Button>
              {!template.isDefault && (
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      startEdit(template);
                    }}
                  >
                    Edit
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteTemplate(template.id);
                    }}
                    className="text-danger hover:text-danger"
                  >
                    Delete
                  </Button>
                </>
              )}
            </div>
          </div>
        ))}

        {/* Create new template card */}
        <div
          className="border-2 border-dashed border-gray-300 rounded-lg p-4 hover:border-primary hover:bg-primary/5 transition-colors cursor-pointer flex items-center justify-center min-h-[180px]"
          onClick={() => setShowCreateDialog(true)}
        >
          <div className="text-center">
            <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-2">
              <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </div>
            <p className="font-medium text-gray-700">Create Template</p>
          </div>
        </div>
      </div>

      {/* Create/Edit Template Dialog */}
      <Modal
        isOpen={showCreateDialog}
        onClose={() => {
          setShowCreateDialog(false);
          setEditingTemplate(null);
          setFormData({
            name: '',
            description: '',
            type: 'task',
            priority: 'medium',
            defaultTitle: '',
            defaultDescription: '',
            defaultLabels: [],
          });
        }}
        title={editingTemplate ? 'Edit Template' : 'Create Template'}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Template Name *
            </label>
            <Input
              value={formData.name || ''}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., Bug Report, User Story"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <Input
              value={formData.description || ''}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Brief description of this template"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Type
              </label>
              <Select
                value={formData.type || 'task'}
                onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
              >
                <option value="story">Story</option>
                <option value="task">Task</option>
                <option value="bug">Bug</option>
                <option value="epic">Epic</option>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Priority
              </label>
              <Select
                value={formData.priority || 'medium'}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value as any })}
              >
                <option value="lowest">Lowest</option>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="highest">Highest</option>
              </Select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Default Title Prefix
            </label>
            <Input
              value={formData.defaultTitle || ''}
              onChange={(e) => setFormData({ ...formData, defaultTitle: e.target.value })}
              placeholder="e.g., [BUG], [FEATURE]"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Default Description *
            </label>
            <Textarea
              value={formData.defaultDescription || ''}
              onChange={(e) => setFormData({ ...formData, defaultDescription: e.target.value })}
              placeholder="Template content with placeholders..."
              rows={10}
            />
          </div>

          <div className="flex gap-2 justify-end pt-4 border-t">
            <Button
              variant="ghost"
              onClick={() => {
                setShowCreateDialog(false);
                setEditingTemplate(null);
                setFormData({
                  name: '',
                  description: '',
                  type: 'task',
                  priority: 'medium',
                  defaultTitle: '',
                  defaultDescription: '',
                  defaultLabels: [],
                });
              }}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={editingTemplate ? updateTemplate : createTemplate}
            >
              {editingTemplate ? 'Update' : 'Create'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
