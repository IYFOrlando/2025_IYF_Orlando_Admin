
import { useState, useCallback } from 'react'
import { supabase } from '../../../lib/supabase'
import { useAuth } from '../../../context/AuthContext'
import { notifyError, notifySuccess } from '../../../lib/alerts'

export type FeedbackRow = {
  id: string | null
  studentId: string
  studentName: string
  academyId: string
  academyName: string
  levelId: string | null
  levelName: string | null
  semesterId: string
  score: number | null
  comment: string
  attendancePct: number | null
  dirty: boolean
}

export type ProgressRow = {
  id: string
  date: string
  studentId: string
  studentName: string
  academy: string
  level?: string
  score?: number
  note?: string
}

export type StudentSearchResult = {
  id: string
  firstName: string
  lastName: string
  email?: string
  city?: string
}

export function useSupabaseProgress() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { currentUser } = useAuth()

  // Get active semester
  const getActiveSemesterId = useCallback(async (): Promise<string | null> => {
    const { data } = await supabase.from('semesters').select('id').eq('name', 'Spring 2026').limit(1)
    return data?.[0]?.id || null
  }, [])

  // Calculate attendance % for students in an academy
  const calcAttendancePcts = useCallback(async (
    academyId: string,
    studentIds: string[],
  ): Promise<Record<string, number>> => {
    if (studentIds.length === 0) return {}

    // Get all sessions for this academy
    const { data: sessions } = await supabase
      .from('attendance_sessions')
      .select('id')
      .eq('academy_id', academyId)

    if (!sessions || sessions.length === 0) return {}
    const sessionIds = sessions.map(s => s.id)

    // Get all records for these students in these sessions
    const { data: records } = await supabase
      .from('attendance_records')
      .select('student_id, status')
      .in('session_id', sessionIds)
      .in('student_id', studentIds)

    if (!records) return {}

    const stats: Record<string, { present: number; total: number }> = {}
    records.forEach((r: any) => {
      if (!stats[r.student_id]) stats[r.student_id] = { present: 0, total: 0 }
      stats[r.student_id].total++
      if (r.status === 'present') stats[r.student_id].present++
    })

    const pcts: Record<string, number> = {}
    Object.keys(stats).forEach(sid => {
      const s = stats[sid]
      pcts[sid] = s.total > 0 ? Math.round((s.present / s.total) * 100) : 0
    })
    return pcts
  }, [])

  // Fetch feedback rows for an academy (semester-oriented, one row per student)
  const fetchFeedback = useCallback(async (
    academyId: string,
    academyName: string,
  ): Promise<FeedbackRow[]> => {
    try {
      setLoading(true)
      setError(null)

      const semesterId = await getActiveSemesterId()
      if (!semesterId) throw new Error('Active semester not found')

      // 1. Get enrolled students for this academy
      const { data: enrollments, error: enrErr } = await supabase
        .from('enrollments')
        .select(`
          student_id,
          level_id,
          students ( id, first_name, last_name ),
          levels ( id, name )
        `)
        .eq('academy_id', academyId)
        .eq('semester_id', semesterId)

      if (enrErr) throw enrErr
      if (!enrollments || enrollments.length === 0) return []

      const studentIds = enrollments.map((e: any) => e.student_id)

      // 2. Get existing feedback for these students
      const { data: existing } = await supabase
        .from('progress_reports')
        .select('id, student_id, score, comments, attendance_pct')
        .eq('academy_id', academyId)
        .eq('semester_id', semesterId)

      const feedbackMap: Record<string, any> = {}
      existing?.forEach((r: any) => { feedbackMap[r.student_id] = r })

      // 3. Calculate attendance %
      const attPcts = await calcAttendancePcts(academyId, studentIds)

      // 4. Build rows
      const rows: FeedbackRow[] = enrollments.map((e: any) => {
        const fb = feedbackMap[e.student_id]
        const student = e.students as any
        return {
          id: fb?.id || null,
          studentId: e.student_id,
          studentName: `${student?.first_name || ''} ${student?.last_name || ''}`.trim(),
          academyId,
          academyName,
          levelId: e.level_id,
          levelName: (e.levels as any)?.name || null,
          semesterId,
          score: fb?.score ?? null,
          comment: fb?.comments || '',
          attendancePct: attPcts[e.student_id] ?? fb?.attendance_pct ?? null,
          dirty: false,
        }
      })

      return rows.sort((a, b) => a.studentName.localeCompare(b.studentName))
    } catch (err: any) {
      console.error('fetchFeedback error:', err)
      setError(err.message)
      return []
    } finally {
      setLoading(false)
    }
  }, [getActiveSemesterId, calcAttendancePcts])

  // Batch save feedback
  const saveFeedbackBatch = useCallback(async (rows: FeedbackRow[]): Promise<boolean> => {
    try {
      setLoading(true)
      const dirtyRows = rows.filter(r => r.dirty)
      if (dirtyRows.length === 0) {
        notifySuccess('No changes', 'Nothing to save')
        return true
      }

      const today = new Date().toISOString().slice(0, 10)

      for (const row of dirtyRows) {
        const payload = {
          student_id: row.studentId,
          academy_id: row.academyId,
          level_id: row.levelId,
          semester_id: row.semesterId,
          date: today,
          score: row.score,
          comments: row.comment,
          attendance_pct: row.attendancePct,
          teacher_id: currentUser?.id || null,
        }

        if (row.id) {
          const { error } = await supabase.from('progress_reports').update(payload).eq('id', row.id)
          if (error) throw error
        } else {
          const { error } = await supabase.from('progress_reports').insert(payload)
          if (error) throw error
        }
      }

      notifySuccess('Saved', `${dirtyRows.length} feedback record(s) saved`)
      return true
    } catch (err: any) {
      notifyError('Save Failed', err.message)
      return false
    } finally {
      setLoading(false)
    }
  }, [currentUser])

  // Fetch all feedback for certifications view (all academies for semester)
  const fetchAllCertifications = useCallback(async (): Promise<FeedbackRow[]> => {
    try {
      setLoading(true)
      setError(null)

      const semesterId = await getActiveSemesterId()
      if (!semesterId) throw new Error('Active semester not found')

      // Get all enrollments for the semester
      const { data: enrollments, error: enrErr } = await supabase
        .from('enrollments')
        .select(`
          student_id,
          academy_id,
          level_id,
          students ( id, first_name, last_name ),
          academies ( id, name ),
          levels ( id, name )
        `)
        .eq('semester_id', semesterId)

      if (enrErr) throw enrErr
      if (!enrollments || enrollments.length === 0) return []

      // Get all feedback for this semester
      const { data: existing } = await supabase
        .from('progress_reports')
        .select('id, student_id, academy_id, score, comments, attendance_pct')
        .eq('semester_id', semesterId)

      const fbKey = (sid: string, aid: string) => `${sid}:${aid}`
      const feedbackMap: Record<string, any> = {}
      existing?.forEach((r: any) => { feedbackMap[fbKey(r.student_id, r.academy_id)] = r })

      // Get unique academy IDs and calculate attendance for each
      const academyIds = [...new Set(enrollments.map((e: any) => e.academy_id))]
      const allPcts: Record<string, Record<string, number>> = {}
      for (const aid of academyIds) {
        const sids = enrollments.filter((e: any) => e.academy_id === aid).map((e: any) => e.student_id)
        allPcts[aid] = await calcAttendancePcts(aid, sids)
      }

      const rows: FeedbackRow[] = enrollments.map((e: any) => {
        const key = fbKey(e.student_id, e.academy_id)
        const fb = feedbackMap[key]
        const student = e.students as any
        const academy = e.academies as any
        const pcts = allPcts[e.academy_id] || {}
        return {
          id: fb?.id || null,
          studentId: e.student_id,
          studentName: `${student?.first_name || ''} ${student?.last_name || ''}`.trim(),
          academyId: e.academy_id,
          academyName: academy?.name || '',
          levelId: e.level_id,
          levelName: (e.levels as any)?.name || null,
          semesterId,
          score: fb?.score ?? null,
          comment: fb?.comments || '',
          attendancePct: pcts[e.student_id] ?? fb?.attendance_pct ?? null,
          dirty: false,
        }
      })

      return rows.sort((a, b) => a.studentName.localeCompare(b.studentName) || a.academyName.localeCompare(b.academyName))
    } catch (err: any) {
      console.error('fetchAllCertifications error:', err)
      setError(err.message)
      return []
    } finally {
      setLoading(false)
    }
  }, [getActiveSemesterId, calcAttendancePcts])

  // Legacy: Fetch progress reports (old format)
  const fetchProgress = useCallback(async (academyNames: string[] | null) => {
    try {
      setLoading(true)
      setError(null)

      let query = supabase
        .from('progress_reports')
        .select(`
          id, date, score, comments,
          student:students ( id, first_name, last_name ),
          academy:academies ( name ),
          level:levels ( name )
        `)
        .order('date', { ascending: false })

      if (academyNames && academyNames.length > 0) {
        query = supabase
          .from('progress_reports')
          .select(`
            id, date, score, comments,
            student:students ( id, first_name, last_name ),
            academy:academies!inner ( name ),
            level:levels ( name )
          `)
          .in('academy.name', academyNames)
          .order('date', { ascending: false })
      } else if (academyNames && academyNames.length === 0) {
        return []
      }

      const { data, error } = await query
      if (error) throw error

      return data.map((r: any) => ({
        id: r.id,
        date: r.date,
        studentId: r.student?.id,
        studentName: `${r.student?.first_name || ''} ${r.student?.last_name || ''}`.trim(),
        academy: r.academy?.name,
        level: r.level?.name,
        score: r.score,
        note: r.comments
      })) as ProgressRow[]
    } catch (err: any) {
      console.error('Fetch progress error:', err)
      setError(err.message)
      return []
    } finally {
      setLoading(false)
    }
  }, [])

  const searchStudents = async (term: string): Promise<StudentSearchResult[]> => {
    if (!term || term.length < 2) return []
    try {
      const { data, error } = await supabase
        .from('students')
        .select('id, first_name, last_name, email, address')
        .or(`first_name.ilike.%${term}%,last_name.ilike.%${term}%`)
        .limit(20)
      if (error) throw error
      return data.map((s: any) => ({
        id: s.id, firstName: s.first_name, lastName: s.last_name,
        email: s.email, city: s.address?.city
      }))
    } catch (err: any) {
      console.error('Search error:', err)
      return []
    }
  }

  const saveProgress = async (record: Partial<ProgressRow> & { studentId: string, academy: string }) => {
    try {
      setLoading(true)
      const { data: acData, error: acError } = await supabase
        .from('academies').select('id').eq('name', record.academy).single()
      if (acError) throw new Error(`Academy '${record.academy}' not found`)

      let levelId = null
      if (record.level) {
        const { data: lvlData } = await supabase
          .from('levels').select('id').eq('academy_id', acData.id).eq('name', record.level).single()
        levelId = lvlData?.id
      }

      const semesterId = await getActiveSemesterId()

      const payload = {
        student_id: record.studentId, academy_id: acData.id, level_id: levelId,
        semester_id: semesterId, date: record.date,
        score: record.score, comments: record.note, teacher_id: currentUser?.id || null,
      }

      if (record.id) {
        const { error } = await supabase.from('progress_reports').update(payload).eq('id', record.id)
        if (error) throw error
      } else {
        const { error } = await supabase.from('progress_reports').insert(payload)
        if (error) throw error
      }

      notifySuccess('Saved', 'Progress saved successfully')
      return true
    } catch (err: any) {
      notifyError('Save Failed', err.message)
      return false
    } finally {
      setLoading(false)
    }
  }

  const deleteProgress = async (ids: string[]) => {
    try {
      const { error } = await supabase.from('progress_reports').delete().in('id', ids)
      if (error) throw error
      notifySuccess('Deleted', `${ids.length} records removed`)
      return true
    } catch (err: any) {
      notifyError('Delete Failed', err.message)
      return false
    }
  }

  return {
    fetchProgress, searchStudents, saveProgress, deleteProgress,
    fetchFeedback, saveFeedbackBatch, fetchAllCertifications,
    calcAttendancePcts, getActiveSemesterId,
    loading, error
  }
}
