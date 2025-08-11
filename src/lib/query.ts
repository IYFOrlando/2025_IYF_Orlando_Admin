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
  return a.includes('korean') || a.includes('corean') || a.includes('kore')
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
export function usd(n?: number | null) {
  if (n == null || Number.isNaN(n)) return ''
  return `$${Number(n).toFixed(2)}`
}