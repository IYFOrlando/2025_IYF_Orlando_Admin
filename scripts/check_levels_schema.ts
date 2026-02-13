import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env") });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey || "");

async function checkLevelsSchema() {
  const { data, error } = await supabase.from("levels").select("*").limit(1);
  if (error) {
    console.error("Error selecting from levels:", error);
  } else {
    console.log("Levels data sample:", data);
  }
}

checkLevelsSchema();
