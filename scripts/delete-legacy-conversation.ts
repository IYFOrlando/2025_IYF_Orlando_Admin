import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env") });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey)
  switch (process.env.NODE_ENV) {
    case "production":
      console.error("Missing Supabase credentials");
      process.exit(1);
      break;
    default:
      console.warn("Missing Supabase credentials");
  }

const supabase = createClient(supabaseUrl!, supabaseServiceKey!);

async function deleteLegacy() {
  console.log('🗑 Deleting legacy "Korean Conversation" enrollments...');

  // 1. Get Academy ID
  const { data: badAcademy } = await supabase
    .from("academies")
    .select("id")
    .eq("name", "Korean Conversation")
    .single();
  if (!badAcademy) {
    console.log("✅ Academy not found.");
    return;
  }

  // 2. Delete Enrollments
  const { count, error } = await supabase
    .from("enrollments")
    .delete({ count: "exact" })
    .eq("academy_id", badAcademy.id);

  if (error) console.error("Error:", error);
  else
    console.log(
      `✅ Deleted ${count} enrollment(s) from "Korean Conversation".`,
    );
}

deleteLegacy();
