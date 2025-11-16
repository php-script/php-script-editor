/**
 * Storage quota management and monitoring
 */

import { logger } from '../utils/logger';
import { MAX_STORAGE_SIZE } from '../config/defaults';

/**
 * Check if localStorage is available
 */
export function checkStorageAvailable(): boolean {
  try {
    const testKey = '__storage_test__';
    localStorage.setItem(testKey, 'test');
    localStorage.removeItem(testKey);
    return true;
  } catch {
    logger.warn('localStorage is not available');
    return false;
  }
}

/**
 * Get current storage size in bytes (approximate)
 */
export function getStorageSize(): number {
  let totalSize = 0;

  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) {
        const value = localStorage.getItem(key);
        if (value) {
          // Count key + value size
          totalSize += key.length + value.length;
        }
      }
    }
  } catch (error) {
    logger.error('Failed to calculate storage size', { error });
  }

  return totalSize;
}

/**
 * Check if storage quota is exceeded
 */
export function isQuotaExceeded(): boolean {
  const currentSize = getStorageSize();
  const exceeded = currentSize >= MAX_STORAGE_SIZE;

  if (exceeded) {
    logger.warn('Storage quota exceeded', {
      currentSize,
      maxSize: MAX_STORAGE_SIZE,
      utilizationPercent: Math.round((currentSize / MAX_STORAGE_SIZE) * 100),
    });
  }

  return exceeded;
}

/**
 * Check if content can be stored (size check)
 */
export function canStoreContent(content: string): boolean {
  const contentSize = content.length * 2; // Rough estimate (UTF-16)
  const currentSize = getStorageSize();
  const projectedSize = currentSize + contentSize;

  const canStore = projectedSize < MAX_STORAGE_SIZE;

  if (!canStore) {
    logger.warn('Cannot store content - would exceed quota', {
      contentSize,
      currentSize,
      projectedSize,
      maxSize: MAX_STORAGE_SIZE,
    });
  }

  return canStore;
}

/**
 * Get storage usage statistics
 */
export function getStorageStats(): {
  used: number;
  max: number;
  available: number;
  utilizationPercent: number;
} {
  const used = getStorageSize();
  const max = MAX_STORAGE_SIZE;
  const available = max - used;
  const utilizationPercent = Math.round((used / max) * 100);

  return {
    used,
    max,
    available,
    utilizationPercent,
  };
}

/**
 * Try to free up storage space by removing old entries
 */
export function cleanupOldEntries(prefix: string = 'php-script-editor'): number {
  let freedSpace = 0;

  try {
    const entries: Array<{ key: string; timestamp: number; size: number }> = [];

    // Collect all entries with timestamps
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(prefix)) {
        const value = localStorage.getItem(key);
        if (value) {
          try {
            const data = JSON.parse(value);
            if (data.timestamp) {
              entries.push({
                key,
                timestamp: data.timestamp,
                size: key.length + value.length,
              });
            }
          } catch {
            // Skip invalid entries
          }
        }
      }
    }

    // Sort by timestamp (oldest first)
    entries.sort((a, b) => a.timestamp - b.timestamp);

    // Remove oldest 25% of entries
    const removeCount = Math.ceil(entries.length * 0.25);
    for (let i = 0; i < removeCount; i++) {
      const entry = entries[i];
      if (entry) {
        localStorage.removeItem(entry.key);
        freedSpace += entry.size;
      }
    }

    if (freedSpace > 0) {
      logger.info('Cleaned up old storage entries', {
        removedCount: removeCount,
        freedSpace,
      });
    }
  } catch (error) {
    logger.error('Failed to cleanup old entries', { error });
  }

  return freedSpace;
}
