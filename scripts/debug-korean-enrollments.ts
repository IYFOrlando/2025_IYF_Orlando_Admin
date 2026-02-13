import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import path from "path";

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), ".env") });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing Supabase credentials");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function debugEnrollments() {
  console.log("Searching for HieJu and Carolina...");

  const { data, error } = await supabase
    .from("enrollments")
    .select(
      `
            id,
            status,
            student:students!inner(first_name, last_name),
            academy:academies(name),
            level:levels(name)
        `,
    )
    .or("first_name.ilike.%HieJu%,first_name.ilike.%Carolina%", {
      foreignTable: "students",
    });

  if (error) {
    console.error("Error:", error);
    return;
  }

  console.log("Found Enrollments:", JSON.stringify(data, null, 2));
}

debugEnrollments();
