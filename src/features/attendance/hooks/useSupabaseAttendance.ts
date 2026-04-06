import { useState, useCallback } from "react";
import { supabase } from "../../../lib/supabase";
import { notifyError, notifySuccess } from "../../../lib/alerts";

export type AttendanceRow = {
  id: string; // student_id (for the grid)
  studentName: string;
  status: "present" | "late" | "absent";
  reason: string;
  percent?: number;
  recordId?: string; // Link to specific attendance_record ID
};

export function useSupabaseAttendance() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch attendance for a specific class session
  const fetchAttendance = useCallback(
    async (date: string, academyId: string, levelId: string | null) => {
      try {
        setLoading(true);
        setError(null);

        // 1. Get Session ID
        let query = supabase
          .from("attendance_sessions")
          .select("id")
          .eq("academy_id", academyId)
          .eq("date", date);

        if (levelId) query = query.eq("level_id", levelId);
        else query = query.is("level_id", null);

        const { data: session, error: sessError } = await query.maybeSingle();

        if (sessError) throw sessError;

        if (!session) {
          return []; // No session yet, return empty (UI will fill from Roster)
        }

        // 2. Get Records linked to Session
        const { data: records, error: recError } = await supabase
          .from("attendance_records")
          .select(
            `
          id,
          status,
          reason,
          student_id,
          students (first_name, last_name)
        `,
          )
          .eq("session_id", session.id);

        if (recError) throw recError;

        // Transform to easy format
        return records.map((r: any) => ({
          id: r.student_id, // Grid uses Student ID as key
          studentName:
            `${r.students?.first_name || ""} ${r.students?.last_name || ""}`.trim(),
          status:
            r.status === "late" || r.status === "absent" ? r.status : "present",
          reason: r.reason || "",
          recordId: r.id,
        }));
      } catch (err: any) {
        console.error("Fetch attendance error:", err);
        setError(err.message);
        return [];
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  // NEW: Fetch Daily Summary for all classes (for Dashboard)
  // Returns: { totalPresent: number, totalClassesRecorded: number }
  const fetchDailyOverallAttendance = useCallback(
    async (date: string, academyIds: string[]) => {
      try {
        if (!academyIds || academyIds.length === 0)
          return { totalPresent: 0, totalClassesRecorded: 0 };

        // 1. Find all sessions for these academies on this date
        const { data: sessions, error: sessError } = await supabase
          .from("attendance_sessions")
          .select("id")
          .in("academy_id", academyIds)
          .eq("date", date);

        if (sessError) throw sessError;
        if (!sessions || sessions.length === 0)
          return { totalPresent: 0, totalClassesRecorded: 0 };

        const sessionIds = sessions.map((s) => s.id);

        // 2. Count 'present' records in these sessions
        const { count, error: recError } = await supabase
          .from("attendance_records")
          .select("*", { count: "exact", head: true }) // head: true for count only logic, but we need to filter by status
          .in("session_id", sessionIds)
          .eq("status", "present");

        // Note: head:true with eq filter works for count

        if (recError) throw recError;

        return {
          totalPresent: count || 0,
          totalClassesRecorded: sessions.length,
        };
      } catch (err) {
        console.error("fetchDailyOverallAttendance error", err);
        return { totalPresent: 0, totalClassesRecorded: 0 };
      }
    },
    [],
  );

  // Save (Upsert Session + Upsert Records)
  const saveAttendance = async (
    date: string,
    academyId: string,
    levelId: string | null,
    teacherId: string | null,
    teacherNote: string | null,
    rows: AttendanceRow[],
  ) => {
    try {
      setLoading(true);

      // 1. Upsert Session
      // We need to find if it exists to get ID, or insert.
      // Upsert on (academy_id, level_id, date) needs unique constraint.
      const sessionData = {
        academy_id: academyId,
        level_id: levelId || null,
        date: date,
        teacher_id: teacherId,
        notes: teacherNote,
      };

      // We rely on the UNIQUE constraint on (academy_id, level_id, date) in schema
      const { data: session, error: sessError } = await supabase
        .from("attendance_sessions")
        .upsert(sessionData, { onConflict: "academy_id, level_id, date" }) // Requires unique constraint!
        .select()
        .single();

      if (sessError) throw sessError;

      // 2. Upsert Records
      const recordsToUpsert = rows.map((r) => ({
        session_id: session.id,
        student_id: r.id,
        status: r.status,
        reason: r.status === "present" ? null : r.reason || null,
      }));

      // Batch upsert
      const { error: recError } = await supabase
        .from("attendance_records")
        .upsert(recordsToUpsert, { onConflict: "session_id, student_id" });

      if (recError) throw recError;

      notifySuccess("Saved", "Attendance updated successfully");
      return true;
    } catch (err: any) {
      console.error("Save attendance error:", err);
      notifyError("Save Failed", err.message);
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Delete specific records (or clear attendance for a student)
  const deleteAttendanceRecords = async (recordIds: string[]) => {
    try {
      const { error } = await supabase
        .from("attendance_records")
        .delete()
        .in("id", recordIds);
      if (error) throw error;
      notifySuccess("Deleted", `${recordIds.length} records removed`);
      return true;
    } catch (err: any) {
      notifyError("Delete Failed", err.message);
      return false;
    }
  };

  return {
    fetchAttendance,
    fetchDailyOverallAttendance,
    saveAttendance,
    deleteAttendanceRecords,
    loading,
    error,
  };
}
