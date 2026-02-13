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
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function debugTotals() {
  console.log("🔍 Debugging Financial Totals...");

  // 1. Get Semester
  const { data: semester } = await supabase
    .from("semesters")
    .select("id")
    .eq("name", "Spring 2026")
    .single();

  if (!semester) {
    console.error("❌ Semester not found");
    return;
  }

  // 2. Fetch All Invoices
  const { data: invoices, error } = await supabase
    .from("invoices")
    .select("id, student_id, total, paid_amount, balance, status")
    .eq("semester_id", semester.id);

  if (error) {
    console.error("❌ Error fetching invoices:", error);
    return;
  }

  console.log(`📊 Found ${invoices.length} invoices`);

  let dbTotalBilled = 0;
  let dbTotalPaid = 0;
  let dbTotalBalance = 0;
  let calculatedPaid = 0; // Sum of payments table

  invoices.forEach((inv) => {
    dbTotalBilled += inv.total || 0;
    dbTotalPaid += inv.paid_amount || 0;
    dbTotalBalance += inv.balance || 0;
  });

  console.log("\n--- INVOICE TABLE AGGREGATES ---");
  console.log(`Total Billed:   $${dbTotalBilled.toFixed(2)}`);
  console.log(`Total Paid:     $${dbTotalPaid.toFixed(2)}`);
  console.log(`Total Balance:  $${dbTotalBalance.toFixed(2)}`);

  // 3. Fetch All Payments
  const { data: payments } = await supabase
    .from("payments")
    .select("amount, invoice_id, method")
    .eq("invoice.semester_id", semester.id); // This might fail if we don't join properly in code or view

  // Better: Fetch payments where invoice_id is in our invoice list
  const invoiceIds = invoices.map((i) => i.id);
  const { data: validPayments } = await supabase
    .from("payments")
    .select("amount, invoice_id, method")
    .in("invoice_id", invoiceIds);

  const paymentSum = validPayments?.reduce((sum, p) => sum + p.amount, 0) || 0;

  console.log("\n--- PAYMENTS TABLE AGGREGATES ---");
  console.log(`Total Payments (Sum): ${paymentSum.toFixed(2)}`);

  if (validPayments.length > 0) {
    console.log("Sample Payment:", validPayments[0]);
  }

  // Check Migration Script Logic:
  // migrate-firebase-to-supabase.js: `price: data.price` -> `academies.price`
  // PaymentsPage.tsx: `usd` function divides by 100?
  // Let's check `usd` function definition or usage.
}

debugTotals();
