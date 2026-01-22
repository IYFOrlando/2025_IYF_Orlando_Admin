# 🌱 Cargar Academias desde la Consola del Navegador

## ⚠️ IMPORTANTE: Permisos Requeridos

**Este script requiere permisos de admin en Firestore.**

Los emails admin permitidos son:
- `orlando@iyfusa.org`
- `jodlouis.dev@gmail.com`
- `michellemoralespradis@gmail.com`

Si tu email no está en esta lista, verás un error de "Missing or insufficient permissions".

**Soluciones:**
1. Inicia sesión con uno de los emails admin listados arriba
2. O agrega tu email a `firestore.rules` (ver `CHECK_AUTH.md` para instrucciones)

## 📋 Instrucciones Rápidas

1. **Asegúrate de estar autenticado** en el admin dashboard con un email admin
2. Abre la consola del navegador (F12 → Console)
3. **Copia y pega TODO el código de abajo** (desde `(async function()` hasta el final)
4. Presiona Enter
5. Espera a que termine (verás mensajes de progreso)

## 🚀 Código para Copiar y Pegar

```javascript
(async function() {
  console.log('🌱 Iniciando carga de academias...');
  
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
      console.warn('⚠️  Si necesitas acceso, actualiza firestore.rules o inicia sesión con un email admin.');
      throw new Error(`Permisos insuficientes. Tu email (${user.email}) no es admin.`);
    }
    
    console.log('✅ Permisos de admin verificados');
    
  } catch (importError) {
    console.log('⚠️  No se pudo usar Firebase del dashboard, cargando desde CDN...');
    console.log('   Error:', importError.message);
    
    // Fallback: cargar Firebase desde CDN
    const loadFirebase = () => {
      return new Promise((resolve, reject) => {
        if (window.firebase && typeof window.firebase.firestore === 'function') {
          console.log('✅ Firebase ya está cargado');
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
            
            setTimeout(() => {
              if (window.firebase && typeof window.firebase.firestore === 'function') {
                resolve(window.firebase);
              } else {
                reject(new Error('firebase.firestore no es una función'));
              }
            }, 300);
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
  
  console.log('✅ Firestore inicializado');
  
  // Datos de las academias
  const ACADEMIES = [
    {
      name: "Art",
      price: 100,
      schedule: "9:30 AM - 11:30 AM",
      hasLevels: false,
      order: 1,
      enabled: true,
      description: "Art Academy"
    },
    {
      name: "English",
      price: 50,
      schedule: "10:00 AM - 11:30 AM",
      hasLevels: false,
      order: 2,
      enabled: true,
      description: "English Academy"
    },
    {
      name: "Kids Academy",
      price: 50,
      schedule: "10:30 AM - 12:15 PM",
      hasLevels: false,
      order: 3,
      enabled: true,
      description: "Kids Academy"
    },
    {
      name: "Korean Language",
      price: 50,
      schedule: "10:00 AM - 11:30 AM",
      hasLevels: true,
      levels: [
        { name: "Alphabet", schedule: "9:00 AM - 10:15 AM", order: 1 },
        { name: "Beginner", schedule: "10:20 AM - 11:35 AM", order: 2 },
        { name: "Intermediate", schedule: "10:00 AM - 11:30 AM", order: 3 },
        { name: "K-Movie Conversation", schedule: "10:00 AM - 11:30 AM", order: 4 }
      ],
      order: 4,
      enabled: true,
      description: "Korean Language Academy"
    },
    {
      name: "Piano",
      price: 100,
      schedule: "10:00 AM - 11:30 AM",
      hasLevels: false,
      order: 5,
      enabled: true,
      description: "Piano Academy"
    },
    {
      name: "Pickleball",
      price: 50,
      schedule: "7:15 AM - 9:15 AM",
      hasLevels: false,
      order: 6,
      enabled: true,
      description: "Pickleball Academy"
    },
    {
      name: "Soccer",
      price: 50,
      schedule: "9:00 AM - 10:30 AM",
      hasLevels: false,
      order: 7,
      enabled: true,
      description: "Soccer Academy"
    },
    {
      name: "Taekwondo",
      price: 100,
      schedule: "9:20 AM - 10:20 AM & 10:30 AM - 11:30 AM",
      hasLevels: false,
      order: 8,
      enabled: true,
      description: "Taekwondo Academy"
    }
  ];
  
  let created = 0;
  
  // Cargar cada academia
  for (const academy of ACADEMIES) {
    try {
      const docId = academy.name.toLowerCase().replace(/\s+/g, '_');
      const academyRef = db.collection('academies_2026_spring').doc(docId);
      
      await academyRef.set({
        ...academy,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }, { merge: true });
      
      created++;
      console.log(`✅ ${academy.name} ($${academy.price})`);
      
      if (academy.hasLevels && academy.levels) {
        const levelsInfo = academy.levels.map(l => `${l.name} (${l.schedule})`).join(', ');
        console.log(`   Niveles: ${levelsInfo}`);
      } else {
        console.log(`   Horario: ${academy.schedule}`);
      }
    } catch (error) {
      console.error(`❌ Error al crear ${academy.name}:`, error);
    }
  }
  
  console.log(`\n🎉 ¡Completado!\n   Creadas: ${created} academias\n   Total: ${ACADEMIES.length} academias`);
})();
```

## ✅ Verificación

Después de ejecutar el código, verifica en Firebase Console:

1. Ve a [Firebase Console](https://console.firebase.google.com/)
2. Selecciona el proyecto `iyf-orlando-academy`
3. Ve a Firestore Database
4. Busca la colección `academies_2026_spring`
5. Deberías ver 8 documentos (una por cada academia)

## 🔧 Solución de Problemas

### Error: "firebase.firestore is not a function"

**Solución:** El código ahora espera 100ms después de cargar los scripts para asegurar que Firebase se inicialice correctamente. Si aún tienes problemas:

1. Refresca la página del admin dashboard
2. Espera a que la página cargue completamente
3. Ejecuta el código de nuevo

### Error: "Cannot use import statement outside a module"

**Solución:** Este código NO usa `import` statements. Usa scripts desde CDN que funcionan en cualquier consola.

### Error: "Missing or insufficient permissions"

**Causa:** Tu email no está en la lista de admins en Firestore rules.

**Solución 1 (Recomendado):** Inicia sesión con un email admin:
- `orlando@iyfusa.org`
- `jodlouis.dev@gmail.com`
- `michellemoralespradis@gmail.com`

**Solución 2:** Agrega tu email a las reglas de Firestore:
1. Abre `firestore.rules`
2. Encuentra la función `isAdmin()` (líneas 5-11)
3. Agrega tu email a la lista
4. Despliega las reglas: `firebase deploy --only firestore:rules`

**Verificar tu email actual:** Ejecuta el código en `CHECK_AUTH.md` para ver qué email estás usando.

## 📝 Notas

- El código carga Firebase desde CDN usando la versión "compat" (compatibilidad)
- Los datos se guardan en la colección `academies_2026_spring`
- Si una academia ya existe, se actualizará (merge: true)
- El código muestra el progreso en la consola
- Hay un pequeño delay (100ms) después de cargar los scripts para asegurar que Firebase se inicialice