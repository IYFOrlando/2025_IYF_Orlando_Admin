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

async function renameLevels() {
  console.log("Finding Korean Language academy...");

  // 1. Find Academy
  const { data: academies, error: academyError } = await supabase
    .from("academies")
    .select("id")
    .eq("name", "Korean Language")
    .limit(1);

  if (academyError || !academies.length) {
    console.error("Academy not found or error:", academyError);
    return;
  }

  const academyId = academies[0].id;

  // 2. Update Names
  console.log("Updating level names...");

  const updates = [
    { old: "Korean Alphabet", new: "Alphabet" },
    { old: "Korean Beginner", new: "Beginner" },
  ];

  for (const update of updates) {
    const { error } = await supabase
      .from("levels")
      .update({ name: update.new })
      .eq("academy_id", academyId)
      .eq("name", update.old);

    if (error) {
      console.error(`Error updating ${update.old}:`, error);
    } else {
      console.log(`Updated ${update.old} -> ${update.new}`);
    }
  }
}

renameLevels();
