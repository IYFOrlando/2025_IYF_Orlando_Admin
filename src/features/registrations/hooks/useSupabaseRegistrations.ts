import { useState, useEffect, useCallback } from "react";
import { supabase } from "../../../lib/supabase";
import type { Registration } from "../types";

export function useSupabaseRegistrations() {
  const [data, setData] = useState<Registration[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRegistrations = useCallback(async () => {
    try {
      setLoading(true);

      // 1. Get Active Semester
      const { data: semesters, error: semError } = await supabase
        .from("semesters")
        .select("id, name")
        .eq("name", "Spring 2026")
        .limit(1);

      if (semError) {
        console.error("❌ Error fetching semester:", semError);
        throw new Error("Failed to fetch semester");
      }
      const semester = semesters?.[0];
      if (!semester) throw new Error("Semester not found");

      // 2. Fetch Enrollments
      const { data: enrollments, error: enrolledError } = await supabase
        .from("enrollments")
        .select(
          `
            status,
            created_at,
            student:students (
                id, first_name, last_name, email, phone, birth_date, 
                address, gender, guardian_name, guardian_phone, t_shirt_size, notes
            ),
            academy:academies (name),
            level:levels (name)
        `,
        )
        .eq("semester_id", semester.id);

      if (enrolledError) {
        console.error("❌ Error fetching enrollments:", enrolledError);
        throw enrolledError;
      }

      // 3. Group by Student to match "Registration" object structure
      // The current UI expects one Registration object per student, containing their selected academies
      const studentMap = new Map<string, any>();

      enrollments.forEach((enroll: any) => {
        const student = enroll.student;
        if (!student) return;

        if (!studentMap.has(student.id)) {
          studentMap.set(student.id, {
            id: student.id,
            firstName: student.first_name,
            lastName: student.last_name,
            email: student.email,
            cellNumber: student.phone,
            birthday: student.birth_date, // Format might differ? Date string vs Timestamp
            gender: student.gender,
            guardianName: student.guardian_name,
            guardianPhone: student.guardian_phone,
            shirtSize: student.t_shirt_size,
            address: student.address?.street || "",
            city: student.address?.city || "",
            state: student.address?.state || "",
            zipCode: student.address?.zip || "",
            notes: student.notes,
            createdAt: enroll.created_at, // Use the enrollment date roughly

            // NEW structure for 2026
            selectedAcademies: [],

            // Legacy support (optional, but helpful for existing UI code)
            firstPeriod: null,
            secondPeriod: null,
          });
        }

        const regEntry = studentMap.get(student.id);

        // Add to selectedAcademies
        regEntry.selectedAcademies.push({
          academy: enroll.academy?.name || "Unknown",
          level: enroll.level?.name || null,
          status: enroll.status,
        });
      });

      const registrations = Array.from(studentMap.values());

      // Sort by newest
      registrations.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );

      setData(registrations);
    } catch (err: any) {
      console.error("Error fetching registrations from Supabase:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRegistrations();
  }, [fetchRegistrations]);

  return { data, loading, error, refetch: fetchRegistrations };
}
