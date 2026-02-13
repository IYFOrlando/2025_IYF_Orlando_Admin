import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../../lib/supabase'

export interface AttendanceRecord {
  id: string
  studentId: string
  status: 'present' | 'absent' | 'late' | 'excused'
  notes?: string
  date: string // Derived from session
}

export function useSupabaseAttendance(academyId: string, levelId: string | null = null, date: string) {
  const [attendance, setAttendance] = useState<Record<string, AttendanceRecord>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchAttendance = useCallback(async () => {
    try {
      setLoading(true)
      
      // 1. Get Session ID
      let query = supabase
        .from('attendance_sessions')
        .select('id')
        .eq('academy_id', academyId)
        .eq('date', date)
      
      if (levelId) {
        query = query.eq('level_id', levelId)
      } else {
        query = query.is('level_id', null)
      }

      const { data: sessionData, error: sessionError } = await query.maybeSingle()
      
      if (sessionError) throw sessionError
      if (!sessionData) {
        setAttendance({})
        return
      }

      // 2. Get Records
      const { data: records, error: recordsError } = await supabase
        .from('attendance_records')
        .select('*')
        .eq('session_id', sessionData.id)

      if (recordsError) throw recordsError

      const map: Record<string, AttendanceRecord> = {}
      records?.forEach((r: any) => {
        map[r.student_id] = {
          id: r.id,
          studentId: r.student_id,
          status: r.status,
          notes: r.reason, // Schema says 'reason', UI often uses 'notes'
          date: date
        }
      })
      
      setAttendance(map)

    } catch (err: any) {
      console.error('Error fetching attendance:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [academyId, levelId, date])

  const saveAttendance = async (studentId: string, status: AttendanceRecord['status'], notes?: string) => {
    try {
      // Optimistic Update
      setAttendance((prev) => ({
        ...prev,
        [studentId]: {
          id: prev[studentId]?.id || 'temp',
          studentId,
          status,
          notes,
          date
        },
      }))

      // 1. Find or Create Session
      let sessionId: string | null = null;
      
      // Try to find session again
      let query = supabase
        .from('attendance_sessions')
        .select('id')
        .eq('academy_id', academyId)
        .eq('date', date)
      
      if (levelId) {
        query = query.eq('level_id', levelId)
      } else {
        query = query.is('level_id', null)
      }
      
      const { data: existingSession } = await query.maybeSingle()
      
      if (existingSession) {
        sessionId = existingSession.id
      } else {
        // Create Session
        const { data: newSession, error: createError } = await supabase
          .from('attendance_sessions')
          .insert({
            academy_id: academyId,
            level_id: levelId,
            date: date
          })
          .select('id')
          .single()
        
        if (createError) throw createError
        sessionId = newSession.id
      }

      // 2. Upsert Record
      // We need record ID if it exists? 
      // Upsert on (session_id, student_id) unique constraint should work if defined.
      // Schema says UNIQUE(session_id, student_id).
      
      const { error: upsertError } = await supabase
        .from('attendance_records')
        .upsert({
          session_id: sessionId,
          student_id: studentId,
          status,
          reason: notes
        }, { onConflict: 'session_id, student_id' })

      if (upsertError) throw upsertError

    } catch (err: any) {
      console.error('Error saving attendance:', err)
      setError('Failed to save attendance')
    }
  }

  useEffect(() => {
    if (academyId && date) {
      fetchAttendance()
    }
  }, [fetchAttendance, academyId, date])

  return { attendance, loading, error, saveAttendance, refresh: fetchAttendance }
}
