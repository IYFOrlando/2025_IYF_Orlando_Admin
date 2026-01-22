# 🌱 Cargar Academias, Precios y Horarios a Firebase

## 📋 Resumen

Este documento explica cómo cargar las academias, precios y horarios para 2026 Spring Semester a Firebase Firestore.

## 🎯 Datos a Cargar

Las siguientes academias se cargarán a la colección `academies_2026_spring`:

1. **Art** - $100 - 9:30 AM - 11:30 AM
2. **English** - $50 - 10:00 AM - 11:30 AM
3. **Kids Academy** - $50 - 10:30 AM - 12:15 PM
4. **Korean Language** - $50 - Con niveles:
   - Alphabet: 9:00 AM - 10:15 AM
   - Beginner: 10:20 AM - 11:35 AM
   - Intermediate: 10:00 AM - 11:30 AM
   - K-Movie Conversation: 10:00 AM - 11:30 AM
5. **Piano** - $100 - 10:00 AM - 11:30 AM
6. **Pickleball** - $50 - 7:15 AM - 9:15 AM
7. **Soccer** - $50 - 9:00 AM - 10:30 AM
8. **Taekwondo** - $100 - 9:20 AM - 10:20 AM & 10:30 AM - 11:30 AM

## 🚀 Método 1: Usar el Script (Recomendado)

### Opción A: Desde la Consola del Navegador (Admin Dashboard) ⭐ RECOMENDADO

**📄 Ver archivo `SEED_ACADEMIES_CONSOLE.md` para el código completo que funciona en la consola**

1. Abre el admin dashboard en el navegador
2. Abre la consola del navegador (F12 → Console)
3. Copia y pega el código del archivo `SEED_ACADEMIES_CONSOLE.md` (o usa el código simplificado de abajo):

```javascript
// Este código funciona directamente en la consola del navegador
// Las funciones de Firebase ya están disponibles en el contexto de la aplicación

// Obtener las funciones de Firebase desde el módulo cargado
const { collection, doc, setDoc, getDocs } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js')
  .catch(() => {
    // Si no funciona, intentar acceder desde el contexto de la app
    // En React DevTools, puedes acceder a través de window.__REACT_DEVTOOLS_GLOBAL_HOOK__
    throw new Error('Firebase no está disponible. Asegúrate de estar en el admin dashboard.')
  })

// O mejor: usar las funciones que ya están disponibles en la página
// Primero, intenta acceder a db desde el contexto de React
let db
try {
  // Intenta acceder a través del módulo de Firebase que ya está cargado
  const firebaseModule = await import('/src/lib/firebase.ts')
  db = firebaseModule.db
} catch (e) {
  // Si eso no funciona, necesitamos inicializar Firebase manualmente
  const { initializeApp } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js')
  const { getFirestore } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js')
  
  const firebaseConfig = {
    apiKey: "AIzaSyBVBE2Cb5UFePdUOlTWVPPwGZCzH9lUtRQ",
    authDomain: "iyf-orlando-academy.firebaseapp.com",
    projectId: "iyf-orlando-academy",
    storageBucket: "iyf-orlando-academy.appspot.com",
    messagingSenderId: "321117265409",
    appId: "1:321117265409:web:27dc40234503505a3eaa00"
  }
  
  const app = initializeApp(firebaseConfig)
  db = getFirestore(app)
}

const ACADEMIES_2026_SPRING = [
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
]

// Función para cargar academias
async function seedAcademies() {
  try {
    // Obtener funciones de Firebase (versión simplificada que funciona en consola)
    const { collection, doc, setDoc } = await import('firebase/firestore')
    
    // Acceder a db desde el contexto de la aplicación
    // Si estás en el admin dashboard, db debería estar disponible
    // Si no, necesitarás importarlo manualmente
    const { db } = await import('/src/lib/firebase.ts').catch(async () => {
      // Si no funciona, inicializar Firebase manualmente
      const { initializeApp } = await import('firebase/app')
      const { getFirestore } = await import('firebase/firestore')
      
      const firebaseConfig = {
        apiKey: "AIzaSyBVBE2Cb5UFePdUOlTWVPPwGZCzH9lUtRQ",
        authDomain: "iyf-orlando-academy.firebaseapp.com",
        projectId: "iyf-orlando-academy",
        storageBucket: "iyf-orlando-academy.appspot.com",
        messagingSenderId: "321117265409",
        appId: "1:321117265409:web:27dc40234503505a3eaa00"
      }
      
      const app = initializeApp(firebaseConfig)
      return { db: getFirestore(app) }
    })
    
    const academiesRef = collection(db, 'academies_2026_spring')
    let created = 0
    
    for (const academy of ACADEMIES_2026_SPRING) {
      const docId = academy.name.toLowerCase().replace(/\s+/g, '_')
      const academyRef = doc(db, 'academies_2026_spring', docId)
      
      await setDoc(academyRef, {
        ...academy,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      })
      created++
      console.log(`✅ Created: ${academy.name} ($${academy.price})`)
    }
    
    console.log(`\n🎉 Done! Created ${created} academies`)
  } catch (error) {
    console.error('❌ Error:', error)
    console.log('\n💡 Alternativa: Usa el código simplificado de abajo')
  }
}

// Ejecutar
seedAcademies()
```

**⚠️ Si el código de arriba no funciona, usa esta versión simplificada:**

```javascript
// CÓDIGO SIMPLIFICADO - Copia y pega esto directamente
(async function() {
  // Obtener Firebase desde el contexto de la página
  const firebaseApp = window.firebase || (await import('firebase/app')).default
  const firestore = await import('firebase/firestore')
  
  // Configuración de Firebase
  const firebaseConfig = {
    apiKey: "AIzaSyBVBE2Cb5UFePdUOlTWVPPwGZCzH9lUtRQ",
    authDomain: "iyf-orlando-academy.firebaseapp.com",
    projectId: "iyf-orlando-academy",
    storageBucket: "iyf-orlando-academy.appspot.com",
    messagingSenderId: "321117265409",
    appId: "1:321117265409:web:27dc40234503505a3eaa00"
  }
  
  // Inicializar si no está inicializado
  let app, db
  try {
    app = firebaseApp.initializeApp(firebaseConfig)
    db = firestore.getFirestore(app)
  } catch (e) {
    app = firebaseApp.getApp()
    db = firestore.getFirestore(app)
  }
  
  const { collection, doc, setDoc } = firestore
  
  const ACADEMIES = [
    { name: "Art", price: 100, schedule: "9:30 AM - 11:30 AM", hasLevels: false, order: 1, enabled: true, description: "Art Academy" },
    { name: "English", price: 50, schedule: "10:00 AM - 11:30 AM", hasLevels: false, order: 2, enabled: true, description: "English Academy" },
    { name: "Kids Academy", price: 50, schedule: "10:30 AM - 12:15 PM", hasLevels: false, order: 3, enabled: true, description: "Kids Academy" },
    { name: "Korean Language", price: 50, schedule: "10:00 AM - 11:30 AM", hasLevels: true, levels: [
      { name: "Alphabet", schedule: "9:00 AM - 10:15 AM", order: 1 },
      { name: "Beginner", schedule: "10:20 AM - 11:35 AM", order: 2 },
      { name: "Intermediate", schedule: "10:00 AM - 11:30 AM", order: 3 },
      { name: "K-Movie Conversation", schedule: "10:00 AM - 11:30 AM", order: 4 }
    ], order: 4, enabled: true, description: "Korean Language Academy" },
    { name: "Piano", price: 100, schedule: "10:00 AM - 11:30 AM", hasLevels: false, order: 5, enabled: true, description: "Piano Academy" },
    { name: "Pickleball", price: 50, schedule: "7:15 AM - 9:15 AM", hasLevels: false, order: 6, enabled: true, description: "Pickleball Academy" },
    { name: "Soccer", price: 50, schedule: "9:00 AM - 10:30 AM", hasLevels: false, order: 7, enabled: true, description: "Soccer Academy" },
    { name: "Taekwondo", price: 100, schedule: "9:20 AM - 10:20 AM & 10:30 AM - 11:30 AM", hasLevels: false, order: 8, enabled: true, description: "Taekwondo Academy" }
  ]
  
  let created = 0
  for (const academy of ACADEMIES) {
    const docId = academy.name.toLowerCase().replace(/\s+/g, '_')
    const academyRef = doc(db, 'academies_2026_spring', docId)
    await setDoc(academyRef, {
      ...academy,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    })
    created++
    console.log(`✅ ${academy.name} ($${academy.price})`)
  }
  console.log(`\n🎉 Creadas ${created} academias`)
})()
```

### Opción B: Desde Terminal (Requiere Firebase Admin SDK)

Si tienes Firebase Admin SDK configurado:

```bash
npm run seed:academies
```

**Nota:** Si obtienes errores de permisos, necesitas:
1. Usar Firebase Admin SDK con credenciales de servicio
2. O ejecutar desde la consola del navegador (Opción A)

## 🚀 Método 2: Cargar Manualmente desde Firebase Console

1. Ve a [Firebase Console](https://console.firebase.google.com/)
2. Selecciona el proyecto `iyf-orlando-academy`
3. Ve a Firestore Database
4. Crea la colección `academies_2026_spring` si no existe
5. Para cada academia, crea un documento con:
   - **ID del documento**: nombre en minúsculas con guiones bajos (ej: `art`, `korean_language`)
   - **Campos**:
     - `name` (string): Nombre de la academia
     - `price` (number): Precio en dólares (ej: 100, 50)
     - `schedule` (string): Horario (ej: "9:30 AM - 11:30 AM")
     - `hasLevels` (boolean): true si tiene niveles, false si no
     - `levels` (array, opcional): Array de niveles si `hasLevels` es true
     - `order` (number): Orden de visualización
     - `enabled` (boolean): true
     - `description` (string): Descripción
     - `createdAt` (string): Fecha ISO
     - `updatedAt` (string): Fecha ISO

## 📝 Estructura de Datos

### Academia Simple (sin niveles)

```json
{
  "name": "Art",
  "price": 100,
  "schedule": "9:30 AM - 11:30 AM",
  "hasLevels": false,
  "order": 1,
  "enabled": true,
  "description": "Art Academy",
  "createdAt": "2026-01-22T00:00:00.000Z",
  "updatedAt": "2026-01-22T00:00:00.000Z"
}
```

### Academia con Niveles (Korean Language)

```json
{
  "name": "Korean Language",
  "price": 50,
  "schedule": "10:00 AM - 11:30 AM",
  "hasLevels": true,
  "levels": [
    {
      "name": "Alphabet",
      "schedule": "9:00 AM - 10:15 AM",
      "order": 1
    },
    {
      "name": "Beginner",
      "schedule": "10:20 AM - 11:35 AM",
      "order": 2
    },
    {
      "name": "Intermediate",
      "schedule": "10:00 AM - 11:30 AM",
      "order": 3
    },
    {
      "name": "K-Movie Conversation",
      "schedule": "10:00 AM - 11:30 AM",
      "order": 4
    }
  ],
  "order": 4,
  "enabled": true,
  "description": "Korean Language Academy",
  "createdAt": "2026-01-22T00:00:00.000Z",
  "updatedAt": "2026-01-22T00:00:00.000Z"
}
```

## ✅ Verificación

Después de cargar los datos, verifica:

1. **En Firebase Console:**
   - Ve a Firestore Database
   - Verifica que la colección `academies_2026_spring` tenga 8 documentos
   - Verifica que cada documento tenga los campos correctos

2. **En el Admin Dashboard:**
   - Los invoices deberían usar los precios de Firebase
   - Los logs deberían mostrar: `"Pricing loaded from academies_2026_spring"`

3. **En el Frontend:**
   - Las academias deberían aparecer con precios y horarios correctos

## 🔧 Solución de Problemas

### Error: "Missing or insufficient permissions"

**Solución:** 
- Ejecuta el script desde la consola del navegador (Método 1, Opción A)
- O actualiza temporalmente las reglas de Firestore para permitir escritura

### Los precios no se cargan

**Verifica:**
1. Que la colección se llame exactamente `academies_2026_spring`
2. Que cada documento tenga `name` y `price` (en dólares, no centavos)
3. Revisa los logs del admin dashboard para ver qué colección está intentando usar

### Los horarios no aparecen

**Verifica:**
1. Que el campo `schedule` esté presente en cada academia
2. Para Korean Language, que cada nivel tenga su `schedule`
3. Que el frontend esté leyendo de la colección correcta

## 📚 Referencias

- Colección: `academies_2026_spring`
- Configuración: `src/config/shared.js` → `academies2026Spring`
- Código de lectura: `src/lib/autoInvoice.ts` → `getPricing()`
