/**
 * Unit tests for localStorage content persistence
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  saveContent,
  loadContent,
  clearContent,
  hasPersistedContent,
  getStorageKey,
} from '../../../src/persistence/content-store';

describe('Content Store', () => {
  const testStorageKey = 'test-editor-content';
  const testContent = 'user.name.length()';

  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('saveContent', () => {
    it('should save content to localStorage', () => {
      saveContent(testStorageKey, testContent);

      const stored = localStorage.getItem(testStorageKey);
      expect(stored).toBeDefined();
      expect(stored).toContain(testContent);
    });

    it('should save content with timestamp', () => {
      saveContent(testStorageKey, testContent);

      const stored = localStorage.getItem(testStorageKey);
      const parsed = JSON.parse(stored!);

      expect(parsed.content).toBe(testContent);
      expect(parsed.timestamp).toBeDefined();
      expect(typeof parsed.timestamp).toBe('number');
    });

    it('should update existing content', () => {
      saveContent(testStorageKey, testContent);
      const newContent = 'user.email';
      saveContent(testStorageKey, newContent);

      const stored = localStorage.getItem(testStorageKey);
      const parsed = JSON.parse(stored!);

      expect(parsed.content).toBe(newContent);
    });
  });

  describe('loadContent', () => {
    it('should load persisted content', () => {
      saveContent(testStorageKey, testContent);
      const loaded = loadContent(testStorageKey);

      expect(loaded).toBe(testContent);
    });

    it('should return null for non-existent key', () => {
      const loaded = loadContent('nonexistent-key');
      expect(loaded).toBeNull();
    });

    it('should throw error for corrupted data and clear it', () => {
      localStorage.setItem(testStorageKey, 'invalid json {');

      expect(() => loadContent(testStorageKey)).toThrow('Corrupted data in localStorage');

      // Verify data was cleared
      expect(localStorage.getItem(testStorageKey)).toBeNull();
    });

    it('should return null for invalid format', () => {
      localStorage.setItem(testStorageKey, JSON.stringify({ wrong: 'format' }));
      const loaded = loadContent(testStorageKey);

      expect(loaded).toBeNull();
    });
  });

  describe('clearContent', () => {
    it('should remove content from localStorage', () => {
      saveContent(testStorageKey, testContent);
      expect(localStorage.getItem(testStorageKey)).toBeDefined();

      clearContent(testStorageKey);
      expect(localStorage.getItem(testStorageKey)).toBeNull();
    });

    it('should not throw error for non-existent key', () => {
      expect(() => clearContent('nonexistent-key')).not.toThrow();
    });
  });

  describe('hasPersistedContent', () => {
    it('should return true when content exists', () => {
      saveContent(testStorageKey, testContent);
      expect(hasPersistedContent(testStorageKey)).toBe(true);
    });

    it('should return false when content does not exist', () => {
      expect(hasPersistedContent('nonexistent-key')).toBe(false);
    });

    it('should return false for corrupted data', () => {
      localStorage.setItem(testStorageKey, 'invalid json');
      expect(hasPersistedContent(testStorageKey)).toBe(false);
    });
  });

  describe('getStorageKey', () => {
    it('should generate storage key from page URL', () => {
      const key = getStorageKey();
      expect(key).toBeDefined();
      expect(key).toContain('php-script-editor-content');
    });

    it('should use custom key if provided', () => {
      const customKey = 'my-custom-key';
      const key = getStorageKey(customKey);
      expect(key).toBe(customKey);
    });
  });
});
