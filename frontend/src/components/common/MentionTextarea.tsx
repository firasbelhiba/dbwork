'use client';

import React, { useState, useRef, useEffect, KeyboardEvent } from 'react';
import { api } from '@/lib/api';

interface User {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  avatar?: string;
}

interface MentionTextareaProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  rows?: number;
  disabled?: boolean;
}

export const MentionTextarea: React.FC<MentionTextareaProps> = ({
  value,
  onChange,
  placeholder = 'Write a comment... Use @ to mention someone',
  className = '',
  rows = 3,
  disabled = false,
}) => {
  const [showMentions, setShowMentions] = useState(false);
  const [mentionSearch, setMentionSearch] = useState('');
  const [suggestions, setSuggestions] = useState<User[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [mentionStart, setMentionStart] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Search users when mention search changes
  useEffect(() => {
    if (mentionSearch) {
      const searchUsers = async () => {
        try {
          const response = await api.get(`/users/search?q=${mentionSearch}`);
          setSuggestions(response.data.slice(0, 5)); // Limit to 5 suggestions
        } catch (error) {
          console.error('Error searching users:', error);
          setSuggestions([]);
        }
      };
      searchUsers();
    } else {
      setSuggestions([]);
    }
  }, [mentionSearch]);

  // Handle text changes
  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    const cursorPosition = e.target.selectionStart;

    onChange(newValue);

    // Check if user is typing a mention
    const textBeforeCursor = newValue.slice(0, cursorPosition);
    const lastAtSymbol = textBeforeCursor.lastIndexOf('@');

    if (lastAtSymbol !== -1) {
      const textAfterAt = textBeforeCursor.slice(lastAtSymbol + 1);
      // Check if there's no space after @ (still typing the mention)
      if (!textAfterAt.includes(' ') && !textAfterAt.includes('\n')) {
        setMentionStart(lastAtSymbol);
        setMentionSearch(textAfterAt);
        setShowMentions(true);
        setSelectedIndex(0);
      } else {
        setShowMentions(false);
      }
    } else {
      setShowMentions(false);
    }
  };

  // Insert mention
  const insertMention = (user: User) => {
    if (!textareaRef.current) return;

    const mentionText = `${user.firstName}${user.lastName}`;
    const beforeMention = value.slice(0, mentionStart);
    const afterMention = value.slice(textareaRef.current.selectionStart);
    const newValue = `${beforeMention}@${mentionText} ${afterMention}`;

    onChange(newValue);
    setShowMentions(false);
    setMentionSearch('');

    // Set cursor position after the mention
    setTimeout(() => {
      if (textareaRef.current) {
        const newPosition = beforeMention.length + mentionText.length + 2; // +2 for @ and space
        textareaRef.current.selectionStart = newPosition;
        textareaRef.current.selectionEnd = newPosition;
        textareaRef.current.focus();
      }
    }, 0);
  };

  // Handle keyboard navigation
  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (!showMentions || suggestions.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : prev));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : 0));
        break;
      case 'Enter':
        if (showMentions) {
          e.preventDefault();
          insertMention(suggestions[selectedIndex]);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setShowMentions(false);
        break;
    }
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        textareaRef.current &&
        !textareaRef.current.contains(event.target as Node)
      ) {
        setShowMentions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative">
      <textarea
        ref={textareaRef}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        rows={rows}
        disabled={disabled}
        className={`w-full px-4 py-3 border border-gray-300 dark:border-dark-400 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-dark-500 dark:text-gray-200 resize-none ${className}`}
      />

      {/* Mention Suggestions Dropdown */}
      {showMentions && suggestions.length > 0 && (
        <div
          ref={dropdownRef}
          className="absolute z-50 w-64 mt-1 bg-white dark:bg-dark-500 border border-gray-200 dark:border-dark-400 rounded-lg shadow-lg max-h-60 overflow-y-auto"
          style={{
            bottom: '100%',
            marginBottom: '0.25rem',
          }}
        >
          {suggestions.map((user, index) => (
            <button
              key={user._id}
              type="button"
              onClick={() => insertMention(user)}
              className={`w-full px-4 py-2 text-left hover:bg-gray-100 dark:hover:bg-dark-400 flex items-center gap-3 transition-colors ${
                index === selectedIndex ? 'bg-gray-100 dark:bg-dark-400' : ''
              }`}
            >
              {user.avatar ? (
                <img
                  src={user.avatar}
                  alt={`${user.firstName} ${user.lastName}`}
                  className="w-8 h-8 rounded-full"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-primary-500 text-white flex items-center justify-center text-sm font-bold">
                  {user.firstName[0]}{user.lastName[0]}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                  {user.firstName} {user.lastName}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                  @{user.firstName}{user.lastName}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
