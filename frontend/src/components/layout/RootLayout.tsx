'use client';

import React from 'react';
import { Toaster } from 'react-hot-toast';
import { AchievementNotifier } from '@/components/achievements/AchievementNotifier';

export const RootLayoutClient: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <>
      {children}
      <AchievementNotifier />
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#fff',
            color: '#374151',
            border: '1px solid #e5e7eb',
            padding: '12px 16px',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: '500',
          },
          success: {
            iconTheme: {
              primary: '#10b981',
              secondary: '#fff',
            },
            style: {
              border: '1px solid #d1fae5',
              background: '#f0fdf4',
            },
          },
          error: {
            iconTheme: {
              primary: '#ef4444',
              secondary: '#fff',
            },
            style: {
              border: '1px solid #fecaca',
              background: '#fef2f2',
            },
          },
        }}
      />
    </>
  );
};
