/**
 * localStorage content persistence for editor
 */

import { logger } from '../utils/logger';
import { ContentPersistenceError } from '../utils/errors';

/**
 * Persisted content structure
 */
export interface PersistedContent {
  content: string;
  timestamp: number;
  originalContent?: string;
}

/**
 * Save content to localStorage
 */
export function saveContent(storageKey: string, content: string, originalContent?: string): void {
  try {
    const data: PersistedContent = {
      content,
      timestamp: Date.now(),
      originalContent,
    };

    localStorage.setItem(storageKey, JSON.stringify(data));

    logger.debug('Content saved to localStorage', {
      storageKey,
      contentLength: content.length,
      timestamp: data.timestamp,
    });
  } catch (error) {
    if (error instanceof Error && error.name === 'QuotaExceededError') {
      logger.error('Storage quota exceeded', { storageKey, error });
      throw new ContentPersistenceError(
        'Storage quota exceeded. Cannot save editor content.',
        'QUOTA_EXCEEDED',
        storageKey
      );
    }

    logger.error('Failed to save content to localStorage', { storageKey, error });
    throw new ContentPersistenceError(
      'Failed to save editor content to localStorage',
      'STORAGE_UNAVAILABLE',
      storageKey
    );
  }
}

/**
 * Load content from localStorage
 */
export function loadContent(storageKey: string): string | null {
  try {
    const stored = localStorage.getItem(storageKey);

    if (!stored) {
      logger.debug('No persisted content found', { storageKey });
      return null;
    }

    const data: PersistedContent = JSON.parse(stored);

    if (!data.content || typeof data.content !== 'string') {
      logger.warn('Invalid persisted content format', { storageKey });
      return null;
    }

    logger.info('Content loaded from localStorage', {
      storageKey,
      contentLength: data.content.length,
      timestamp: data.timestamp,
      age: Date.now() - data.timestamp,
    });

    return data.content;
  } catch (error) {
    logger.error('Failed to load content from localStorage', { storageKey, error });

    // Clear corrupted data
    try {
      localStorage.removeItem(storageKey);
      logger.info('Corrupted data cleared from localStorage', { storageKey });
    } catch {
      // Ignore cleanup errors
    }

    throw new ContentPersistenceError(
      'Corrupted data in localStorage. Content has been cleared.',
      'CORRUPTED_DATA',
      storageKey
    );
  }
}

/**
 * Load original content from persisted data
 */
export function loadOriginalContent(storageKey: string): string | null {
  try {
    const stored = localStorage.getItem(storageKey);

    if (!stored) {
      return null;
    }

    const data: PersistedContent = JSON.parse(stored);
    return data.originalContent || null;
  } catch {
    return null;
  }
}

/**
 * Clear content from localStorage
 */
export function clearContent(storageKey: string): void {
  try {
    localStorage.removeItem(storageKey);
    logger.info('Content cleared from localStorage', { storageKey });
  } catch (error) {
    logger.warn('Failed to clear content from localStorage', { storageKey, error });
  }
}

/**
 * Check if persisted content exists
 */
export function hasPersistedContent(storageKey: string): boolean {
  try {
    const stored = localStorage.getItem(storageKey);
    if (!stored) {
      return false;
    }

    const data: PersistedContent = JSON.parse(stored);
    return !!(data.content && typeof data.content === 'string');
  } catch {
    return false;
  }
}

/**
 * Get storage key for current page
 */
export function getStorageKey(customKey?: string): string {
  if (customKey) {
    return customKey;
  }

  // Generate key from current page URL (if in browser)
  if (typeof window !== 'undefined' && window.location) {
    const path = window.location.pathname + window.location.search;
    const hash = simpleHash(path);
    return `php-script-editor-content-${hash}`;
  }

  // Fallback for non-browser environments
  return 'php-script-editor-content-default';
}

/**
 * Simple string hash function
 */
function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(36);
}
