import { Timestamp } from 'firebase/firestore'

export type UserRole = 'admin' | 'teacher' | 'viewer' | 'unauthorized'

export interface TeacherData {
  name: string
  email: string
  phone?: string
  credentials?: string
}

export interface TeacherAcademy {
  academyId: string
  academyName: string
  level?: string | null // If null, applies to whole academy
  teacherData: TeacherData // Snapshot of data at that node
}

export interface TeacherProfile {
  id: string // This is the email
  email: string
  name: string
  phone?: string
  credentials?: string
  academies: TeacherAcademy[]
}

// Activity Log Types (for Phase 10)
export type TeacherActionType = 
  | 'attendance_created' 
  | 'attendance_updated' 
  | 'progress_created' 
  | 'progress_updated' 
  | 'export_excel'

export interface TeacherActivity {
  id?: string
  teacherEmail: string
  teacherName: string
  action: TeacherActionType
  academy: string
  level?: string
  studentId?: string
  studentName?: string
  date: Timestamp 
  details?: any
  createdAt: Timestamp 
}
