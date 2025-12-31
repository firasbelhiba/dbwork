'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import dynamic from 'next/dynamic';
import data from '@emoji-mart/data';
import { ChatMessage, MessageAttachment } from '@/types/chat';
import { User } from '@/types/user';

// Dynamically import emoji picker to avoid SSR issues
const Picker = dynamic(
  () => import('@emoji-mart/react').then(mod => {
    const PickerComponent = mod.default;
    // Return a wrapper that includes the data prop
    return function PickerWithData(props: any) {
      return <PickerComponent data={data} {...props} />;
    };
  }),
  {
    ssr: false,
    loading: () => <div className="w-[352px] h-[435px] bg-white dark:bg-dark-500 rounded-lg flex items-center justify-center">Loading...</div>,
  }
);

interface MessageInputProps {
  onSend: (content: string, replyTo?: string, mentions?: string[]) => Promise<void>;
  onSendWithFiles: (content: string, files: File[], replyTo?: string, mentions?: string[]) => Promise<void>;
  onTyping?: (isTyping: boolean) => void;
  replyTo?: ChatMessage | null;
  onCancelReply?: () => void;
  disabled?: boolean;
  placeholder?: string;
}

export const MessageInput: React.FC<MessageInputProps> = ({
  onSend,
  onSendWithFiles,
  onTyping,
  replyTo,
  onCancelReply,
  disabled = false,
  placeholder = 'Type a message...',
}) => {
  const [content, setContent] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [sending, setSending] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const emojiPickerRef = useRef<HTMLDivElement>(null);
  const emojiButtonRef = useRef<HTMLButtonElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Create object URLs for file previews and clean them up
  const filePreviewUrls = useMemo(() => {
    return files.map(file => {
      if (file.type.startsWith('image/')) {
        return URL.createObjectURL(file);
      }
      return null;
    });
  }, [files]);

  // Clean up object URLs when files change
  useEffect(() => {
    return () => {
      filePreviewUrls.forEach(url => {
        if (url) URL.revokeObjectURL(url);
      });
    };
  }, [filePreviewUrls]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 150) + 'px';
    }
  }, [content]);

  // Close emoji picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        showEmojiPicker &&
        emojiPickerRef.current &&
        !emojiPickerRef.current.contains(event.target as Node) &&
        emojiButtonRef.current &&
        !emojiButtonRef.current.contains(event.target as Node)
      ) {
        setShowEmojiPicker(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showEmojiPicker]);

  // Handle emoji selection
  const handleEmojiSelect = (emoji: any) => {
    const emojiChar = emoji.native;
    const textarea = textareaRef.current;
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const newContent = content.substring(0, start) + emojiChar + content.substring(end);
      setContent(newContent);
      // Set cursor position after emoji
      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = start + emojiChar.length;
        textarea.focus();
      }, 0);
    } else {
      setContent(content + emojiChar);
    }
  };

  // Handle typing indicator
  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value);

    // Emit typing start
    onTyping?.(true);

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set timeout to emit typing stop
    typingTimeoutRef.current = setTimeout(() => {
      onTyping?.(false);
    }, 2000);
  };

  // Handle file selection
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    if (selectedFiles.length + files.length > 5) {
      alert('Maximum 5 files allowed');
      return;
    }
    setFiles([...files, ...selectedFiles]);
    e.target.value = ''; // Reset input
  };

  // Remove file
  const handleRemoveFile = (index: number) => {
    setFiles(files.filter((_, i) => i !== index));
  };

  // Handle send
  const handleSend = async () => {
    const trimmedContent = content.trim();
    if (!trimmedContent && files.length === 0) return;
    if (sending) return;

    setSending(true);
    try {
      if (files.length > 0) {
        await onSendWithFiles(trimmedContent, files, replyTo?._id);
      } else {
        await onSend(trimmedContent, replyTo?._id);
      }
      setContent('');
      setFiles([]);
      onCancelReply?.();
      onTyping?.(false);
      // Keep focus on the textarea after sending
      textareaRef.current?.focus();
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setSending(false);
      // Also focus after sending completes (in case of error)
      textareaRef.current?.focus();
    }
  };

  // Handle key press
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Handle paste for images
  const handlePaste = (e: React.ClipboardEvent) => {
    const items = Array.from(e.clipboardData.items);
    const imageItems = items.filter(item => item.type.startsWith('image/'));

    if (imageItems.length > 0) {
      e.preventDefault();
      const newFiles: File[] = [];
      imageItems.forEach(item => {
        const file = item.getAsFile();
        if (file) newFiles.push(file);
      });

      if (newFiles.length + files.length > 5) {
        alert('Maximum 5 files allowed');
        return;
      }
      setFiles([...files, ...newFiles]);
    }
  };

  // Handle drag and drop
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const droppedFiles = Array.from(e.dataTransfer.files);
    if (droppedFiles.length + files.length > 5) {
      alert('Maximum 5 files allowed');
      return;
    }
    setFiles([...files, ...droppedFiles]);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  // Format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <div className="border-t border-gray-200 dark:border-dark-400 p-3">
      {/* Reply Preview */}
      {replyTo && (
        <div className="flex items-center justify-between mb-2 p-2 rounded-lg bg-gray-100 dark:bg-dark-400 border-l-2 border-primary-500">
          <div className="min-w-0 flex-1">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Replying to {(replyTo.senderId as User).firstName}
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-300 truncate">
              {replyTo.content}
            </p>
          </div>
          <button
            onClick={onCancelReply}
            className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-dark-300 transition-colors"
          >
            <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* File Previews */}
      {files.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2">
          {files.map((file, index) => (
            <div
              key={index}
              className="relative group flex items-center gap-2 p-2 rounded-lg bg-gray-100 dark:bg-dark-400"
            >
              {file.type.startsWith('image/') && filePreviewUrls[index] ? (
                <img
                  src={filePreviewUrls[index]!}
                  alt={file.name}
                  className="w-12 h-12 rounded object-cover"
                />
              ) : (
                <div className="w-12 h-12 rounded bg-gray-200 dark:bg-dark-300 flex items-center justify-center">
                  <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                </div>
              )}
              <div className="min-w-0 max-w-[100px]">
                <p className="text-xs font-medium text-gray-700 dark:text-gray-300 truncate">
                  {file.name}
                </p>
                <p className="text-[10px] text-gray-500">{formatFileSize(file.size)}</p>
              </div>
              <button
                onClick={() => handleRemoveFile(index)}
                className="absolute -top-1 -right-1 p-0.5 rounded-full bg-red-500 text-white opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Input Area */}
      <div
        className="flex items-end gap-2"
        onDrop={handleDrop}
        onDragOver={handleDragOver}
      >
        {/* Attach Button */}
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled || files.length >= 5}
          className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-dark-400 transition-colors disabled:opacity-50"
          title="Attach file"
        >
          <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
          </svg>
        </button>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"
          className="hidden"
          onChange={handleFileSelect}
        />

        {/* Emoji Button */}
        <div className="relative">
          <button
            ref={emojiButtonRef}
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            disabled={disabled}
            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-dark-400 transition-colors disabled:opacity-50"
            title="Add emoji"
          >
            <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </button>

          {/* Emoji Picker Dropdown */}
          {showEmojiPicker && (
            <div
              ref={emojiPickerRef}
              className="absolute bottom-12 left-0 z-50 shadow-xl rounded-lg"
            >
              <Picker
                onEmojiSelect={handleEmojiSelect}
                theme="auto"
                previewPosition="none"
                skinTonePosition="search"
                maxFrequentRows={2}
              />
            </div>
          )}
        </div>

        {/* Text Input */}
        <textarea
          ref={textareaRef}
          value={content}
          onChange={handleContentChange}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          disabled={disabled || sending}
          placeholder={placeholder}
          rows={1}
          className="flex-1 resize-none px-4 py-2 rounded-2xl bg-gray-100 dark:bg-dark-400 text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50"
          style={{ maxHeight: '150px' }}
        />

        {/* Send Button */}
        <button
          onClick={handleSend}
          disabled={disabled || sending || (!content.trim() && files.length === 0)}
          className="p-2 rounded-full bg-primary-500 hover:bg-primary-600 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {sending ? (
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          )}
        </button>
      </div>
    </div>
  );
};
