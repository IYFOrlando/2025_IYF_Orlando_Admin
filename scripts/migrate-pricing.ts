import { createClient } from "@supabase/supabase-js";
import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import dotenv from "dotenv";
import path from "path";

// Fix for ES modules path resolution
dotenv.config({ path: path.resolve(process.cwd(), ".env") });

const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT || "{}");

if (!getApps().length) {
  initializeApp({
    credential: cert(serviceAccount),
  });
}

const db = getFirestore();
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing Supabase credentials");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function migratePricing() {
  console.log("--- Migrating Pricing ---");

  // 1. Read from Firebase
  const pricingRef = db.doc("settings/pricing");
  const snap = await pricingRef.get();

  if (!snap.exists) {
    console.log("No pricing data found in Firebase settings/pricing");
    return;
  }

  const data = snap.data();
  console.log("Found pricing data:", data);

  // 2. Write to Supabase app_settings
  const { error } = await supabase.from("app_settings").upsert({
    key: "pricing",
    value: data,
    updated_at: new Date().toISOString(),
  });

  if (error) {
    console.error("Error writing to Supabase:", error);
  } else {
    console.log("Successfully migrated pricing to Supabase app_settings");
  }
}

migratePricing().catch(console.error);
