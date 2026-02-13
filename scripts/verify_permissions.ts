import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env") });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
const adminClient = createClient(supabaseUrl, supabaseServiceKey || "", {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function verifyPermissions() {
  console.log("Verifying Strict Access Control...");

  // 1. Create a Viewe User
  const email = `audit_viewer_${Date.now()}@test.com`;
  const password = "Password123!";

  const { data: user, error: createError } =
    await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: "Audit Viewer" },
    });

  if (createError) {
    console.error("Failed to create audit user:", createError);
    return;
  }

  const userId = user.user.id;
  console.log(`Created Audit User (Viewer): ${email} (${userId})`);

  // 2. Sign in as this user to get a token (Client context)
  const { data: session, error: loginError } =
    await adminClient.auth.signInWithPassword({
      email,
      password,
    });

  if (loginError) {
    console.error("Failed to login as audit user:", loginError);
    // Cleanup
    await adminClient.auth.admin.deleteUser(userId);
    return;
  }

  // Create client as THIS user
  const viewerClient = createClient(
    supabaseUrl,
    process.env.VITE_SUPABASE_KEY || "",
    {
      // Anon key + Token
      global: {
        headers: { Authorization: `Bearer ${session.session?.access_token}` },
      },
    },
  );

  try {
    // TEST 1: Academies (Public Catalog) - Should Succeed
    const { data: academies, error: acError } = await viewerClient
      .from("academies")
      .select("*")
      .limit(5);
    if (acError)
      console.error(
        "❌ Viewer could NOT read academies (Unexpected if public):",
        acError.message,
      );
    else
      console.log(
        `✅ Viewer read ${academies.length} academies (Public Catalog).`,
      );

    // TEST 2: Students (Sensitive) - Should FAIL (return empty or error)
    const { data: students, error: stError } = await viewerClient
      .from("students")
      .select("*")
      .limit(5);
    if (stError)
      console.log(
        "✅ Viewer blocked from reading students (Error):",
        stError.message,
      );
    else if (students.length === 0)
      console.log("✅ Viewer returned 0 students (RLS Filtering).");
    else
      console.error(
        `❌ SECURITY ALERT: Viewer read ${students.length} students! RULES ARE LEAKING.`,
      );

    // TEST 3: Invoices (Sensitive) - Should FAIL
    const { data: invoices, error: invError } = await viewerClient
      .from("invoices")
      .select("*")
      .limit(5);
    if (invError)
      console.log(
        "✅ Viewer blocked from reading invoices (Error):",
        invError.message,
      );
    else if (invoices.length === 0)
      console.log("✅ Viewer returned 0 invoices (RLS Filtering).");
    else
      console.error(
        `❌ SECURITY ALERT: Viewer read ${invoices.length} invoices! RULES ARE LEAKING.`,
      );
  } catch (err) {
    console.error("Unexpected error during verification:", err);
  } finally {
    // Cleanup
    await adminClient.auth.admin.deleteUser(userId);
    console.log("Audit User deleted.");
  }
}

verifyPermissions();
