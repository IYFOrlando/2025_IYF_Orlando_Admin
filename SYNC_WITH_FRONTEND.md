# Sincronización entre Admin Dashboard y Página de Registro Pública

## 📋 Resumen

Este documento explica cómo sincronizar el **Admin Dashboard** con la **página web pública** donde la gente se registra, para que ambos usen la misma colección de Firestore y los invoices se generen automáticamente.

## 🔗 Cómo Funciona la Sincronización

Ambas páginas se conectan a través de **Firebase Firestore** usando la misma colección:

- **Colección de Registros**: `2026-iyf_orlando_academy_spring_semester`
- **Proyecto Firebase**: `iyf-orlando-academy`

### Flujo de Datos:

```
Página Web Pública (Registro)
    ↓
    Escribe a Firestore: 2026-iyf_orlando_academy_spring_semester
    ↓
Admin Dashboard (Escucha cambios)
    ↓
    Detecta nuevo registro
    ↓
    Genera Invoice automáticamente
    ↓
    Crea en: academy_invoices
```

## 🔧 Pasos para Sincronizar

### 1. En la Página Web Pública (Frontend)

Necesitas asegurarte de que la página de registro use el mismo nombre de colección.

#### Opción A: Si tienes acceso al código del frontend

1. **Copia el archivo de configuración compartida**:
   - Copia `src/config/shared.js` del admin dashboard al frontend
   - O crea un archivo similar con la misma configuración

2. **Actualiza el código de registro** para usar la colección correcta:

```javascript
// En tu página de registro (frontend)
import { COLLECTIONS_CONFIG } from './config/shared.js'
// O directamente:
const REGISTRATION_COLLECTION = "2026-iyf_orlando_academy_spring_semester"

// Al guardar el registro:
import { collection, addDoc, serverTimestamp } from 'firebase/firestore'
import { db } from './firebase'

const handleSubmit = async (formData) => {
  try {
    await addDoc(collection(db, REGISTRATION_COLLECTION), {
      firstName: formData.firstName,
      lastName: formData.lastName,
      email: formData.email,
      // ... otros campos
      firstPeriod: {
        academy: formData.firstPeriodAcademy,
        level: formData.firstPeriodLevel
      },
      secondPeriod: {
        academy: formData.secondPeriodAcademy,
        level: formData.secondPeriodLevel
      },
      createdAt: serverTimestamp(),
      // ... otros campos
    })
    
    // Mostrar mensaje de éxito
    alert('Registration successful!')
  } catch (error) {
    console.error('Error:', error)
    alert('Registration failed')
  }
}
```

#### Opción B: Si NO tienes acceso al código del frontend

1. **Comparte esta información con el desarrollador del frontend**:
   - Nombre de colección: `2026-iyf_orlando_academy_spring_semester`
   - Proyecto Firebase: `iyf-orlando-academy`
   - Configuración de Firebase (está en `src/config/shared.js`)

2. **Estructura de datos esperada**:

```javascript
{
  firstName: string,
  lastName: string,
  email: string,
  cellNumber: string,
  birthday: string,
  age: string | number,
  gender: string,
  address: string,
  city: string,
  state: string,
  zipCode: string,
  firstPeriod: {
    academy: string,
    level: string | null
  },
  secondPeriod: {
    academy: string,
    level: string | null
  },
  createdAt: Timestamp,
  termsAccepted: boolean,
  confirmEmail: string
}
```

### 2. En el Admin Dashboard (Este proyecto)

✅ **Ya está configurado** - El admin dashboard:
- Usa `COLLECTIONS_CONFIG.fallAcademy` que apunta a `2026-iyf_orlando_academy_spring_semester`
- Escucha cambios en esa colección automáticamente
- Genera invoices cuando detecta nuevos registros

### 3. Verificar la Conexión

Para verificar que ambas páginas están sincronizadas:

1. **Registra un estudiante en la página pública**
2. **Abre el Admin Dashboard**
3. **Ve a la página de Registrations** - deberías ver el nuevo registro
4. **Ve a la página de Payments** - deberías ver el invoice generado automáticamente

## 📝 Configuración de Firebase

Ambas páginas deben usar la misma configuración de Firebase:

```javascript
const firebaseConfig = {
  apiKey: "AIzaSyBVBE2Cb5UFePdUOlTWVPPwGZCzH9lUtRQ",
  authDomain: "iyf-orlando-academy.firebaseapp.com",
  projectId: "iyf-orlando-academy",
  storageBucket: "iyf-orlando-academy.appspot.com",
  messagingSenderId: "321117265409",
  appId: "1:321117265409:web:27dc40234503505a3eaa00",
  measurementId: "G-H4FJCX8JT0",
}
```

## 🔒 Permisos de Firestore

Asegúrate de que las reglas de Firestore permitan:

1. **Lectura pública** de la colección de registros (para que el admin pueda leer)
2. **Escritura pública** de la colección de registros (para que el frontend pueda escribir)
3. **Lectura/Escritura de invoices** solo para admins

Ejemplo de reglas (en `firestore.rules`):

```javascript
match /2026-iyf_orlando_academy_spring_semester/{document} {
  // Permitir lectura y escritura pública para el formulario de registro
  allow read, write: if true;
}

match /academy_invoices/{document} {
  // Solo admins pueden leer/escribir invoices
  allow read, write: if isAdmin();
}
```

## 🚀 Pruebas

1. **Test de Registro**:
   - Registra un estudiante en la página pública
   - Verifica que aparece en el admin dashboard

2. **Test de Auto-Invoice**:
   - Registra un estudiante con academias seleccionadas
   - Verifica que se crea el invoice automáticamente en Payments

3. **Test de Precios**:
   - Configura precios en Admin Dashboard → Payments → Settings
   - Registra un estudiante y verifica que el invoice usa los precios correctos

## 📞 Soporte

Si hay problemas de sincronización:

1. Verifica que ambas páginas usen el mismo nombre de colección
2. Verifica que ambas páginas apunten al mismo proyecto de Firebase
3. Revisa la consola del navegador para errores
4. Revisa las reglas de Firestore en Firebase Console

## ✅ Checklist de Sincronización

- [ ] Página pública usa colección: `2026-iyf_orlando_academy_spring_semester`
- [ ] Admin dashboard usa colección: `2026-iyf_orlando_academy_spring_semester`
- [ ] Ambas páginas usan el mismo proyecto Firebase
- [ ] Reglas de Firestore permiten lectura/escritura pública de registros
- [ ] Auto-invoice está habilitado en el admin dashboard
- [ ] Precios están configurados en `settings/pricing`
