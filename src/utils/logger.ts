/**
 * Logging utility for php-script Monaco Editor
 */

export enum LogLevel {
  // eslint-disable-next-line no-unused-vars
  DEBUG = 'DEBUG',
  // eslint-disable-next-line no-unused-vars
  INFO = 'INFO',
  // eslint-disable-next-line no-unused-vars
  WARN = 'WARN',
  // eslint-disable-next-line no-unused-vars
  ERROR = 'ERROR',
}

export interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: Date;
  context?: Record<string, unknown>;
}

class Logger {
  private logs: LogEntry[] = [];
  private maxLogs = 1000;
  private enabled = true;

  /**
   * Enable or disable logging
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  /**
   * Log a debug message
   */
  debug(message: string, context?: Record<string, unknown>): void {
    this.log(LogLevel.DEBUG, message, context);
  }

  /**
   * Log an info message
   */
  info(message: string, context?: Record<string, unknown>): void {
    this.log(LogLevel.INFO, message, context);
  }

  /**
   * Log a warning
   */
  warn(message: string, context?: Record<string, unknown>): void {
    this.log(LogLevel.WARN, message, context);
    console.warn(`[php-script] ${message}`, context);
  }

  /**
   * Log an error
   */
  error(message: string, context?: Record<string, unknown>): void {
    this.log(LogLevel.ERROR, message, context);
    console.error(`[php-script] ${message}`, context);
  }

  /**
   * Internal log method
   */
  private log(level: LogLevel, message: string, context?: Record<string, unknown>): void {
    if (!this.enabled) {
      return;
    }

    const entry: LogEntry = {
      level,
      message,
      timestamp: new Date(),
      context,
    };

    this.logs.push(entry);

    // Trim logs if exceeding max
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }

    // Console output for development
    if (
      level === LogLevel.DEBUG &&
      typeof process !== 'undefined' &&
      process.env?.NODE_ENV === 'development'
    ) {
      // eslint-disable-next-line no-console
      console.log(`[${level}] ${message}`, context);
    }
  }

  /**
   * Get all logs
   */
  getLogs(): LogEntry[] {
    return [...this.logs];
  }

  /**
   * Get logs filtered by level
   */
  getLogsByLevel(level: LogLevel): LogEntry[] {
    return this.logs.filter((log) => log.level === level);
  }

  /**
   * Clear all logs
   */
  clearLogs(): void {
    this.logs = [];
  }

  /**
   * Export logs as JSON
   */
  exportLogs(): string {
    return JSON.stringify(this.logs, null, 2);
  }

  /**
   * Measure performance of a synchronous operation
   *
   * Executes the function and logs the execution time.
   *
   * @param label - Label for the measurement
   * @param fn - Function to measure
   * @returns Result of the function
   *
   * @example
   * ```typescript
   * const result = logger.measure('syntax-highlighting', () => {
   *   return tokenizeCode(code);
   * });
   * // Logs: "Performance: syntax-highlighting { durationMs: 42.5 }"
   * ```
   */
  measure<T>(label: string, fn: () => T): T {
    const start = performance.now();
    try {
      const result = fn();
      const duration = performance.now() - start;
      this.debug(`Performance: ${label}`, { durationMs: duration });
      return result;
    } catch (error) {
      const duration = performance.now() - start;
      this.error(`Performance: ${label} (failed)`, { durationMs: duration, error });
      throw error;
    }
  }

  /**
   * Measure performance of an asynchronous operation
   *
   * Executes the async function and logs the execution time.
   *
   * @param label - Label for the measurement
   * @param fn - Async function to measure
   * @returns Promise with result of the function
   *
   * @example
   * ```typescript
   * const data = await logger.measureAsync('load-config', async () => {
   *   return await fetchConfiguration();
   * });
   * ```
   */
  async measureAsync<T>(label: string, fn: () => Promise<T>): Promise<T> {
    const start = performance.now();
    try {
      const result = await fn();
      const duration = performance.now() - start;
      this.debug(`Performance: ${label}`, { durationMs: duration });
      return result;
    } catch (error) {
      const duration = performance.now() - start;
      this.error(`Performance: ${label} (failed)`, { durationMs: duration, error });
      throw error;
    }
  }
}

// Singleton instance
export const logger = new Logger();
