/**
 * Centralized logging utility that respects NODE_ENV
 * Only logs in development, silent in production
 * 
 * @module logger
 * @example
 * ```typescript
 * import { logger } from './lib/logger'
 * 
 * logger.debug('Debug message', { data: 'value' })
 * logger.info('Info message')
 * logger.warn('Warning message')
 * logger.error('Error message', error)
 * ```
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error'

/**
 * Log entry structure
 */
interface LogEntry {
  level: LogLevel
  message: string
  data?: any
  timestamp: string
}

/**
 * Logger class for centralized application logging
 * Automatically filters logs based on environment
 */
class Logger {
  private isDevelopment = import.meta.env.DEV || import.meta.env.MODE === 'development'
  private isProduction = import.meta.env.PROD || import.meta.env.MODE === 'production'

  /**
   * Formats log message with timestamp and level
   * @param level - Log level
   * @param message - Log message
   * @param data - Optional data to log
   * @returns Formatted message string
   */
  private formatMessage(level: LogLevel, message: string, data?: any): string {
    const timestamp = new Date().toISOString()
    const prefix = `[${timestamp}] [${level.toUpperCase()}]`
    
    if (data !== undefined) {
      return `${prefix} ${message}`
    }
    return `${prefix} ${message}`
  }

  /**
   * Determines if a log level should be logged in current environment
   * @param level - Log level to check
   * @returns True if should log, false otherwise
   */
  private shouldLog(level: LogLevel): boolean {
    // In production, only log errors
    if (this.isProduction) {
      return level === 'error'
    }
    // In development, log everything
    return this.isDevelopment
  }

  /**
   * Internal log method that handles all logging
   * @param level - Log level
   * @param message - Log message
   * @param data - Optional data to log
   */
  private log(level: LogLevel, message: string, data?: any): void {
    if (!this.shouldLog(level)) {
      return
    }

    const formattedMessage = this.formatMessage(level, message, data)
    // LogEntry structure reserved for future error tracking integration
    // const logEntry: LogEntry = {
    //   level,
    //   message,
    //   data,
    //   timestamp: new Date().toISOString()
    // }

    switch (level) {
      case 'debug':
        console.debug(formattedMessage, data || '')
        break
      case 'info':
        console.info(formattedMessage, data || '')
        break
      case 'warn':
        console.warn(formattedMessage, data || '')
        break
      case 'error':
        console.error(formattedMessage, data || '')
        // In production, you might want to send errors to an error tracking service
        if (this.isProduction && data) {
          // TODO: Integrate with error tracking service (e.g., Sentry)
          // sendToErrorTracking(logEntry)
        }
        break
    }
  }

  /**
   * Logs a debug message (only in development)
   * @param message - Debug message
   * @param data - Optional debug data
   */
  debug(message: string, data?: any): void {
    this.log('debug', message, data)
  }

  /**
   * Logs an info message (only in development)
   * @param message - Info message
   * @param data - Optional info data
   */
  info(message: string, data?: any): void {
    this.log('info', message, data)
  }

  /**
   * Logs a warning message (only in development)
   * @param message - Warning message
   * @param data - Optional warning data
   */
  warn(message: string, data?: any): void {
    this.log('warn', message, data)
  }

  /**
   * Logs an error message (always logged, even in production)
   * @param message - Error message
   * @param error - Error object or error data
   */
  error(message: string, error?: any): void {
    // Handle Error objects specially
    if (error instanceof Error) {
      this.log('error', message, {
        name: error.name,
        message: error.message,
        stack: error.stack,
        ...(error as any).code && { code: (error as any).code }
      })
    } else {
      this.log('error', message, error)
    }
  }
}

// Export singleton instance
export const logger = new Logger()

// Export type for use in other files
export type { LogLevel, LogEntry }

