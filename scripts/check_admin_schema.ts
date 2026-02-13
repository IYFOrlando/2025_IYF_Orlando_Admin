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

async function checkSchema() {
  console.log("--- Checking Profiles ---");
  const { data: profiles, error: pError } = await supabase
    .from("profiles")
    .select("*")
    .limit(1);
  if (pError) console.error(pError);
  console.log("Profiles Sample:", profiles);

  console.log("--- Checking for Settings Table ---");
  // Try to select from a hypothetical 'settings' or 'app_settings' table
  const { data: settings, error: sError } = await supabase
    .from("settings")
    .select("*")
    .limit(1);
  if (sError)
    console.log(
      "Settings table likely empty or does not exist:",
      sError.message,
    );
  else console.log("Settings Data:", settings);

  const { data: config, error: cError } = await supabase
    .from("configurations")
    .select("*")
    .limit(1);
  if (cError)
    console.log(
      "Configurations table likely empty or does not exist:",
      cError.message,
    );
  else console.log("Configurations Data:", config);
}

checkSchema();
