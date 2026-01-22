# Configuración de Email Automático para Invoices

## 🎯 Objetivo

Enviar automáticamente un email con el link al invoice cuando un usuario se registra en el frontend.

## 📋 Opciones Disponibles

### ✅ Opción 1: EmailJS con Gmail Workspace (Recomendado para empezar rápido)

**Ventajas:**
- ✅ Fácil de implementar
- ✅ No requiere backend
- ✅ Gratis hasta 200 emails/mes
- ✅ Funciona directamente desde el frontend
- ✅ Compatible con Gmail Workspace

**Pasos para Gmail Workspace:**

1. **Crear cuenta en EmailJS:**
   - Ir a https://www.emailjs.com/
   - Crear cuenta gratuita
   - Verificar email

2. **Configurar Gmail Workspace en EmailJS:**
   - Ir a "Email Services" en EmailJS
   - Click en "Add New Service"
   - Seleccionar "Gmail"
   - **IMPORTANTE para Gmail Workspace:**
     - Necesitas crear una "App Password" en tu cuenta de Gmail Workspace
     - Ve a tu cuenta de Google Admin o Google Account
     - Activa la verificación en 2 pasos (si no está activada)
     - Ve a "Security" > "2-Step Verification" > "App passwords"
     - Genera una nueva App Password para "Mail"
     - Usa esta App Password (no tu contraseña normal) en EmailJS
   - Ingresa tu email de Gmail Workspace (ej: orlando@iyfusa.org)
   - Ingresa la App Password generada
   - Guarda el servicio

3. **Crear plantilla de email:**
   - Ir a "Email Templates"
   - Crear nueva plantilla
   - Usar esta plantilla base:

```
Subject: Your IYF Orlando Academy Invoice - Invoice #{{invoice_id}}

Hello {{to_name}},

Thank you for registering for the IYF Orlando Academy Spring 2026 Semester!

Your invoice has been generated and is ready for review.

Invoice Details:
- Invoice ID: {{invoice_id}}
- Total Amount: {{total_amount}}

View and Download Your Invoice:
{{invoice_url}}

You can also search for your invoice anytime at:
{{invoice_lookup_url}}

Payment Methods:
- Zelle: orlando@iyfusa.org
- Cash: At IYF Orlando office (320 S Park Ave, Sanford, FL 32771)
- Check: Payable to IYF Orlando

If you have any questions, please contact us at orlando@iyfusa.org or (407) 900-3442.

Best regards,
IYF Orlando Team
```

4. **Obtener credenciales:**
   - Service ID: En "Email Services"
   - Template ID: En "Email Templates"
   - Public Key: En "Account" > "General"

5. **Instalar en el frontend:**
```bash
npm install @emailjs/browser
```

6. **Código de implementación:**
Ver `INVOICE_ACCESS_FOR_USERS.md` sección "Opción A: EmailJS"

### ✅ Opción 2: Firebase Functions con Gmail Workspace (Recomendado para producción)

**Ventajas:**
- ✅ Más confiable
- ✅ Se ejecuta automáticamente cuando se crea el invoice
- ✅ No depende del frontend
- ✅ Escalable
- ✅ Compatible con Gmail Workspace

**Desventajas:**
- ⚠️ Requiere configuración de backend
- ⚠️ Necesita App Password de Gmail Workspace

**Pasos para Gmail Workspace:**

1. **Crear App Password en Gmail Workspace:**
   - Ve a tu cuenta de Google Admin Console
   - O ve a https://myaccount.google.com/security
   - Activa "2-Step Verification" si no está activada
   - Ve a "App passwords" (https://myaccount.google.com/apppasswords)
   - Selecciona "Mail" y tu dispositivo
   - Genera la App Password
   - **Copia la contraseña de 16 caracteres** (la necesitarás después)

2. **Instalar Firebase CLI:**
```bash
npm install -g firebase-tools
firebase login
```

3. **Inicializar Functions:**
```bash
cd /path/to/your/project
firebase init functions
# Selecciona JavaScript o TypeScript
# Instala dependencias cuando se pregunte
```

4. **Instalar dependencias necesarias:**
```bash
cd functions
npm install nodemailer
```

5. **Crear la función con configuración para Gmail Workspace:**
Ver código actualizado abajo

6. **Configurar credenciales de Gmail Workspace:**
```bash
# Usar el email de Gmail Workspace y la App Password generada
firebase functions:config:set email.user="orlando@iyfusa.org" email.password="xxxx xxxx xxxx xxxx"
# Nota: La App Password tiene espacios, pero Firebase la guardará correctamente
```

7. **Desplegar:**
```bash
firebase deploy --only functions:onInvoiceCreated
```

**Código de la función para Gmail Workspace:**

```javascript
// functions/index.js
const functions = require('firebase-functions')
const admin = require('firebase-admin')
const nodemailer = require('nodemailer')

admin.initializeApp()

// Configurar transporter para Gmail Workspace
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: functions.config().email.user, // orlando@iyfusa.org
    pass: functions.config().email.password // App Password de 16 caracteres
  }
})

// Trigger cuando se crea un invoice
exports.onInvoiceCreated = functions.firestore
  .document('academy_invoices/{invoiceId}')
  .onCreate(async (snap, context) => {
    const invoice = snap.data()
    const invoiceId = context.params.invoiceId
    
    // Buscar el registro del estudiante
    const registrationRef = admin.firestore()
      .collection('2026-iyf_orlando_academy_spring_semester')
      .doc(invoice.studentId)
    
    const registration = await registrationRef.get()
    
    if (!registration.exists) {
      console.error('Registration not found for invoice:', invoiceId)
      return null
    }
    
    const registrationData = registration.data()
    const email = registrationData.email
    const studentName = `${registrationData.firstName} ${registrationData.lastName}`
    
    // Construir el link al invoice
    const invoiceUrl = `https://www.iyforlando.org/invoice/${invoice.studentId}`
    const invoiceLookupUrl = `https://www.iyforlando.org/invoice-lookup`
    const shortInvoiceId = invoiceId.slice(0, 8).toUpperCase()
    
    // Enviar email
    const mailOptions = {
      from: '"IYF Orlando" <orlando@iyfusa.org>', // Nombre y email del remitente
      to: email,
      subject: `Your IYF Orlando Academy Invoice - Invoice #${shortInvoiceId}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #1976d2;">Hello ${studentName},</h2>
          <p>Thank you for registering for the <strong>IYF Orlando Academy Spring 2026 Semester</strong>!</p>
          <p>Your invoice has been generated and is ready for review.</p>
          
          <div style="background-color: #f5f5f5; padding: 20px; border-radius: 5px; margin: 20px 0;">
            <h3 style="margin-top: 0;">Invoice Details:</h3>
            <ul style="list-style: none; padding: 0;">
              <li><strong>Invoice ID:</strong> ${shortInvoiceId}</li>
              <li><strong>Total Amount:</strong> $${(invoice.total / 100).toFixed(2)}</li>
              <li><strong>Status:</strong> ${invoice.status.toUpperCase()}</li>
            </ul>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${invoiceUrl}" 
               style="background-color: #1976d2; color: white; padding: 12px 30px; 
                      text-decoration: none; border-radius: 5px; display: inline-block;">
              View Your Invoice
            </a>
          </div>
          
          <p>You can also search for your invoice anytime at:<br>
          <a href="${invoiceLookupUrl}">${invoiceLookupUrl}</a></p>
          
          <div style="background-color: #fff3cd; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <h3 style="margin-top: 0;">Payment Methods:</h3>
            <ul>
              <li><strong>Zelle:</strong> orlando@iyfusa.org</li>
              <li><strong>Cash:</strong> At IYF Orlando office (320 S Park Ave, Sanford, FL 32771)</li>
              <li><strong>Check:</strong> Payable to IYF Orlando</li>
            </ul>
          </div>
          
          <p>If you have any questions, please contact us at 
          <a href="mailto:orlando@iyfusa.org">orlando@iyfusa.org</a> or (407) 900-3442.</p>
          
          <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
          <p style="color: #666; font-size: 12px;">
            Best regards,<br>
            <strong>IYF Orlando Team</strong><br>
            320 S Park Ave, Sanford, FL 32771<br>
            (407) 900-3442 | orlando@iyfusa.org
          </p>
        </div>
      `
    }
    
    try {
      await transporter.sendMail(mailOptions)
      console.log('✅ Invoice email sent to:', email)
      return null
    } catch (error) {
      console.error('❌ Error sending invoice email:', error)
      return null
    }
  })
```

### ✅ Opción 3: SendGrid / Mailgun / Otro servicio

Similar a EmailJS pero con más opciones y mejor para alto volumen.

## 🔧 Variables de Entorno Necesarias

Si usas EmailJS, agregar al `.env` del frontend:

```env
VITE_EMAILJS_SERVICE_ID=your_service_id
VITE_EMAILJS_TEMPLATE_ID=your_template_id
VITE_EMAILJS_PUBLIC_KEY=your_public_key
```

## 📧 Configuración Específica para Gmail Workspace

Si estás usando **Gmail Workspace** (anteriormente G Suite), ver la guía completa en:
- **`GMAIL_WORKSPACE_SETUP.md`** - Guía detallada paso a paso

**Resumen rápido:**
1. Activar verificación en 2 pasos en tu cuenta de Google
2. Crear App Password (no usar contraseña normal)
3. Usar la App Password en EmailJS o Firebase Functions
4. El formato es: `xxxx xxxx xxxx xxxx` (16 caracteres)

## 📝 Checklist de Implementación

- [ ] Elegir opción (EmailJS recomendado para empezar)
- [ ] Configurar servicio de email
- [ ] Crear plantilla de email
- [ ] Obtener credenciales
- [ ] Instalar dependencias necesarias
- [ ] Implementar código en el frontend
- [ ] Probar con registro de prueba
- [ ] Verificar que el email llega correctamente
- [ ] Verificar que el link funciona

## 🧪 Pruebas

1. **Registro de prueba:**
   - Registrar un usuario con tu email
   - Verificar que el invoice se genera
   - Verificar que el email llega

2. **Verificar contenido:**
   - El link al invoice funciona
   - Los datos del invoice son correctos
   - El formato del email es correcto

3. **Probar diferentes escenarios:**
   - Registro con un periodo
   - Registro con dos periodos
   - Registro sin academias (no debería enviar email)

## 🚨 Troubleshooting

**El email no se envía:**
- Verificar credenciales de EmailJS/Firebase Functions
- Verificar que el invoice se generó correctamente
- Revisar logs de consola/Cloud Functions

**El link no funciona:**
- Verificar que la URL es correcta
- Verificar que la página de invoice existe
- Verificar reglas de Firestore

**El invoice no se genera:**
- Verificar que el auto-invoice está funcionando
- Verificar logs del admin dashboard
- Verificar que hay academias seleccionadas en el registro
