// Shared normalization utilities for academies and levels
// This ensures consistency across all pages

/**
 * Normalize academy names to handle variations
 * Converts different formats of academy names to standard format
 */
export const normalizeAcademy = (academy: string | null): string => {
  if (!academy) return 'No Academy'
  
  const normalized = academy.trim().toLowerCase()
  
  // Normalize Korean Language variations
  if (normalized.includes('korean') && normalized.includes('language')) {
    return 'Korean Language'
  }
  
  // Keep other academies as they are
  return academy.trim()
}

/**
 * Normalize level names and group similar levels
 * Converts different formats of level names to standard format
 */
export const normalizeLevel = (level: string | null): string => {
  if (!level) return 'No Level'
  
  const normalized = level.trim().toLowerCase()
  
  // Group Alphabet and Alphabet Level
  if (normalized.includes('alphabet')) {
    return 'Alphabet'
  }
  
  // Group Beginner and Beginner Level
  if (normalized.includes('beginner')) {
    return 'Beginner'
  }
  
  // Group Intermediate and Intermediate Level
  if (normalized.includes('intermediate')) {
    return 'Intermediate'
  }
  
  // Group Conversation variations (except K-Movie which is handled below)
  if (normalized.includes('conversation') && !normalized.includes('movie')) {
    return 'Conversation'
  }
  
  // Handle K-Movie Conversation (keep as is, it's a specific level)
  if (normalized.includes('k-movie') || normalized.includes('movie')) {
    return 'K-Movie Conversation'
  }
  
  // Remove "Level" from other levels
  return level.replace(/level/i, '').trim() || level.trim()
}
