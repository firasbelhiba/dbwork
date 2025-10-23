'use client';

import React from 'react';
import { CommandPalette } from '@/components/command/CommandPalette';

export const RootLayoutClient: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <>
      {children}
      <CommandPalette />
    </>
  );
};
