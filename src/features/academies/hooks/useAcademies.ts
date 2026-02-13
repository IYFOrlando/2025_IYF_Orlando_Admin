import { useState, useEffect, useCallback } from "react";
import { supabase } from "../../../lib/supabase";

export type AcademyLevel = {
  id?: string;
  name: string;
  schedule: string;
  order: number;
  // UI helper for teacher assignment (TeacherSelector uses this structure)
  teacher?: {
    id?: string;
    name: string;
    email: string;
    phone: string;
    credentials?: string;
  };
  // DB field
  teacher_email?: string;
};

export type Academy = {
  id: string;
  name: string;
  price: number;
  schedule: string;
  hasLevels: boolean;
  levels?: AcademyLevel[];
  order: number;
  enabled: boolean;
  description: string;
  // UI helper
  teacher?: {
    id?: string;
    name: string;
    email: string;
    phone: string;
    credentials?: string;
  };
  // DB field
  teacher_email?: string;

  // Additional fields
  active?: boolean;
  image?: string;
  tag?: string;
  catchPhrase?: string;
  goal?: string[];
  age?: string;
  equipment?: string;
  requirements?: string[];
  gallery?: string[];
  desc1?: string;
  desc2?: string;
  desc3?: string;
  linkName?: string;
  // Legacy
  instructor?: string;
  instructorBio?: string;
};

export type AcademyInput = Omit<Academy, "id">;

export function useAcademies() {
  const [academies, setAcademies] = useState<Academy[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAcademies = useCallback(async () => {
    try {
      setLoading(true);

      // 1. Get active semester
      const { data: semesters } = await supabase
        .from("semesters")
        .select("id")
        .eq("name", "Spring 2026")
        .limit(1);

      const semester = semesters?.[0];
      if (!semester) throw new Error("Active semester not found");

      // 2. Fetch Academies + Levels
      const { data, error: fetchError } = await supabase
        .from("academies")
        .select(
          `
            *,
            levels (*)
        `,
        )
        .eq("semester_id", semester.id)
        .order("display_order", { ascending: true });

      if (fetchError) throw fetchError;

      // 3. Collect all teacher emails to fetch profiles
      const emails = new Set<string>();
      data?.forEach((a) => {
        if (a.teacher_email) emails.add(a.teacher_email.toLowerCase().trim());
        a.levels?.forEach((l: any) => {
          if (l.teacher_email) emails.add(l.teacher_email.toLowerCase().trim());
        });
      });

      // 4. Fetch Profiles
      let profilesMap: Record<string, any> = {};
      if (emails.size > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, email, full_name, phone, credentials")
          .in("email", Array.from(emails));

        profiles?.forEach((p) => {
          if (p.email) profilesMap[p.email.toLowerCase().trim()] = p;
        });
      }

      // 5. Map to Academy Interface
      const mapped: Academy[] = (data || []).map((a) => {
        const tEmail = a.teacher_email?.toLowerCase().trim();
        const tProfile = tEmail ? profilesMap[tEmail] : undefined;

        return {
          id: a.id,
          name: a.name,
          price: Number(a.price),
          schedule: a.schedule_summary || "",
          hasLevels: a.levels && a.levels.length > 0, // Inferred
          order: a.display_order,
          enabled: a.is_active,
          description: a.description || "",
          teacher_email: a.teacher_email,
          teacher: tProfile
            ? {
                id: tProfile.id,
                name: tProfile.full_name,
                email: tProfile.email,
                phone: tProfile.phone,
                credentials: tProfile.credentials,
              }
            : a.teacher_email
              ? {
                  name: "",
                  email: a.teacher_email,
                  phone: "",
                }
              : undefined,

          // Levels
          levels: (a.levels || [])
            .sort((x: any, y: any) => x.display_order - y.display_order)
            .map((l: any) => {
              const ltEmail = l.teacher_email?.toLowerCase().trim();
              const ltProfile = ltEmail ? profilesMap[ltEmail] : undefined;
              return {
                id: l.id,
                name: l.name,
                schedule: l.schedule || "",
                order: l.display_order,
                teacher_email: l.teacher_email,
                teacher: ltProfile
                  ? {
                      name: ltProfile.full_name,
                      email: ltProfile.email,
                      phone: ltProfile.phone,
                      credentials: ltProfile.credentials,
                    }
                  : l.teacher_email
                    ? {
                        name: "",
                        email: l.teacher_email,
                        phone: "",
                      }
                    : undefined,
              };
            }),

          // Map other fields
          image: a.image_url,
          // Defaults for fields not in DB or mapped differently
          active: a.is_active,
          tag: "",
          catchPhrase: "", // Could add to DB if needed
          goal: [],
          age: "",
          equipment: "",
          requirements: [],
          gallery: [],
          desc1: "",
          desc2: "",
          desc3: "",
          linkName: "",
        };
      });

      setAcademies(mapped);
    } catch (err: any) {
      console.error("Error fetching academies:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAcademies();
  }, [fetchAcademies]);

  const addAcademy = useCallback(
    async (input: AcademyInput) => {
      try {
        // Get semester
        const { data: semesters } = await supabase
          .from("semesters")
          .select("id")
          .eq("name", "Spring 2026")
          .limit(1);

        const semester = semesters?.[0];
        if (!semester) throw new Error("Semester not found");

        // Insert Academy
        // Note: snake_case for DB columns
        const { data: newAc, error: insertError } = await supabase
          .from("academies")
          .insert({
            semester_id: semester.id,
            name: input.name,
            description: input.description,
            price: input.price,
            schedule_summary: input.schedule,
            image_url: input.image,
            is_active: input.enabled,
            display_order: input.order,
            teacher_email: input.teacher?.email
              ? input.teacher.email.toLowerCase().trim()
              : null,
          })
          .select()
          .single();

        if (insertError) throw insertError;
        if (!newAc) throw new Error("Failed to return new academy");

        // Insert Levels
        if (input.levels && input.levels.length > 0) {
          const levelsToInsert = input.levels.map((l) => ({
            academy_id: newAc.id,
            name: l.name,
            schedule: l.schedule,
            display_order: l.order,
            teacher_email: l.teacher?.email
              ? l.teacher.email.toLowerCase().trim()
              : null,
          }));

          const { error: levelsError } = await supabase
            .from("levels")
            .insert(levelsToInsert);
          if (levelsError) throw levelsError;
        }

        await fetchAcademies();
      } catch (err: any) {
        console.error("Error adding academy:", err);
        throw err;
      }
    },
    [fetchAcademies],
  );

  const updateAcademy = useCallback(
    async (id: string, input: Partial<AcademyInput>) => {
      try {
        // Update Academy Fields
        const updates: any = {};
        if (input.name !== undefined) updates.name = input.name;
        if (input.description !== undefined)
          updates.description = input.description;
        if (input.price !== undefined) updates.price = input.price;
        if (input.schedule !== undefined)
          updates.schedule_summary = input.schedule;
        if (input.image !== undefined) updates.image_url = input.image;
        if (input.enabled !== undefined) updates.is_active = input.enabled;
        if (input.order !== undefined) updates.display_order = input.order;
        if (input.teacher !== undefined)
          updates.teacher_email = input.teacher?.email
            ? input.teacher.email.toLowerCase().trim()
            : null;

        if (Object.keys(updates).length > 0) {
          // updates.updated_at = new Date().toISOString(); // Column missing in schema
          const { error } = await supabase
            .from("academies")
            .update(updates)
            .eq("id", id);
          if (error) throw error;
        }

        // Handle Levels Sync if provided
        if (input.levels) {
          // 1. Fetch current levels relative to this academy
          const { data: currentLevels } = await supabase
            .from("levels")
            .select("id")
            .eq("academy_id", id);
          const currentIds = new Set((currentLevels || []).map((l) => l.id));

          // 2. Identify updates/inserts
          for (const lvl of input.levels) {
            const lvlData = {
              name: lvl.name,
              schedule: lvl.schedule,
              display_order: lvl.order,
              teacher_email: lvl.teacher?.email
                ? lvl.teacher.email.toLowerCase().trim()
                : null,
            };

            if (lvl.id && currentIds.has(lvl.id)) {
              // Update
              await supabase.from("levels").update(lvlData).eq("id", lvl.id);
              currentIds.delete(lvl.id); // Mark as handled
            } else {
              // Insert
              await supabase.from("levels").insert({
                academy_id: id,
                ...lvlData,
              });
            }
          }

          // 3. Delete remaining (removed from UI)
          // This might fail if referenced by enrollments/attendance
          if (currentIds.size > 0) {
            const toDelete = Array.from(currentIds);
            const { error: delError } = await supabase
              .from("levels")
              .delete()
              .in("id", toDelete);
            if (delError) {
              console.error(
                "Failed to delete removed levels (likely in use):",
                delError,
              );
              // UI Warning? For now just log.
            }
          }
        }

        await fetchAcademies();
      } catch (err: any) {
        console.error("Error updating academy:", err);
        throw err;
      }
    },
    [fetchAcademies],
  );

  const deleteAcademy = useCallback(
    async (id: string) => {
      try {
        // Cascade delete on DB side handles levels
        // However, if enrollments exist, this might fail unless enrollments also cascade?
        // Schema says: enrollments -> academy_id ON DELETE CASCADE. So this should work and wipe enrollments too.
        const { error } = await supabase
          .from("academies")
          .delete()
          .eq("id", id);
        if (error) throw error;
        await fetchAcademies();
      } catch (err: any) {
        console.error("Error deleting academy:", err);
        throw err;
      }
    },
    [fetchAcademies],
  );

  return {
    academies,
    loading,
    error,
    addAcademy,
    updateAcademy,
    deleteAcademy,
  };
}
