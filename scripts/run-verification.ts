import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env") });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing Supabase credentials");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runVerification() {
  console.log("🔍 Running Data Verification...\n");

  // 1. Total Students
  const { count: studentCount, error: err1 } = await supabase
    .from("students")
    .select("*", { count: "exact", head: true });
  console.log(
    `1. Total Students: ${studentCount} (Error: ${err1?.message || "None"})`,
  );

  // 2. Total Enrollments (Spring 2026)
  const { data: semester } = await supabase
    .from("semesters")
    .select("id")
    .eq("name", "Spring 2026")
    .single();
  if (!semester) {
    console.error("Spring 2026 Semester not found");
    return;
  }

  const { count: enrollCount, error: err2 } = await supabase
    .from("enrollments")
    .select("*", { count: "exact", head: true })
    .eq("semester_id", semester.id);
  console.log(
    `2. Total Enrollments (Spring 2026): ${enrollCount} (Error: ${err2?.message || "None"})`,
  );

  // 3. Enrollments by Academy (and missing levels for Korean)
  console.log("\n3. Academy Counts:");
  const { data: academyCounts, error: err3 } = await supabase.rpc(
    "get_academy_counts",
    {
      semester_uuid: semester.id, // Assuming RPC exists? No, I should query directly.
    },
  );

  // Direct Query Aggregation is hard in pure Supabase JS client without Views/RPC.
  // I'll fetch raw enrollments and aggregate in JS.
  const { data: enrollments } = await supabase
    .from("enrollments")
    .select(
      `
        id,
        level_id,
        academy:academies(name),
        level:levels(name)
    `,
    )
    .eq("semester_id", semester.id);

  if (enrollments) {
    const counts: Record<string, number> = {};
    const koreanLevels: Record<string, number> = {};
    let koreanMissingLevel = 0;

    enrollments.forEach((e: any) => {
      const academyName = e.academy?.name || "Unknown";
      counts[academyName] = (counts[academyName] || 0) + 1;

      if (academyName === "Korean Language") {
        const levelName = e.level?.name;
        if (levelName) {
          koreanLevels[levelName] = (koreanLevels[levelName] || 0) + 1;
        } else {
          koreanMissingLevel++;
        }
      }
    });

    console.table(counts);

    console.log("\nKorean Level Breakdown:");
    console.table(koreanLevels);
    console.log(`Korean Missing Level: ${koreanMissingLevel}`);
  }

  // 4. Duplicate Students (by Name)
  console.log("\n4. Checking for potential duplicates (by Name)...");
  const { data: students } = await supabase
    .from("students")
    .select("first_name, last_name, email");
  if (students) {
    const nameMap = new Map<string, number>();
    students.forEach((s) => {
      const key = `${s.first_name?.toLowerCase()} ${s.last_name?.toLowerCase()}`;
      nameMap.set(key, (nameMap.get(key) || 0) + 1);
    });

    const duplicates = Array.from(nameMap.entries()).filter(([k, v]) => v > 1);
    if (duplicates.length > 0) {
      console.log("⚠️ Duplicates found:");
      console.table(duplicates);
    } else {
      console.log("✅ No name-based duplicates found.");
    }
  }
}

runVerification();
