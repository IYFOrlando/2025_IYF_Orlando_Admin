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

async function checkTeacherTables() {
  console.log("🔍 Checking Teacher Tables...");

  const { error: tError } = await supabase
    .from("teachers")
    .select("*")
    .limit(1);
  console.log(
    'Table "teachers" exists?',
    !tError ? "YES" : "NO",
    tError ? tError.message : "",
  );

  const { data: pData, error: pError } = await supabase
    .from("profiles")
    .select("*")
    .limit(1);
  console.log(
    'Table "profiles" exists?',
    !pError ? "YES" : "NO",
    pError ? pError.message : "",
  );
  if (pData && pData.length > 0) {
    console.log("Profiles Columns:", Object.keys(pData[0]));
  }
}

checkTeacherTables();
