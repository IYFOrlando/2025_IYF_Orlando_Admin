/**
 * Error types and utilities
 * Centralized error handling with specific error types
 * 
 * @module errors
 */

/**
 * Firebase-specific error codes
 */
export enum FirebaseErrorCode {
  PERMISSION_DENIED = 'permission-denied',
  UNAVAILABLE = 'unavailable',
  UNAUTHENTICATED = 'unauthenticated',
  NOT_FOUND = 'not-found',
  ALREADY_EXISTS = 'already-exists',
  FAILED_PRECONDITION = 'failed-precondition',
  ABORTED = 'aborted',
  OUT_OF_RANGE = 'out-of-range',
  UNIMPLEMENTED = 'unimplemented',
  INTERNAL = 'internal',
  DATA_LOSS = 'data-loss'
}

/**
 * Custom error class for Firebase operations
 */
export class FirebaseError extends Error {
  constructor(
    message: string,
    public code: FirebaseErrorCode | string,
    public originalError?: any
  ) {
    super(message)
    this.name = 'FirebaseError'
    Object.setPrototypeOf(this, FirebaseError.prototype)
  }
}

/**
 * Custom error class for validation errors
 */
export class ValidationError extends Error {
  constructor(
    message: string,
    public field?: string,
    public value?: any
  ) {
    super(message)
    this.name = 'ValidationError'
    Object.setPrototypeOf(this, ValidationError.prototype)
  }
}

/**
 * Custom error class for business logic errors
 */
export class BusinessLogicError extends Error {
  constructor(
    message: string,
    public context?: Record<string, any>
  ) {
    super(message)
    this.name = 'BusinessLogicError'
    Object.setPrototypeOf(this, BusinessLogicError.prototype)
  }
}

/**
 * Checks if an error is a Firebase permission error
 * @param error - Error to check
 * @returns True if error is a permission error
 */
export function isFirebasePermissionError(error: any): boolean {
  if (!error) return false
  
  const errorCode = error.code || error.message
  const errorMessage = error.message || ''
  
  return (
    errorCode === FirebaseErrorCode.PERMISSION_DENIED ||
    errorMessage.includes('permission-denied') ||
    errorMessage.includes('Missing or insufficient permissions') ||
    errorMessage.includes('permissions')
  )
}

/**
 * Checks if an error is a Firebase error
 * @param error - Error to check
 * @returns True if error is a Firebase error
 */
export function isFirebaseError(error: any): boolean {
  if (!error) return false
  return error.code !== undefined || error.message?.includes('Firebase')
}

/**
 * Normalizes an error to a standard format
 * @param error - Error to normalize
 * @returns Normalized error information
 */
export function normalizeError(error: any): {
  message: string
  code?: string
  name?: string
  stack?: string
} {
  if (error instanceof Error) {
    return {
      message: error.message,
      name: error.name,
      stack: error.stack,
      ...(error as any).code && { code: (error as any).code }
    }
  }
  
  if (typeof error === 'string') {
    return { message: error }
  }
  
  if (error && typeof error === 'object') {
    return {
      message: error.message || 'Unknown error',
      code: error.code,
      name: error.name
    }
  }
  
  return { message: 'Unknown error' }
}

