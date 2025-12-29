'use client';

import React from 'react';

interface TypingIndicatorProps {
  users: string[];
}

export const TypingIndicator: React.FC<TypingIndicatorProps> = ({ users }) => {
  if (users.length === 0) return null;

  const getText = () => {
    if (users.length === 1) {
      return `${users[0]} is typing...`;
    }
    if (users.length === 2) {
      return `${users[0]} and ${users[1]} are typing...`;
    }
    return `${users.length} people are typing...`;
  };

  return (
    <div className="flex items-center gap-2 px-3 py-2">
      {/* Animated dots */}
      <div className="flex gap-1">
        <div className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '0ms' }} />
        <div className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '150ms' }} />
        <div className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '300ms' }} />
      </div>
      <span className="text-sm text-gray-500 dark:text-gray-400 italic">
        {getText()}
      </span>
    </div>
  );
};
