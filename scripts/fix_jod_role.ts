import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env") });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey || "");

async function promoteJod() {
  const email = "ing.jod@gmail.com";
  console.log(`Promoting ${email} to superuser...`);

  const { error } = await supabase
    .from("profiles")
    .update({ role: "superuser", updated_at: new Date().toISOString() })
    .eq("email", email);

  if (error) {
    console.error("Error promoting Jod:", error);
  } else {
    console.log("Success! Jod is now a superuser.");

    // Verify
    const { data } = await supabase
      .from("profiles")
      .select("role")
      .eq("email", email)
      .single();
    console.log("Verified Role:", data?.role);
  }
}

promoteJod();
