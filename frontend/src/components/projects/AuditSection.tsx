'use client';

import React, { useState, useEffect, useRef } from 'react';
import { auditsAPI } from '@/lib/api';
import { Audit, formatFileSize } from '@/types/audit';
import { Button, Input, Select } from '@/components/common';
import { PDFViewerModal } from './PDFViewerModal';
import { useAuth } from '@/contexts/AuthContext';
import { UserRole } from '@/types/user';
import { getInitials } from '@/lib/utils';
import toast from 'react-hot-toast';

const AUDIT_TYPES = [
  { value: 'security', label: 'Security Audit' },
  { value: 'financial', label: 'Financial Audit' },
  { value: 'compliance', label: 'Compliance Audit' },
  { value: 'code-review', label: 'Code Review' },
  { value: 'performance', label: 'Performance Audit' },
  { value: 'accessibility', label: 'Accessibility Audit' },
  { value: 'penetration-test', label: 'Penetration Test' },
  { value: 'infrastructure', label: 'Infrastructure Audit' },
  { value: 'data-privacy', label: 'Data Privacy Audit' },
  { value: 'other', label: 'Other' },
];

const getAuditTypeLabel = (value: string): string => {
  const type = AUDIT_TYPES.find((t) => t.value === value);
  return type ? type.label : value;
};

interface AuditSectionProps {
  projectId: string;
}

export function AuditSection({ projectId }: AuditSectionProps) {
  const { user } = useAuth();
  const [audits, setAudits] = useState<Audit[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // PDF Viewer state
  const [viewingAudit, setViewingAudit] = useState<Audit | null>(null);

  // Form state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    auditType: '',
    description: '',
    auditDate: '',
  });

  useEffect(() => {
    fetchAudits();
  }, [projectId]);

  const fetchAudits = async () => {
    try {
      const response = await auditsAPI.getByProject(projectId);
      setAudits(response.data);
    } catch (error) {
      console.error('Error fetching audits:', error);
      toast.error('Failed to load audits');
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (file: File) => {
    if (file.type !== 'application/pdf') {
      toast.error('Only PDF files are allowed');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error('File size must be less than 10MB');
      return;
    }
    setSelectedFile(file);
    // Auto-fill title from filename if empty
    if (!formData.title) {
      const nameWithoutExt = file.name.replace(/\.pdf$/i, '');
      setFormData({ ...formData, title: nameWithoutExt });
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => {
    setDragOver(false);
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      toast.error('Please select a PDF file');
      return;
    }
    if (!formData.title.trim()) {
      toast.error('Title is required');
      return;
    }
    if (!formData.auditType.trim()) {
      toast.error('Audit type is required');
      return;
    }

    setUploading(true);
    try {
      await auditsAPI.upload(projectId, selectedFile, {
        title: formData.title.trim(),
        auditType: formData.auditType.trim(),
        description: formData.description.trim() || undefined,
        auditDate: formData.auditDate || undefined,
      });
      toast.success('Audit uploaded successfully');
      setShowUploadForm(false);
      setSelectedFile(null);
      setFormData({ title: '', auditType: '', description: '', auditDate: '' });
      fetchAudits();
    } catch (error: any) {
      console.error('Error uploading audit:', error);
      const errorMessage = error.response?.data?.message || 'Failed to upload audit';
      toast.error(errorMessage);
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (auditId: string) => {
    if (!confirm('Are you sure you want to delete this audit?')) return;

    try {
      await auditsAPI.delete(auditId);
      toast.success('Audit deleted successfully');
      fetchAudits();
    } catch (error: any) {
      console.error('Error deleting audit:', error);
      const errorMessage = error.response?.data?.message || 'Failed to delete audit';
      toast.error(errorMessage);
    }
  };

  const canDelete = (audit: Audit) => {
    if (!user) return false;
    return user.role === UserRole.ADMIN || audit.userId._id === user._id;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-dark-400 rounded-lg shadow-sm border border-gray-200 dark:border-dark-300">
        <div className="p-6 border-b border-gray-200 dark:border-dark-300">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Project Audits</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Upload and manage PDF audit documents for this project
              </p>
            </div>
            <Button onClick={() => setShowUploadForm(!showUploadForm)}>
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Upload Audit
            </Button>
          </div>
        </div>

        {/* Upload Form */}
        {showUploadForm && (
          <form onSubmit={handleUpload} className="p-6 bg-gray-50 dark:bg-dark-300 border-b border-gray-200 dark:border-dark-300">
            <div className="space-y-4">
              {/* File Drop Zone */}
              <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                  dragOver
                    ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                    : selectedFile
                    ? 'border-success-500 bg-success-50 dark:bg-success-900/20'
                    : 'border-gray-300 dark:border-dark-200 hover:border-primary-400 dark:hover:border-primary-500'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,application/pdf"
                  onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
                  className="hidden"
                />
                {selectedFile ? (
                  <div className="flex items-center justify-center gap-3">
                    <svg className="w-10 h-10 text-danger-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
                    </svg>
                    <div className="text-left">
                      <p className="font-medium text-gray-900 dark:text-gray-100">{selectedFile.name}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">{formatFileSize(selectedFile.size)}</p>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedFile(null);
                      }}
                      className="ml-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ) : (
                  <>
                    <svg className="w-12 h-12 mx-auto text-gray-400 dark:text-gray-500 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                    <p className="text-gray-600 dark:text-gray-400">
                      Drag and drop a PDF file here, or click to browse
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">
                      Maximum file size: 10MB
                    </p>
                  </>
                )}
              </div>

              {/* Form Fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Title <span className="text-danger-500">*</span>
                  </label>
                  <Input
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="e.g., Q4 Security Audit"
                    disabled={uploading}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Audit Type <span className="text-danger-500">*</span>
                  </label>
                  <Select
                    value={formData.auditType}
                    onChange={(e) => setFormData({ ...formData, auditType: e.target.value })}
                    disabled={uploading}
                  >
                    <option value="">Select audit type...</option>
                    {AUDIT_TYPES.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Audit Date
                  </label>
                  <Input
                    type="date"
                    value={formData.auditDate}
                    onChange={(e) => setFormData({ ...formData, auditDate: e.target.value })}
                    disabled={uploading}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Description
                  </label>
                  <Input
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Optional notes about this audit"
                    disabled={uploading}
                  />
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowUploadForm(false);
                    setSelectedFile(null);
                    setFormData({ title: '', auditType: '', description: '', auditDate: '' });
                  }}
                  disabled={uploading}
                >
                  Cancel
                </Button>
                <Button type="submit" loading={uploading} disabled={uploading || !selectedFile}>
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                  </svg>
                  Upload Audit
                </Button>
              </div>
            </div>
          </form>
        )}

        {/* Audits List */}
        <div className="divide-y divide-gray-200 dark:divide-dark-300">
          {audits.length === 0 ? (
            <div className="p-12 text-center">
              <svg className="w-16 h-16 mx-auto mb-4 text-gray-400 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-1">No audits yet</h3>
              <p className="text-gray-500 dark:text-gray-400">
                Upload your first audit document to get started
              </p>
            </div>
          ) : (
            audits.map((audit) => (
              <div key={audit._id} className="p-6 hover:bg-gray-50 dark:hover:bg-dark-300 transition-colors">
                <div className="flex items-start gap-4">
                  {/* PDF Icon */}
                  <div className="flex-shrink-0 w-12 h-12 bg-danger-100 dark:bg-danger-900/30 rounded-lg flex items-center justify-center">
                    <svg className="w-6 h-6 text-danger-600 dark:text-danger-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
                    </svg>
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1">
                      <h3 className="text-base font-medium text-gray-900 dark:text-gray-100 truncate">
                        {audit.title}
                      </h3>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400">
                        {getAuditTypeLabel(audit.auditType)}
                      </span>
                    </div>

                    {audit.description && (
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-2 line-clamp-2">
                        {audit.description}
                      </p>
                    )}

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500 dark:text-gray-400">
                      <span className="flex items-center gap-1">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        {audit.originalName}
                      </span>
                      <span>{formatFileSize(audit.size)}</span>
                      {audit.auditDate && (
                        <span className="flex items-center gap-1">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          Audit Date: {formatDate(audit.auditDate)}
                        </span>
                      )}
                      <span>Uploaded {formatDate(audit.createdAt)}</span>
                    </div>

                    {/* Uploader */}
                    <div className="flex items-center gap-2 mt-3">
                      {audit.userId.avatar ? (
                        <img
                          src={audit.userId.avatar}
                          alt={`${audit.userId.firstName} ${audit.userId.lastName}`}
                          className="w-6 h-6 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center text-xs font-medium">
                          {getInitials(audit.userId.firstName, audit.userId.lastName)}
                        </div>
                      )}
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {audit.userId.firstName} {audit.userId.lastName}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => setViewingAudit(audit)}
                      className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-md transition-colors"
                    >
                      <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                      View
                    </button>
                    <a
                      href={audit.url}
                      download={audit.originalName}
                      className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-dark-200 rounded-md transition-colors"
                    >
                      <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                      Download
                    </a>
                    {canDelete(audit) && (
                      <button
                        onClick={() => handleDelete(audit._id)}
                        className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-danger-600 dark:text-danger-400 hover:text-danger-700 dark:hover:text-danger-300 hover:bg-danger-50 dark:hover:bg-danger-900/20 rounded-md transition-colors"
                      >
                        <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        Delete
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* PDF Viewer Modal */}
      {viewingAudit && (
        <PDFViewerModal
          isOpen={!!viewingAudit}
          onClose={() => setViewingAudit(null)}
          pdfUrl={viewingAudit.url}
          title={viewingAudit.title}
          originalName={viewingAudit.originalName}
        />
      )}
    </div>
  );
}
