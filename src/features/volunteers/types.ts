export interface VolunteerApplication {
  id: string
  // Personal Information (matching DB structure)
  firstName: string
  lastName: string
  email: string
  gender: string
  tshirtSize: string
  
  // Emergency Contact (matching DB structure)
  emergencyContact: string
  emergencyPhone: string
  
  // Additional fields from DB
  volunteerCode?: string
  source?: string
  eventInfoAccepted?: boolean
  termsAccepted?: boolean
  recaptchaToken?: string
  
  // Additional fields (optional)
  age?: number
  phone?: string
  confirmEmail?: string
  city?: string
  address?: string
  state?: string
  zipCode?: string
  availability?: {
    days: string[]
    times: string[]
    commitment: string
  }
  interests?: string[]
  skills?: string[]
  experience?: string
  motivation?: string
  references?: Array<{
    name: string
    phone: string
    email?: string
    relationship: string
  }>
  
  // Status and metadata
  status: 'pending' | 'approved' | 'rejected' | 'active' | 'inactive'
  notes?: string
  createdAt: {
    seconds: number
    nanoseconds: number
  }
  updatedAt?: {
    seconds: number
    nanoseconds: number
  }
  createdBy?: string
  updatedBy?: string
}

export type VolunteerStatus = 'pending' | 'approved' | 'rejected' | 'active' | 'inactive'

export interface VolunteerSchedule {
  id: string
  volunteerName: string
  volunteerEmail: string
  volunteerCode: string
  volunteerPhone?: string
  status: 'scheduled' | 'confirmed' | 'completed' | 'cancelled'
  date?: string
  selectedSlots: Array<{
    id: string
    date: string
    startTime: string
    endTime: string
    hours: number
  } | string>
  totalHours?: number
  slotId?: string
  reservedAt?: {
    seconds: number
    nanoseconds: number
  }
  createdAt?: {
    seconds: number
    nanoseconds: number
  }
  updatedAt?: {
    seconds: number
    nanoseconds: number
  }
}
