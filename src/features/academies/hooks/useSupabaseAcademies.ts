import { useState, useEffect, useCallback } from "react";
import { supabase } from "../../../lib/supabase";
import { normalizeAcademy } from "../../../lib/normalization";
import type { Academy, AcademyInput } from "./useAcademies";

export function useSupabaseAcademies() {
  const [academies, setAcademies] = useState<Academy[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAcademies = useCallback(async () => {
    try {
      setLoading(true);

      // 1. Get active semester (Spring 2026)
      const { data: semester } = await supabase
        .from("semesters")
        .select("id")
        .eq("name", "Spring 2026")
        .single();

      if (!semester) throw new Error("Active semester not found");

      // 2. Fetch Academies
      const { data: academiesData, error: acError } = await supabase
        .from("academies")
        .select(
          `
          *,
          levels (*)
        `,
        )
        .eq("semester_id", semester.id)
        .order("display_order", { ascending: true });

      if (acError) throw acError;

      // 3. Extract all unique teacher emails
      const teacherEmails = new Set<string>();
      academiesData.forEach((ac) => {
        if (ac.teacher_email)
          teacherEmails.add(ac.teacher_email.toLowerCase().trim());
        if (ac.levels) {
          ac.levels.forEach((l: any) => {
            if (l.teacher_email)
              teacherEmails.add(l.teacher_email.toLowerCase().trim());
          });
        }
      });

      // 4. Fetch Profiles for these emails
      let profilesMap: Record<
        string,
        { full_name: string; phone: string; credentials: string }
      > = {};

      if (teacherEmails.size > 0) {
        const { data: profiles, error: pError } = await supabase
          .from("profiles")
          .select("email, full_name, phone, credentials")
          .in("email", Array.from(teacherEmails));

        if (!pError && profiles) {
          profiles.forEach((p) => {
            if (p.email) {
              profilesMap[p.email.toLowerCase().trim()] = {
                full_name: p.full_name || "",
                phone: p.phone || "",
                credentials: p.credentials || "",
              };
            }
          });
        }
      }

      // 5. Transform to matching interface
      const formattedAcademies: Academy[] = academiesData.map((ac) => {
        const academyTeacherEmail = ac.teacher_email?.toLowerCase().trim();
        const academyTeacherProfile = academyTeacherEmail
          ? profilesMap[academyTeacherEmail]
          : undefined;

        return {
          id: ac.id,
          name: ac.name,
          price: Number(ac.price) * 100, // DB(Dollars) -> UI(Cents)
          schedule: ac.schedule_summary || "",
          hasLevels: ac.levels && ac.levels.length > 0,
          levels:
            ac.levels
              ?.sort((a: any, b: any) => a.display_order - b.display_order)
              .map((l: any) => {
                const levelTeacherEmail = l.teacher_email?.toLowerCase().trim();
                const levelTeacherProfile = levelTeacherEmail
                  ? profilesMap[levelTeacherEmail]
                  : undefined;

                return {
                  id: l.id,
                  name: l.name,
                  schedule: l.schedule || "",
                  order: l.display_order,
                  teacher: levelTeacherProfile
                    ? {
                        name: levelTeacherProfile.full_name,
                        email: l.teacher_email!,
                        phone: levelTeacherProfile.phone,
                        credentials: levelTeacherProfile.credentials,
                      }
                    : l.teacher_email
                      ? {
                          name: "",
                          email: l.teacher_email,
                          phone: "",
                          credentials: "",
                        }
                      : undefined,
                };
              }) || [],
          order: ac.display_order,
          enabled: ac.is_active,
          description: ac.description || "",
          // Map Teacher
          teacher: academyTeacherProfile
            ? {
                name: academyTeacherProfile.full_name,
                email: ac.teacher_email!,
                phone: academyTeacherProfile.phone,
                credentials: academyTeacherProfile.credentials,
              }
            : ac.teacher_email
              ? {
                  name: "",
                  email: ac.teacher_email,
                  phone: "",
                  credentials: "",
                }
              : undefined,

          // Legacy fields (optional or mapped)
          image: ac.image_url,
          // Default others
          active: ac.is_active,
          tag: "",
          catchPhrase: "",
          goal: [],
          age: "",
          equipment: "",
          requirements: [],
          gallery: [],
          desc1: "",
          desc2: "",
          desc3: "",
          linkName: "",
          instructor: "", // Legacy field
          instructorBio: "", // Legacy field
        };
      });

      // Filter out normalized duplicates (e.g. "Korean Conversation" should be hidden as it's merged into "Korean Language")
      const filteredAcademies = formattedAcademies.filter((ac) => {
        const norm = normalizeAcademy(ac.name);
        // If it normalizes to Korean Language, but isn't the main one, hide it.
        if (
          norm === "Korean Language" &&
          ac.name.trim() !== "Korean Language"
        ) {
          return false;
        }
        return true;
      });

      setAcademies(filteredAcademies);
    } catch (err: any) {
      console.error("Error fetching academies from Supabase:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAcademies();
  }, [fetchAcademies]);

  // TODO: Implement mutations if needed (add, update, delete)
  // For viewing data, this is sufficient.

  return {
    academies,
    loading,
    error,
    // refresh: fetchAcademies
  };
}
