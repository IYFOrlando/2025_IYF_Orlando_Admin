import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(process.cwd(), "scripts", ".env") });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

const supabase = createClient(supabaseUrl || "", supabaseServiceKey || "");

async function analyzeStudents() {
  console.log("Analyzing students...");

  // Fetch all students
  const { data: students, error } = await supabase
    .from("students")
    .select("id, first_name, last_name, email, created_at")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching students:", error);
    return;
  }

  console.log(`Total Students: ${students.length}`);

  // Check for duplicates by email
  const emailMap = new Map<string, number>();
  const nameMap = new Map<string, number>();

  students.forEach((s) => {
    if (s.email) {
      const email = s.email.toLowerCase().trim();
      emailMap.set(email, (emailMap.get(email) || 0) + 1);
    }
    const fullName = `${s.first_name} ${s.last_name}`.toLowerCase().trim();
    nameMap.set(fullName, (nameMap.get(fullName) || 0) + 1);
  });

  const duplicateEmails = Array.from(emailMap.entries()).filter(
    ([_, count]) => count > 1,
  );
  const duplicateNames = Array.from(nameMap.entries()).filter(
    ([_, count]) => count > 1,
  );

  console.log(`Duplicate Emails found: ${duplicateEmails.length}`);
  duplicateEmails
    .slice(0, 10)
    .forEach(([email, count]) => console.log(`  - ${email}: ${count}`));

  console.log(`Duplicate Names found: ${duplicateNames.length}`);
  duplicateNames
    .slice(0, 10)
    .forEach(([name, count]) => console.log(`  - ${name}: ${count}`));

  // Check enrollments count
  const { count: enrollCount } = await supabase
    .from("enrollments")
    .select("*", { count: "exact", head: true });
  console.log(`Total Enrollments: ${enrollCount}`);
}

analyzeStudents();
