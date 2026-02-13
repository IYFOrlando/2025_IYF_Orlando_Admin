import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(__dirname, "../.env") });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing Supabase credentials in .env");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkAcademies() {
  const { data, error } = await supabase
    .from("academies")
    .select("id, name, is_active")
    .ilike("name", "%Korean%");

  if (error) {
    console.error("Error:", error);
    return;
  }

  console.log("Found Academies:", data);

  const { data: all } = await supabase.from("academies").select("name");
  console.log(
    "All Academy Names:",
    all?.map((a) => a.name),
  );
}

checkAcademies();
