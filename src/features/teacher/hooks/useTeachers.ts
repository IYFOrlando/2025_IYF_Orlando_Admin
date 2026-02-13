import { useState, useEffect, useCallback } from "react";
import { supabase } from "../../../lib/supabase";

export interface Teacher {
  id: string;
  name: string;
  email: string;
  phone: string;
  credentials?: string;
  photoURL?: string;
  bio?: string;
  subjects?: string[];
}

export const useTeachers = () => {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTeachers = useCallback(async () => {
    try {
      const { data, error: fetchError } = await supabase
        .from("profiles")
        .select("*")
        .eq("role", "teacher")
        .order("full_name", { ascending: true });

      if (fetchError) throw fetchError;

      if (data) {
        const mapped: Teacher[] = data.map((p) => ({
          id: p.id,
          name: p.full_name || "",
          email: p.email,
          phone: p.phone || "",
          credentials: p.credentials || "",
          photoURL: p.photo_url || "",
          bio: "", // Profiles doesn't have bio yet, maybe add later
          subjects: [],
        }));
        setTeachers(mapped);
      }
    } catch (err) {
      console.error("Error fetching teachers:", err);
      setError("Failed to fetch teachers");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTeachers();

    // Set up realtime subscription for updates
    const channel = supabase
      .channel("public:profiles")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "profiles",
          filter: "role=eq.teacher",
        },
        () => {
          fetchTeachers();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchTeachers]);

  const deleteTeacher = async (email: string) => {
    // Soft delete by changing role to viewer
    // First get ID by email
    // Actually, we should probably pass ID to deleteTeacher, but the current UI might pass email.
    // Let's support email for backward compat or find the teacher in our list.
    const teacher = teachers.find((t) => t.email === email);
    if (!teacher) return;

    const { error } = await supabase
      .from("profiles")
      .update({ role: "viewer" })
      .eq("id", teacher.id);
    if (error) throw error;
    fetchTeachers();
  };

  return {
    teachers,
    loading,
    error,
    deleteTeacher,
    refreshTeachers: fetchTeachers,
  };
};
