// Vitest setup file
// This file runs before all tests

import { vi } from 'vitest';

// Mock localStorage for testing
const localStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
    get length() {
      return Object.keys(store).length;
    },
    key: (index: number) => {
      const keys = Object.keys(store);
      return keys[index] || null;
    },
  };
})();

global.localStorage = localStorageMock as Storage;

// Mock window.MonacoEnvironment if needed
global.window = global.window || ({} as any);

// Mock Monaco Editor
const registeredLanguages: any[] = [];
const languageTokenizers: Map<string, any> = new Map();
const languageConfigs: Map<string, any> = new Map();

vi.mock('monaco-editor/esm/vs/editor/editor.api', () => ({
  languages: {
    register: (lang: any) => {
      if (!registeredLanguages.find((l) => l.id === lang.id)) {
        registeredLanguages.push(lang);
      }
    },
    getLanguages: () => registeredLanguages,
    setMonarchTokensProvider: (languageId: string, definition: any) => {
      languageTokenizers.set(languageId, definition);
    },
    setLanguageConfiguration: (languageId: string, config: any) => {
      languageConfigs.set(languageId, config);
    },
  },
  editor: {
    create: vi.fn(() => ({
      getValue: vi.fn(() => ''),
      setValue: vi.fn(),
      dispose: vi.fn(),
      getModel: vi.fn(() => ({})),
    })),
  },
}));
