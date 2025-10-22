/**
 * Utility functions for generating and validating volunteer codes
 */

/**
 * Generate a random alphanumeric volunteer code
 * @param length - Length of the code (default: 6)
 * @returns Random alphanumeric code
 */
export function generateVolunteerCode(length: number = 6): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let result = ''
  
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  
  return result
}

/**
 * Validate if a string is a valid volunteer code format
 * @param code - Code to validate
 * @param length - Expected length (default: 6)
 * @returns True if valid format
 */
export function isValidVolunteerCodeFormat(code: string, length: number = 6): boolean {
  if (!code || typeof code !== 'string') return false
  
  // Check length
  if (code.length !== length) return false
  
  // Check if contains only alphanumeric characters
  const alphanumericRegex = /^[A-Z0-9]+$/
  return alphanumericRegex.test(code.toUpperCase())
}

/**
 * Normalize volunteer code (uppercase, trim)
 * @param code - Code to normalize
 * @returns Normalized code
 */
export function normalizeVolunteerCode(code: string): string {
  if (!code || typeof code !== 'string') return ''
  return code.trim().toUpperCase()
}

/**
 * Generate multiple unique volunteer codes
 * @param count - Number of codes to generate
 * @param length - Length of each code (default: 6)
 * @returns Array of unique codes
 */
export function generateMultipleVolunteerCodes(count: number, length: number = 6): string[] {
  const codes = new Set<string>()
  
  while (codes.size < count) {
    codes.add(generateVolunteerCode(length))
  }
  
  return Array.from(codes)
}
