export interface Event {
  id: string
  name: string
  description?: string
  date: string
  startTime: string
  endTime: string
  location: string
  status: 'upcoming' | 'active' | 'completed' | 'cancelled'
  qrCode?: string
  createdAt: {
    seconds: number
    nanoseconds: number
  }
  updatedAt?: {
    seconds: number
    nanoseconds: number
  }
}

export interface VolunteerHours {
  id: string
  volunteerId: string
  volunteerName: string
  volunteerEmail: string
  eventId: string
  eventName: string
  checkInTime?: {
    seconds: number
    nanoseconds: number
  }
  checkOutTime?: {
    seconds: number
    nanoseconds: number
  }
  totalHours?: number
  status: 'checked-in' | 'checked-out' | 'completed'
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

export interface QRCodeData {
  type: 'check-in' | 'check-out'
  eventId: string
  volunteerCode?: string
  timestamp: number
}

export interface VolunteerCode {
  id: string
  code: string
  volunteerName: string
  volunteerEmail: string
  eventId: string
  isActive: boolean
  createdAt: {
    seconds: number
    nanoseconds: number
  }
}

export type EventStatus = 'upcoming' | 'active' | 'completed' | 'cancelled'
export type HoursStatus = 'checked-in' | 'checked-out' | 'completed'
