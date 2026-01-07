'use client';

import React, { useState, useRef, useEffect } from 'react';
import { format } from 'date-fns';
import { ChatMessage, MessageAttachment, ReadReceipt } from '@/types/chat';
import { User } from '@/types/user';
import { useAuth } from '@/contexts/AuthContext';

// Message status for check marks
type MessageStatus = 'sending' | 'sent' | 'delivered' | 'seen';

interface MessageBubbleProps {
  message: ChatMessage;
  onReply?: (message: ChatMessage) => void;
  onEdit?: (message: ChatMessage) => void;
  onDelete?: (message: ChatMessage) => void;
  onReact?: (message: ChatMessage, reaction: string) => void;
  highlightText?: string;
  /** Read receipts from the conversation to determine seen status */
  readReceipts?: ReadReceipt[];
  /** Whether this is a DM (1:1) conversation for simpler seen logic */
  isDirectMessage?: boolean;
  /** Whether this message is from the same sender as the previous message (hide avatar/name) */
  isConsecutive?: boolean;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  onReply,
  onEdit,
  onDelete,
  onReact,
  highlightText = '',
  readReceipts = [],
  isDirectMessage = false,
  isConsecutive = false,
}) => {
  const { user: currentUser } = useAuth();
  const [showActions, setShowActions] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [dropdownAbove, setDropdownAbove] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const triggerButtonRef = useRef<HTMLButtonElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };

    if (showDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showDropdown]);

  const sender = message.senderId as User;
  const isOwnMessage = sender?._id === currentUser?._id;
  const isSystemMessage = message.type === 'system';
  const senderName = sender?.firstName || 'Unknown';
  const senderLastName = sender?.lastName || '';

  // Determine message status for check marks (only for own messages)
  const getMessageStatus = (): MessageStatus => {
    if (!isOwnMessage) return 'sent';

    const messageTime = new Date(message.createdAt).getTime();

    // For DMs, check if the other person has read it
    if (isDirectMessage) {
      const otherReadReceipt = readReceipts.find(r => r.userId !== currentUser?._id);
      if (otherReadReceipt) {
        const lastReadTime = new Date(otherReadReceipt.lastReadAt).getTime();
        if (lastReadTime >= messageTime) {
          return 'seen';
        }
      }
      return 'delivered';
    }

    // For group chats, check if at least one other person has read it
    const otherReceipts = readReceipts.filter(r => r.userId !== currentUser?._id);
    const hasBeenSeen = otherReceipts.some(r => {
      const lastReadTime = new Date(r.lastReadAt).getTime();
      return lastReadTime >= messageTime;
    });

    return hasBeenSeen ? 'seen' : 'delivered';
  };

  const messageStatus = getMessageStatus();

  // Reaction emojis
  const reactions = ['\u{1F44D}', '\u{2764}\u{FE0F}', '\u{1F602}', '\u{1F62E}', '\u{1F622}', '\u{1F64F}'];

  // Highlight mentions in text
  const renderMentions = (text: string): React.ReactNode => {
    // Match @FirstnameLastname pattern (letters only, no spaces)
    const mentionRegex = /@([A-Za-z]+)/g;
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;
    let match;

    while ((match = mentionRegex.exec(text)) !== null) {
      // Add text before the mention
      if (match.index > lastIndex) {
        parts.push(text.slice(lastIndex, match.index));
      }
      // Add the highlighted mention
      parts.push(
        <span
          key={match.index}
          className={`font-medium ${
            isOwnMessage
              ? 'text-white underline decoration-white/50'
              : 'text-primary-600 dark:text-primary-400'
          }`}
        >
          {match[0]}
        </span>
      );
      lastIndex = match.index + match[0].length;
    }

    // Add remaining text
    if (lastIndex < text.length) {
      parts.push(text.slice(lastIndex));
    }

    return parts.length > 0 ? parts : text;
  };

  // Highlight matching text (for search)
  const renderHighlightedText = (text: string): React.ReactNode => {
    // First render mentions
    const contentWithMentions = renderMentions(text);

    // If no search highlight, return with mentions only
    if (!highlightText.trim()) return contentWithMentions;

    // If the content is just a string (no mentions), apply search highlighting
    if (typeof contentWithMentions === 'string') {
      const regex = new RegExp(`(${highlightText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
      const parts = text.split(regex);

      return parts.map((part, i) =>
        regex.test(part) ? (
          <mark key={i} className="bg-yellow-300 dark:bg-yellow-500/50 rounded px-0.5">
            {part}
          </mark>
        ) : (
          part
        )
      );
    }

    // If content has mentions, return as-is (mentions take priority over search highlight)
    return contentWithMentions;
  };

  // Format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  // Render attachment
  const renderAttachment = (attachment: MessageAttachment) => {
    const isImage = attachment.mimeType.startsWith('image/');

    if (isImage) {
      return (
        <a
          key={attachment.cloudinaryId}
          href={attachment.url}
          target="_blank"
          rel="noopener noreferrer"
          className="block mt-2"
        >
          <img
            src={attachment.thumbnail || attachment.url}
            alt={attachment.fileName}
            className="max-w-xs max-h-64 rounded-lg object-cover"
          />
        </a>
      );
    }

    return (
      <a
        key={attachment.cloudinaryId}
        href={attachment.url}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-2 mt-2 p-2 rounded-lg bg-gray-100 dark:bg-dark-400 hover:bg-gray-200 dark:hover:bg-dark-300 transition-colors"
      >
        <svg
          className="w-8 h-8 text-gray-500"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
          />
        </svg>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate">
            {attachment.fileName}
          </p>
          <p className="text-xs text-gray-500">{formatFileSize(attachment.fileSize)}</p>
        </div>
      </a>
    );
  };

  // System message
  if (isSystemMessage) {
    return (
      <div className="flex justify-center my-4">
        <div className="px-3 py-1 rounded-full bg-gray-100 dark:bg-dark-400 text-xs text-gray-500 dark:text-gray-400">
          {renderHighlightedText(message.content)}
        </div>
      </div>
    );
  }

  return (
    <div
      className={`flex gap-2 ${isConsecutive ? 'mb-0.5' : 'mb-3'} group ${isOwnMessage ? 'flex-row-reverse' : ''}`}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => {
        setShowActions(false);
        setShowDropdown(false);
      }}
    >
      {/* Avatar - hidden for consecutive messages, but keep spacing */}
      {!isOwnMessage && (
        <div className="flex-shrink-0 w-8">
          {!isConsecutive && (
            sender?.avatar ? (
              <img
                src={sender.avatar}
                alt={senderName}
                className="w-8 h-8 rounded-full object-cover"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-gray-400 text-white flex items-center justify-center text-sm font-medium">
                {senderName.charAt(0).toUpperCase()}
              </div>
            )
          )}
        </div>
      )}

      {/* Message Content */}
      <div className={`relative max-w-[70%] flex flex-col ${isOwnMessage ? 'items-end' : 'items-start'}`}>
        {/* Sender name for non-own messages - hidden for consecutive */}
        {!isOwnMessage && !isConsecutive && (
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
            {senderName} {senderLastName}
          </p>
        )}

        {/* Reply preview */}
        {message.replyTo && typeof message.replyTo !== 'string' && (
          <div className="mb-1 p-2 rounded-lg bg-gray-100 dark:bg-dark-400 border-l-2 border-primary-500">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Reply to {(message.replyTo.senderId as User)?.firstName || 'Unknown'}
            </p>
            <p className="text-xs text-gray-600 dark:text-gray-300 truncate">
              {message.replyTo.content}
            </p>
          </div>
        )}

        {/* Bubble */}
        <div
          className={`relative px-3 py-1.5 rounded-2xl ${
            isOwnMessage
              ? 'bg-primary-500 text-white'
              : 'bg-gray-100 dark:bg-dark-400 text-gray-900 dark:text-white'
          } ${message.isDeleted ? 'opacity-50 italic' : ''} ${
            message.reactions && message.reactions.length > 0 ? 'pb-5' : ''
          }`}
        >
          {/* Message content with inline timestamp */}
          <div className="flex flex-wrap items-end gap-x-2">
            <p className="text-sm whitespace-pre-wrap break-words inline">{renderHighlightedText(message.content)}</p>

            {/* Timestamp and read status inside bubble */}
            <span className={`inline-flex items-center gap-0.5 text-[10px] ml-auto mt-0.5 whitespace-nowrap ${
              isOwnMessage
                ? 'text-white/70'
                : 'text-gray-400 dark:text-gray-500'
            }`}>
              {message.isEdited && <span>(edited)</span>}
              <span>{format(new Date(message.createdAt), 'HH:mm')}</span>
              {/* Check marks for own messages */}
              {isOwnMessage && (
                <span className={`inline-flex items-center ${messageStatus === 'seen' ? 'text-white' : 'text-white/70'}`}>
                  {messageStatus === 'seen' ? (
                    // Double check mark (seen)
                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M1 12l5 5L17 6" />
                      <path d="M7 12l5 5L23 6" />
                    </svg>
                  ) : (
                    // Single check mark (delivered)
                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M5 12l5 5L20 7" />
                    </svg>
                  )}
                </span>
              )}
            </span>
          </div>

          {/* Attachments */}
          {message.attachments && message.attachments.length > 0 && (
            <div className="space-y-2 mt-1">
              {message.attachments.map(renderAttachment)}
            </div>
          )}

          {/* Reactions - WhatsApp-style inside bubble at bottom */}
          {message.reactions && message.reactions.length > 0 && (
            <div className={`absolute -bottom-2 ${isOwnMessage ? 'left-2' : 'right-2'} flex flex-wrap gap-0.5`}>
              {message.reactions.map((reaction, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-white dark:bg-dark-500 text-sm shadow-sm border border-gray-200 dark:border-dark-300 cursor-pointer hover:scale-110 transition-transform"
                  onClick={() => onReact?.(message, reaction.reaction)}
                  title="Click to react"
                >
                  {reaction.reaction}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* WhatsApp-style dropdown trigger - shows on hover */}
        {showActions && !message.isDeleted && (
          <div
            ref={dropdownRef}
            className={`absolute top-1 ${isOwnMessage ? 'left-1' : 'right-1'} z-20`}
          >
            <button
              ref={triggerButtonRef}
              onClick={() => {
                // Calculate if dropdown should open above or below
                if (triggerButtonRef.current) {
                  const rect = triggerButtonRef.current.getBoundingClientRect();
                  const viewportHeight = window.innerHeight;
                  const spaceBelow = viewportHeight - rect.bottom;
                  const dropdownHeight = 280; // Approximate height of dropdown

                  // If not enough space below, show above
                  setDropdownAbove(spaceBelow < dropdownHeight);
                }
                setShowDropdown(!showDropdown);
              }}
              className="p-1 rounded-md bg-white/90 dark:bg-dark-500/90 hover:bg-white dark:hover:bg-dark-400 shadow-sm transition-colors"
            >
              <svg
                className="w-4 h-4 text-gray-500 dark:text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {/* Dropdown menu */}
            {showDropdown && (
              <div className={`absolute ${dropdownAbove ? 'bottom-full mb-1' : 'top-full mt-1'} ${isOwnMessage ? 'left-0' : 'right-0'} bg-white dark:bg-dark-500 rounded-lg shadow-xl border border-gray-200 dark:border-dark-400 py-1 min-w-[160px] z-30`}>
                {/* Quick reactions row */}
                <div className="flex justify-center gap-1 px-2 py-2 border-b border-gray-100 dark:border-dark-400">
                  {reactions.map((emoji) => (
                    <button
                      key={emoji}
                      onClick={() => {
                        onReact?.(message, emoji);
                        setShowDropdown(false);
                      }}
                      className="p-1.5 hover:bg-gray-100 dark:hover:bg-dark-400 rounded-full transition-colors text-lg"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>

                {/* Menu actions */}
                <div className="py-1">
                  {/* Reply */}
                  <button
                    onClick={() => {
                      onReply?.(message);
                      setShowDropdown(false);
                    }}
                    className="w-full px-3 py-2 text-left text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-dark-400 flex items-center gap-3"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                    </svg>
                    Reply
                  </button>

                  {/* Copy */}
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(message.content);
                      setShowDropdown(false);
                    }}
                    className="w-full px-3 py-2 text-left text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-dark-400 flex items-center gap-3"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    Copy
                  </button>

                  {/* Edit (own messages only) */}
                  {isOwnMessage && (
                    <button
                      onClick={() => {
                        onEdit?.(message);
                        setShowDropdown(false);
                      }}
                      className="w-full px-3 py-2 text-left text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-dark-400 flex items-center gap-3"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                      Edit
                    </button>
                  )}

                  {/* Delete (own messages only) */}
                  {isOwnMessage && (
                    <button
                      onClick={() => {
                        onDelete?.(message);
                        setShowDropdown(false);
                      }}
                      className="w-full px-3 py-2 text-left text-sm text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-dark-400 flex items-center gap-3"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                      Delete
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
};
