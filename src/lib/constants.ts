/**
 * Application-wide constants
 * Centralized location for all magic strings and hardcoded values
 * 
 * @module constants
 * @description This module exports all application constants to prevent magic strings
 * and improve maintainability.
 */

/**
 * Valid T-shirt sizes for volunteers
 */
// T-Shirt Sizes
export const TSHIRT_SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL'] as const
/** T-shirt sizes in order including 'Unknown' for sorting */
export const TSHIRT_SIZE_ORDER = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL', 'Unknown'] as const
/** Type for valid T-shirt sizes */
export type TShirtSize = typeof TSHIRT_SIZES[number] | 'Unknown'

// Gender Options
export const GENDER_OPTIONS = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'other', label: 'Other' },
  { value: 'prefer-not-to-say', label: 'Prefer not to say' }
] as const

// Volunteer Status Options
export const VOLUNTEER_STATUS_OPTIONS = [
  { value: 'pending', label: 'Pending Review', color: '#ff9800' },
  { value: 'approved', label: 'Approved', color: '#2196f3' },
  { value: 'active', label: 'Active', color: '#4caf50' },
  { value: 'rejected', label: 'Rejected', color: '#f44336' },
  { value: 'inactive', label: 'Inactive', color: '#9e9e9e' }
] as const

export type VolunteerStatus = typeof VOLUNTEER_STATUS_OPTIONS[number]['value']

// Skill Options
export const SKILL_OPTIONS = [
  'Event Planning',
  'Customer Service',
  'Marketing',
  'Photography',
  'Videography',
  'Social Media',
  'Translation',
  'Cooking',
  'Setup/Cleanup',
  'Registration',
  'Security',
  'First Aid',
  'Childcare',
  'Transportation',
  'Technical Support'
] as const

// Interest Options
export const INTEREST_OPTIONS = [
  'Korean Culture',
  'Community Service',
  'Event Management',
  'Food & Beverage',
  'Entertainment',
  'Education',
  'Youth Programs',
  'Cultural Exchange',
  'Volunteer Leadership',
  'Non-profit Work'
] as const

// Language Options
export const LANGUAGE_OPTIONS = [
  'English',
  'Korean',
  'Spanish',
  'French',
  'German',
  'Japanese',
  'Chinese',
  'Portuguese'
] as const

// Commitment Options
export const COMMITMENT_OPTIONS = [
  { value: 'one-time', label: 'One-time Event' },
  { value: 'short-term', label: 'Short-term (1-3 months)' },
  { value: 'long-term', label: 'Long-term (3+ months)' },
  { value: 'flexible', label: 'Flexible' }
] as const

// Discount Codes
export const DISCOUNT_CODES = {
  'TEACHER100': {
    name: 'Teacher Discount',
    discount: 100,
    type: 'percentage' as const,
    description: '100% discount for teachers'
  },
  'SAVE50': {
    name: 'Save $50',
    discount: 50,
    type: 'fixed' as const,
    description: '$50 off discount'
  }
} as const

export type DiscountCode = keyof typeof DISCOUNT_CODES

// Academy Names (Period 1) - 2026 Spring Semester
export const PERIOD_1_ACADEMIES = [
  'Art',
  'English',
  'Kids Academy',
  'Korean Language',
  'Piano',
  'Pickleball',
  'Soccer',
  'Taekwondo',
  // Legacy (mantener compatibilidad)
  'DIY',
  'Senior',
  'Stretch and Strengthen'
] as const

// Academy Names (Period 2) - 2026 Spring Semester
export const PERIOD_2_ACADEMIES = [
  'Art',
  'English',
  'Kids Academy',
  'Korean Language',
  'Piano',
  'Pickleball',
  'Soccer',
  'Taekwondo',
  // Legacy (mantener compatibilidad)
  'DIY',
  'Korean Cooking',
  'Senior',
  'Kids'
] as const

// Academy Pricing (default prices in dollars) - 2026 Spring Semester
export const ACADEMY_DEFAULT_PRICES = {
  'Art': 100,
  'English': 50,
  'Kids Academy': 50,
  'Kids': 50, // Alias for compatibility
  'Korean Language': 50,
  'Piano': 100,
  'Pickleball': 50,
  'Soccer': 50,
  'Taekwondo': 100,
  // Legacy academies (mantener compatibilidad)
  'Korean Cooking': 150,
  'DIY': 80,
  'Senior': 40,
  'Stretch and Strengthen': 40,
  'default': 50
} as const

// Korean Language Levels
export const KOREAN_LEVELS = [
  'Beginner',
  'Intermediate',
  'Advanced'
] as const

// Payment Methods
export const PAYMENT_METHODS = [
  { value: 'cash', label: 'Cash' },
  { value: 'zelle', label: 'Zelle' },
  { value: 'check', label: 'Check' },
  { value: 'credit', label: 'Credit Card' },
  { value: 'none', label: 'None' }
] as const

export type PaymentMethod = typeof PAYMENT_METHODS[number]['value']

// Event Status Options
export const EVENT_STATUS_OPTIONS = [
  { value: 'draft', label: 'Draft' },
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'active', label: 'Active' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' }
] as const

// Attendance Status
export const ATTENDANCE_STATUS = {
  'not-checked-in': 'Not Checked In',
  'checked-in': 'Checked In',
  'completed': 'Completed',
  'unknown': 'Unknown'
} as const

// Email Sources
export const EMAIL_SOURCES = [
  'registrations',
  'attendance',
  'classes',
  'staff',
  'staff_profiles',
  'eventbrite',
  'csv',
  'manual'
] as const

export type EmailSource = typeof EMAIL_SOURCES[number]

/**
 * Validates if a string is a valid T-shirt size
 * @param size - String to validate
 * @returns True if size is valid, false otherwise
 */
export function isValidTShirtSize(size: string): size is TShirtSize {
  return [...TSHIRT_SIZES, 'Unknown'].includes(size as TShirtSize)
}

/**
 * Gets discount information by discount code
 * @param code - Discount code to look up
 * @returns Discount object or null if not found
 */
export function getDiscountByCode(code: string): typeof DISCOUNT_CODES[keyof typeof DISCOUNT_CODES] | null {
  return DISCOUNT_CODES[code as DiscountCode] || null
}

/**
 * Checks if an academy name is Korean Language academy
 * @param academy - Academy name to check
 * @returns True if academy is Korean Language, false otherwise
 */
export function isKoreanLanguageAcademy(academy: string): boolean {
  return academy.toLowerCase().includes('korean') && academy.toLowerCase().includes('language')
}

/**
 * Checks if an academy name is Korean Cooking academy
 * @param academy - Academy name to check
 * @returns True if academy is Korean Cooking, false otherwise
 */
export function isKoreanCookingAcademy(academy: string): boolean {
  return academy.toLowerCase().includes('korean') && academy.toLowerCase().includes('cooking')
}

