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

async function debugMenorah() {
  console.log("Searching for Menorah Lerhtoo...");
  const { data, error } = await supabase
    .from("enrollments")
    .select(
      `
            id,
            academy:academies(id, name),
            level:levels(id, name),
            student:students!inner(first_name, last_name)
        `,
    )
    .ilike("student.first_name", "%Menorah%")
    .ilike("student.last_name", "%Lerhtoo%");

  if (error) {
    console.error("Error:", error);
    return;
  }

  console.log(JSON.stringify(data, null, 2));
}

debugMenorah();
