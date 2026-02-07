import { useAuth } from '../../../context/AuthContext'
import { useTeacherProfile } from './useTeacherProfile'
import { ADMIN_EMAILS } from '../../../lib/admin'
import type { UserRole } from '../types'

export const useUserRole = () => {
    const { currentUser } = useAuth()
    const { isTeacher, profile, loading: loadingTeacher } = useTeacherProfile()

    if (!currentUser) {
        return { 
            role: 'unauthorized' as UserRole, 
            teacherProfile: null, 
            loading: false,
            isAdmin: false,
            isTeacher: false
        }
    }

    const email = currentUser.email?.toLowerCase().trim() || ''
    const isAdmin = ADMIN_EMAILS.includes(email)
    
    // Debug log for permissions
    if (import.meta.env.DEV) {
      console.debug('[AuthCheck] Local user email:', email)
      console.debug('[AuthCheck] Recognized as Admin:', isAdmin)
      console.debug('[AuthCheck] Recognized as Teacher:', isTeacher)
    }

    let role: UserRole = 'unauthorized'
    if (isAdmin) role = 'admin'
    else if (isTeacher) role = 'teacher'

    return {
        role,
        teacherProfile: profile,
        loading: loadingTeacher,
        isAdmin,
        isTeacher
    }
}
