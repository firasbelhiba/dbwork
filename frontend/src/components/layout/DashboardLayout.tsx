'use client';

import React, { ReactNode, useState, useCallback } from 'react';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import { useKeyboardShortcuts } from '@/hooks';

interface DashboardLayoutProps {
  children: ReactNode;
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children }) => {
  // Enable global keyboard shortcuts
  useKeyboardShortcuts();

  // Mobile menu state
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const toggleMobileMenu = useCallback(() => {
    setMobileMenuOpen(prev => !prev);
  }, []);

  const closeMobileMenu = useCallback(() => {
    setMobileMenuOpen(false);
  }, []);

  return (
    <div className="h-screen flex flex-col bg-gray-50 dark:bg-dark-600">
      <Header onMenuToggle={toggleMobileMenu} />
      <div className="flex-1 flex overflow-hidden">
        {/* Desktop Sidebar - hidden on mobile */}
        <div className="hidden md:flex">
          <Sidebar />
        </div>

        {/* Mobile Sidebar Overlay */}
        {mobileMenuOpen && (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 bg-black/50 z-40 md:hidden"
              onClick={closeMobileMenu}
            />
            {/* Mobile Sidebar Drawer */}
            <div className="fixed inset-y-0 left-0 w-72 z-50 md:hidden">
              <Sidebar onClose={closeMobileMenu} isMobile />
            </div>
          </>
        )}

        <main className="flex-1 overflow-y-auto bg-gray-50 dark:bg-dark-600 transition-colors">
          {children}
        </main>
      </div>
    </div>
  );
};
