import { useSupabaseAcademies } from "../../academies/hooks/useSupabaseAcademies";
import { normalizeAcademy } from "../../../lib/normalization";
import { useCallback, useMemo } from "react";
import type { Instructor } from "./useInstructors";

export function useSupabaseInstructors() {
  const { academies, loading, error } = useSupabaseAcademies();

  const instructors = useMemo(() => {
    const list: Instructor[] = [];
    academies.forEach((ac) => {
      // Main Teacher
      if (ac.teacher && ac.teacher.email) {
        list.push({
          id: `${ac.name}_main`,
          name: ac.teacher.name,
          email: ac.teacher.email,
          phone: ac.teacher.phone,
          academy: ac.name,
          level: null,
          credentials: ac.teacher.credentials,
        });
      }

      // Level Teachers
      if (ac.levels) {
        ac.levels.forEach((l) => {
          if (l.teacher && l.teacher.email) {
            list.push({
              id: `${ac.name}_${l.name}`,
              name: l.teacher.name,
              email: l.teacher.email,
              phone: l.teacher.phone,
              academy: ac.name,
              level: l.name,
              credentials: l.teacher.credentials,
            });
          }
        });
      }
    });
    return list;
  }, [academies]);

  // Helper function to normalize academy names for matching
  const normalizeAcademyName = useCallback((academy: string): string => {
    if (!academy) return "";
    return normalizeAcademy(academy);
  }, []);

  // Helper function to get instructor by academy and level
  const getInstructorByAcademy = useCallback(
    (academy: string, level?: string | null): Instructor | undefined => {
      if (!academy) return undefined;

      const normalizedAcademy = normalizeAcademyName(academy);
      const normalizedLevel = level ? level.trim() : null;

      // For academies with levels (like Korean Language)
      if (normalizedLevel) {
        // Match by academy name and level exactly
        const instructor = instructors.find((inst) => {
          const normalizedInstAcademy = normalizeAcademyName(inst.academy);
          return (
            normalizedInstAcademy === normalizedAcademy &&
            inst.level === normalizedLevel
          );
        });
        if (instructor) return instructor;
      }

      // Strategy: Match by academy name (if no level specific match or no level requested)
      // Find instructor with no level or "_main" suffix
      let instructor = instructors.find((inst) => {
        const normalizedInstAcademy = normalizeAcademyName(inst.academy);
        const hasNoLevel =
          !inst.level || inst.level === null || inst.level === "";
        return normalizedInstAcademy === normalizedAcademy && hasNoLevel;
      });

      // Fallback: take first one for this academy
      if (!instructor) {
        instructor = instructors.find((inst) => {
          const normalizedInstAcademy = normalizeAcademyName(inst.academy);
          return normalizedInstAcademy === normalizedAcademy;
        });
      }

      return instructor;
    },
    [instructors, normalizeAcademyName],
  );

  const getInstructorsByAcademy = useCallback(
    (academy: string): Instructor[] => {
      return instructors.filter(
        (inst) =>
          normalizeAcademyName(inst.academy) === normalizeAcademyName(academy),
      );
    },
    [instructors, normalizeAcademyName],
  );

  return {
    instructors,
    loading,
    error,
    getInstructorByAcademy,
    getInstructorsByAcademy,
  };
}
