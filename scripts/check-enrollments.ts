import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(process.cwd(), "scripts", ".env") });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
const targetSemesterId = "8d41455e-f392-4fde-aa81-26fefb89da6a"; // The one we kept

const supabase = createClient(supabaseUrl, supabaseServiceKey || "");

async function checkEnrollments() {
  const { count, error } = await supabase
    .from("enrollments")
    .select("*", { count: "exact", head: true })
    .eq("semester_id", targetSemesterId);

  if (error) {
    console.error("Error counting enrollments:", error);
    return;
  }

  console.log(`Enrollments for semester ${targetSemesterId}: ${count}`);
}

checkEnrollments();
