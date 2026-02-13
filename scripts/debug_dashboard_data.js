import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, "../.env") });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing SUPABASE env vars");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkDashboardData() {
  console.log("🔍 Checking Dashboard Data Sources...");

  // 1. Check Semester
  const { data: semester, error: semError } = await supabase
    .from("semesters")
    .select("id, name")
    .eq("name", "Spring 2026")
    .single();

  if (semError) {
    console.error("❌ Error fetching semester:", semError);
    return;
  }
  console.log("✅ Semester found:", semester);

  // 2. Check Enrollments count
  const { count, error: countError } = await supabase
    .from("enrollments")
    .select("*", { count: "exact", head: true })
    .eq("semester_id", semester.id);

  if (countError) {
    console.error("❌ Error fetching enrollments count:", countError);
  } else {
    console.log(`✅ Total Enrollments for ${semester.name}: ${count}`);
  }

  // 3. fetch a few recent enrollments to see if they look like "new" data
  const { data: recent, error: recentError } = await supabase
    .from("enrollments")
    .select("created_at, student:students(first_name, last_name)")
    .eq("semester_id", semester.id)
    .order("created_at", { ascending: false })
    .limit(5);

  if (recentError) {
    console.error("❌ Error fetching recent enrollments:", recentError);
  } else {
    console.log("Latest 5 enrollments:");
    recent.forEach((r) => {
      console.log(
        ` - ${r.created_at}: ${r.student?.first_name} ${r.student?.last_name}`,
      );
    });
  }
}

checkDashboardData();
