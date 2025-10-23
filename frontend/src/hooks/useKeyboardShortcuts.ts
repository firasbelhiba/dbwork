import { useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';

interface ShortcutConfig {
  key: string;
  ctrl?: boolean;
  meta?: boolean;
  shift?: boolean;
  alt?: boolean;
  handler: () => void;
  description: string;
}

const shortcuts: ShortcutConfig[] = [
  // Navigation
  {
    key: 'g',
    shift: true,
    handler: () => window.location.href = '/dashboard',
    description: 'Go to Dashboard',
  },
  {
    key: 'p',
    shift: true,
    handler: () => window.location.href = '/projects',
    description: 'Go to Projects',
  },
  {
    key: 'i',
    shift: true,
    handler: () => window.location.href = '/issues',
    description: 'Go to Issues',
  },
  {
    key: 'r',
    shift: true,
    handler: () => window.location.href = '/reports',
    description: 'Go to Reports',
  },

  // Quick Actions
  {
    key: 'c',
    handler: () => window.location.href = '/issues/new',
    description: 'Create New Issue',
  },
  {
    key: 'n',
    handler: () => window.location.href = '/projects?create=true',
    description: 'Create New Project',
  },

  // Search (handled by Command Palette - Cmd+K)
  // Already implemented
];

export function useKeyboardShortcuts() {
  const router = useRouter();

  const handleKeyPress = useCallback((event: KeyboardEvent) => {
    // Ignore if user is typing in an input field
    const target = event.target as HTMLElement;
    if (
      target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA' ||
      target.isContentEditable
    ) {
      return;
    }

    // Check for command palette (Cmd+K) - already handled by CommandPalette
    if ((event.metaKey || event.ctrlKey) && event.key === 'k') {
      return; // Let CommandPalette handle this
    }

    // Check for shortcuts
    for (const shortcut of shortcuts) {
      const metaMatch = shortcut.meta ? event.metaKey : !event.metaKey;
      const ctrlMatch = shortcut.ctrl ? event.ctrlKey : !event.ctrlKey;
      const shiftMatch = shortcut.shift ? event.shiftKey : !event.shiftKey;
      const altMatch = shortcut.alt ? event.altKey : !event.altKey;

      if (
        event.key.toLowerCase() === shortcut.key.toLowerCase() &&
        metaMatch &&
        ctrlMatch &&
        shiftMatch &&
        altMatch
      ) {
        event.preventDefault();
        shortcut.handler();
        break;
      }
    }

    // Global shortcuts that work anywhere
    switch (event.key) {
      case '?':
        if (event.shiftKey) {
          event.preventDefault();
          showKeyboardShortcutsHelp();
        }
        break;

      case 'Escape':
        // Close any open modals (handled by individual components)
        break;
    }
  }, [router]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [handleKeyPress]);

  return { shortcuts };
}

// Show keyboard shortcuts help modal
function showKeyboardShortcutsHelp() {
  const helpElement = document.getElementById('keyboard-shortcuts-help');
  if (helpElement) {
    helpElement.style.display = 'block';
  } else {
    // Create help modal dynamically
    const modal = document.createElement('div');
    modal.id = 'keyboard-shortcuts-help';
    modal.className = 'fixed inset-0 z-50 flex items-center justify-center bg-black/50';
    modal.innerHTML = `
      <div class="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[80vh] overflow-auto">
        <div class="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 class="text-xl font-semibold text-gray-900">Keyboard Shortcuts</h2>
          <button onclick="document.getElementById('keyboard-shortcuts-help').remove()" class="text-gray-400 hover:text-gray-600">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>
        <div class="p-6">
          <div class="space-y-6">
            <div>
              <h3 class="text-sm font-semibold text-gray-500 uppercase mb-3">Navigation</h3>
              <div class="space-y-2">
                <div class="flex justify-between items-center">
                  <span class="text-gray-700">Go to Dashboard</span>
                  <kbd class="px-2 py-1 bg-gray-100 rounded border border-gray-300 text-sm">Shift + G</kbd>
                </div>
                <div class="flex justify-between items-center">
                  <span class="text-gray-700">Go to Projects</span>
                  <kbd class="px-2 py-1 bg-gray-100 rounded border border-gray-300 text-sm">Shift + P</kbd>
                </div>
                <div class="flex justify-between items-center">
                  <span class="text-gray-700">Go to Issues</span>
                  <kbd class="px-2 py-1 bg-gray-100 rounded border border-gray-300 text-sm">Shift + I</kbd>
                </div>
                <div class="flex justify-between items-center">
                  <span class="text-gray-700">Go to Reports</span>
                  <kbd class="px-2 py-1 bg-gray-100 rounded border border-gray-300 text-sm">Shift + R</kbd>
                </div>
              </div>
            </div>

            <div>
              <h3 class="text-sm font-semibold text-gray-500 uppercase mb-3">Quick Actions</h3>
              <div class="space-y-2">
                <div class="flex justify-between items-center">
                  <span class="text-gray-700">Create New Issue</span>
                  <kbd class="px-2 py-1 bg-gray-100 rounded border border-gray-300 text-sm">C</kbd>
                </div>
                <div class="flex justify-between items-center">
                  <span class="text-gray-700">Create New Project</span>
                  <kbd class="px-2 py-1 bg-gray-100 rounded border border-gray-300 text-sm">N</kbd>
                </div>
                <div class="flex justify-between items-center">
                  <span class="text-gray-700">Command Palette</span>
                  <kbd class="px-2 py-1 bg-gray-100 rounded border border-gray-300 text-sm">Cmd/Ctrl + K</kbd>
                </div>
              </div>
            </div>

            <div>
              <h3 class="text-sm font-semibold text-gray-500 uppercase mb-3">General</h3>
              <div class="space-y-2">
                <div class="flex justify-between items-center">
                  <span class="text-gray-700">Show Shortcuts Help</span>
                  <kbd class="px-2 py-1 bg-gray-100 rounded border border-gray-300 text-sm">?</kbd>
                </div>
                <div class="flex justify-between items-center">
                  <span class="text-gray-700">Close Modal</span>
                  <kbd class="px-2 py-1 bg-gray-100 rounded border border-gray-300 text-sm">ESC</kbd>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    // Close on click outside
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.remove();
      }
    });
  }
}

export { shortcuts };
