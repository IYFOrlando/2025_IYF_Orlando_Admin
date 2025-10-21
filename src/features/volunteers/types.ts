export interface VolunteerApplication {
  id: string
  firstName: string
  lastName: string
  email: string
  phone?: string
  dateOfBirth?: string
  address?: string
  city?: string
  state?: string
  zipCode?: string
  emergencyContact?: {
    name: string
    phone: string
    relationship: string
  }
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
