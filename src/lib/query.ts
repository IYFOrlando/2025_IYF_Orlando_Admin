export function norm(s?: string) {
  return (s ?? '').toString().trim()
}
export function normLower(s?: string) {
  return norm(s).toLowerCase()
}
export function isKoreanLanguage(acad?: string) {
  const a = normLower(acad)
  if (!a) return false
  if (a.includes('cook')) return false // exclude Korean Cooking
  // Check for exact match or common variants
  return a === 'korean language' || a === 'korean lang' || a.includes('corean') || a.includes('kore')
}
export function mapKoreanLevel(level?: string) {
  const v = normLower(level)
  if (!v || v === 'n/a') return 'Unknown'
  if (v.startsWith('alpha')) return 'Alphabet'
  if (v.startsWith('begin')) return 'Beginner'
  if (v.startsWith('inter')) return 'Intermediate'
  if (v.includes('movie') || v.includes('k-movie') || v.startsWith('adv') || v.includes('conversation')) return 'K-Movie Conversation'
  return 'Unknown'
}
/**
 * Format number as USD currency
 * Assumes input is in cents (as stored in Firestore)
 * Converts to dollars for display
 */
export function usd(n?: number | null) {
  if (n == null || Number.isNaN(n)) return ''
  // Convert from cents to dollars
  const dollars = Number(n) / 100
  return `$${dollars.toFixed(2)}`
}