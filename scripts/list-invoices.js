/**
 * Script to list all invoices from Firebase
 * Run with: node scripts/list-invoices.js
 * Uses same collection as the app: 2026_spring_academy_invoices_2026
 */

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
import 'dotenv/config';

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const INV_COLLECTION = '2026_spring_academy_invoices_2026';

async function listInvoices() {
  console.log('\n📋 REPORTE DE FACTURAS\n');
  console.log('='.repeat(80));
  console.log('Collection:', INV_COLLECTION);
  console.log('='.repeat(80));

  const invoicesRef = collection(db, INV_COLLECTION);
  const snapshot = await getDocs(invoicesRef);
  
  let totalCollected = 0;
  let totalPending = 0;
  let unpaidCount = 0;
  
  const invoices = [];
  
  snapshot.forEach((doc) => {
    const data = doc.data();
    const invoice = {
      id: doc.id,
      studentName: data.studentName || 'N/A',
      total: data.total || 0,
      paid: data.paid || 0,
      balance: data.balance || 0,
      status: data.status || 'unknown',
      createdAt: data.createdAt?.toDate?.() || data.createdAt || null,
      lines: data.lines || []
    };
    
    invoices.push(invoice);
    totalCollected += invoice.paid;
    totalPending += invoice.balance;
    if (invoice.status !== 'paid') unpaidCount++;
  });
  
  // Sort by balance (highest first)
  invoices.sort((a, b) => b.balance - a.balance);
  
  console.log(`\nTotal de facturas: ${invoices.length}`);
  console.log(`Total cobrado: $${totalCollected.toFixed(2)}`);
  console.log(`Total pendiente: $${totalPending.toFixed(2)}`);
  console.log(`Facturas no pagadas: ${unpaidCount}\n`);
  console.log('='.repeat(80));
  console.log('\n');
  
  invoices.forEach((inv, idx) => {
    console.log(`\n${idx + 1}. ${inv.studentName}`);
    console.log(`   ID: ${inv.id}`);
    console.log(`   Total: $${inv.total.toFixed(2)} | Pagado: $${inv.paid.toFixed(2)} | Balance: $${inv.balance.toFixed(2)}`);
    console.log(`   Estado: ${inv.status.toUpperCase()}`);
    console.log(`   Fecha: ${inv.createdAt ? inv.createdAt.toLocaleDateString() : 'N/A'}`);
    if (inv.lines.length > 0) {
      console.log(`   Academias: ${inv.lines.map(l => l.academy).join(', ')}`);
    }
  });
  
  console.log('\n' + '='.repeat(80));
  console.log('\n✅ Reporte completado\n');
}

listInvoices()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Error:', error);
    process.exit(1);
  });
