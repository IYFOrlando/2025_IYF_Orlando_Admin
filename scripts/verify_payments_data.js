import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env vars
dotenv.config({ path: path.resolve(__dirname, "../.env") });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("❌ Missing SUPABASE env vars");
  console.log("URL:", supabaseUrl ? "Set" : "Missing");
  console.log("Key:", supabaseKey ? "Set" : "Missing");
  process.exit(1);
}

console.log("Connecting to:", supabaseUrl);
const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false },
});

async function verifyData() {
  console.log("🔍 Verifying Payments Data in Supabase...");

  // 0. Simple ping
  console.log("Checking connection...");
  const { data: ping, error: pingError } = await supabase
    .from("semesters")
    .select("count", { count: "exact", head: true });
  if (pingError) {
    console.error("❌ Ping failed:", pingError.message);
    return;
  }
  console.log("✅ Connection successful");

  // 1. Check Semester
  const { data: semester, error: semError } = await supabase
    .from("semesters")
    .select("*")
    .eq("name", "Spring 2026")
    .single();

  if (semError) {
    console.error("❌ Semester Error:", semError.message);
    return;
  }
  console.log(`✅ Semester Found: ${semester.name} (${semester.id})`);

  // 2. Count Invoices
  const { count: invoiceCount, error: invError } = await supabase
    .from("invoices")
    .select("*", { count: "exact", head: true })
    .eq("semester_id", semester.id);

  if (invError) console.error("❌ Invoice Error:", invError.message);
  else console.log(`📊 Total Invoices for Semester: ${invoiceCount}`);

  // 3. Count Payments
  // Need to join invoices to filter by semester
  const { data: payments, error: payError } = await supabase
    .from("payments")
    .select("*, invoice:invoices!inner(semester_id)")
    .eq("invoice.semester_id", semester.id);

  if (payError) console.error("❌ Payment Error:", payError.message);
  else {
    console.log(`💰 Total Payments for Semester: ${payments.length}`);
    const totalAmount = payments.reduce((sum, p) => sum + p.amount, 0);
    console.log(`💵 Total Revenue: $${(totalAmount / 100).toFixed(2)}`);
  }
}

verifyData();
