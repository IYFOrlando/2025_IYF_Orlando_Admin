import { useState, useEffect } from "react";
import { useAuth } from "../../../context/AuthContext";
import { supabase } from "../../../lib/supabase";
import type { TeacherProfile, TeacherAcademy } from "../types";

export const useTeacherProfile = (overrideEmail?: string | null) => {
  const { session } = useAuth();
  const [profile, setProfile] = useState<TeacherProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isTeacher, setIsTeacher] = useState(false);

  useEffect(() => {
    const targetEmail = (overrideEmail || session?.user?.email || "").trim().toLowerCase();

    if (!targetEmail) {
      setProfile(null);
      setIsTeacher(false);
      setLoading(false);
      return;
    }

    const fetchTeacherData = async () => {
      setLoading(true);
      
      try {
        // 1. Fetch Academies where user is the main teacher
        const { data: academiesData, error: acError } = await supabase
            .from('academies')
            .select('*')
            .ilike('teacher_email', targetEmail);

        if (acError) throw acError;

        // 2. Fetch Levels where user is the level teacher
        const { data: levelsData, error: lvlError } = await supabase
            .from('levels')
            .select(`
                *,
                academies (
                    id,
                    name
                )
            `)
            .ilike('teacher_email', targetEmail);

        if (lvlError) throw lvlError;

        const taughtAcademies: TeacherAcademy[] = [];

        // Process Academies
        if (academiesData) {
            academiesData.forEach(ac => {
                taughtAcademies.push({
                    academyId: ac.id,
                    academyName: ac.name,
                    level: null, // Entire academy
                    teacherData: {
                        name: '', // We don't have name easily here unless we query profiles, relying on User context
                        email: targetEmail,
                    }
                });
            });
        }

        // Process Levels
        if (levelsData) {
            levelsData.forEach((lvl: any) => {
                // Determine Academy Name (joined)
                const acName = lvl.academies?.name || 'Unknown Academy';
                
                taughtAcademies.push({
                    academyId: lvl.academy_id,
                    academyName: acName,
                    level: lvl.name,
                    teacherData: {
                         name: '', 
                         email: targetEmail
                    }
                });
            });
        }

        if (taughtAcademies.length > 0) {
            setIsTeacher(true);
            setProfile({
                id: targetEmail,
                email: targetEmail,
                name: session?.user.user_metadata?.full_name || targetEmail.split('@')[0],
                academies: taughtAcademies
            });
        } else {
            setIsTeacher(false);
            setProfile(null);
        }

      } catch (err) {
        console.error("Error fetching teacher profile:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchTeacherData();
  }, [session, overrideEmail]);

  return { isTeacher, profile, loading };
};
