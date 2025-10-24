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
  period: 1 | 2
  level?: string | null
  unitPrice: number
  qty: number
  amount: number
  instructor?: {
    name: string
    email?: string
    phone?: string
    credentials?: string
  }
  instructionDates?: {
    startDate: string
    endDate: string
    totalHours: number
    schedule?: string // e.g., "Saturdays 10:00 AM - 12:00 PM"
  }
  serviceRate?: number // Rate per hour for elective courses
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
  method?: 'cash' | 'zelle' | null
  createdAt: any
  updatedAt: any
}

export type Payment = {
  id: string
  invoiceId: string
  studentId: string
  amount: number
  method: 'cash' | 'zelle'
  createdAt: any
}