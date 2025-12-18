'use client';

import React, { useState, useEffect } from 'react';
import { Modal } from '@/components/common';

interface PDFViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  pdfUrl: string;
  title: string;
  originalName: string;
}

export function PDFViewerModal({ isOpen, onClose, pdfUrl, title, originalName }: PDFViewerModalProps) {
  const [loadError, setLoadError] = useState(false);
  const [viewerType, setViewerType] = useState<'direct' | 'google' | 'object'>('direct');
  const [isLoading, setIsLoading] = useState(true);

  // Google Docs Viewer URL - works well for most PDFs
  const googleViewerUrl = `https://docs.google.com/viewer?url=${encodeURIComponent(pdfUrl)}&embedded=true`;

  const tryNextViewer = () => {
    if (viewerType === 'direct') {
      // Try object tag next
      setViewerType('object');
      setIsLoading(true);
    } else if (viewerType === 'object') {
      // Try Google Docs viewer as last resort
      setViewerType('google');
      setIsLoading(true);
    } else {
      setLoadError(true);
    }
  };

  const handleLoad = () => {
    setIsLoading(false);
  };

  const resetViewer = () => {
    setLoadError(false);
    setViewerType('direct');
    setIsLoading(true);
  };

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      resetViewer();
    }
  }, [isOpen, pdfUrl]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      size="full"
      footer={
        <div className="flex items-center gap-3">
          <a
            href={pdfUrl}
            download={originalName}
            className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-dark-400 hover:bg-gray-200 dark:hover:bg-dark-300 rounded-lg transition-colors"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Download PDF
          </a>
          <a
            href={pdfUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-dark-400 hover:bg-gray-200 dark:hover:bg-dark-300 rounded-lg transition-colors"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
            Open in New Tab
          </a>
        </div>
      }
    >
      <div className="w-full h-[calc(80vh-120px)] bg-gray-100 dark:bg-dark-500 rounded-lg overflow-hidden relative">
        {/* Loading indicator */}
        {isLoading && !loadError && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-dark-500 z-10">
            <div className="flex flex-col items-center">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600 mb-3"></div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Loading PDF...</p>
            </div>
          </div>
        )}

        {loadError ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-8">
            <svg className="w-16 h-16 text-gray-400 dark:text-gray-500 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
              Unable to display PDF
            </h3>
            <p className="text-gray-500 dark:text-gray-400 mb-4 max-w-md">
              The PDF viewer couldn't load this document. You can download it or open it in a new tab.
            </p>
            <div className="flex gap-3">
              <button
                onClick={resetViewer}
                className="px-4 py-2 text-sm font-medium text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300"
              >
                Try Again
              </button>
              <a
                href={pdfUrl}
                download={originalName}
                className="px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-lg"
              >
                Download PDF
              </a>
            </div>
          </div>
        ) : (
          <>
            {viewerType === 'direct' && (
              <iframe
                src={pdfUrl}
                className="w-full h-full border-0"
                title={title}
                onLoad={handleLoad}
                onError={tryNextViewer}
              />
            )}
            {viewerType === 'object' && (
              <object
                data={pdfUrl}
                type="application/pdf"
                className="w-full h-full"
                onLoad={handleLoad}
                onError={tryNextViewer}
              >
                <p className="p-8 text-center text-gray-500 dark:text-gray-400">
                  Loading alternative viewer...
                </p>
              </object>
            )}
            {viewerType === 'google' && (
              <iframe
                src={googleViewerUrl}
                className="w-full h-full border-0"
                title={title}
                onLoad={handleLoad}
                onError={() => setLoadError(true)}
              />
            )}
          </>
        )}
      </div>
    </Modal>
  );
}
