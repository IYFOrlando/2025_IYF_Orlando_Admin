import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env") });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey || "");

const allowedTeachers = [
  { name: "Aung w pyo", email: "apyo5757@gmail.com", phone: "3864536528" },
  {
    name: "Sefora Acevedo",
    email: "sefiekix94@gmail.com",
    phone: "7807187013",
  },
  {
    name: "Susan Sprott",
    email: "sprottsusane@gmail.com",
    phone: "8139635820",
  },
  { name: "Tevin Im", email: "imtevin@gmail.com", phone: "4078107341" },
  { name: "Hannah Lim", email: "hyang1070@gmail.com", phone: "4076256701" },
  { name: "Hannah Choi", email: "hchoi@iyfusa.org", phone: "4073121696" },
  {
    name: "Jennie Godfrey",
    email: "lucyandbetty1027@gmail.com",
    phone: "3524069814",
  },
  { name: "Jod Louis", email: "ing.jod@gmail.com", phone: "6562007031" }, // Keep existing phone if valid, or update
  { name: "Megan Munch", email: "tkdlove1991@yahoo.com", phone: "3216961322" },
];

async function cleanupTeachers() {
  console.log("--- Cleaning up Teachers ---");

  // 1. Fetch all teachers (anyone with role teacher, admin, superuser)
  const { data: profiles, error } = await supabase
    .from("profiles")
    .select("*")
    .in("role", ["teacher", "admin", "superuser"]);

  if (error) {
    console.error("Error fetching profiles:", error);
    return;
  }

  const allowedEmails = new Set(
    allowedTeachers.map((t) => t.email.toLowerCase().trim()),
  );

  for (const p of profiles) {
    const pEmail = p.email?.toLowerCase().trim();

    // Check if allowed
    if (allowedEmails.has(pEmail)) {
      // Update phone/name if needed
      const allowed = allowedTeachers.find(
        (t) => t.email.toLowerCase().trim() === pEmail,
      );
      console.log(`Keeping/Updating: ${p.full_name} (${p.email})`);

      if (allowed) {
        const { error: updateError } = await supabase
          .from("profiles")
          .update({
            phone: allowed.phone,
            // valid roles: superuser, admin, teacher, viewer
            // If they are superuser/admin, DO NOT DOWNGRADE to teacher.
            // If they are just teacher, keep as teacher.
            // We only update phone here to be safe.
            // But if Jod is 'teacher' locally, and allowed list implies 'teacher', it's fine.
            updated_at: new Date().toISOString(),
          })
          .eq("id", p.id);

        if (updateError)
          console.error(`Failed to update ${pEmail}:`, updateError);
      }
    } else {
      // NOT allowed. Downgrade to viewer.
      // Safety: Don't downgrade if it's some other critical admin?
      // But the list is "manten estos" (keep these).
      // If there is another admin not in the list, they will be downgraded.
      // Jod is in the list, so he is safe.
      console.log(`REMOVING (Downgrading): ${p.full_name} (${p.email})`);

      const { error: downgradeError } = await supabase
        .from("profiles")
        .update({ role: "viewer", updated_at: new Date().toISOString() })
        .eq("id", p.id);

      if (downgradeError)
        console.error(`Failed to downgrade ${pEmail}:`, downgradeError);
    }
  }
  console.log("Cleanup complete.");
}

cleanupTeachers().catch(console.error);
