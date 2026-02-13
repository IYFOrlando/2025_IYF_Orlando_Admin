
import { useState, useCallback } from 'react'
import { supabase } from '../../../lib/supabase'
import { notifyError, notifySuccess } from '../../../lib/alerts'

export type ProgressRow = {
  id: string // report_id
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

  // Fetch progress reports for specific academies
  const fetchProgress = useCallback(async (academyNames: string[] | null) => {
    try {
      setLoading(true)
      setError(null)
      
      let query = supabase
        .from('progress_reports')
        .select(`
          id,
          date,
          score,
          comments,
          student:students (
            id,
            first_name,
            last_name
          ),
          academy:academies (
            name
          ),
          level:levels (
            name
          )
        `)
        .order('date', { ascending: false })

      // Filter by academy names if provided (for Teachers)
      if (academyNames && academyNames.length > 0) {
        // We need to filter by academy name.
        // Supabase foreign key filter: academy!inner(name)
        // .in('academy.name', academyNames) // This syntax depends on postgrest version
        // safer to find IDs of academies first or use inner join filter
         query = supabase
        .from('progress_reports')
        .select(`
          id,
          date,
          score,
          comments,
          student:students (
            id,
            first_name,
            last_name
          ),
          academy:academies!inner (
            name
          ),
          level:levels (
            name
          )
        `)
        .in('academy.name', academyNames)
        .order('date', { ascending: false })
      } else if (academyNames && academyNames.length === 0) {
        // Teacher with no academies
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

  // Search Students
  const searchStudents = async (term: string): Promise<StudentSearchResult[]> => {
    if (!term || term.length < 2) return []
    try {
      // Simple ILIKE search on first or last name
      const { data, error } = await supabase
        .from('students')
        .select('id, first_name, last_name, email, address') // address is jsonb
        .or(`first_name.ilike.%${term}%,last_name.ilike.%${term}%`)
        .limit(20)

      if (error) throw error

      return data.map((s: any) => ({
        id: s.id,
        firstName: s.first_name,
        lastName: s.last_name,
        email: s.email,
        city: s.address?.city
      }))
    } catch (err: any) {
      console.error('Search error:', err)
      return []
    }
  }

  // Save (Create/Update)
  const saveProgress = async (record: Partial<ProgressRow> & { studentId: string, academy: string }) => {
    try {
      setLoading(true)
      
      // 1. Get Academy ID & Level ID
      // We need IDs to insert.
      const { data: acData, error: acError } = await supabase
        .from('academies')
        .select('id')
        .eq('name', record.academy)
        .single() // Semester context? We Assume "Spring 2026" is active or latest?
        // Ideally we should filter by semester_id too.
        // For now, let's assume names are unique per active semester or unique in general.
        // Actually schema says (semester_id, name) is unique.
        // We really need semester_id context.
        // TODO: Pass semesterId to hook or fetch active one.
      
        // Temporary: fetch latest semester's academy
      
      if (acError) throw new Error(`Academy '${record.academy}' not found`)

      let levelId = null
      if (record.level) {
         const { data: lvlData } = await supabase
            .from('levels')
            .select('id')
            .eq('academy_id', acData.id)
            .eq('name', record.level)
            .single()
         levelId = lvlData?.id
      }

      const payload = {
          student_id: record.studentId,
          academy_id: acData.id,
          level_id: levelId,
          date: record.date,
          score: record.score,
          comments: record.note
      }

      if (record.id) {
          // Update
          const { error } = await supabase
            .from('progress_reports')
            .update(payload)
            .eq('id', record.id)
          if (error) throw error
      } else {
          // Insert
          const { error } = await supabase
            .from('progress_reports')
            .insert(payload)
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
    fetchProgress,
    searchStudents,
    saveProgress,
    deleteProgress,
    loading,
    error
  }
}
