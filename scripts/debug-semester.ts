import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import path from "path";

// Load env from scripts/.env
dotenv.config({ path: path.resolve(process.cwd(), "scripts", ".env") });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_KEY");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkSemesters() {
  console.log("Checking semesters...");

  const { data, error } = await supabase
    .from("semesters")
    .select("*")
    .eq("name", "Spring 2026");

  if (error) {
    console.error("Error fetching semesters:", error);
    return;
  }

  console.log(`Found ${data?.length} semesters with name 'Spring 2026':`);
  console.table(data);

  if (data && data.length > 1) {
    console.log("⚠️ DUPLICATES FOUND! Deleting all but one...");
    // Keep the one with the most recent created_at? Or just the first one?
    // Actually, if we have foreign keys, deleting might be hard.
    // Let's just see them first.

    // We will keep the FIRST one and delete others.
    const [keep, ...remove] = data;
    console.log(`Keeping ID: ${keep.id}`);

    for (const r of remove) {
      console.log(`Deleting ID: ${r.id}`);
      // We might need to migrate data if FKs exist. Use CASCADE?
      // Or just standard delete (might fail if FKs).
      const { error: delError } = await supabase
        .from("semesters")
        .delete()
        .eq("id", r.id);

      if (delError) {
        console.error(`Failed to delete ${r.id}:`, delError);
      } else {
        console.log(`Deleted ${r.id}`);
      }
    }
  }
}

checkSemesters();
