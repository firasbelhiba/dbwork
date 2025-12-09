'use client';

import React, { useState, useRef, useEffect } from 'react';

// Meta/Facebook style emoji reactions
const EMOJI_REACTIONS = [
  { emoji: '👍', name: 'like' },
  { emoji: '❤️', name: 'love' },
  { emoji: '😂', name: 'haha' },
  { emoji: '😮', name: 'wow' },
  { emoji: '😢', name: 'sad' },
  { emoji: '😡', name: 'angry' },
];

interface Reaction {
  userId: string | { _id: string };
  reaction: string;
}

interface EmojiReactionPickerProps {
  reactions: Reaction[];
  currentUserId?: string;
  onAddReaction: (emoji: string) => void;
  onRemoveReaction: (emoji: string) => void;
  disabled?: boolean;
}

export const EmojiReactionPicker: React.FC<EmojiReactionPickerProps> = ({
  reactions = [],
  currentUserId,
  onAddReaction,
  onRemoveReaction,
  disabled = false,
}) => {
  const [showPicker, setShowPicker] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);

  // Close picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) {
        setShowPicker(false);
      }
    };

    if (showPicker) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showPicker]);

  // Group reactions by emoji and count them
  const reactionGroups = reactions.reduce((acc, reaction) => {
    const emoji = reaction.reaction;
    if (!acc[emoji]) {
      acc[emoji] = { count: 0, users: [], hasCurrentUser: false };
    }
    acc[emoji].count++;
    const userId = typeof reaction.userId === 'object' ? reaction.userId._id : reaction.userId;
    acc[emoji].users.push(userId);
    if (userId === currentUserId) {
      acc[emoji].hasCurrentUser = true;
    }
    return acc;
  }, {} as Record<string, { count: number; users: string[]; hasCurrentUser: boolean }>);

  const handleReactionClick = (emoji: string) => {
    if (disabled) return;

    const group = reactionGroups[emoji];
    if (group?.hasCurrentUser) {
      onRemoveReaction(emoji);
    } else {
      onAddReaction(emoji);
    }
    setShowPicker(false);
  };

  const handleExistingReactionClick = (emoji: string) => {
    if (disabled) return;

    const group = reactionGroups[emoji];
    if (group?.hasCurrentUser) {
      onRemoveReaction(emoji);
    } else {
      onAddReaction(emoji);
    }
  };

  return (
    <div className="flex items-center gap-1.5" ref={pickerRef}>
      {/* Display existing reactions */}
      {Object.entries(reactionGroups).map(([emoji, group]) => (
        <button
          key={emoji}
          type="button"
          onClick={() => handleExistingReactionClick(emoji)}
          disabled={disabled}
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-sm transition-all ${
            group.hasCurrentUser
              ? 'bg-primary/20 border border-primary text-primary dark:bg-primary/30'
              : 'bg-gray-100 dark:bg-dark-400 hover:bg-gray-200 dark:hover:bg-dark-300 border border-transparent'
          } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
          title={`${group.count} ${group.count === 1 ? 'reaction' : 'reactions'}`}
        >
          <span>{emoji}</span>
          <span className="text-xs font-medium">{group.count}</span>
        </button>
      ))}

      {/* Add reaction button */}
      <div className="relative">
        <button
          type="button"
          onClick={() => !disabled && setShowPicker(!showPicker)}
          disabled={disabled}
          className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-dark-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors ${
            disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
          }`}
          title="Add reaction"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </button>

        {/* Emoji picker dropdown */}
        {showPicker && (
          <div className="absolute left-0 bottom-full mb-2 bg-white dark:bg-dark-500 rounded-full shadow-lg border border-gray-200 dark:border-dark-300 px-2 py-1.5 flex items-center gap-1 z-50 animate-in fade-in slide-in-from-bottom-2 duration-150">
            {EMOJI_REACTIONS.map(({ emoji, name }) => {
              const isSelected = reactionGroups[emoji]?.hasCurrentUser;
              return (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => handleReactionClick(emoji)}
                  className={`text-xl p-1.5 rounded-full transition-all hover:scale-125 hover:bg-gray-100 dark:hover:bg-dark-400 ${
                    isSelected ? 'bg-primary/20' : ''
                  }`}
                  title={name}
                >
                  {emoji}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
