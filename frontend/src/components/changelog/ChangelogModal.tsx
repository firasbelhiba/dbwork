'use client';

import React, { useEffect, useState } from 'react';
import { Modal } from '@/components/common/Modal';
import { IChangelog } from '@/types';
import { changelogsAPI } from '@/lib/api';
import { toast } from 'react-hot-toast';

interface ChangelogModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ChangelogModal: React.FC<ChangelogModalProps> = ({ isOpen, onClose }) => {
  const [changelogs, setChangelogs] = useState<IChangelog[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedVersion, setExpandedVersion] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchAllChangelogs();
    }
  }, [isOpen]);

  const fetchAllChangelogs = async () => {
    try {
      setLoading(true);
      const response = await changelogsAPI.getAll();
      setChangelogs(response.data.data || []);
      // Expand the latest version by default
      if (response.data.data && response.data.data.length > 0) {
        setExpandedVersion(response.data.data[0].version);
      }
    } catch (error: any) {
      console.error('Error fetching changelogs:', error);
      if (error.response?.status !== 404) {
        toast.error('Failed to load changelogs');
      } else {
        setChangelogs([]);
      }
    } finally {
      setLoading(false);
    }
  };

  const toggleVersion = (version: string) => {
    setExpandedVersion(expandedVersion === version ? null : version);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const renderChangelogContent = (changelog: IChangelog) => (
    <div className="space-y-4 px-4 pb-4">
      {/* Title */}
      <div>
        <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
          {changelog.title}
        </h4>
        <p className="text-gray-600 dark:text-gray-300 mt-2">
          {changelog.description}
        </p>
      </div>

      {/* Features */}
      {changelog.features && changelog.features.length > 0 && (
        <div>
          <h5 className="text-md font-semibold text-gray-900 dark:text-white flex items-center gap-2 mb-3">
            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-300">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </span>
            New Features
          </h5>
          <ul className="space-y-2 ml-8">
            {changelog.features.map((feature, index) => (
              <li key={index} className="text-gray-600 dark:text-gray-300 flex items-start">
                <span className="mr-2 text-green-500">•</span>
                <span>{feature}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Improvements */}
      {changelog.improvements && changelog.improvements.length > 0 && (
        <div>
          <h5 className="text-md font-semibold text-gray-900 dark:text-white flex items-center gap-2 mb-3">
            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
              </svg>
            </span>
            Improvements
          </h5>
          <ul className="space-y-2 ml-8">
            {changelog.improvements.map((improvement, index) => (
              <li key={index} className="text-gray-600 dark:text-gray-300 flex items-start">
                <span className="mr-2 text-blue-500">•</span>
                <span>{improvement}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Bug Fixes */}
      {changelog.bugFixes && changelog.bugFixes.length > 0 && (
        <div>
          <h5 className="text-md font-semibold text-gray-900 dark:text-white flex items-center gap-2 mb-3">
            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-red-100 dark:bg-red-900 text-red-600 dark:text-red-300">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </span>
            Bug Fixes
          </h5>
          <ul className="space-y-2 ml-8">
            {changelog.bugFixes.map((bugFix, index) => (
              <li key={index} className="text-gray-600 dark:text-gray-300 flex items-start">
                <span className="mr-2 text-red-500">•</span>
                <span>{bugFix}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="What's New" size="lg">
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        </div>
      ) : changelogs.length > 0 ? (
        <div className="space-y-3">
          {changelogs.map((changelog) => (
            <div
              key={changelog.version}
              className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden"
            >
              {/* Accordion Header */}
              <button
                onClick={() => toggleVersion(changelog.version)}
                className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-750 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                    Version {changelog.version}
                  </h3>
                  <span className="text-xs px-2 py-1 rounded bg-primary-100 dark:bg-primary-900 text-primary-700 dark:text-primary-300">
                    {formatDate(changelog.releaseDate)}
                  </span>
                </div>
                <svg
                  className={`w-5 h-5 text-gray-500 dark:text-gray-400 transition-transform ${
                    expandedVersion === changelog.version ? 'rotate-180' : ''
                  }`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </button>

              {/* Accordion Content */}
              {expandedVersion === changelog.version && renderChangelogContent(changelog)}
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
            No changelogs available
          </h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Check back later for updates.
          </p>
        </div>
      )}
    </Modal>
  );
};
