export type PricingDoc = {
  academyPrices: Record<string, number>
  items?: PricingItem[]
  currency?: string
  lunch?: { semester?: number | null; single?: number | null }
  updatedAt?: any
}

export type PricingItem = {
  id: string
  academy: string
  level?: string | null
  p1?: number | null
  p2?: number | null
  enabled?: boolean
  notes?: string
}

export type LunchPricing = {
  semester?: number
  single?: number
}

export type InvoiceLine = {
  academy: string
  period: 1 | 2 | null // null for 2026 (no periods), kept for backward compatibility
  level?: string | null
  schedule?: string | null // Schedule for the academy (2026)
  unitPrice: number
  qty: number
  amount: number
  instructor?: {
    firstName: string // Instructor's first name
    lastName: string // Instructor's last name
    email?: string
    phone?: string
    credentials?: string // Required for elective courses
  }
  instructionDates?: {
    startDate: string // Must include year (YYYY-MM-DD format)
    endDate: string // Must include year (YYYY-MM-DD format)
    totalHours: number
    schedule?: string // e.g., "Saturdays 10:00 AM - 12:00 PM"
  }
  serviceRate?: number // Rate per hour for elective courses (required for elective courses)
}

export type Invoice = {
  id: string
  studentId: string
  studentName: string
  lines: InvoiceLine[]
  subtotal: number
  lunch?: {
    semesterSelected?: boolean
    singleQty?: number
    prices?: { semester?: number; single?: number }
  }
  lunchAmount?: number
  discountAmount?: number
  discountNote?: string | null
  total: number
  paid: number
  balance: number
  status: 'unpaid' | 'partial' | 'paid' | 'exonerated'
  method?: 'cash' | 'zelle' | 'check' | 'card' | null
  createdAt: any // Firebase Timestamp or Date
  updatedAt: any // Firebase Timestamp or Date
}

export type Payment = {
  id: string
  invoiceId: string
  studentId: string
  amount: number
  method: 'cash' | 'zelle' | 'check' | 'card'
  createdAt: any
}