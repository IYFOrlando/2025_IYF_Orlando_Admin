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

async function checkSchema() {
  console.log("🔍 Checking Schema...");

  // Get columns for academies
  // Since we can't query information_schema easily with js client (unless rpc),
  // we limit to selecting one row and looking at keys, OR use rpc if available.
  // Better: Select * limit 1 and print keys.

  const { data: aData, error: aError } = await supabase
    .from("academies")
    .select("*")
    .limit(1);
  if (aData && aData.length > 0) {
    console.log("Academies Columns:", Object.keys(aData[0]));
    console.log("Sample Academy:", JSON.stringify(aData[0], null, 2));
  } else {
    console.log("Academies: No data or error", aError);
  }

  const { data: lData, error: lError } = await supabase
    .from("levels")
    .select("*")
    .limit(1);
  if (lData && lData.length > 0) {
    console.log("Levels Columns:", Object.keys(lData[0]));
    console.log("Sample Level:", JSON.stringify(lData[0], null, 2));
  } else {
    console.log("Levels: No data or error", lError);
  }
}

checkSchema();
