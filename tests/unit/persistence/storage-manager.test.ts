/**
 * Unit tests for storage quota management
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  checkStorageAvailable,
  getStorageSize,
  isQuotaExceeded,
  canStoreContent,
} from '../../../src/persistence/storage-manager';

describe('Storage Manager', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('checkStorageAvailable', () => {
    it('should detect if localStorage is available', () => {
      const available = checkStorageAvailable();
      expect(available).toBe(true);
    });
  });

  describe('getStorageSize', () => {
    it('should calculate storage size correctly', () => {
      const testData = 'a'.repeat(100);
      localStorage.setItem('test-key', testData);

      const size = getStorageSize();
      expect(size).toBeGreaterThan(0);
      expect(size).toBeGreaterThan(100); // Account for JSON overhead
    });

    it('should return 0 for empty storage', () => {
      const size = getStorageSize();
      expect(size).toBe(0);
    });
  });

  describe('isQuotaExceeded', () => {
    it('should return false for normal storage usage', () => {
      const exceeded = isQuotaExceeded();
      expect(exceeded).toBe(false);
    });
  });

  describe('canStoreContent', () => {
    it('should return true for small content', () => {
      const content = 'user.name';
      const canStore = canStoreContent(content);
      expect(canStore).toBe(true);
    });

    it('should return true for moderate content', () => {
      const content = 'a'.repeat(10000);
      const canStore = canStoreContent(content);
      expect(canStore).toBe(true);
    });
  });
});
