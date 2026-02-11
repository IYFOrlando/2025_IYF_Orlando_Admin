import type { Registration } from "../features/registrations/types";

/**
 * Deduplicate registrations based on email or name.
 * Keeps the most recent registration (assumes input is sorted or we simply keep first encounter).
 *
 * Logic extracted from AcademiesPage to ensure consistency across Dashboard and Reports.
 */
export const deduplicateRegistrations = (
  regs: Registration[],
): Registration[] => {
  const seen = new Set<string>();
  return regs.filter((reg) => {
    // Create a unique key for the student (normalize to lower case to be safe)
    // Use email as primary identifier, or name combination if email is missing
    const key = reg.email
      ? reg.email.toLowerCase().trim()
      : `${reg.firstName?.toLowerCase().trim() || ""}_${reg.lastName?.toLowerCase().trim() || ""}`;

    // If we've seen this student before, skip
    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
};
