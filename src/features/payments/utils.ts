import type { Invoice } from './types'

/** Timestamp-like value to number (Firestore uses { seconds } or similar). */
export function toMillis(v: unknown): number {
  if (v == null) return 0
  if (v instanceof Date) return Number.isFinite(v.getTime()) ? v.getTime() : 0
  if (typeof v === 'string') {
    const parsed = Date.parse(v)
    return Number.isFinite(parsed) ? parsed : 0
  }
  if (typeof v === 'number') {
    // Support both unix seconds and epoch milliseconds.
    return v > 1e12 ? v : v * 1000
  }

  const o = v as {
    seconds?: number
    _seconds?: number
    toDate?: () => Date
  }
  if (typeof o.toDate === 'function') {
    const d = o.toDate()
    return d instanceof Date && Number.isFinite(d.getTime()) ? d.getTime() : 0
  }
  if (typeof o.seconds === 'number') return o.seconds * 1000
  if (typeof o._seconds === 'number') return o._seconds * 1000
  return 0
}

export function formatDateSafe(v: unknown, fallback = '—'): string {
  const ms = toMillis(v)
  return ms > 0 ? new Date(ms).toLocaleDateString() : fallback
}

export function formatDateTimeSafe(v: unknown, fallback = '—'): string {
  const ms = toMillis(v)
  return ms > 0 ? new Date(ms).toLocaleString() : fallback
}

/**
 * Returns one invoice per studentId: the most recent by createdAt.
 * Use this for pending total and student counts so duplicate invoices don't double-count.
 * Older invoices for the same student remain in DB as history.
 */
export function latestInvoicePerStudent(invoices: Invoice[]): Invoice[] {
  const byStudent = new Map<string, Invoice>()
  for (const inv of invoices) {
    const t = toMillis(inv.createdAt)
    const cur = byStudent.get(inv.studentId)
    if (!cur || t > toMillis(cur.createdAt)) byStudent.set(inv.studentId, inv)
  }
  return Array.from(byStudent.values())
}
