# Integración con Página Web Pública - Guía Rápida

## 🎯 Objetivo

Conectar la página web pública de registro con este admin dashboard para que:
- Los registros se guarden en la misma colección
- Los invoices se generen automáticamente
- Todo funcione sin hardcodeo

## 📦 Nombre de Colección

**Colección de Registros**: `2026-iyf_orlando_academy_spring_semester`

## 🔧 Código para la Página Pública

### 1. Configuración de Firebase

```javascript 
// firebase.js o config.js
import { initializeApp } from 'firebase/app'
import { getFirestore } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: "AIzaSyBVBE2Cb5UFePdUOlTWVPPwGZCzH9lUtRQ",
  authDomain: "iyf-orlando-academy.firebaseapp.com",
  projectId: "iyf-orlando-academy",
  storageBucket: "iyf-orlando-academy.appspot.com",
  messagingSenderId: "321117265409",
  appId: "1:321117265409:web:27dc40234503505a3eaa00",
  measurementId: "G-H4FJCX8JT0",
}

const app = initializeApp(firebaseConfig)
export const db = getFirestore(app)
```

### 2. Nombre de Colección (Sin Hardcodeo)

```javascript
// config.js
export const COLLECTIONS = {
  registrations: "2026-iyf_orlando_academy_spring_semester"
}
```

### 3. Función de Registro

```javascript
// registration.js
import { collection, addDoc, serverTimestamp } from 'firebase/firestore'
import { db } from './firebase'
import { COLLECTIONS } from './config'

export async function submitRegistration(formData) {
  try {
    const registrationData = {
      firstName: formData.firstName,
      lastName: formData.lastName,
      email: formData.email,
      confirmEmail: formData.confirmEmail,
      cellNumber: formData.phone,
      birthday: formData.birthday,
      age: formData.age,
      gender: formData.gender,
      address: formData.address,
      city: formData.city,
      state: formData.state,
      zipCode: formData.zipCode,
      firstPeriod: {
        academy: formData.firstPeriodAcademy,
        level: formData.firstPeriodLevel || null
      },
      secondPeriod: {
        academy: formData.secondPeriodAcademy || null,
        level: formData.secondPeriodLevel || null
      },
      termsAccepted: true,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    }

    const docRef = await addDoc(
      collection(db, COLLECTIONS.registrations),
      registrationData
    )

    return { success: true, id: docRef.id }
  } catch (error) {
    console.error('Error submitting registration:', error)
    throw error
  }
}
```

### 4. Ejemplo de Uso en Formulario

```javascript
// RegistrationForm.jsx
import { submitRegistration } from './registration'

const handleSubmit = async (e) => {
  e.preventDefault()
  
  try {
    const result = await submitRegistration({
      firstName: formData.firstName,
      lastName: formData.lastName,
      email: formData.email,
      // ... otros campos
    })
    
    alert('Registration successful!')
    // El invoice se generará automáticamente en el admin dashboard
  } catch (error) {
    alert('Registration failed. Please try again.')
  }
}
```

## ✅ Lo que Pasa Automáticamente

1. **Usuario se registra** en la página pública
2. **Datos se guardan** en `2026-iyf_orlando_academy_spring_semester`
3. **Admin dashboard detecta** el nuevo registro (escucha en tiempo real)
4. **Invoice se genera automáticamente** con los precios configurados
5. **Invoice aparece** en la página de Payments del admin

## 🔍 Verificación

Para verificar que funciona:

1. Registra un estudiante en la página pública
2. Abre el admin dashboard
3. Ve a **Registrations** → Deberías ver el nuevo registro
4. Ve a **Payments** → Deberías ver el invoice generado

## 📝 Notas Importantes

- ✅ **No hardcodees** el nombre de la colección - usa una constante
- ✅ **Usa la misma configuración de Firebase** que el admin
- ✅ **Estructura de datos** debe coincidir con lo esperado
- ✅ **Permisos de Firestore** ya están configurados para permitir escritura pública

## 🆘 Si Algo No Funciona

1. Verifica que el nombre de colección sea exactamente: `2026-iyf_orlando_academy_spring_semester`
2. Verifica que ambas páginas usen el mismo proyecto Firebase
3. Revisa la consola del navegador para errores
4. Verifica las reglas de Firestore en Firebase Console
