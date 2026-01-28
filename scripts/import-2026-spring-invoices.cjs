/**
 * Import invoices from academy_invoices_2026 into 2026_spring_academy_invoices_2026.
 * Only copies invoices whose studentId exists in 2026-iyf_orlando_academy_spring_semester
 * (cohorte 2026 spring). Preserves document IDs so academy_payments_2026 keeps valid invoiceId.
 *
 * Usage:
 *   node scripts/import-2026-spring-invoices.cjs
 *   node scripts/import-2026-spring-invoices.cjs ./path/to/service-account.json
 *
 * Credentials: GOOGLE_APPLICATION_CREDENTIALS, gcloud auth application-default login, or pass JSON path.
 */

const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');

const SOURCE_INVOICES = 'academy_invoices_2026';
const TARGET_INVOICES = '2026_spring_academy_invoices_2026';
const REG_COLLECTION = '2026-iyf_orlando_academy_spring_semester';

function getCredential() {
  const keyPath = process.argv[2];
  if (keyPath) {
    const resolved = path.resolve(process.cwd(), keyPath);
    if (!fs.existsSync(resolved)) {
      console.error('❌ Archivo no encontrado:', resolved);
      process.exit(1);
    }
    const key = JSON.parse(fs.readFileSync(resolved, 'utf8'));
    return admin.credential.cert(key);
  }
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    return admin.credential.applicationDefault();
  }
  console.error('❌ Sin credenciales. Necesitas una de estas opciones:\n');
  console.log('  1) Pasar la ruta al JSON de la cuenta de servicio:');
  console.log('     node scripts/import-2026-spring-invoices.cjs ./ruta/al/service-account.json\n');
  console.log('  2) Definir GOOGLE_APPLICATION_CREDENTIALS:');
  console.log('     export GOOGLE_APPLICATION_CREDENTIALS=./ruta/al/service-account.json');
  console.log('     node scripts/import-2026-spring-invoices.cjs\n');
  console.log('  3) Usar gcloud:');
  console.log('     gcloud auth application-default login');
  console.log('     node scripts/import-2026-spring-invoices.cjs');
  process.exit(1);
}

async function run() {
  let app;
  try {
    const cred = getCredential();
    app =
      admin.apps.length > 0
        ? admin.app()
        : admin.initializeApp({
            credential: cred,
            projectId: 'iyf-orlando-academy',
          });
  } catch (err) {
    console.error('❌ Error initializing Firebase Admin:', err.message);
    console.log('\n💡 Usa: node scripts/import-2026-spring-invoices.cjs ./ruta/a/service-account.json');
    console.log('   o GOOGLE_APPLICATION_CREDENTIALS o gcloud auth application-default login');
    process.exit(1);
  }

  const db = admin.firestore();

  console.log('📂 Loading 2026 spring registration ids...');
  const regSnap = await db.collection(REG_COLLECTION).get();
  const studentIds = new Set(regSnap.docs.map((d) => d.id));
  console.log(`   ${studentIds.size} alumnos en ${REG_COLLECTION}\n`);

  console.log(`📂 Source invoices: ${SOURCE_INVOICES}`);
  console.log(`📂 Target invoices: ${TARGET_INVOICES}`);
  console.log('   Filter: solo facturas cuyo studentId está en la cohorte 2026 spring\n');

  const invSnap = await db.collection(SOURCE_INVOICES).get();
  const targetRef = db.collection(TARGET_INVOICES);

  let copied = 0;
  let skipped = 0;

  for (const docSnap of invSnap.docs) {
    const data = docSnap.data();
    const studentId = data.studentId || '';
    if (!studentIds.has(studentId)) {
      skipped++;
      continue;
    }
    await targetRef.doc(docSnap.id).set(data);
    copied++;
    const label = (data.studentName || docSnap.id.slice(0, 8)).toString();
    console.log(`   ✅ [${copied}] ${label} (${docSnap.id.slice(0, 8)}...)`);
  }

  console.log(`\n📋 Total en origen: ${invSnap.size}`);
  console.log(`   Omitidos (fuera de cohorte): ${skipped}`);
  console.log(`   Copiados: ${copied}`);
  console.log(`\n✅ Hecho. La app ya usa "${TARGET_INVOICES}" (config academyInvoices).`);
}

run().catch((err) => {
  console.error('❌', err);
  process.exit(1);
});
