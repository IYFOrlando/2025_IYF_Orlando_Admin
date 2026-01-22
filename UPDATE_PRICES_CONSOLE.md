# 💰 Revisar y Actualizar Precios de Academias

## 📋 Instrucciones

1. **Asegúrate de estar autenticado** en el admin dashboard con un email admin
2. Abre la consola del navegador (F12 → Console)
3. **Copia y pega TODO el código de abajo** (desde `(async function()` hasta el final)
4. Presiona Enter
5. El script mostrará los precios actuales y actualizará los que necesiten cambio

## 🚀 Código para Copiar y Pegar

```javascript
(async function() {
  console.log('💰 Revisando y actualizando precios...');
  
  // Intentar usar Firebase del dashboard si está disponible
  let db;
  let auth;
  
  try {
    // Intentar importar desde el módulo del dashboard
    const { getFirestore, getAuth } = await import('firebase/firestore');
    const { getApp } = await import('firebase/app');
    
    const app = getApp();
    db = getFirestore(app);
    auth = getAuth(app);
    
    console.log('✅ Usando Firebase del dashboard');
    
    // Verificar autenticación
    const user = auth.currentUser;
    if (!user) {
      throw new Error('No estás autenticado. Por favor, inicia sesión en el dashboard primero.');
    }
    
    console.log(`👤 Usuario autenticado: ${user.email}`);
    
    // Verificar si es admin
    const adminEmails = ['orlando@iyfusa.org', 'jodlouis.dev@gmail.com', 'michellemoralespradis@gmail.com'];
    if (!adminEmails.includes(user.email)) {
      console.warn(`⚠️  ADVERTENCIA: Tu email (${user.email}) no está en la lista de admins.`);
      console.warn('⚠️  Las reglas de Firestore requieren ser admin para escribir en academies_2026_spring.');
      console.warn('⚠️  Emails admin permitidos:', adminEmails.join(', '));
      throw new Error(`Permisos insuficientes. Tu email (${user.email}) no es admin.`);
    }
    
    console.log('✅ Permisos de admin verificados');
    
  } catch (importError) {
    console.log('⚠️  No se pudo usar Firebase del dashboard, cargando desde CDN...');
    console.log('   Error:', importError.message);
    
    // Fallback: cargar Firebase desde CDN
    const loadFirebase = () => {
      return new Promise((resolve, reject) => {
        if (window.firebase && typeof window.firebase.firestore === 'function' && typeof window.firebase.auth === 'function') {
          console.log('✅ Firebase ya está cargado completamente');
          resolve(window.firebase);
          return;
        }
        
        console.log('📦 Cargando Firebase desde CDN...');
        
        const script1 = document.createElement('script');
        script1.src = 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js';
        script1.onload = () => {
          console.log('✅ firebase-app-compat cargado');
          
          const script2 = document.createElement('script');
          script2.src = 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore-compat.js';
          script2.onload = () => {
            console.log('✅ firebase-firestore-compat cargado');
            
            const script3 = document.createElement('script');
            script3.src = 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth-compat.js';
            script3.onload = () => {
              console.log('✅ firebase-auth-compat cargado');
              
              setTimeout(() => {
                if (window.firebase && typeof window.firebase.firestore === 'function' && typeof window.firebase.auth === 'function') {
                  resolve(window.firebase);
                } else {
                  reject(new Error('firebase.firestore o firebase.auth no son funciones'));
                }
              }, 300);
            };
            script3.onerror = () => reject(new Error('Error cargando firebase-auth-compat'));
            document.head.appendChild(script3);
          };
          script2.onerror = () => reject(new Error('Error cargando firebase-firestore-compat'));
          document.head.appendChild(script2);
        };
        script1.onerror = () => reject(new Error('Error cargando firebase-app-compat'));
        document.head.appendChild(script1);
      });
    };
    
    const firebase = await loadFirebase();
    
    const firebaseConfig = {
      apiKey: "AIzaSyBVBE2Cb5UFePdUOlTWVPPwGZCzH9lUtRQ",
      authDomain: "iyf-orlando-academy.firebaseapp.com",
      projectId: "iyf-orlando-academy",
      storageBucket: "iyf-orlando-academy.appspot.com",
      messagingSenderId: "321117265409",
      appId: "1:321117265409:web:27dc40234503505a3eaa00"
    };
    
    let app;
    try {
      app = firebase.app();
      console.log('✅ Usando app Firebase existente');
    } catch (e) {
      app = firebase.initializeApp(firebaseConfig);
      console.log('✅ Firebase inicializado');
    }
    
    if (typeof firebase.firestore !== 'function') {
      throw new Error('firebase.firestore no es una función');
    }
    
    if (typeof firebase.auth !== 'function') {
      throw new Error('firebase.auth no es una función');
    }
    
    db = firebase.firestore(app);
    auth = firebase.auth(app);
    
    // Verificar autenticación
    const user = auth.currentUser;
    if (!user) {
      throw new Error('No estás autenticado. Por favor, inicia sesión en el dashboard primero.');
    }
    
    console.log(`👤 Usuario autenticado: ${user.email}`);
    
    // Verificar si es admin
    const adminEmails = ['orlando@iyfusa.org', 'jodlouis.dev@gmail.com', 'michellemoralespradis@gmail.com'];
    if (!adminEmails.includes(user.email)) {
      console.warn(`⚠️  ADVERTENCIA: Tu email (${user.email}) no está en la lista de admins.`);
      console.warn('⚠️  Las reglas de Firestore requieren ser admin para escribir en academies_2026_spring.');
      console.warn('⚠️  Emails admin permitidos:', adminEmails.join(', '));
      throw new Error(`Permisos insuficientes. Tu email (${user.email}) no es admin.`);
    }
    
    console.log('✅ Permisos de admin verificados');
  }
  
  console.log('✅ Firestore inicializado\n');
  
  // Precios esperados según la configuración
  const EXPECTED_PRICES = {
    'art': 100,
    'english': 50,
    'kids_academy': 50,
    'korean_language': 50,
    'piano': 100,
    'pickleball': 50,
    'soccer': 50,
    'taekwondo': 100
  };
  
  // Obtener todas las academias
  console.log('📊 Obteniendo academias de Firestore...\n');
  const snapshot = await db.collection('academies_2026_spring').get();
  const academies = [];
  
  snapshot.forEach(doc => {
    academies.push({
      id: doc.id,
      ...doc.data()
    });
  });
  
  console.log(`📋 Academias encontradas: ${academies.length}\n`);
  console.log('─'.repeat(60));
  
  let updated = 0;
  let correct = 0;
  let notFound = [];
  
  // Revisar y actualizar cada academia
  for (const academy of academies) {
    const currentPrice = academy.price || 0;
    const expectedPrice = EXPECTED_PRICES[academy.id];
    
    if (expectedPrice === undefined) {
      console.log(`⚠️  ${academy.name || academy.id}: $${currentPrice} (no está en la lista de precios esperados)`);
      notFound.push(academy.id);
      continue;
    }
    
    if (currentPrice === expectedPrice) {
      console.log(`✅ ${academy.name || academy.id}: $${currentPrice} (correcto)`);
      correct++;
    } else {
      console.log(`🔄 ${academy.name || academy.id}: $${currentPrice} → $${expectedPrice} (actualizando...)`);
      
      try {
        const academyRef = db.collection('academies_2026_spring').doc(academy.id);
        await academyRef.update({
          price: expectedPrice,
          updatedAt: new Date().toISOString()
        });
        
        console.log(`   ✅ Actualizado correctamente`);
        updated++;
      } catch (error) {
        console.error(`   ❌ Error al actualizar:`, error.message);
      }
    }
  }
  
  // Verificar si hay academias esperadas que no existen
  console.log('\n' + '─'.repeat(60));
  console.log('🔍 Verificando academias faltantes...\n');
  
  const existingIds = academies.map(a => a.id);
  const missingAcademies = Object.keys(EXPECTED_PRICES).filter(id => !existingIds.includes(id));
  
  if (missingAcademies.length > 0) {
    console.log(`⚠️  Academias faltantes en Firestore:`);
    missingAcademies.forEach(id => {
      console.log(`   - ${id} (precio esperado: $${EXPECTED_PRICES[id]})`);
    });
    console.log('\n💡 Ejecuta el script de SEED_ACADEMIES_CONSOLE.md para crear estas academias.');
  } else {
    console.log('✅ Todas las academias esperadas están en Firestore.');
  }
  
  // Resumen final
  console.log('\n' + '═'.repeat(60));
  console.log('📊 RESUMEN');
  console.log('═'.repeat(60));
  console.log(`✅ Precios correctos: ${correct}`);
  console.log(`🔄 Precios actualizados: ${updated}`);
  if (notFound.length > 0) {
    console.log(`⚠️  Academias no encontradas en lista: ${notFound.length}`);
  }
  if (missingAcademies.length > 0) {
    console.log(`⚠️  Academias faltantes: ${missingAcademies.length}`);
  }
  console.log('═'.repeat(60));
  console.log('\n🎉 ¡Proceso completado!');
})();
```

## 📊 Qué hace el script

1. **Conecta a Firebase** usando el dashboard o CDN como fallback
2. **Verifica autenticación** y permisos de admin
3. **Obtiene todas las academias** de la colección `academies_2026_spring`
4. **Compara precios actuales** con los precios esperados:
   - Art: $100
   - English: $50
   - Kids Academy: $50
   - Korean Language: $50
   - Piano: $100
   - Pickleball: $50
   - Soccer: $50
   - Taekwondo: $100
5. **Actualiza solo los precios** que necesiten cambio
6. **Muestra un resumen** de lo que se actualizó

## ✅ Verificación

Después de ejecutar el código, puedes verificar en Firebase Console:

1. Ve a [Firebase Console](https://console.firebase.google.com/)
2. Selecciona el proyecto `iyf-orlando-academy`
3. Ve a Firestore Database
4. Busca la colección `academies_2026_spring`
5. Revisa los precios de cada academia

## 🔧 Solución de Problemas

### Error: "Missing or insufficient permissions"

**Causa:** Tu email no está en la lista de admins en Firestore rules.

**Solución:** Inicia sesión con un email admin:
- `orlando@iyfusa.org`
- `jodlouis.dev@gmail.com`
- `michellemoralespradis@gmail.com`

### Error: "No estás autenticado"

**Solución:** Asegúrate de estar autenticado en el dashboard antes de ejecutar el script.

### El script no encuentra algunas academias

**Solución:** Ejecuta primero el script de `SEED_ACADEMIES_CONSOLE.md` para crear todas las academias.
