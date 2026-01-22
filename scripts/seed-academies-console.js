/**
 * Código para ejecutar en la consola del navegador (admin dashboard)
 * Copia y pega este código completo en la consola del navegador
 * 
 * IMPORTANTE: Este código NO usa import statements, funciona directamente en la consola
 */

// Código completo para la consola del navegador
const seedAcademiesConsole = `
(async function() {
  console.log('🌱 Iniciando carga de academias...');
  
  // Obtener Firebase desde los módulos ya cargados en la página
  // Primero intentamos acceder a través del contexto de React/Vite
  let db, collection, doc, setDoc;
  
  try {
    // Intentar acceder a Firebase desde el módulo ya cargado
    const firebaseModule = await import('/src/lib/firebase.ts');
    db = firebaseModule.db;
    
    const firestoreModule = await import('firebase/firestore');
    collection = firestoreModule.collection;
    doc = firestoreModule.doc;
    setDoc = firestoreModule.setDoc;
    
    console.log('✅ Firebase accedido desde módulos de la aplicación');
  } catch (e) {
    console.log('⚠️ No se pudo acceder a Firebase desde módulos, inicializando manualmente...');
    
    // Inicializar Firebase manualmente
    const { initializeApp } = await import('firebase/app');
    const { getFirestore, collection: col, doc: docFn, setDoc: setDocFn } = await import('firebase/firestore');
    
    const firebaseConfig = {
      apiKey: "AIzaSyBVBE2Cb5UFePdUOlTWVPPwGZCzH9lUtRQ",
      authDomain: "iyf-orlando-academy.firebaseapp.com",
      projectId: "iyf-orlando-academy",
      storageBucket: "iyf-orlando-academy.appspot.com",
      messagingSenderId: "321117265409",
      appId: "1:321117265409:web:27dc40234503505a3eaa00"
    };
    
    const app = initializeApp(firebaseConfig);
    db = getFirestore(app);
    collection = col;
    doc = docFn;
    setDoc = setDocFn;
    
    console.log('✅ Firebase inicializado manualmente');
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
  ];
  
  let created = 0;
  let updated = 0;
  
  for (const academy of ACADEMIES_2026_SPRING) {
    const docId = academy.name.toLowerCase().replace(/\\s+/g, '_');
    const academyRef = doc(db, 'academies_2026_spring', docId);
    
    try {
      await setDoc(academyRef, {
        ...academy,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }, { merge: true });
      
      created++;
      console.log(\`✅ \${academy.name} ($$\${academy.price})\`);
      
      if (academy.hasLevels && academy.levels) {
        console.log(\`   Niveles: \${academy.levels.map(l => \`\${l.name} (\${l.schedule})\`).join(', ')}\`);
      } else {
        console.log(\`   Horario: \${academy.schedule}\`);
      }
    } catch (error) {
      console.error(\`❌ Error al crear \${academy.name}:\`, error);
    }
  }
  
  console.log(\`\\n🎉 Completado!\\n   Creadas: \${created} academias\\n   Total: \${ACADEMIES_2026_SPRING.length} academias\`);
})();
`;

console.log(seedAcademiesConsole);
