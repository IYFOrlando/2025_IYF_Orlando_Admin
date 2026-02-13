/**
 * Script to migrate data from Firebase to Supabase
 * Usage: node scripts/migrate-firebase-to-supabase.js
 */

import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore";

// Inline Config to avoid import issues
const SHARED_CONFIG = {
  firebase: {
    apiKey: "AIzaSyBVBE2Cb5UFePdUOlTWVPPwGZCzH9lUtRQ",
    authDomain: "iyf-orlando-academy.firebaseapp.com",
    projectId: "iyf-orlando-academy",
    storageBucket: "iyf-orlando-academy.appspot.com",
    messagingSenderId: "321117265409",
    appId: "1:321117265409:web:27dc40234503505a3eaa00",
    measurementId: "G-H4FJCX8JT0",
  },
  collections: {
    academies2026Spring: "academies_2026_spring",
    springAcademy2026: "2026-iyf_orlando_academy_spring_semester",
    academyAttendance: "academy_attendance",
    academyProgress: "academy_progress",
  },
};

const FIREBASE_CONFIG = SHARED_CONFIG.firebase;
const COLLECTIONS_CONFIG = SHARED_CONFIG.collections;

// Load environment variables for Supabase
dotenv.config();

console.log("Script loaded, starting configuration...");

// Initialize Firebase (Client SDK)
const app = initializeApp(FIREBASE_CONFIG);
// const db = getFirestore(app); // Initialized later or re-used if needed?
// The original script initialized db after app.
const db = getFirestore(app);

// Configuration
const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error("❌ Missing SUPABASE_URL or SUPABASE_SERVICE_KEY in .env");
  console.log("URL:", SUPABASE_URL);
  console.log("Key:", SUPABASE_SERVICE_KEY ? "Set" : "Missing");
  process.exit(1);
}

// Initialize Supabase (Admin Client)
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

// Collections to migrate
const COLS = {
  academies: COLLECTIONS_CONFIG.academies2026Spring,
  registrations: COLLECTIONS_CONFIG.springAcademy2026,
  attendance: COLLECTIONS_CONFIG.academyAttendance,
  progress: COLLECTIONS_CONFIG.academyProgress,
};

async function migrate() {
  console.log("🚀 Starting Migration: Firebase -> Supabase");

  // 1. Create Semester
  console.log("📅 Creating Spring 2026 Semester...");
  const { data: semester, error: semError } = await supabase
    .from("semesters")
    .insert({
      name: "Spring 2026",
      start_date: "2026-02-01",
      end_date: "2026-05-30",
      is_active: true,
    })
    .select()
    .single();

  let semesterId = semester?.id;

  if (semError) {
    if (semError.code === "23505") {
      // Unique violation
      console.log("   Semester already exists, fetching ID...");
      const { data: existing } = await supabase
        .from("semesters")
        .select()
        .eq("name", "Spring 2026")
        .single();
      semesterId = existing.id;
    } else {
      console.error("Error creating semester:", semError);
      process.exit(1);
    }
  }

  // 2. Migrate Academies
  console.log("🏫 Migrating Academies...");
  const academiesRef = collection(db, COLS.academies);
  const acSnapshot = await getDocs(academiesRef);

  const academyMap = new Map(); // Name -> UUID
  const levelMap = new Map(); // AcademyId_LevelName -> UUID

  for (const doc of acSnapshot.docs) {
    const data = doc.data();
    const normalizeName = (name) => (name ? name.trim() : "");
    const name = normalizeName(data.name);

    if (!data.enabled) continue; // Skip disabled

    console.log(`   Processing ${name}...`);

    // Insert Academy
    const { data: acData, error: acError } = await supabase
      .from("academies")
      .upsert(
        {
          semester_id: semesterId,
          name: name,
          description: data.description,
          price: data.price,
          schedule_summary: data.schedule,
          image_url: data.image,
          display_order: data.order,
          is_active: true,
        },
        { onConflict: "semester_id, name" },
      )
      .select()
      .single();

    if (acError) {
      console.error(`   ❌ Failed to insert ${name}`, acError);
      continue;
    }

    academyMap.set(name, acData.id);

    // Insert Levels if any
    if (data.hasLevels && data.levels && Array.isArray(data.levels)) {
      for (const lvl of data.levels) {
        const { data: lvlData } = await supabase
          .from("levels")
          .upsert(
            {
              academy_id: acData.id,
              name: lvl.name,
              schedule: lvl.schedule,
              display_order: lvl.order,
            },
            { onConflict: "academy_id, name" },
          )
          .select()
          .single();
        if (lvlData) {
          levelMap.set(`${acData.id}_${lvl.name}`, lvlData.id);
        }
      }
    }
  }

  // RE-FETCH Levels to be safe
  const { data: allLevels } = await supabase
    .from("levels")
    .select("id, name, academy_id");
  if (allLevels) {
    allLevels.forEach((l) => levelMap.set(`${l.academy_id}_${l.name}`, l.id));
  }

  // 3. Migrate Students & Enrollments
  console.log("🎓 Migrating Students & Enrollments...");
  const regRef = collection(db, COLS.registrations);
  const regSnapshot = await getDocs(regRef);

  let studentCount = 0;
  let enrollCount = 0;
  const registrationIdMap = new Map(); // Firestore Reg ID -> Supabase Student UUID

  for (const doc of regSnapshot.docs) {
    const r = doc.data();
    if (!r.firstName || !r.lastName) continue;

    // Deduplicate logic: Check if student exists by email
    let studentId = null;

    if (r.email) {
      const { data: existing } = await supabase
        .from("students")
        .select("id")
        .eq("email", r.email)
        .maybeSingle();
      studentId = existing?.id;
    }

    if (!studentId) {
      // Create Student
      const { data: newS, error: sError } = await supabase
        .from("students")
        .insert({
          first_name: r.firstName,
          last_name: r.lastName,
          email: r.email || null,
          phone: r.cellNumber,
          guardian_name: r.guardianName,
          guardian_phone: r.guardianPhone,
          birth_date: r.birthday || null,
          gender: r.gender,
          t_shirt_size: r.tShirtSize,
          address: {
            street: r.address,
            city: r.city,
            state: r.state,
            zip: r.zipCode,
          },
        })
        .select()
        .single();

      if (sError) {
        console.error(`Error creating student ${r.firstName}:`, sError);
        // check if phone number duplication or something else
        continue;
      }
      studentId = newS.id;
      studentCount++;
    }

    // Map Firestore ID to Student UUID
    registrationIdMap.set(doc.id, studentId);

    // Handle Enrollments
    const academiesToEnroll = new Set();
    const normalize = (n) => (n ? n.trim() : "");

    // Legacy
    if (r.firstPeriod?.academy)
      academiesToEnroll.add(normalize(r.firstPeriod.academy));
    if (r.secondPeriod?.academy)
      academiesToEnroll.add(normalize(r.secondPeriod.academy));

    // New
    if (r.selectedAcademies && Array.isArray(r.selectedAcademies)) {
      r.selectedAcademies.forEach((sa) => {
        if (sa.academy) academiesToEnroll.add(normalize(sa.academy));
      });
    }

    for (const acName of academiesToEnroll) {
      if (!acName || acName.toLowerCase() === "n/a") continue;

      let acId = academyMap.get(acName);
      if (!acId) continue;

      const { error: enrollError } = await supabase.from("enrollments").insert({
        student_id: studentId,
        academy_id: acId,
        semester_id: semesterId,
        status: "active",
      });

      if (!enrollError) enrollCount++;
    }
  }
  console.log(`   Students: ${studentCount}, Enrollments: ${enrollCount}`);

  // 4. Migrate Attendance
  console.log("📝 Migrating Attendance...");
  const attRef = collection(db, COLS.attendance);
  const attSnapshot = await getDocs(attRef);
  let attCount = 0;

  // Cache sessions to avoid excessive lookups/inserts
  // Key: `${academyId}_${date}_${levelId || 'none'}` -> Session UUID
  const sessionCache = new Map();

  for (const doc of attSnapshot.docs) {
    const a = doc.data();
    const studentId = registrationIdMap.get(a.registrationId);

    if (!studentId) {
      // console.warn(`   ⚠️ Orphan attendance record: ${a.studentName} (RegID: ${a.registrationId})`);
      continue;
    }

    const academyId = academyMap.get(a.academy ? a.academy.trim() : "");
    if (!academyId) continue;

    let levelId = null;
    if (a.level && a.academy === "Korean Language") {
      levelId = levelMap.get(`${academyId}_${a.level}`) || null;
    }

    const date = a.date;
    // Ensure session exists
    const sessionKey = `${academyId}_${date}_${levelId || "none"}`;
    let sessionId = sessionCache.get(sessionKey);

    if (!sessionId) {
      // Check/Create Session
      // Try to select first
      let query = supabase
        .from("attendance_sessions")
        .select("id")
        .eq("academy_id", academyId)
        .eq("date", date);
      if (levelId) query = query.eq("level_id", levelId);
      else query = query.is("level_id", null);

      const { data: existingSession } = await query.maybeSingle();

      if (existingSession) {
        sessionId = existingSession.id;
      } else {
        // Create
        const { data: newSession, error: sessError } = await supabase
          .from("attendance_sessions")
          .insert({
            academy_id: academyId,
            level_id: levelId,
            date: date,
            // teacher_id: lookup teacher? optional
            notes: a.teacherNote || null,
          })
          .select()
          .single();

        if (sessError) {
          console.error("   ❌ Session create error:", sessError);
          continue;
        }
        sessionId = newSession.id;
      }
      sessionCache.set(sessionKey, sessionId);
    }

    // Create Record
    const { error: recError } = await supabase
      .from("attendance_records")
      .insert({
        session_id: sessionId,
        student_id: studentId,
        status: a.present ? "present" : "absent",
        reason: a.reason || null,
      });

    if (!recError) attCount++;
  }
  console.log(`   Attendance Records: ${attCount}`);

  // 5. Migrate Progress
  console.log("📈 Migrating Progress...");
  const progRef = collection(db, COLS.progress);
  const progSnapshot = await getDocs(progRef);
  let progCount = 0;

  for (const doc of progSnapshot.docs) {
    const p = doc.data();
    const studentId = registrationIdMap.get(p.registrationId);
    if (!studentId) continue;

    const academyId = academyMap.get(p.academy ? p.academy.trim() : "");
    if (!academyId) continue;

    let levelId = null;
    if (p.level && p.academy === "Korean Language") {
      levelId = levelMap.get(`${academyId}_${p.level}`) || null;
    }

    const { error: progError } = await supabase
      .from("progress_reports")
      .insert({
        student_id: studentId,
        academy_id: academyId,
        level_id: levelId,
        date: p.date,
        score: typeof p.score === "number" ? p.score : null,
        comments: p.note || null,
        // teacher_id
      });

    if (!progError) progCount++;
  }
  console.log(`   Progress Reports: ${progCount}`);

  console.log("✅ Migration Finalized!");
}

migrate().catch(console.error);
