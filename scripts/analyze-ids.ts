import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(process.cwd(), "scripts", ".env") });
const supabase = createClient(
  process.env.VITE_SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_KEY || "",
);

async function analyzeIds() {
  const { data: students, error } = await supabase
    .from("students")
    .select("id, created_at, first_name, last_name, email")
    .order("created_at", { ascending: true });

  if (error || !students) return;

  let uuidCount = 0;
  let firebaseCount = 0;
  let otherCount = 0;

  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  const uuids: any[] = [];
  const firebaseIds: any[] = [];

  students.forEach((s) => {
    if (uuidRegex.test(s.id)) {
      uuidCount++;
      uuids.push(s);
    } else if (s.id.length === 20 || s.id.length === 28) {
      // Firebase auth uids are 28, firestore docs 20
      firebaseCount++;
      firebaseIds.push(s);
    } else {
      otherCount++;
    }
  });

  console.log(`Total Students: ${students.length}`);
  console.log(`UUID Style (Likely Duplicate/Auto-gen): ${uuidCount}`);
  console.log(`Firebase Style (Likely Correct): ${firebaseCount}`);
  console.log(`Other: ${otherCount}`);

  if (uuids.length > 0) {
    console.log("\nSample UUID Students (To Delete?):");
    uuids
      .slice(0, 5)
      .forEach((s) =>
        console.log(
          `  - ${s.first_name} ${s.last_name} (${s.email}) - Created: ${s.created_at}`,
        ),
      );
  }
}

analyzeIds();
