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

async function fixOrphan() {
  console.log('🔍 Searching for orphans in "Korean Conversation" academy...');

  // 1. Get Academy ID for "Korean Conversation"
  const { data: badAcademy } = await supabase
    .from("academies")
    .select("id")
    .eq("name", "Korean Conversation")
    .single();
  if (!badAcademy) {
    console.log('✅ "Korean Conversation" academy not found (Good).');
    return;
  }

  // 2. Get Enrollments
  const { data: enrollments } = await supabase
    .from("enrollments")
    .select(
      `
            id,
            student:students(first_name, last_name)
        `,
    )
    .eq("academy_id", badAcademy.id);

  if (!enrollments || enrollments.length === 0) {
    console.log('✅ No students in "Korean Conversation".');
    return;
  }

  console.log(`⚠️ Found ${enrollments.length} student(s):`);
  enrollments.forEach((e: any) =>
    console.log(` - ${e.student?.first_name} ${e.student?.last_name}`),
  );

  // 3. Move to "Korean Language" + "Conversation"
  console.log("🛠 Moving to Korean Language...");

  // Get Target IDs
  const { data: goodAcademy } = await supabase
    .from("academies")
    .select("id")
    .eq("name", "Korean Language")
    .single();
  if (!goodAcademy) throw new Error("Target academy not found");

  const { data: level } = await supabase
    .from("levels")
    .select("id")
    .eq("academy_id", goodAcademy.id)
    .eq("name", "Conversation")
    .single();
  if (!level) throw new Error("Target level not found");

  for (const e of enrollments) {
    // Check if already enrolled in good academy?
    // If so, delete bad enrollment. If not, update bad enrollment.

    // Update enrollment
    const { error } = await supabase
      .from("enrollments")
      .update({
        academy_id: goodAcademy.id,
        level_id: level.id,
      })
      .eq("id", e.id);

    if (error) console.error(`❌ Failed to update ${e.id}:`, error);
    else console.log(`✅ Moved enrollment ${e.id} to correct academy/level.`);
  }
}

fixOrphan();
