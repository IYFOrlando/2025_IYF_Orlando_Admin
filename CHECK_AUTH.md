# 🔐 Verificar Autenticación y Permisos

## 📋 Verificar tu Email Actual

Ejecuta este código en la consola del navegador (en el admin dashboard):

```javascript
(async function() {
  try {
    const { getAuth } = await import('firebase/auth');
    const { getApp } = await import('firebase/app');
    
    const app = getApp();
    const auth = getAuth(app);
    const user = auth.currentUser;
    
    if (!user) {
      console.log('❌ No estás autenticado');
      console.log('👉 Por favor, inicia sesión en el dashboard primero');
      return;
    }
    
    console.log('✅ Usuario autenticado:', user.email);
    
    const adminEmails = ['orlando@iyfusa.org', 'jodlouis.dev@gmail.com', 'michellemoralespradis@gmail.com'];
    const isAdmin = adminEmails.includes(user.email);
    
    if (isAdmin) {
      console.log('✅ Tienes permisos de admin');
    } else {
      console.log('❌ NO tienes permisos de admin');
      console.log('📧 Tu email:', user.email);
      console.log('📧 Emails admin permitidos:', adminEmails.join(', '));
      console.log('\n💡 Soluciones:');
      console.log('   1. Inicia sesión con uno de los emails admin');
      console.log('   2. O agrega tu email a firestore.rules (línea 6-10)');
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
})();
```

## 🔧 Agregar tu Email como Admin

Si necesitas agregar tu email a la lista de admins:

1. Abre el archivo `firestore.rules`
2. Encuentra la función `isAdmin()` (líneas 5-11)
3. Agrega tu email a la lista:

```javascript
function isAdmin() {
  return request.auth != null && 
         request.auth.token.email in [
           'orlando@iyfusa.org',
           'jodlouis.dev@gmail.com',
           'michellemoralespradis@gmail.com',
           'TU_EMAIL_AQUI@ejemplo.com'  // ← Agrega tu email aquí
         ];
}
```

4. Despliega las reglas actualizadas:

```bash
firebase deploy --only firestore:rules
```

O si tienes el script de despliegue:

```bash
./deploy-firestore-rules.sh
```

## 📝 Notas

- Las reglas de Firestore requieren que el usuario sea admin para escribir en `academies_2026_spring`
- Solo los emails en la lista `isAdmin()` tienen permisos de escritura
- Después de actualizar las reglas, espera unos segundos para que se propaguen los cambios
