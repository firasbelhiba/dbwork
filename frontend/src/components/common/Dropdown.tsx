'use client';

import React, { useState, useRef, useEffect, ReactNode } from 'react';
import { cn } from '@/lib/utils';

export interface DropdownProps {
  trigger: ReactNode;
  children: ReactNode;
  align?: 'left' | 'right';
}

export const Dropdown: React.FC<DropdownProps> = ({ trigger, children, align = 'left' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <div onClick={() => setIsOpen(!isOpen)}>{trigger}</div>
      {isOpen && (
        <div
          className={cn(
            'absolute z-50 mt-2 min-w-[200px] bg-white dark:bg-dark-400 rounded-md shadow-lg border border-gray-200 dark:border-dark-300 py-1',
            align === 'right' ? 'right-0' : 'left-0'
          )}
        >
          {children}
        </div>
      )}
    </div>
  );
};

export const DropdownItem: React.FC<{
  children: ReactNode;
  onClick?: () => void;
  variant?: 'default' | 'danger';
}> = ({ children, onClick, variant = 'default' }) => {
  return (
    <button
      onClick={onClick}
      className={cn(
        'block w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-dark-300 transition-colors',
        variant === 'danger' ? 'text-danger' : 'text-gray-700 dark:text-gray-200'
      )}
    >
      {children}
    </button>
  );
};
