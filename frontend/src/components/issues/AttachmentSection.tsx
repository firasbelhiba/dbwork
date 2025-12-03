'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { attachmentsAPI } from '@/lib/api';
import { Attachment, formatFileSize, getFileIcon, isImageFile } from '@/types/attachment';
import { Button } from '@/components/common';
import { getInitials, getRelativeTime } from '@/lib/utils';
import toast from 'react-hot-toast';

interface AttachmentSectionProps {
  issueId: string;
}

export function AttachmentSection({ issueId }: AttachmentSectionProps) {
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchAttachments = useCallback(async () => {
    try {
      const response = await attachmentsAPI.getByIssue(issueId);
      setAttachments(response.data);
    } catch (error) {
      console.error('Error fetching attachments:', error);
    } finally {
      setLoading(false);
    }
  }, [issueId]);

  useEffect(() => {
    fetchAttachments();
  }, [fetchAttachments]);

  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    setUploading(true);
    const uploadPromises = Array.from(files).map(async (file) => {
      try {
        await attachmentsAPI.upload(issueId, file);
        return { success: true, name: file.name };
      } catch (error: any) {
        return { success: false, name: file.name, error: error?.response?.data?.message || 'Upload failed' };
      }
    });

    const results = await Promise.all(uploadPromises);
    const successes = results.filter(r => r.success);
    const failures = results.filter(r => !r.success);

    if (successes.length > 0) {
      toast.success(`${successes.length} file(s) uploaded successfully`);
      fetchAttachments();
    }

    if (failures.length > 0) {
      failures.forEach(f => toast.error(`Failed to upload ${f.name}: ${f.error}`));
    }

    setUploading(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDelete = async (attachmentId: string) => {
    try {
      await attachmentsAPI.delete(attachmentId);
      toast.success('Attachment deleted');
      setAttachments(prev => prev.filter(a => a._id !== attachmentId));
      setDeleteConfirm(null);
    } catch (error) {
      console.error('Error deleting attachment:', error);
      toast.error('Failed to delete attachment');
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    handleFileUpload(e.dataTransfer.files);
  };

  const getFileIconSvg = (type: string) => {
    switch (type) {
      case 'image':
        return (
          <svg className="w-8 h-8 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        );
      case 'pdf':
        return (
          <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>
        );
      case 'doc':
        return (
          <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        );
      case 'xls':
        return (
          <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        );
      case 'zip':
        return (
          <svg className="w-8 h-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
          </svg>
        );
      default:
        return (
          <svg className="w-8 h-8 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>
        );
    }
  };

  return (
    <div className="bg-white dark:bg-dark-600 rounded-lg border border-gray-200 dark:border-dark-400 p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          Attachments ({attachments.length})
        </h2>
        <Button
          variant="outline"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
        >
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          {uploading ? 'Uploading...' : 'Add Files'}
        </Button>
      </div>

      {/* Drop Zone */}
      <div
        className={`border-2 border-dashed rounded-lg p-6 mb-4 transition-colors ${
          dragActive
            ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
            : 'border-gray-300 dark:border-dark-300 hover:border-gray-400 dark:hover:border-dark-200'
        }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <div className="text-center">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Drag and drop files here, or{' '}
            <button
              type="button"
              className="text-primary-600 dark:text-primary-400 hover:underline font-medium"
              onClick={() => fileInputRef.current?.click()}
            >
              browse
            </button>
          </p>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-500">
            Images, PDFs, documents, spreadsheets, zip files (max 10MB)
          </p>
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={(e) => handleFileUpload(e.target.files)}
        accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.csv,.zip"
      />

      {/* Attachments List */}
      {loading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500 mx-auto"></div>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">Loading attachments...</p>
        </div>
      ) : attachments.length === 0 ? (
        <p className="text-center text-gray-500 dark:text-gray-400 py-4">No attachments yet</p>
      ) : (
        <div className="space-y-3">
          {attachments.map((attachment) => {
            const fileType = getFileIcon(attachment.mimeType);
            const isImage = isImageFile(attachment.mimeType);

            return (
              <div
                key={attachment._id}
                className="flex items-center gap-4 p-3 bg-gray-50 dark:bg-dark-500 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-400 transition-colors"
              >
                {/* Thumbnail or Icon */}
                <div className="flex-shrink-0">
                  {isImage && attachment.thumbnail ? (
                    <button
                      onClick={() => setPreviewImage(attachment.url)}
                      className="block w-12 h-12 rounded overflow-hidden hover:opacity-80 transition-opacity"
                    >
                      <img
                        src={attachment.thumbnail}
                        alt={attachment.originalName}
                        className="w-full h-full object-cover"
                      />
                    </button>
                  ) : isImage ? (
                    <button
                      onClick={() => setPreviewImage(attachment.url)}
                      className="block w-12 h-12 rounded overflow-hidden hover:opacity-80 transition-opacity"
                    >
                      <img
                        src={attachment.url}
                        alt={attachment.originalName}
                        className="w-full h-full object-cover"
                      />
                    </button>
                  ) : (
                    <div className="w-12 h-12 flex items-center justify-center">
                      {getFileIconSvg(fileType)}
                    </div>
                  )}
                </div>

                {/* File Info */}
                <div className="flex-1 min-w-0">
                  <a
                    href={attachment.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-medium text-gray-900 dark:text-white hover:text-primary-600 dark:hover:text-primary-400 truncate block"
                  >
                    {attachment.originalName}
                  </a>
                  <div className="flex items-center gap-2 mt-1 text-xs text-gray-500 dark:text-gray-400">
                    <span>{formatFileSize(attachment.size)}</span>
                    <span>-</span>
                    <span>{getRelativeTime(attachment.createdAt)}</span>
                    {attachment.userId && (
                      <>
                        <span>-</span>
                        <span className="flex items-center gap-1">
                          {attachment.userId.avatar ? (
                            <img
                              src={attachment.userId.avatar}
                              alt={`${attachment.userId.firstName} ${attachment.userId.lastName}`}
                              className="w-4 h-4 rounded-full object-cover"
                            />
                          ) : (
                            <div className="w-4 h-4 rounded-full bg-primary-500 text-white flex items-center justify-center text-[8px] font-medium">
                              {getInitials(attachment.userId.firstName, attachment.userId.lastName)}
                            </div>
                          )}
                          {attachment.userId.firstName}
                        </span>
                      </>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  <a
                    href={attachment.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 text-gray-500 hover:text-primary-600 dark:text-gray-400 dark:hover:text-primary-400 transition-colors"
                    title="Download"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                  </a>
                  <button
                    onClick={() => setDeleteConfirm(attachment._id)}
                    className="p-2 text-gray-500 hover:text-danger-600 dark:text-gray-400 dark:hover:text-danger-400 transition-colors"
                    title="Delete"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Image Preview Modal */}
      {previewImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75"
          onClick={() => setPreviewImage(null)}
        >
          <button
            className="absolute top-4 right-4 text-white hover:text-gray-300 transition-colors"
            onClick={() => setPreviewImage(null)}
          >
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <img
            src={previewImage}
            alt="Preview"
            className="max-w-[90vw] max-h-[90vh] object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black bg-opacity-50" onClick={() => setDeleteConfirm(null)} />
          <div className="relative bg-white dark:bg-dark-600 rounded-lg shadow-xl p-6 max-w-sm w-full">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Delete Attachment</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Are you sure you want to delete this attachment? This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setDeleteConfirm(null)} className="flex-1">
                Cancel
              </Button>
              <Button
                onClick={() => handleDelete(deleteConfirm)}
                className="flex-1 bg-danger-600 hover:bg-danger-700 text-white"
              >
                Delete
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
