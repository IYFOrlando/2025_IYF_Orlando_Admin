import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(process.cwd(), "scripts", ".env") });
const supabase = createClient(
  process.env.VITE_SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_KEY || "",
);

async function checkNames() {
  const targetEmail = "cifredo@yahoo.com";

  const { data: students } = await supabase
    .from("students")
    .select("id, first_name, last_name, created_at")
    .eq("email", targetEmail);

  console.table(students);
}

checkNames();
