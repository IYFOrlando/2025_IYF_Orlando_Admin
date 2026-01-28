/**
 * Fix pricing conversion issue in settings/pricing
 * 
 * Problem: Some prices were saved in dollars instead of cents
 * Solution: Identify prices that are too low (< 100 cents = $1.00) and multiply by 100
 * 
 * Usage:
 *   node scripts/fix-pricing-conversion.cjs [--dry-run]
 *   node scripts/fix-pricing-conversion.cjs ./path/to/service-account.json [--dry-run]
 * 
 * Options:
 *   --dry-run: Only show what would be changed, don't actually update
 */

const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');

const PRICING_DOC_PATH = ['settings', 'pricing'];
const MIN_REASONABLE_PRICE_CENTS = 1000; // $10.00 - anything below this is suspicious
const MAX_REASONABLE_PRICE_CENTS = 50000; // $500.00 - anything above this is suspicious

function getCredential() {
  const args = process.argv.slice(2).filter(arg => !arg.startsWith('--'));
  const keyPath = args[0];
  
  if (keyPath && !keyPath.startsWith('--')) {
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
  console.log('     node scripts/fix-pricing-conversion.cjs ./ruta/al/service-account.json\n');
  console.log('  2) Definir GOOGLE_APPLICATION_CREDENTIALS:');
  console.log('     export GOOGLE_APPLICATION_CREDENTIALS=./ruta/al/service-account.json');
  console.log('     node scripts/fix-pricing-conversion.cjs\n');
  console.log('  3) Usar gcloud:');
  console.log('     gcloud auth application-default login');
  console.log('     node scripts/fix-pricing-conversion.cjs');
  process.exit(1);
}

function isDryRun() {
  return process.argv.includes('--dry-run');
}

async function run() {
  let app;
  try {
    const cred = getCredential();
    app = admin.apps.length > 0 
      ? admin.app() 
      : admin.initializeApp({
          credential: cred,
          projectId: 'iyf-orlando-academy'
        });
  } catch (error) {
    console.error('❌ Error inicializando Firebase Admin:', error.message);
    process.exit(1);
  }

  const db = admin.firestore();
  const isDry = isDryRun();
  
  if (isDry) {
    console.log('🔍 MODO DRY-RUN: Solo mostraré cambios, no se guardarán\n');
  }

  try {
    console.log('📋 Verificando precios en settings/pricing...\n');
    
    const pricingRef = db.doc(PRICING_DOC_PATH.join('/'));
    const pricingDoc = await pricingRef.get();
    
    if (!pricingDoc.exists) {
      console.log('⚠️  No existe el documento settings/pricing');
      process.exit(0);
    }

    const data = pricingDoc.data();
    const academyPrices = data.academyPrices || {};
    const lunch = data.lunch || { semester: 0, single: 0 };
    
    console.log(`📊 Encontrados ${Object.keys(academyPrices).length} precios de academias\n`);
    
    const fixes = {
      academyPrices: {},
      lunch: {}
    };
    let hasFixes = false;

    // Check academy prices
    console.log('🔍 Verificando precios de academias:');
    console.log('─'.repeat(80));
    
    for (const [academy, priceCents] of Object.entries(academyPrices)) {
      const price = Number(priceCents);
      const priceDollars = price / 100;
      
      if (isNaN(price) || price < 0) {
        console.log(`⚠️  ${academy}: Valor inválido (${priceCents})`);
        continue;
      }
      
      if (price > 0 && price < MIN_REASONABLE_PRICE_CENTS) {
        // Likely stored in dollars, needs conversion
        const fixedPrice = Math.round(price * 100);
        console.log(`🔧 ${academy}:`);
        console.log(`   Actual: $${priceDollars.toFixed(2)} (${price} centavos) ❌`);
        console.log(`   Corregido: $${(fixedPrice / 100).toFixed(2)} (${fixedPrice} centavos) ✅`);
        fixes.academyPrices[academy] = fixedPrice;
        hasFixes = true;
      } else if (price >= MIN_REASONABLE_PRICE_CENTS && price <= MAX_REASONABLE_PRICE_CENTS) {
        console.log(`✅ ${academy}: $${priceDollars.toFixed(2)} (${price} centavos) - OK`);
      } else {
        console.log(`⚠️  ${academy}: $${priceDollars.toFixed(2)} (${price} centavos) - Revisar manualmente`);
      }
    }

    // Check lunch prices
    console.log('\n🔍 Verificando precios de lunch:');
    console.log('─'.repeat(80));
    
    const lunchSemester = Number(lunch.semester || 0);
    const lunchSingle = Number(lunch.single || 0);
    
    if (lunchSemester > 0 && lunchSemester < MIN_REASONABLE_PRICE_CENTS) {
      const fixedSemester = Math.round(lunchSemester * 100);
      console.log(`🔧 Lunch Semester:`);
      console.log(`   Actual: $${(lunchSemester / 100).toFixed(2)} (${lunchSemester} centavos) ❌`);
      console.log(`   Corregido: $${(fixedSemester / 100).toFixed(2)} (${fixedSemester} centavos) ✅`);
      fixes.lunch.semester = fixedSemester;
      hasFixes = true;
    } else if (lunchSemester >= MIN_REASONABLE_PRICE_CENTS) {
      console.log(`✅ Lunch Semester: $${(lunchSemester / 100).toFixed(2)} (${lunchSemester} centavos) - OK`);
    } else {
      console.log(`⚠️  Lunch Semester: $${(lunchSemester / 100).toFixed(2)} (${lunchSemester} centavos) - Revisar`);
    }
    
    if (lunchSingle > 0 && lunchSingle < MIN_REASONABLE_PRICE_CENTS) {
      const fixedSingle = Math.round(lunchSingle * 100);
      console.log(`🔧 Lunch Single:`);
      console.log(`   Actual: $${(lunchSingle / 100).toFixed(2)} (${lunchSingle} centavos) ❌`);
      console.log(`   Corregido: $${(fixedSingle / 100).toFixed(2)} (${fixedSingle} centavos) ✅`);
      fixes.lunch.single = fixedSingle;
      hasFixes = true;
    } else if (lunchSingle >= MIN_REASONABLE_PRICE_CENTS) {
      console.log(`✅ Lunch Single: $${(lunchSingle / 100).toFixed(2)} (${lunchSingle} centavos) - OK`);
    } else {
      console.log(`⚠️  Lunch Single: $${(lunchSingle / 100).toFixed(2)} (${lunchSingle} centavos) - Revisar`);
    }

    // Apply fixes
    if (hasFixes) {
      console.log('\n' + '═'.repeat(80));
      if (isDry) {
        console.log('🔍 DRY-RUN: Los siguientes cambios se aplicarían:');
      } else {
        console.log('💾 Aplicando correcciones...');
      }
      
      const updateData = {};
      if (Object.keys(fixes.academyPrices).length > 0) {
        updateData.academyPrices = fixes.academyPrices;
      }
      if (Object.keys(fixes.lunch).length > 0) {
        updateData.lunch = { ...lunch, ...fixes.lunch };
      }
      
      if (!isDry) {
        await pricingRef.update(updateData);
        console.log('✅ Precios corregidos exitosamente');
      } else {
        console.log('📝 Cambios que se aplicarían:');
        console.log(JSON.stringify(updateData, null, 2));
      }
    } else {
      console.log('\n✅ Todos los precios están correctos (en centavos)');
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

run();
