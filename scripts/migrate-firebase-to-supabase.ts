#!/usr/bin/env tsx
/**
 * Firebase to Supabase Migration Script
 * Migrates Spring 2026 registrations, invoices, and payments
 */

import "dotenv/config";
import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore";
import { createClient } from "@supabase/supabase-js";

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBVBE2Cb5UFePdUOlTWVPPwGZCzH9lUtRQ",
  authDomain: "iyf-orlando-academy.firebaseapp.com",
  projectId: "iyf-orlando-academy",
  storageBucket: "iyf-orlando-academy.appspot.com",
  messagingSenderId: "321117265409",
  appId: "1:321117265409:web:27dc40234503505a3eaa00",
};

// Supabase configuration (read from environment)
const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY!; // Need service role key for migrations

if (!supabaseUrl || !supabaseServiceKey) {
  console.error(
    "❌ Missing Supabase credentials. Set VITE_SUPABASE_URL and SUPABASE_SERVICE_KEY",
  );
  process.exit(1);
}

// Initialize clients
const firebaseApp = initializeApp(firebaseConfig);
const db = getFirestore(firebaseApp);
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Firebase collections
const FIREBASE_COLLECTIONS = {
  registrations: "2026-iyf_orlando_academy_spring_semester",
  invoices: "2026_spring_academy_invoices_2026",
  payments: "academy_payments_2026",
};

interface FirebaseRegistration {
  id?: string;
  firstName: string;
  lastName: string;
  email: string;
  cellNumber: string;
  birthday: string;
  gender: string;
  address: string;
  addressLine2?: string;
  city: string;
  state: string;
  zipCode: string;
  selectedAcademies: Array<{
    academy: string;
    level: string;
    schedule?: any;
  }>;
  createdAt: any; // Firestore Timestamp
  age?: string;
  confirmEmail?: string;
  termsAccepted?: boolean;
  isDuplicate?: boolean;
  recaptchaToken?: string;
  survey?: any;
}

interface FirebaseInvoice {
  id?: string;
  studentId: string;
  total: number;
  paid: number;
  balance: number;
  status: string;
  items: Array<{
    description: string;
    amount: number;
  }>;
  createdAt: any;
}

interface FirebasePayment {
  id?: string;
  studentId: string;
  invoiceId?: string;
  amount: number;
  method: string;
  notes?: string;
  createdAt: any;
  date?: string;
}

async function getSemesterId(): Promise<string> {
  // First, let's see what semesters exist
  const { data: allSemesters, error: allError } = await supabase
    .from("semesters")
    .select("*");

  console.log("🔍 Debug: All semesters in database:", allSemesters);

  if (allError) {
    console.error("Error fetching semesters:", allError);
  }

  const { data, error } = await supabase
    .from("semesters")
    .select("id")
    .eq("name", "Spring 2026")
    .limit(1)
    .single();

  if (error || !data) {
    console.error("Error details:", error);
    throw new Error("Spring 2026 semester not found in Supabase");
  }

  console.log(`✅ Found Spring 2026 semester: ${data.id}`);
  return data.id;
}

async function getAcademyId(academyName: string): Promise<string | null> {
  const { data } = await supabase
    .from("academies")
    .select("id")
    .eq("name", academyName)
    .single();

  return data?.id || null;
}

async function getLevelId(
  academyId: string,
  levelName: string,
): Promise<string | null> {
  if (!levelName || levelName === "N/A") return null;

  const { data } = await supabase
    .from("levels")
    .select("id")
    .eq("academy_id", academyId)
    .eq("name", levelName)
    .single();

  return data?.id || null;
}

async function migrateRegistrations(semesterId: string) {
  console.log("\n📚 Migrating Registrations...");

  const snapshot = await getDocs(
    collection(db, FIREBASE_COLLECTIONS.registrations),
  );
  const registrations = snapshot.docs.map(
    (doc) => ({ id: doc.id, ...doc.data() }) as FirebaseRegistration,
  );

  console.log(`  Found ${registrations.length} registrations in Firebase`);

  let successCount = 0;
  let errorCount = 0;

  for (const reg of registrations) {
    try {
      // 1. Create/Update Student
      const studentData = {
        id: reg.id, // Use Firebase ID as Supabase ID for consistency
        first_name: reg.firstName,
        last_name: reg.lastName,
        email: reg.email,
        phone: reg.cellNumber,
        birth_date: reg.birthday,
        gender: reg.gender,
        address: {
          street: reg.address,
          street2: reg.addressLine2 || "",
          city: reg.city,
          state: reg.state,
          zip: reg.zipCode,
        },
        guardian_name: null, // Not in Firebase data shown
        guardian_phone: null,
        t_shirt_size: null,
        notes: null,
      };

      const { error: studentError } = await supabase
        .from("students")
        .upsert(studentData, { onConflict: "id" });

      if (studentError) {
        console.error(
          `    ❌ Error creating student ${reg.firstName} ${reg.lastName}:`,
          studentError.message,
        );
        errorCount++;
        continue;
      }

      // 2. Create Enrollments for each academy
      for (const academy of reg.selectedAcademies || []) {
        let academyName = academy.academy;
        let levelName = academy.level;

        // Special handling for Korean Conversation legacy data
        if (academyName === "Korean Conversation") {
          academyName = "Korean Language";
          levelName = "Conversation";
        }

        const academyId = await getAcademyId(academyName);

        if (!academyId) {
          console.warn(
            `    ⚠️  Academy "${academyName}" not found in Supabase, skipping...`,
          );
          continue;
        }

        const levelId = await getLevelId(academyId, levelName);

        // Check for existing enrollment to avoid duplicates
        const { data: existingEnrollment } = await supabase
          .from("enrollments")
          .select("id")
          .eq("student_id", reg.id)
          .eq("academy_id", academyId)
          .eq("semester_id", semesterId)
          .maybeSingle();

        if (existingEnrollment) {
          console.log(
            `    Header: Student ${reg.firstName} already enrolled in ${academyName}, skipping insert.`,
          );
          continue;
        }

        const enrollmentData = {
          student_id: reg.id,
          semester_id: semesterId,
          academy_id: academyId,
          level_id: levelId,
          status: "active",
          created_at: reg.createdAt?.toDate
            ? reg.createdAt.toDate().toISOString()
            : new Date().toISOString(),
        };

        const { error: enrollError } = await supabase
          .from("enrollments")
          .insert(enrollmentData);

        if (enrollError) {
          console.error(
            `    ❌ Error creating enrollment for ${reg.firstName} ${reg.lastName} - ${academyName}:`,
            enrollError.message,
          );
        }
      }

      successCount++;
      console.log(
        `  ✅ Migrated ${reg.firstName} ${reg.lastName} (${reg.selectedAcademies?.length || 0} academies)`,
      );
    } catch (error: any) {
      console.error(
        `  ❌ Error migrating ${reg.firstName} ${reg.lastName}:`,
        error.message,
      );
      errorCount++;
    }
  }

  console.log(`\n📊 Registrations Migration Complete:`);
  console.log(`  ✅ Success: ${successCount}`);
  console.log(`  ❌ Errors: ${errorCount}`);
}

async function migrateInvoices(semesterId: string) {
  console.log("\n💰 Migrating Invoices...");

  const snapshot = await getDocs(collection(db, FIREBASE_COLLECTIONS.invoices));
  const invoices = snapshot.docs.map(
    (doc) => ({ id: doc.id, ...doc.data() }) as FirebaseInvoice,
  );

  console.log(`  Found ${invoices.length} invoices in Firebase`);

  let successCount = 0;
  let errorCount = 0;

  for (const inv of invoices) {
    try {
      // Insert invoice
      const invoiceData = {
        id: inv.id,
        student_id: inv.studentId,
        semester_id: semesterId,
        total: (inv.total || 0) / 100, // Firebase stores in cents, Supabase in dollars
        paid: (inv.paid || 0) / 100,
        balance: (inv.balance || 0) / 100,
        status: inv.status,
        created_at: inv.createdAt?.toDate
          ? inv.createdAt.toDate().toISOString()
          : new Date().toISOString(),
      };

      const { data: invoiceResult, error: invoiceError } = await supabase
        .from("invoices")
        .upsert(invoiceData, { onConflict: "id" })
        .select()
        .single();

      if (invoiceError) {
        console.error(
          `    ❌ Error creating invoice for student ${inv.studentId}:`,
          invoiceError.message,
        );
        errorCount++;
        continue;
      }

      // Insert invoice items
      if (inv.items && inv.items.length > 0) {
        for (const item of inv.items) {
          const itemData = {
            invoice_id: invoiceResult.id,
            description: item.description,
            amount: (item.amount || 0) / 100, // Convert cents to dollars
          };

          const { error: itemError } = await supabase
            .from("invoice_items")
            .insert(itemData);

          if (itemError) {
            console.error(
              `      ⚠️  Error creating invoice item:`,
              itemError.message,
            );
          }
        }
      }

      successCount++;
      console.log(`  ✅ Migrated invoice for student ${inv.studentId}`);
    } catch (error: any) {
      console.error(`  ❌ Error migrating invoice ${inv.id}:`, error.message);
      errorCount++;
    }
  }

  console.log(`\n📊 Invoices Migration Complete:`);
  console.log(`  ✅ Success: ${successCount}`);
  console.log(`  ❌ Errors: ${errorCount}`);
}

async function migratePayments() {
  console.log("\n💳 Migrating Payments...");

  const snapshot = await getDocs(collection(db, FIREBASE_COLLECTIONS.payments));
  const payments = snapshot.docs.map(
    (doc) => ({ id: doc.id, ...doc.data() }) as FirebasePayment,
  );

  console.log(`  Found ${payments.length} payments in Firebase`);

  let successCount = 0;
  let errorCount = 0;

  for (const pay of payments) {
    try {
      const paymentData = {
        id: pay.id,
        invoice_id: pay.invoiceId || null,
        student_id: pay.studentId,
        amount: (pay.amount || 0) / 100, // Convert cents to dollars
        method: pay.method,
        notes: pay.notes || null,
        created_at: pay.createdAt?.toDate
          ? pay.createdAt.toDate().toISOString()
          : new Date().toISOString(),
        transaction_date:
          pay.date ||
          pay.createdAt?.toDate().toISOString() ||
          new Date().toISOString(),
      };

      const { error: paymentError } = await supabase
        .from("payments")
        .upsert(paymentData, { onConflict: "id" });

      if (paymentError) {
        console.error(
          `    ❌ Error creating payment ${pay.id}:`,
          paymentError.message,
        );
        errorCount++;
        continue;
      }

      successCount++;
    } catch (error: any) {
      console.error(`  ❌ Error migrating payment ${pay.id}:`, error.message);
      errorCount++;
    }
  }

  console.log(`\n📊 Payments Migration Complete:`);
  console.log(`  ✅ Success: ${successCount}`);
  console.log(`  ❌ Errors: ${errorCount}`);
}

async function main() {
  console.log("🚀 Starting Firebase to Supabase Migration\n");
  console.log("=".repeat(50));

  try {
    // Get Spring 2026 semester ID
    const semesterId = await getSemesterId();
    console.log(`✅ Found Spring 2026 semester: ${semesterId}`);

    // Run migrations
    await migrateRegistrations(semesterId);
    await migrateInvoices(semesterId);
    await migratePayments();

    console.log("\n" + "=".repeat(50));
    console.log("✅ Migration Complete!\n");
  } catch (error: any) {
    console.error("\n❌ Migration Failed:", error.message);
    process.exit(1);
  }
}

main();
