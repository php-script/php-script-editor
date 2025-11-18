/**
 * Custom error types for the php-script Monaco Editor
 */

/**
 * Base editor error class
 */
export class EditorError extends Error {
  code: string;
  details?: unknown;

  constructor(message: string, code: string, details?: unknown) {
    super(message);
    this.name = 'EditorError';
    this.code = code;
    this.details = details;
    Object.setPrototypeOf(this, EditorError.prototype);
  }
}

/**
 * Error thrown when editor initialization fails
 */
export class EditorInitializationError extends EditorError {
  constructor(message: string, details?: unknown) {
    super(message, 'EDITOR_INIT_FAILED', details);
    this.name = 'EditorInitializationError';
    Object.setPrototypeOf(this, EditorInitializationError.prototype);
  }
}

/**
 * Error thrown when configuration validation fails
 */
export class ConfigurationValidationError extends EditorError {
  details: {
    field: string;
    message: string;
    value: unknown;
  }[];

  constructor(
    message: string,
    validationErrors: { field: string; message: string; value: unknown }[]
  ) {
    super(message, 'CONFIG_VALIDATION_FAILED', validationErrors);
    this.name = 'ConfigurationValidationError';
    this.details = validationErrors;
    Object.setPrototypeOf(this, ConfigurationValidationError.prototype);
  }
}

/**
 * Error thrown when configuration application fails
 */
export class ConfigurationApplicationError extends EditorError {
  constructor(message: string, details?: unknown) {
    super(message, 'CONFIG_APPLICATION_FAILED', details);
    this.name = 'ConfigurationApplicationError';
    Object.setPrototypeOf(this, ConfigurationApplicationError.prototype);
  }
}

/**
 * Error thrown when content persistence fails
 */
export class ContentPersistenceError extends EditorError {
  details: {
    reason: 'QUOTA_EXCEEDED' | 'STORAGE_UNAVAILABLE' | 'CORRUPTED_DATA';
    storageKey: string;
  };

  constructor(
    message: string,
    reason: 'QUOTA_EXCEEDED' | 'STORAGE_UNAVAILABLE' | 'CORRUPTED_DATA',
    storageKey: string
  ) {
    super(message, 'CONTENT_PERSISTENCE_FAILED', { reason, storageKey });
    this.name = 'ContentPersistenceError';
    this.details = { reason, storageKey };
    Object.setPrototypeOf(this, ContentPersistenceError.prototype);
  }
}

/**
 * Get user-friendly error message from any error
 *
 * Converts technical error messages into user-friendly messages with actionable advice.
 *
 * @param error - The error to format
 * @returns User-friendly error message
 *
 * @example
 * ```typescript
 * try {
 *   // ... editor operation
 * } catch (error) {
 *   alert(getUserFriendlyErrorMessage(error));
 * }
 * ```
 */
export function getUserFriendlyErrorMessage(error: unknown): string {
  if (error instanceof ContentPersistenceError) {
    switch (error.details.reason) {
      case 'QUOTA_EXCEEDED':
        return 'Your browser storage is full. Please clear some space in your browser settings or disable auto-save in the editor settings.';
      case 'STORAGE_UNAVAILABLE':
        return 'Unable to save your work. Please check your browser settings to ensure localStorage is enabled.';
      case 'CORRUPTED_DATA':
        return 'Saved data was corrupted and has been cleared. Your work from the server has been restored.';
    }
  }

  if (error instanceof ConfigurationValidationError) {
    const fieldCount = error.details.length;
    const firstError = error.details[0];
    if (fieldCount === 1 && firstError) {
      return `Configuration error in ${firstError.field}: ${firstError.message}`;
    }
    return `Configuration has ${fieldCount} validation errors. Please check the browser console for details.`;
  }

  if (error instanceof EditorInitializationError) {
    return 'Failed to initialize the editor. Please refresh the page or contact support if the problem persists.';
  }

  if (error instanceof ConfigurationApplicationError) {
    return 'Failed to apply editor configuration. The editor may have limited functionality. Please refresh the page.';
  }

  if (error instanceof EditorError) {
    return `Editor error: ${error.message}`;
  }

  if (error instanceof Error) {
    return `An unexpected error occurred: ${error.message}`;
  }

  return 'An unknown error occurred. Please try again or contact support.';
}

/**
 * Get actionable advice for an error
 *
 * Provides specific steps the user can take to resolve the error.
 *
 * @param error - The error to get advice for
 * @returns Array of actionable steps
 */
export function getErrorAdvice(error: unknown): string[] {
  if (error instanceof ContentPersistenceError) {
    switch (error.details.reason) {
      case 'QUOTA_EXCEEDED':
        return [
          'Clear browser cache and cookies for this site',
          'Close other tabs using localStorage',
          'Disable auto-save in editor settings',
          'Copy your work elsewhere and refresh the page',
        ];
      case 'STORAGE_UNAVAILABLE':
        return [
          'Check browser settings to ensure localStorage is enabled',
          'Try using a different browser',
          'Disable private/incognito mode if active',
        ];
      case 'CORRUPTED_DATA':
        return [
          'Your latest work from the server has been loaded',
          'You can continue editing normally',
          'Consider copying important work to a backup location',
        ];
    }
  }

  if (error instanceof ConfigurationValidationError) {
    return [
      'Contact your administrator about the configuration errors',
      'Check the browser console for detailed error messages',
      'Try refreshing the page',
    ];
  }

  if (error instanceof EditorInitializationError) {
    return [
      'Refresh the page',
      'Clear browser cache',
      'Check browser console for detailed errors',
      'Contact support if the problem persists',
    ];
  }

  return ['Refresh the page', 'Check browser console for more details'];
}
