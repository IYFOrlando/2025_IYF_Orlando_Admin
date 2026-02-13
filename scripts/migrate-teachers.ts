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

async function migrateTeachers() {
  console.log("--- Migrating Teachers ---");

  // 1. Read from Firebase 'teachers' collection
  const teachersSnap = await db.collection("teachers").get();

  if (teachersSnap.empty) {
    console.log("No teachers found in Firebase");
    return;
  }

  let count = 0;

  for (const doc of teachersSnap.docs) {
    const data = doc.data();
    const email = data.email?.trim();

    if (!email) {
      console.log(`Skipping teacher doc ${doc.id} - no email`);
      continue;
    }

    console.log(`Processing teacher: ${data.name} (${email})`);

    // 2. Check if user exists in Auth
    let userId: string | undefined;

    // Check profiles first
    const { data: existingProfile } = await supabase
      .from("profiles")
      .select("id")
      .eq("email", email)
      .single();

    if (existingProfile) {
      userId = existingProfile.id;
    } else {
      // Check Auth
      const {
        data: { users },
        error: listError,
      } = await supabase.auth.admin.listUsers();
      const existingAuthUser = users?.find(
        (u) => u.email?.toLowerCase() === email.toLowerCase(),
      );

      if (existingAuthUser) {
        userId = existingAuthUser.id;
        console.log(`Found existing Auth User: ${userId}`);
      } else {
        console.log(`Creating new Auth User for ${email}...`);
        const { data: newUser, error: createError } =
          await supabase.auth.admin.createUser({
            email: email,
            email_confirm: true,
            user_metadata: { full_name: data.name },
          });

        if (createError) {
          console.error(`Failed to create user ${email}:`, createError.message);
          continue;
        }
        userId = newUser.user.id;
        console.log(`Created new user ${userId}`);
      }
    }

    if (userId) {
      console.log(`Upserting profile for ${email} (${userId})...`);
      // CORRECTED: Use 'full_name' instead of 'name'
      const { error } = await supabase.from("profiles").upsert({
        id: userId,
        email: email,
        full_name: data.name,
        phone: data.phone || data.phoneNumber || null,
        role: "teacher",
        updated_at: new Date().toISOString(),
      });

      if (error) console.error(`Error updating profile for ${email}:`, error);
      else count++;
    }
  }

  console.log(`Migrated/Updated ${count} teachers.`);
}

migrateTeachers().catch(console.error);
