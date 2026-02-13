import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import path from "path";

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), ".env") });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing Supabase credentials");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function addLevel() {
  console.log("Finding Korean Language academy...");

  // 1. Find Academy
  const { data: academies, error: academyError } = await supabase
    .from("academies")
    .select("id, name")
    .eq("name", "Korean Language")
    .limit(1);

  if (academyError || !academies.length) {
    console.error("Academy not found or error:", academyError);
    return;
  }

  const academyId = academies[0].id;
  console.log(`Found Academy: ${academies[0].name} (${academyId})`);

  // 2. Check Existing Levels
  const { data: levels, error: levelError } = await supabase
    .from("levels")
    .select("*")
    .eq("academy_id", academyId)
    .order("display_order");

  if (levelError) {
    console.error("Error fetching levels:", levelError);
    return;
  }

  console.log(
    "Current Levels:",
    levels.map((l) => l.name),
  );

  const hasConversation = levels.some((l) =>
    l.name.toLowerCase().includes("conversation"),
  );

  if (hasConversation) {
    console.log("Conversation level already exists.");
  } else {
    console.log("Adding Conversation level...");
    const maxOrder =
      levels.length > 0
        ? Math.max(...levels.map((l) => l.display_order || 0))
        : 0;

    const { error: insertError } = await supabase.from("levels").insert({
      academy_id: academyId,
      name: "Conversation",
      schedule: "11:40 AM - 12:40 PM", // Placeholder or copy from others?
      display_order: maxOrder + 1,
    });

    if (insertError) {
      console.error("Error inserting level:", insertError);
    } else {
      console.log("Successfully added Conversation level!");
    }
  }
}

addLevel();
