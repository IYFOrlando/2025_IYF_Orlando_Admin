# Configuración de Gmail Workspace para Envío de Emails

## 📧 Guía Específica para Gmail Workspace

Esta guía te ayudará a configurar el envío automático de emails con invoices usando Gmail Workspace (anteriormente G Suite).

## 🔑 Paso 1: Crear App Password en Gmail Workspace

Gmail Workspace requiere una "App Password" en lugar de tu contraseña normal para aplicaciones de terceros.

### Opción A: Si tienes acceso a Google Admin Console

1. **Ir a Google Admin Console:**
   - https://admin.google.com/
   - Iniciar sesión con tu cuenta de administrador

2. **Activar verificación en 2 pasos:**
   - Ve a "Security" > "2-Step Verification"
   - Activa la verificación en 2 pasos si no está activada
   - Esto es **requerido** para crear App Passwords

3. **Crear App Password:**
   - Ve a https://myaccount.google.com/apppasswords
   - O en Admin Console: "Security" > "App passwords"
   - Selecciona "Mail" como aplicación
   - Selecciona tu dispositivo
   - Click en "Generate"
   - **Copia la contraseña de 16 caracteres** (formato: `xxxx xxxx xxxx xxxx`)

### Opción B: Si NO tienes acceso a Admin Console

1. **Contacta a tu administrador de Gmail Workspace:**
   - Pide que activen "2-Step Verification" para tu cuenta
   - Pide que te den acceso para crear App Passwords

2. **O pide al administrador que cree la App Password por ti**

## 📝 Paso 2: Configurar EmailJS con Gmail Workspace

### 1. Crear cuenta en EmailJS
- Ir a https://www.emailjs.com/
- Crear cuenta gratuita (200 emails/mes gratis)
- Verificar tu email

### 2. Agregar Gmail como servicio

1. **En EmailJS, ir a "Email Services"**
2. **Click en "Add New Service"**
3. **Seleccionar "Gmail"**
4. **Completar el formulario:**
   - **Service Name:** "Gmail Workspace" (o cualquier nombre)
   - **Gmail Address:** Tu email de Gmail Workspace (ej: `orlando@iyfusa.org`)
   - **Gmail Password:** **Usar la App Password** que creaste (los 16 caracteres, con o sin espacios)
5. **Click en "Create Service"**

### 3. Verificar la conexión

- EmailJS enviará un email de prueba
- Verifica que recibes el email
- Si no funciona, verifica:
  - Que la App Password es correcta
  - Que la verificación en 2 pasos está activada
  - Que no hay restricciones en tu cuenta de Gmail Workspace

## 🔧 Paso 3: Configurar Firebase Functions con Gmail Workspace

### 1. Instalar dependencias

```bash
cd functions
npm install nodemailer
```

### 2. Configurar credenciales

```bash
# Usar tu email de Gmail Workspace y la App Password
firebase functions:config:set email.user="orlando@iyfusa.org" email.password="xxxx xxxx xxxx xxxx"
```

**Nota:** La App Password tiene espacios, pero Firebase la guardará correctamente. Si prefieres, puedes quitar los espacios.

### 3. Código de la función

Ver el código completo en `EMAIL_INVOICE_SETUP.md` sección "Opción 2: Firebase Functions con Gmail Workspace"

### 4. Desplegar

```bash
firebase deploy --only functions:onInvoiceCreated
```

## ✅ Verificación

### Probar EmailJS:

1. En EmailJS, ve a "Email Templates"
2. Crea una plantilla de prueba
3. Envía un email de prueba
4. Verifica que recibes el email en tu bandeja de entrada

### Probar Firebase Functions:

1. Crea un invoice de prueba en Firestore
2. Verifica los logs de Cloud Functions:
```bash
firebase functions:log --only onInvoiceCreated
```
3. Verifica que el email se envió correctamente

## 🚨 Troubleshooting

### Error: "Invalid login"

**Causa:** Estás usando tu contraseña normal en lugar de App Password

**Solución:**
- Asegúrate de usar la App Password de 16 caracteres
- Verifica que la verificación en 2 pasos está activada

### Error: "Less secure app access"

**Causa:** Gmail Workspace bloquea aplicaciones "menos seguras"

**Solución:**
- No necesitas activar "less secure apps" si usas App Password
- Asegúrate de usar App Password, no tu contraseña normal

### Error: "App Password no disponible"

**Causa:** La verificación en 2 pasos no está activada

**Solución:**
- Activa la verificación en 2 pasos primero
- Luego podrás crear App Passwords

### Los emails no se envían

**Verificar:**
1. Que la App Password es correcta
2. Que el email del remitente es correcto
3. Que no hay límites de envío en tu cuenta de Gmail Workspace
4. Revisar los logs de EmailJS o Firebase Functions

### Límites de Gmail Workspace

- **Gmail Workspace gratuito:** 500 emails/día
- **Gmail Workspace Business:** 2000 emails/día
- **Gmail Workspace Enterprise:** Sin límite

Si necesitas enviar más emails, considera:
- Usar un servicio de email dedicado (SendGrid, Mailgun, etc.)
- O actualizar tu plan de Gmail Workspace

## 📋 Checklist

- [ ] Verificación en 2 pasos activada en Gmail Workspace
- [ ] App Password creada y copiada
- [ ] EmailJS configurado con App Password
- [ ] Email de prueba enviado y recibido
- [ ] (Opcional) Firebase Functions configurado
- [ ] (Opcional) Firebase Functions desplegado y probado

## 🔐 Seguridad

**IMPORTANTE:**
- **NUNCA** compartas tu App Password públicamente
- **NUNCA** la subas a GitHub o repositorios públicos
- Usa variables de entorno para almacenar credenciales
- Rota la App Password periódicamente (cada 3-6 meses)

## 📞 Soporte

Si tienes problemas:
1. Verifica que sigues todos los pasos
2. Revisa los logs de EmailJS o Firebase Functions
3. Contacta al soporte de EmailJS si usas esa opción
4. Contacta al administrador de Gmail Workspace si hay restricciones
