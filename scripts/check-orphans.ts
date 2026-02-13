import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(process.cwd(), "scripts", ".env") });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(supabaseUrl || "", supabaseServiceKey || "");

async function checkOrphans() {
  console.log("Checking for orphaned students...");

  // 1. Get all students
  const { data: students, error: sError } = await supabase
    .from("students")
    .select("id, email, first_name, last_name, created_at");

  if (sError) {
    console.error("Error fetching students:", sError);
    return;
  }

  // 2. Get all enrollments
  const { data: enrollments, error: eError } = await supabase
    .from("enrollments")
    .select("student_id");

  if (eError) {
    console.error("Error fetching enrollments:", eError);
    return;
  }

  const enrolledStudentIds = new Set(enrollments?.map((e) => e.student_id));

  const orphans = students?.filter((s) => !enrolledStudentIds.has(s.id));
  const withEnrollments = students?.filter((s) => enrolledStudentIds.has(s.id));

  console.log(`Total Students: ${students?.length}`);
  console.log(`Students with Enrollments: ${withEnrollments?.length}`);
  console.log(`Orphaned Students (0 enrollments): ${orphans?.length}`);

  if (orphans && orphans.length > 0) {
    console.log("Sample Orphans:");
    orphans
      .slice(0, 5)
      .forEach((s) =>
        console.log(
          `  - ${s.first_name} ${s.last_name} (${s.email}) - ID: ${s.id}`,
        ),
      );

    // Check if these orphans are indeed duplicates of enrolled students
    console.log("\nChecking if orphans have enrolled counterparts...");
    const enrolledEmails = new Set(
      withEnrollments?.map((s) => s.email?.toLowerCase().trim()),
    );

    const redundancyCount = orphans.filter(
      (o) => o.email && enrolledEmails.has(o.email.toLowerCase().trim()),
    ).length;
    console.log(
      `Orphans that are duplicates of enrolled students: ${redundancyCount}`,
    );
  }
}

checkOrphans();
