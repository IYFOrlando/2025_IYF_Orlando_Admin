/**
 * Common validation utilities
 * Centralized validation functions to avoid duplication
 * 
 * @module validations
 */

import { ValidationError } from './errors'

/**
 * Validates email format
 * @param email - Email to validate
 * @param throwError - If true, throws ValidationError instead of returning false
 * @returns True if email is valid, false otherwise (or throws ValidationError)
 * @throws {ValidationError} If throwError is true and email is invalid
 */
export function isValidEmail(email: string, throwError: boolean = false): boolean {
  if (!email || typeof email !== 'string') {
    if (throwError) {
      throw new ValidationError('Email is required', 'email', email)
    }
    return false
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  const isValid = emailRegex.test(email.trim())
  if (!isValid && throwError) {
    throw new ValidationError('Invalid email format', 'email', email)
  }
  return isValid
}

/**
 * Validates phone number format (basic validation)
 * @param phone - Phone number to validate
 * @returns True if phone is valid, false otherwise
 */
export function isValidPhone(phone: string): boolean {
  if (!phone || typeof phone !== 'string') return false
  // Remove common formatting characters
  const cleaned = phone.replace(/[\s\-\(\)]/g, '')
  // Check if it contains only digits and is reasonable length (7-15 digits)
  return /^\d{7,15}$/.test(cleaned)
}

/**
 * Validates required field
 * @param value - Value to validate
 * @returns True if value is not empty, false otherwise
 */
export function isRequired(value: string | number | null | undefined): boolean {
  if (typeof value === 'string') {
    return value.trim().length > 0
  }
  return value !== null && value !== undefined && value !== ''
}

/**
 * Computes age from birthday
 * @param birthdayISO - Birthday in ISO format (YYYY-MM-DD)
 * @returns Age as number or empty string if invalid
 */
export function computeAge(birthdayISO?: string | null): number | '' {
  if (!birthdayISO) return ''
  const bd = new Date(birthdayISO)
  if (isNaN(bd.getTime())) return ''
  const today = new Date()
  let age = today.getFullYear() - bd.getFullYear()
  const monthDiff = today.getMonth() - bd.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < bd.getDate())) {
    age--
  }
  return age < 0 ? '' : age
}

/**
 * Validates volunteer code format
 * @param code - Code to validate
 * @param length - Expected length (default: 6)
 * @returns True if code is valid format
 */
export function isValidVolunteerCode(code: string, length: number = 6): boolean {
  if (!code || typeof code !== 'string') return false
  const trimmed = code.trim().toUpperCase()
  if (trimmed.length !== length) return false
  const alphanumericRegex = /^[A-Z0-9]+$/
  return alphanumericRegex.test(trimmed)
}

/**
 * Validates ZIP code format (US format: 5 digits or 5+4)
 * @param zipCode - ZIP code to validate
 * @returns True if ZIP code is valid, false otherwise
 */
export function isValidZipCode(zipCode: string): boolean {
  if (!zipCode || typeof zipCode !== 'string') return false
  const zipRegex = /^\d{5}(-\d{4})?$/
  return zipRegex.test(zipCode.trim())
}

/**
 * Validates date format (ISO format: YYYY-MM-DD)
 * @param date - Date string to validate
 * @returns True if date is valid, false otherwise
 */
export function isValidDate(date: string): boolean {
  if (!date || typeof date !== 'string') return false
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/
  if (!dateRegex.test(date)) return false
  const dateObj = new Date(date)
  return !isNaN(dateObj.getTime())
}

