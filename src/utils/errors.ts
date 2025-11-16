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
