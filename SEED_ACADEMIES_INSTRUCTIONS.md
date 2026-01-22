# 🌱 Instrucciones para Cargar Academias a Firebase

Hay varias formas de cargar las academias a Firebase. Elige la que prefieras:

## Opción 1: Script de Consola del Navegador (RECOMENDADO - Más Fácil) ✅

Esta es la forma más simple y no requiere configuración adicional:

1. **Abre tu aplicación admin en el navegador** (debe estar desplegada o corriendo localmente)
2. **Inicia sesión con una cuenta admin** (orlando@iyfusa.org o jodlouis.dev@gmail.com)
3. **Abre la consola del navegador** (F12 o Cmd+Option+I)
4. **Copia y pega el código completo** del archivo `SEED_ACADEMIES_CONSOLE.md`
5. **Presiona Enter** y espera a que se complete

Este método funciona porque usa tu sesión autenticada del navegador.

## Opción 2: Firebase Admin SDK (Requiere Credenciales)

Si prefieres usar el script de Node.js, necesitas credenciales de servicio:

### Paso 1: Obtener Credenciales de Servicio

1. Ve a [Firebase Console](https://console.firebase.google.com/)
2. Selecciona tu proyecto: **iyf-orlando-academy**
3. Ve a **Configuración del proyecto** (ícono de engranaje) > **Cuentas de servicio**
4. Haz clic en **Generar nueva clave privada**
5. Se descargará un archivo JSON con las credenciales
6. Guarda este archivo en un lugar seguro (NO lo subas a Git)

### Paso 2: Configurar las Credenciales

Tienes dos opciones:

**Opción A: Variable de entorno**
```bash
export GOOGLE_APPLICATION_CREDENTIALS="/ruta/al/archivo/credenciales.json"
```

**Opción B: Modificar el script**
Edita `scripts/seed-academies-admin.cjs` y agrega la ruta al archivo de credenciales:

```javascript
admin.initializeApp({
  credential: admin.credential.cert(require('/ruta/al/archivo/credenciales.json')),
  projectId: 'iyf-orlando-academy'
});
```

### Paso 3: Ejecutar el Script

```bash
node scripts/seed-academies-admin.cjs
```

## Opción 3: Firebase CLI (Requiere Login)

Si tienes Firebase CLI instalado y autenticado:

```bash
# 1. Login a Firebase
firebase login

# 2. Usar el script de consola del navegador (Opción 1)
# O usar gcloud para Application Default Credentials:
gcloud auth application-default login
node scripts/seed-academies-admin.cjs
```

## Verificación

Después de ejecutar cualquiera de los métodos, verifica que las academias se cargaron:

1. Ve a [Firebase Console](https://console.firebase.google.com/)
2. Selecciona tu proyecto
3. Ve a **Firestore Database**
4. Busca la colección `academies_2026_spring`
5. Deberías ver 8 documentos (Art, English, Kids Academy, Korean Language, Piano, Pickleball, Soccer, Taekwondo)

## Solución de Problemas

### Error: "Missing or insufficient permissions"
- Asegúrate de estar autenticado como admin (orlando@iyfusa.org o jodlouis.dev@gmail.com)
- Si usas el script de consola, verifica que estés logueado en el navegador

### Error: "Could not load the default credentials"
- Necesitas configurar credenciales de servicio (ver Opción 2)
- O usar el script de consola del navegador (Opción 1)

### Error: "require is not defined"
- El script ya está renombrado a `.cjs` para usar CommonJS
- Si aún tienes problemas, verifica que el archivo se llame `seed-academies-admin.cjs`

## Recomendación

**Usa la Opción 1 (Script de Consola del Navegador)** - Es la más simple y no requiere configuración adicional.
