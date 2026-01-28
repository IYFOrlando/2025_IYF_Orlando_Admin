import type { Invoice } from './types'

/** Timestamp-like value to number (Firestore uses { seconds } or similar). */
function tsSeconds(v: unknown): number {
  if (v == null) return 0
  if (typeof v === 'number') return v
  const o = v as { seconds?: number; _seconds?: number }
  return o.seconds ?? o._seconds ?? 0
}

/**
 * Returns one invoice per studentId: the most recent by createdAt.
 * Use this for pending total and student counts so duplicate invoices don't double-count.
 * Older invoices for the same student remain in DB as history.
 */
export function latestInvoicePerStudent(invoices: Invoice[]): Invoice[] {
  const byStudent = new Map<string, Invoice>()
  for (const inv of invoices) {
    const t = tsSeconds(inv.createdAt)
    const cur = byStudent.get(inv.studentId)
    if (!cur || t > tsSeconds(cur.createdAt)) byStudent.set(inv.studentId, inv)
  }
  return Array.from(byStudent.values())
}
