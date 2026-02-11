import { useState } from "react";
import { useAuth } from "../../../context/AuthContext";
import { useTeacherProfile } from "./useTeacherProfile";
import { ADMIN_EMAILS } from "../../../lib/admin";
import type { UserRole } from "../types";

export const useUserRole = () => {
  const { currentUser } = useAuth();

  // Impersonation State
  const [impersonatedEmail, setImpersonatedEmail] = useState<string | null>(
    () => {
      // Lazy init from storage
      return localStorage.getItem("iyf_impersonated_email");
    },
  );

  // Pass override to profile hook
  const {
    isTeacher,
    profile,
    loading: loadingTeacher,
  } = useTeacherProfile(impersonatedEmail);

  const realEmail = currentUser?.email?.toLowerCase().trim() || "";
  const isAdmin = ADMIN_EMAILS.includes(realEmail);

  // Actions
  const impersonate = (email: string) => {
    if (!isAdmin) return; // Security check
    localStorage.setItem("iyf_impersonated_email", email);
    setImpersonatedEmail(email);
  };

  const stopImpersonation = () => {
    localStorage.removeItem("iyf_impersonated_email");
    setImpersonatedEmail(null);
  };

  if (!currentUser) {
    return {
      role: "unauthorized" as UserRole,
      teacherProfile: null,
      loading: false,
      isAdmin: false,
      isTeacher: false,
      impersonatedEmail: null,
      impersonate,
      stopImpersonation,
    };
  }

  // Determine Role
  let role: UserRole = "unauthorized";

  if (impersonatedEmail) {
    // Impersonation Mode: strict adherence to target profile
    if (isTeacher) role = "teacher";
    // If target is not a teacher, stay unauthorized
  } else {
    // Normal Mode
    if (isAdmin) role = "admin";
    else if (isTeacher) role = "teacher";
  }

  // Debug log for permissions
  if (import.meta.env.DEV) {
    console.debug(
      "[AuthCheck] Role:",
      role,
      "Impersonating:",
      impersonatedEmail,
    );
  }

  return {
    role,
    teacherProfile: profile,
    loading: loadingTeacher,
    isAdmin,
    isTeacher,
    impersonatedEmail,
    impersonate,
    stopImpersonation,
  };
};
