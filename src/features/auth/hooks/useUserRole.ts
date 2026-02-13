import { useState, useEffect } from "react";
import { useAuth } from "../../../context/AuthContext";
import { supabase } from "../../../lib/supabase";
import { useTeacherProfile } from "./useTeacherProfile";
import type { UserRole } from "../types";

export const useUserRole = () => {
  const { session, loading: authLoading } = useAuth();
  const [role, setRole] = useState<UserRole>("unauthorized");
  const [loading, setLoading] = useState(true);
  
  // Impersonation State (kept from original for admin features)
  const [impersonatedEmail, setImpersonatedEmail] = useState<string | null>(
    () => localStorage.getItem("iyf_impersonated_email")
  );

  const {
    isTeacher,
    profile,
    loading: loadingTeacher,
  } = useTeacherProfile(impersonatedEmail);

  useEffect(() => {
    if (authLoading) return;

    if (!session?.user) {
      setRole("unauthorized");
      setLoading(false);
      return;
    }

    const fetchRole = async () => {
      // 1. Check if user is in 'profiles' table (our new source of truth for roles)
      const { data, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', session.user.id)
        .single();
      
      if (error || !data) {
        console.error("Error fetching user role:", error);
        setRole("unauthorized");
      } else {
        // Map DB role to App role
        // DB roles: 'superuser', 'admin', 'teacher', 'viewer'
        // App roles: 'admin', 'teacher', 'viewer', 'unauthorized'
        // We map 'superuser' -> 'admin' for now
        const dbRole = data.role;
        if (dbRole === 'superuser') setRole('admin');
        else if (dbRole === 'admin') setRole('admin');
        else if (dbRole === 'teacher') setRole('teacher');
        else if (dbRole === 'viewer') setRole('viewer');
        else setRole('unauthorized');
      }
      setLoading(false);
    };

    fetchRole();
  }, [session, authLoading]);

  // Actions
  const impersonate = (email: string) => {
    if (role !== 'admin') return; 
    localStorage.setItem("iyf_impersonated_email", email);
    setImpersonatedEmail(email);
  };

  const stopImpersonation = () => {
    localStorage.removeItem("iyf_impersonated_email");
    setImpersonatedEmail(null);
  };

  // Determine final effective role (handling impersonation)
  let effectiveRole = role;
  if (impersonatedEmail) {
      if (isTeacher) effectiveRole = 'teacher';
      // else... stay as admin or whatever, logic is a bit loose here but keeps existing behavior
  }

  return {
    role: effectiveRole,
    teacherProfile: profile,
    loading: loading || loadingTeacher,
    isAdmin: role === 'admin',
    isTeacher: effectiveRole === 'teacher',
    impersonatedEmail,
    impersonate,
    stopImpersonation,
  };
};
