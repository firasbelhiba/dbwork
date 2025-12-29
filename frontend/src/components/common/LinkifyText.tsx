'use client';

import React from 'react';
import { cn } from '@/lib/utils';

interface LinkifyTextProps {
  text: string;
  className?: string;
}

// Regex to detect URLs - handles http, https, and www prefixed URLs
const URL_REGEX = /(https?:\/\/[^\s<]+[^<.,:;"')\]\s]|www\.[^\s<]+[^<.,:;"')\]\s])/gi;

/**
 * Component that auto-detects URLs in text and makes them clickable.
 * Preserves whitespace (newlines, spaces) while converting URLs to links.
 */
export const LinkifyText: React.FC<LinkifyTextProps> = ({ text, className }) => {
  if (!text) {
    return null;
  }

  // Split text by URLs while keeping the URLs in the result
  const parts = text.split(URL_REGEX);

  // Find all URLs in the text
  const urls = text.match(URL_REGEX) || [];
  let urlIndex = 0;

  const elements: React.ReactNode[] = [];

  parts.forEach((part, index) => {
    if (!part) return;

    // Check if this part is a URL
    if (URL_REGEX.test(part)) {
      // Reset the regex lastIndex since we're using global flag
      URL_REGEX.lastIndex = 0;

      // Add protocol if missing (for www. URLs)
      const href = part.startsWith('http') ? part : `https://${part}`;

      elements.push(
        <a
          key={`link-${index}`}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 underline break-all"
          onClick={(e) => e.stopPropagation()}
        >
          {part}
        </a>
      );
      urlIndex++;
    } else {
      // Regular text - preserve whitespace
      elements.push(
        <span key={`text-${index}`}>{part}</span>
      );
    }
  });

  return (
    <span className={cn('whitespace-pre-wrap', className)}>
      {elements}
    </span>
  );
};
