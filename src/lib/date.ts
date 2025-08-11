import type { Timestamp } from 'firebase/firestore'

export function toDate(v: any): Date | null {
  if (!v) return null
  if (v instanceof Date) return v
  if ((v as Timestamp)?.toDate) return (v as Timestamp).toDate()
  const d = new Date(v)
  return isNaN(d.getTime()) ? null : d
}
export function displayYMD(v: any): string {
  const d = toDate(v)
  if (!d) return ''
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}