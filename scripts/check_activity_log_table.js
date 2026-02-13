import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, "../.env") });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTable() {
  const { error } = await supabase
    .from("teacher_activity_log")
    .select("*")
    .limit(1);
  if (error) {
    console.log("Table check result:", error.message);
  } else {
    console.log("Table 'teacher_activity_log' exists.");
  }
}

checkTable();
