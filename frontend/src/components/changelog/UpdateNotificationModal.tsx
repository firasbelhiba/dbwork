'use client';

import React, { useEffect, useState } from 'react';
import { IChangelog } from '@/types';
import { changelogsAPI } from '@/lib/api';
import { toast } from 'react-hot-toast';

interface UpdateNotificationModalProps {
  changelog: IChangelog;
  onClose: () => void;
}

export const UpdateNotificationModal: React.FC<UpdateNotificationModalProps> = ({
  changelog,
  onClose,
}) => {
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    // Trigger animation after mount
    setTimeout(() => setIsAnimating(true), 50);

    // Disable body scroll
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  const handleClose = async () => {
    try {
      // Mark as seen
      await changelogsAPI.markAsSeen(changelog.version);
      onClose();
    } catch (error: any) {
      console.error('Error marking changelog as seen:', error);
      toast.error('Failed to mark update as seen');
      onClose();
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  // Count total changes
  const totalChanges =
    (changelog.features?.length || 0) +
    (changelog.improvements?.length || 0) +
    (changelog.bugFixes?.length || 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/70 transition-opacity duration-300"
        style={{ opacity: isAnimating ? 1 : 0 }}
        onClick={handleClose}
      />

      {/* Modal */}
      <div
        className="relative bg-gradient-to-br from-white to-gray-50 dark:from-dark-600 dark:to-dark-700 rounded-2xl shadow-2xl shadow-primary-500/20 w-full max-w-lg mx-4 transform transition-all duration-500 max-h-[85vh] overflow-hidden"
        style={{
          transform: isAnimating ? 'scale(1) translateY(0)' : 'scale(0.8) translateY(20px)',
          opacity: isAnimating ? 1 : 0,
        }}
      >
        {/* Sparkle effect background */}
        <div className="absolute inset-0 overflow-hidden rounded-2xl pointer-events-none">
          <div className="absolute top-0 left-1/4 w-2 h-2 bg-blue-400 rounded-full animate-ping" style={{ animationDelay: '0.1s' }} />
          <div className="absolute top-10 right-1/4 w-3 h-3 bg-green-400 rounded-full animate-ping" style={{ animationDelay: '0.3s' }} />
          <div className="absolute bottom-20 left-1/3 w-2 h-2 bg-purple-400 rounded-full animate-ping" style={{ animationDelay: '0.5s' }} />
          <div className="absolute bottom-10 right-1/3 w-3 h-3 bg-yellow-400 rounded-full animate-ping" style={{ animationDelay: '0.7s' }} />
        </div>

        {/* Content */}
        <div className="relative px-6 py-8">
          {/* Header */}
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-primary-500 to-blue-600 mb-4 transform transition-transform duration-700"
              style={{
                transform: isAnimating ? 'rotate(360deg) scale(1)' : 'rotate(0deg) scale(0.5)',
              }}
            >
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
              New Update Available!
            </h2>
            <div className="flex items-center justify-center gap-2">
              <span className="inline-block px-3 py-1 rounded-full text-sm font-semibold bg-primary-100 dark:bg-primary-900/50 text-primary-700 dark:text-primary-300 border border-primary-200 dark:border-primary-800">
                Version {changelog.version}
              </span>
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {formatDate(changelog.releaseDate)}
              </span>
            </div>
          </div>

          {/* Title & Description */}
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              {changelog.title}
            </h3>
            <p className="text-gray-600 dark:text-gray-300 text-sm">
              {changelog.description}
            </p>
          </div>

          {/* Changes Summary */}
          <div className="bg-gray-50 dark:bg-dark-500 rounded-lg p-4 mb-6 max-h-[30vh] overflow-y-auto">
            {/* Features */}
            {changelog.features && changelog.features.length > 0 && (
              <div className="mb-4">
                <h5 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2 mb-2">
                  <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-300">
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  </span>
                  New Features ({changelog.features.length})
                </h5>
                <ul className="space-y-1 ml-7">
                  {changelog.features.slice(0, 5).map((feature, index) => (
                    <li key={index} className="text-sm text-gray-600 dark:text-gray-300 flex items-start">
                      <span className="mr-2 text-green-500">•</span>
                      <span>{feature}</span>
                    </li>
                  ))}
                  {changelog.features.length > 5 && (
                    <li className="text-sm text-gray-500 dark:text-gray-400 italic">
                      +{changelog.features.length - 5} more features...
                    </li>
                  )}
                </ul>
              </div>
            )}

            {/* Improvements */}
            {changelog.improvements && changelog.improvements.length > 0 && (
              <div className="mb-4">
                <h5 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2 mb-2">
                  <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300">
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
                    </svg>
                  </span>
                  Improvements ({changelog.improvements.length})
                </h5>
                <ul className="space-y-1 ml-7">
                  {changelog.improvements.slice(0, 3).map((improvement, index) => (
                    <li key={index} className="text-sm text-gray-600 dark:text-gray-300 flex items-start">
                      <span className="mr-2 text-blue-500">•</span>
                      <span>{improvement}</span>
                    </li>
                  ))}
                  {changelog.improvements.length > 3 && (
                    <li className="text-sm text-gray-500 dark:text-gray-400 italic">
                      +{changelog.improvements.length - 3} more improvements...
                    </li>
                  )}
                </ul>
              </div>
            )}

            {/* Bug Fixes */}
            {changelog.bugFixes && changelog.bugFixes.length > 0 && (
              <div>
                <h5 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2 mb-2">
                  <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-red-100 dark:bg-red-900 text-red-600 dark:text-red-300">
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  </span>
                  Bug Fixes ({changelog.bugFixes.length})
                </h5>
                <ul className="space-y-1 ml-7">
                  {changelog.bugFixes.slice(0, 3).map((bugFix, index) => (
                    <li key={index} className="text-sm text-gray-600 dark:text-gray-300 flex items-start">
                      <span className="mr-2 text-red-500">•</span>
                      <span>{bugFix}</span>
                    </li>
                  ))}
                  {changelog.bugFixes.length > 3 && (
                    <li className="text-sm text-gray-500 dark:text-gray-400 italic">
                      +{changelog.bugFixes.length - 3} more fixes...
                    </li>
                  )}
                </ul>
              </div>
            )}
          </div>

          {/* Total changes badge */}
          <div className="flex items-center justify-center mb-6">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-primary-50 to-blue-50 dark:from-primary-900/30 dark:to-blue-900/30 rounded-full border border-primary-200 dark:border-primary-800">
              <svg className="w-5 h-5 text-primary-600 dark:text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-sm font-semibold text-primary-700 dark:text-primary-300">
                {totalChanges} changes in this release
              </span>
            </div>
          </div>

          {/* Refresh reminder */}
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3 mb-6">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <p className="text-sm text-amber-700 dark:text-amber-300">
                Please <strong>refresh your browser</strong> to get the latest updates!
              </p>
            </div>
          </div>

          {/* Close Button */}
          <button
            onClick={handleClose}
            className="w-full bg-gradient-to-r from-primary-600 to-blue-600 hover:from-primary-700 hover:to-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-200 transform hover:scale-[1.02] shadow-lg"
          >
            Got it, thanks!
          </button>
        </div>
      </div>
    </div>
  );
};
