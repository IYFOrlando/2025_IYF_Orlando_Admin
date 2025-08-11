export type PricingDoc = {
  academyPrices: Record<string, number>
  lunch?: { semester?: number | null; single?: number | null }
  updatedAt?: any
}

export type InvoiceLine = {
  academy: string
  period: 1 | 2
  level?: string | null
  unitPrice: number
  qty: number
  amount: number
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
  status: 'unpaid' | 'partial' | 'paid'
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