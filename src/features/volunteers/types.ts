export interface VolunteerApplication {
  id: string
  firstName: string
  lastName: string
  email: string
  gender: string
  tshirtSize: string
  emergencyContact: string
  emergencyPhone: string
  volunteerCode?: string
  source?: string
  eventInfoAccepted?: boolean
  termsAccepted?: boolean
  age?: number
  phone?: string
  city?: string
  state?: string
  country?: string
  availability?: {
    days: string[]
    times: string[]
    commitment: string
    flexible?: boolean
    maxHoursPerDay?: number
  }
  interests?: string[]
  skills?: string[]
  languages?: string[]
  backgroundCheckCompleted?: boolean
  trainingCompleted?: boolean
  orientationAttended?: boolean
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