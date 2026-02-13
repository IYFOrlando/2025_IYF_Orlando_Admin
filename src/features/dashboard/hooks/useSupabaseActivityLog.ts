import { useState, useEffect } from "react";
import { supabase } from "../../../lib/supabase";
import { useTeacherContext } from "../../auth/context/TeacherContext";

export interface ActivityLogEntry {
  id: string;
  teacherName: string;
  teacherId: string;
  action: string;
  academy: string;
  details?: string;
  createdAt: string; // ISO string from Supabase
}

export function useSupabaseActivityLog(isAdmin: boolean) {
  const [logs, setLogs] = useState<ActivityLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isAdmin) {
      setLoading(false);
      return;
    }

    const fetchLogs = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from("teacher_activity_log")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(100); // Limit to last 100 for performance

        if (error) throw error;

        const formattedLogs = (data || []).map((row: any) => ({
          id: row.id,
          teacherName: row.teacher_name,
          teacherId: row.teacher_id,
          action: row.action,
          academy: row.academy,
          details: row.details,
          createdAt: row.created_at,
        }));

        setLogs(formattedLogs);
      } catch (err: any) {
        console.error("Error fetching activity logs:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchLogs();
  }, [isAdmin]);

  const logActivity = async (data: {
    teacherId: string;
    teacherName: string;
    action: string;
    academy: string;
    details?: string;
  }) => {
    try {
      if (!data.teacherId) return;

      const { error } = await supabase.from("teacher_activity_log").insert({
        teacher_id: data.teacherId,
        teacher_name: data.teacherName,
        action: data.action,
        academy: data.academy,
        details: data.details,
      });

      if (error) {
        console.error("Failed to log activity:", error);
      }
    } catch (err) {
      console.error("Error in logActivity:", err);
    }
  };

  return { logs, loading, error, logActivity };
}
