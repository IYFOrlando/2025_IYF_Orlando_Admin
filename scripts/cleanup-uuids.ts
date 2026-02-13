import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(process.cwd(), "scripts", ".env") });
const supabase = createClient(
  process.env.VITE_SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_KEY || "",
);

async function cleanupUUIDs() {
  console.log("Starting cleanup of UUID-based students...");

  // 1. Get UUID students
  const { data: students, error } = await supabase
    .from("students")
    .select("id");

  if (error) {
    console.error("Error fetching students", error);
    return;
  }

  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const toDelete =
    students?.filter((s) => uuidRegex.test(s.id)).map((s) => s.id) || [];

  console.log(`Found ${toDelete.length} UUID students to delete.`);

  if (toDelete.length === 0) return;

  // 2. Delete (Batch)
  // We assume CASCADE DELETE serves us for enrollments/payments/invoices.
  // If not, this might fail or leave orphans.
  // Let's try deleting students directly first.

  const { error: delError } = await supabase
    .from("students")
    .delete()
    .in("id", toDelete);

  if (delError) {
    console.error("Delete failed (likely FK constraints):", delError);
    console.log("Switching to manual child deletion...");

    // Manual cleanup of children
    // Tables: enrollments, invoices, payments, attendance_records, progress_reports
    const tables = [
      "attendance_records",
      "progress_reports",
      "enrollments",
      "invoices",
      "payments",
    ]; // Order matches dependency? Invoices/Payments likely depend on Student.

    for (const table of tables) {
      console.log(`Deleting from ${table}...`);
      const { error: childError } = await supabase
        .from(table)
        .delete()
        .in("student_id", toDelete);

      if (childError)
        console.error(`Failed to delete from ${table}:`, childError);
    }

    // Retry Student Delete
    console.log("Retrying student deletion...");
    const { error: retryError } = await supabase
      .from("students")
      .delete()
      .in("id", toDelete);

    if (retryError) {
      console.error("Retry failed:", retryError);
    } else {
      console.log("Success on retry!");
    }
  } else {
    console.log("Deletion successful (Cascade worked or no checks)!");
  }
}

cleanupUUIDs();
