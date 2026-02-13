import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(process.cwd(), "scripts", ".env") });
const supabase = createClient(
  process.env.VITE_SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_KEY || "",
);

async function inspectDuplicates() {
  const targetEmail = "cifredo@yahoo.com"; // One with 4 duplicates

  console.log(`Inspecting ${targetEmail}...`);

  // Get students
  const { data: students } = await supabase
    .from("students")
    .select("id, created_at")
    .eq("email", targetEmail);

  if (!students) return;

  for (const s of students) {
    console.log(`Student ID: ${s.id}, Created: ${s.created_at}`);
    const { data: enrolls } = await supabase
      .from("enrollments")
      .select("id, semester_id, academy_id, created_at")
      .eq("student_id", s.id);

    console.log(`  Enrollments: ${enrolls?.length}`);
    enrolls?.forEach((e) => {
      console.log(
        `    - Enrollment ID: ${e.id}, Academy: ${e.academy_id}, Semester: ${e.semester_id}`,
      );
    });
  }
}

inspectDuplicates();
