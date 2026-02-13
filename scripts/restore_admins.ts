import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env") });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey || "");

const adminsToRestore = [
  "orlando@iyfusa.org",
  "jodlouis.dev@gmail.com",
  "ing.jod@gmail.com", // Keep this one too as it's the current session
];

async function restoreAdmins() {
  console.log("--- Restoring Admins ---");

  for (const email of adminsToRestore) {
    console.log(`Promoting ${email} to superuser...`);
    const { error } = await supabase
      .from("profiles")
      .update({ role: "superuser", updated_at: new Date().toISOString() })
      .eq("email", email);

    if (error) {
      console.error(`Error promoting ${email}:`, error.message);
    } else {
      console.log(`Success: ${email} is now superuser.`);
    }
  }
}

restoreAdmins().catch(console.error);
