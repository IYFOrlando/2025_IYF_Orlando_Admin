import type { TeacherProfile } from '../features/auth/types'

/**
 * Checks if a teacher has access to a specific academy (and optionally a level).
 * If level is provided, checks if they teach that specific level OR the whole academy.
 */
export function isTeacherFor(
  profile: TeacherProfile | null, 
  academyId: string, 
  levelName?: string | null
): boolean {
  if (!profile) return false
  
  // 1. Check if they teach the academy at all
  const academyAssignment = profile.academies.find(a => a.academyId === academyId)
  if (!academyAssignment) return false

  // 2. If no specific level requested, just knowing they are assigned is enough
  // (Or we might want to be stricter: if they only teach "Beginner", can they view the "Academy" Dashboard? Yes.)
  if (!levelName) return true

  // 3. If level requested, check specific assignment
  // If they are assigned to level 'null', they teach the WHOLE academy (Main Teacher)
  // If they are assigned to 'levelName', they teach that level
  const specificAssignment = profile.academies.find(a => 
    a.academyId === academyId && (a.level === null || a.level === levelName)
  )
  
  return !!specificAssignment
}

/**
 * Returns a list of Academy IDs that the teacher has access to.
 */
export function getTeacherAcademyIds(profile: TeacherProfile | null): string[] {
  if (!profile) return []
  // Unique IDs
  return Array.from(new Set(profile.academies.map(a => a.academyId)))
}

/**
 * Returns true if the teacher teaches ALL levels of this academy (Main Teacher).
 */
export function isMainTeacher(profile: TeacherProfile | null, academyId: string): boolean {
  if (!profile) return false
  return profile.academies.some(a => a.academyId === academyId && a.level === null)
}

/**
 * Validates if a teacher can edit a student's progress/attendance.
 * Requires the student to be in an academy/level the teacher owns.
 */
export function canManageStudent(
  profile: TeacherProfile | null,
  studentAcademies: string[], // List of academy IDs student is in
  studentLevels: Record<string, string> // Map or object of academyId -> levelName
): boolean {
  if (!profile) return false

  // Does the teacher teach ANY of the academies the student is in?
  // And if so, does the student's level match the teacher's assigned level?
  
  return studentAcademies.some(acaId => {
    const studentLvl = studentLevels[acaId]
    return isTeacherFor(profile, acaId, studentLvl)
  })
}
