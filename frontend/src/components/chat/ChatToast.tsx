'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

interface ChatToastProps {
  toastId: string;
  senderName: string;
  senderAvatar?: string;
  message: string;
  conversationId: string;
  onClose: () => void;
}

export const ChatToast: React.FC<ChatToastProps> = ({
  toastId,
  senderName,
  senderAvatar,
  message,
  conversationId,
  onClose,
}) => {
  const router = useRouter();

  const handleClick = () => {
    router.push(`/chat?conversation=${conversationId}`);
    onClose();
  };

  return (
    <div
      className="flex items-start gap-3 p-3 bg-white dark:bg-dark-500 rounded-xl shadow-xl border border-gray-200 dark:border-dark-400 max-w-sm cursor-pointer hover:bg-gray-50 dark:hover:bg-dark-400 transition-colors"
      onClick={handleClick}
    >
      {/* Avatar */}
      <div className="flex-shrink-0">
        {senderAvatar ? (
          <img
            src={senderAvatar}
            alt={senderName}
            className="w-10 h-10 rounded-full object-cover"
          />
        ) : (
          <div className="w-10 h-10 rounded-full bg-primary-500 text-white flex items-center justify-center font-medium text-sm">
            {senderName.charAt(0).toUpperCase()}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-sm text-gray-900 dark:text-white truncate">
            {senderName}
          </span>
          <span className="text-xs text-gray-400">now</span>
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-2 mt-0.5">
          {message}
        </p>
      </div>

      {/* Close button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
        className="flex-shrink-0 p-1 rounded-full hover:bg-gray-200 dark:hover:bg-dark-300 transition-colors"
      >
        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      {/* Chat icon indicator */}
      <div className="absolute -top-1 -left-1 w-5 h-5 bg-primary-500 rounded-full flex items-center justify-center">
        <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
      </div>
    </div>
  );
};

// Helper function to show chat toast
export const showChatToast = (
  senderName: string,
  message: string,
  conversationId: string,
  senderAvatar?: string
) => {
  toast.custom(
    (t) => (
      <ChatToast
        toastId={t.id}
        senderName={senderName}
        senderAvatar={senderAvatar}
        message={message}
        conversationId={conversationId}
        onClose={() => toast.dismiss(t.id)}
      />
    ),
    {
      duration: 5000,
      position: 'top-right',
    }
  );
};
