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

async function checkAcademies() {
  console.log("🔍 Checking Academies Table Prices...");

  const { data: academies, error } = await supabase
    .from("academies")
    .select("name, price")
    .limit(5);

  if (error) {
    console.error("❌ Error:", error);
    return;
  }

  console.log("--- Sample Academies ---");
  academies.forEach((ac) => {
    console.log(`Academy: ${ac.name}, Price in DB: ${ac.price}`);
  });
}

checkAcademies();
