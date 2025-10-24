export type EmailSource = 
  | 'registrations' 
  | 'attendance' 
  | 'classes'
  | 'staff'
  | 'csv'
  | 'manual'

export type EmailRecord = {
  id: string
  email: string
  firstName?: string
  lastName?: string
  source: EmailSource
  sourceId?: string // ID del registro original
  sourceDetails?: {
    academy?: string
    level?: string
    period?: number
    status?: string
    [key: string]: any
  }
  isActive: boolean
  isVerified?: boolean
  tags?: string[] // Para categorizar (ej: 'student', 'parent', 'staff')
  notes?: string
  createdAt: any
  updatedAt: any
  lastUsed?: any // Última vez que se usó para envío
}

export type EmailCollection = {
  id: string
  name: string
  description?: string
  emails: string[] // Array de IDs de EmailRecord
  tags?: string[]
  isActive: boolean
  createdAt: any
  updatedAt: any
}

export type EmailTemplate = {
  id: string
  name: string
  subject: string
  content: string
  isActive: boolean
  createdAt: any
  updatedAt: any
}

export type EmailCampaign = {
  id: string
  name: string
  templateId: string
  collectionId: string
  status: 'draft' | 'scheduled' | 'sending' | 'sent' | 'failed'
  scheduledAt?: any
  sentAt?: any
  totalRecipients: number
  sentCount: number
  failedCount: number
  createdAt: any
  updatedAt: any
}
