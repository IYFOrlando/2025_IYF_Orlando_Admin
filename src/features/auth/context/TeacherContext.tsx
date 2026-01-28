import React, { createContext, useContext, ReactNode } from 'react'
import { useUserRole } from '../hooks/useUserRole'
import type { TeacherProfile, UserRole } from '../types'

interface TeacherContextType {
  role: UserRole
  teacherProfile: TeacherProfile | null
  loading: boolean
  isAdmin: boolean
  isTeacher: boolean
}

const TeacherContext = createContext<TeacherContextType | undefined>(undefined)

export const TeacherProvider = ({ children }: { children: ReactNode }) => {
  const roleData = useUserRole()

  return (
    <TeacherContext.Provider value={roleData}>
      {children}
    </TeacherContext.Provider>
  )
}

export const useTeacherContext = () => {
  const context = useContext(TeacherContext)
  if (context === undefined) {
    throw new Error('useTeacherContext must be used within a TeacherProvider')
  }
  return context
}
