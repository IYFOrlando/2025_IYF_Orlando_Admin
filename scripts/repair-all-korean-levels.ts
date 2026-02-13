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

async function repairAllKoreanLevels() {
  console.log("🔧 Starting Comprehensive Korean Level Repair...");

  // 1. Get IDs
  const { data: academy } = await supabase
    .from("academies")
    .select("id")
    .eq("name", "Korean Language")
    .single();
  if (!academy) throw new Error("Korean Language academy not found");
  const academyId = academy.id;

  // Fetch all levels for Korean
  const { data: levels } = await supabase
    .from("levels")
    .select("id, name")
    .eq("academy_id", academyId);
  if (!levels) throw new Error("No levels found for Korean Language");

  const alphabetId = levels.find((l) => l.name === "Alphabet")?.id;
  const beginnerId = levels.find((l) => l.name === "Beginner")?.id;
  const conversationId = levels.find((l) => l.name === "Conversation")?.id;

  console.log(
    `✅ IDs: Alphabet=${alphabetId}, Beginner=${beginnerId}, Conversation=${conversationId}`,
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

    // Find the Korean entry (fuzzy)
    const koreanEntry = academies.find((a: any) =>
      a.academy.includes("Korean"),
    );

    if (koreanEntry) {
      let targetLevelId = null;
      let sourceString =
        `${koreanEntry.academy} ${koreanEntry.level || ""}`.toLowerCase();

      if (sourceString.includes("alphabet")) targetLevelId = alphabetId;
      else if (sourceString.includes("beginner")) targetLevelId = beginnerId;
      else if (sourceString.includes("conversation"))
        targetLevelId = conversationId;

      if (targetLevelId) {
        // Find existing enrollment in Supabase
        const { data: enrollment } = await supabase
          .from("enrollments")
          .select("id, level_id")
          .eq("student_id", reg.id)
          .eq("academy_id", academyId)
          .maybeSingle();

        if (enrollment) {
          if (enrollment.level_id !== targetLevelId) {
            console.log(
              `🛠 Reparar ${(reg as any).firstName} ${(reg as any).lastName}: ${sourceString} -> ${targetLevelId}`,
            );

            const { error: updateError } = await supabase
              .from("enrollments")
              .update({ level_id: targetLevelId })
              .eq("id", enrollment.id);

            if (updateError) {
              console.error(`  ❌ Failed: ${updateError.message}`);
            } else {
              repairedCount++;
            }
          }
        } else {
          // console.warn(`  ⚠️ No enrollment for ${(reg as any).firstName}`);
        }
      } else {
        console.warn(
          `  ❓ Unrecognized level for ${(reg as any).firstName}: ${sourceString}`,
        );
      }
    }
  }

  console.log(`\n🎉 Repair Complete. Updated ${repairedCount} students.`);
}

repairAllKoreanLevels();
