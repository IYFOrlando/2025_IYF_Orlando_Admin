import { useState, useEffect } from "react";
import { collection, onSnapshot, query } from "firebase/firestore";
import { db } from "../../../lib/firebase";
import { useAuth } from "../../../context/AuthContext"; // Assuming this exists, or use direct auth
import type { TeacherProfile, TeacherAcademy, TeacherData } from "../types";

export const useTeacherProfile = (overrideEmail?: string | null) => {
  const { currentUser } = useAuth();
  const [profile, setProfile] = useState<TeacherProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isTeacher, setIsTeacher] = useState(false);

  useEffect(() => {
    // If no current user AND no override, reset
    if (!currentUser?.email && !overrideEmail) {
      setProfile(null);
      setIsTeacher(false);
      setLoading(false);
      return;
    }

    const email = (overrideEmail || currentUser?.email || "")
      .toLowerCase()
      .trim();
    if (!email) return;
    const q = query(collection(db, "academies_2026_spring"));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const taughtAcademies: TeacherAcademy[] = [];
        let foundTeacherName = "";
        let foundTeacherData: TeacherData | undefined;

        snapshot.docs.forEach((doc) => {
          const data = doc.data();
          const academyName = data.name || doc.id;

          // 1. Check Main Teacher (whole academy)
          if (
            data.teacher?.email &&
            data.teacher.email.toLowerCase().trim() === email
          ) {
            taughtAcademies.push({
              academyId: doc.id,
              academyName: academyName,
              level: null, // Entire academy
              teacherData: data.teacher,
            });
            if (!foundTeacherName) foundTeacherName = data.teacher.name;
            foundTeacherData = data.teacher;
          }

          // 2. Check Level Teachers
          if (data.levels && Array.isArray(data.levels)) {
            data.levels.forEach(
              (lvl: { name: string; teacher?: TeacherData }) => {
                if (
                  lvl.teacher?.email &&
                  lvl.teacher.email.toLowerCase().trim() === email
                ) {
                  taughtAcademies.push({
                    academyId: doc.id,
                    academyName: academyName,
                    level: lvl.name,
                    teacherData: lvl.teacher,
                  });
                  if (!foundTeacherName) foundTeacherName = lvl.teacher.name;
                  if (!foundTeacherData) foundTeacherData = lvl.teacher;
                }
              },
            );
          }
        });

        if (taughtAcademies.length > 0) {
          setIsTeacher(true);
          setProfile({
            id: email,
            email: email,
            name:
              foundTeacherName ||
              userDisplayName({
                displayName: currentUser?.displayName,
                email: currentUser?.email,
              }),
            phone: foundTeacherData?.phone,
            credentials: foundTeacherData?.credentials,
            academies: taughtAcademies,
          });
        } else {
          setIsTeacher(false);
          setProfile(null);
        }
        setLoading(false);
      },
      (err) => {
        console.error("Error fetching teacher profile:", err);
        setLoading(false);
      },
    );

    return () => unsubscribe();
  }, [currentUser, overrideEmail]);

  return { isTeacher, profile, loading };
};

// Helper safely getting display name
function userDisplayName(user: {
  displayName?: string | null;
  email?: string | null;
}) {
  return user.displayName || user.email?.split("@")[0] || "Teacher";
}
