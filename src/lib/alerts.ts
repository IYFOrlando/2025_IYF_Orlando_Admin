/**
 * Alert utilities for user notifications
 * Centralized notification system using SweetAlert2
 * 
 * @module alerts
 */

import Swal from 'sweetalert2'
import { logger } from './logger'

export const Alert = Swal

/**
 * Shows a success notification
 * @param title - Success message title
 * @param text - Optional detailed message
 * @returns Promise that resolves when notification is closed
 */
export function notifySuccess(title: string, text?: string) {
  return Swal.fire({ 
    title, 
    text, 
    icon: 'success', 
    timer: 1400, 
    showConfirmButton: false 
  })
}

/**
 * Shows an error notification with improved messaging
 * @param title - Error message title
 * @param text - Optional detailed error message or suggestion
 * @param context - Optional context object for logging
 * @returns Promise that resolves when notification is closed
 */
export function notifyError(title: string, text?: string, context?: Record<string, any>) {
  if (context) {
    logger.error('User-facing error', { title, text, context })
  }
  
  return Swal.fire({ 
    title, 
    text: text || 'Please try again or contact support if the problem persists.',
    icon: 'error',
    confirmButtonText: 'OK'
  })
}

/**
 * Confirms a delete action with detailed information
 * @param title - Confirmation title
 * @param text - Detailed description of what will be deleted
 * @param itemName - Optional name of the item being deleted (for better UX)
 * @returns Promise that resolves with confirmation result
 */
export function confirmDelete(title: string, text?: string, itemName?: string) {
  const deleteText = itemName 
    ? `Are you sure you want to delete "${itemName}"? This action cannot be undone.`
    : text || 'This action cannot be undone.'
    
  return Swal.fire({
    title: title || 'Confirm Deletion',
    text: deleteText,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonText: 'Yes, delete it',
    cancelButtonText: 'Cancel',
    confirmButtonColor: '#d32f2f',
    cancelButtonColor: '#6c757d'
  })
}

/**
 * Shows a warning notification
 * @param title - Warning message title
 * @param text - Optional detailed warning message
 * @returns Promise that resolves when notification is closed
 */
export function notifyWarning(title: string, text?: string) {
  return Swal.fire({
    title,
    text,
    icon: 'warning',
    confirmButtonText: 'OK'
  })
}

/**
 * Shows an info notification
 * @param title - Info message title
 * @param text - Optional detailed info message
 * @returns Promise that resolves when notification is closed
 */
export function notifyInfo(title: string, text?: string) {
  return Swal.fire({
    title,
    text,
    icon: 'info',
    confirmButtonText: 'OK',
    timer: 3000,
    showConfirmButton: false
  })
}