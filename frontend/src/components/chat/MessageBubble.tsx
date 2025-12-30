'use client';

import React, { useState } from 'react';
import { format } from 'date-fns';
import { ChatMessage, MessageAttachment } from '@/types/chat';
import { User } from '@/types/user';
import { useAuth } from '@/contexts/AuthContext';

interface MessageBubbleProps {
  message: ChatMessage;
  onReply?: (message: ChatMessage) => void;
  onEdit?: (message: ChatMessage) => void;
  onDelete?: (message: ChatMessage) => void;
  onReact?: (message: ChatMessage, reaction: string) => void;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  onReply,
  onEdit,
  onDelete,
  onReact,
}) => {
  const { user: currentUser } = useAuth();
  const [showActions, setShowActions] = useState(false);
  const [showReactionPicker, setShowReactionPicker] = useState(false);

  const sender = message.senderId as User;
  const isOwnMessage = sender?._id === currentUser?._id;
  const isSystemMessage = message.type === 'system';
  const senderName = sender?.firstName || 'Unknown';
  const senderLastName = sender?.lastName || '';

  // Reaction emojis
  const reactions = ['', '', '', '', '', ''];

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
          {message.content}
        </div>
      </div>
    );
  }

  return (
    <div
      className={`flex gap-2 mb-3 group ${isOwnMessage ? 'flex-row-reverse' : ''}`}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => {
        setShowActions(false);
        setShowReactionPicker(false);
      }}
    >
      {/* Avatar */}
      {!isOwnMessage && (
        <div className="flex-shrink-0">
          {sender?.avatar ? (
            <img
              src={sender.avatar}
              alt={senderName}
              className="w-8 h-8 rounded-full object-cover"
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-gray-400 text-white flex items-center justify-center text-sm font-medium">
              {senderName.charAt(0).toUpperCase()}
            </div>
          )}
        </div>
      )}

      {/* Message Content */}
      <div className={`max-w-[70%] ${isOwnMessage ? 'items-end' : 'items-start'}`}>
        {/* Sender name for non-own messages */}
        {!isOwnMessage && (
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
          className={`relative px-3 py-2 rounded-2xl ${
            isOwnMessage
              ? 'bg-primary-500 text-white'
              : 'bg-gray-100 dark:bg-dark-400 text-gray-900 dark:text-white'
          } ${message.isDeleted ? 'opacity-50 italic' : ''}`}
        >
          <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>

          {/* Attachments */}
          {message.attachments && message.attachments.length > 0 && (
            <div className="space-y-2">
              {message.attachments.map(renderAttachment)}
            </div>
          )}
        </div>

        {/* Reactions - displayed below the bubble */}
        {message.reactions && message.reactions.length > 0 && (
          <div className={`flex flex-wrap gap-1 mt-1 ${isOwnMessage ? 'justify-end' : ''}`}>
            {message.reactions.map((reaction, idx) => (
              <span
                key={idx}
                className="inline-flex items-center justify-center px-2 py-0.5 rounded-full bg-gray-100 dark:bg-dark-400 text-sm border border-gray-200 dark:border-dark-300 cursor-pointer hover:bg-gray-200 dark:hover:bg-dark-300 transition-colors"
                onClick={() => onReact?.(message, reaction.reaction)}
                title="Click to react"
              >
                {reaction.reaction}
              </span>
            ))}
          </div>
        )}

        {/* Timestamp and edited label */}
        <div className={`flex items-center gap-1 mt-0.5 ${isOwnMessage ? 'justify-end' : ''}`}>
          <span className="text-[10px] text-gray-400">
            {format(new Date(message.createdAt), 'HH:mm')}
          </span>
          {message.isEdited && (
            <span className="text-[10px] text-gray-400">(edited)</span>
          )}
        </div>
      </div>

      {/* Actions */}
      {showActions && !message.isDeleted && (
        <div className={`flex items-center gap-1 self-center ${isOwnMessage ? 'order-first' : ''}`}>
          {/* Reaction */}
          <div className="relative">
            <button
              onClick={() => setShowReactionPicker(!showReactionPicker)}
              className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-dark-400 transition-colors"
              title="React"
            >
              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </button>
            {showReactionPicker && (
              <div className="absolute bottom-full mb-1 left-0 flex gap-1 p-1 bg-white dark:bg-dark-500 rounded-lg shadow-lg border border-gray-200 dark:border-dark-400">
                {reactions.map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => {
                      onReact?.(message, emoji);
                      setShowReactionPicker(false);
                    }}
                    className="p-1 hover:bg-gray-100 dark:hover:bg-dark-400 rounded transition-colors"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Reply */}
          <button
            onClick={() => onReply?.(message)}
            className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-dark-400 transition-colors"
            title="Reply"
          >
            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
            </svg>
          </button>

          {/* Edit (own messages only) */}
          {isOwnMessage && (
            <button
              onClick={() => onEdit?.(message)}
              className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-dark-400 transition-colors"
              title="Edit"
            >
              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </button>
          )}

          {/* Delete */}
          {isOwnMessage && (
            <button
              onClick={() => onDelete?.(message)}
              className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-dark-400 transition-colors"
              title="Delete"
            >
              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          )}
        </div>
      )}
    </div>
  );
};
