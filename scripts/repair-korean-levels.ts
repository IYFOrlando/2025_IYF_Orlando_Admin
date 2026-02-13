import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import path from "path";

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), ".env") });

const firebaseConfig = {
  apiKey: "AIzaSyBVBE2Cb5UFePdUOlTWVPPwGZCzH9lUtRQ",
  authDomain: "iyf-orlando-academy.firebaseapp.com",
  projectId: "iyf-orlando-academy",
  storageBucket: "iyf-orlando-academy.appspot.com",
  messagingSenderId: "321117265409",
  appId: "1:321117265409:web:27dc40234503505a3eaa00",
};

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing Supabase credentials");
  process.exit(1);
}

const firebaseApp = initializeApp(firebaseConfig);
const db = getFirestore(firebaseApp);
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function repairKoreanLevels() {
  console.log("🔧 Starting Korean Level Repair...");

  // 1. Get IDs
  const { data: academy } = await supabase
    .from("academies")
    .select("id")
    .eq("name", "Korean Language")
    .single();
  if (!academy) throw new Error("Korean Language academy not found");
  const academyId = academy.id;

  const { data: level } = await supabase
    .from("levels")
    .select("id")
    .eq("academy_id", academyId)
    .eq("name", "Conversation")
    .single();
  if (!level) throw new Error("Conversation level not found");
  const levelId = level.id;

  console.log(
    `✅ IDs Found: Academy=${academyId}, Level=${levelId} (Conversation)`,
  );

  // 2. Fetch Firebase Registrations
  const snapshot = await getDocs(
    collection(db, "2026-iyf_orlando_academy_spring_semester"),
  );
  const registrations = snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));

  let repairedCount = 0;

  for (const reg of registrations) {
    const academies = (reg as any).selectedAcademies || [];

    // Check if student enrolled in "Korean Conversation" (Legacy)
    const hasConversation = academies.some(
      (a: any) =>
        a.academy === "Korean Conversation" ||
        a.academy.includes("Conversation") ||
        (a.academy === "Korean Language" &&
          a.level &&
          a.level.includes("Conversation")),
    );

    if (hasConversation) {
      // Find existing enrollment in Supabase for Korean Language
      const { data: enrollment, error } = await supabase
        .from("enrollments")
        .select("id, level_id")
        .eq("student_id", reg.id)
        .eq("academy_id", academyId)
        .maybeSingle();

      if (enrollment) {
        if (enrollment.level_id !== levelId) {
          console.log(
            `🛠 repairing ${(reg as any).firstName} ${(reg as any).lastName}...`,
          );

          const { error: updateError } = await supabase
            .from("enrollments")
            .update({ level_id: levelId })
            .eq("id", enrollment.id);

          if (updateError) {
            console.error(`  ❌ Failed to update: ${updateError.message}`);
          } else {
            console.log(`  ✅ Updated to Conversation level.`);
            repairedCount++;
          }
        } else {
          // Already correct
          // console.log(`  (Already correct: ${(reg as any).firstName})`);
        }
      } else {
        console.warn(
          `  ⚠️ Enrollment not found for ${(reg as any).firstName} (Firebase ID: ${reg.id})`,
        );
      }
    }
  }

  console.log(`\n🎉 Repair Complete. Updated ${repairedCount} students.`);
}

repairKoreanLevels();
