import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env") });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey || "");

async function checkSchema() {
  console.log("Checking academies table columns...");
  const { data: academies, error: acError } = await supabase
    .from("academies")
    .select("*")
    .limit(1);

  if (acError) console.error("Error fetching academies:", acError);
  else if (academies.length > 0) {
    console.log("Academies Columns:", Object.keys(academies[0]));
  } else {
    console.log("Academies table is empty, cannot infer columns from data.");
    // Try to insert a dummy and fail to see columns? No.
  }

  console.log("\nChecking levels table columns...");
  const { data: levels, error: lvError } = await supabase
    .from("levels")
    .select("*")
    .limit(1);

  if (lvError) console.error("Error fetching levels:", lvError);
  else if (levels.length > 0) {
    console.log("Levels Columns:", Object.keys(levels[0]));
  } else {
    console.log("Levels table is empty.");
  }
}

checkSchema();
