# Cómo los Usuarios Acceden a sus Invoices

## 📋 Resumen

Cuando un usuario se registra en el frontend (`www.iyforlando.org`), el admin dashboard automáticamente crea un invoice en Firestore. **El usuario recibe automáticamente un email con el link a su invoice** para descargarlo o verlo en línea.

Los usuarios también pueden acceder a sus invoices de otras formas:

## 🔍 Opción 1: Búsqueda por Email (Recomendado)

El usuario ingresa su email y el sistema busca su registro y sus invoices asociados.

### Implementación en el Frontend

```javascript
// En el frontend (iyforlando)
import { collection, query, where, getDocs } from 'firebase/firestore'
import { db } from './firebase'
import { COLLECTIONS_CONFIG } from './config/shared.js'

/**
 * Buscar invoices de un usuario por email
 */
async function getUserInvoices(email) {
  try {
    // 1. Buscar el registro del usuario por email
    const registrationsRef = collection(db, COLLECTIONS_CONFIG.springAcademy2026)
    const registrationQuery = query(
      registrationsRef, 
      where('email', '==', email.toLowerCase().trim())
    )
    const registrationSnapshot = await getDocs(registrationQuery)
    
    if (registrationSnapshot.empty) {
      return { invoices: [], registration: null }
    }
    
    // 2. Obtener el ID del registro (studentId)
    const registration = registrationSnapshot.docs[0]
    const studentId = registration.id
    
    // 3. Buscar invoices asociados a ese studentId
    const invoicesRef = collection(db, COLLECTIONS_CONFIG.academyInvoices)
    const invoicesQuery = query(
      invoicesRef,
      where('studentId', '==', studentId)
    )
    const invoicesSnapshot = await getDocs(invoicesQuery)
    
    const invoices = invoicesSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }))
    
    return {
      invoices,
      registration: {
        id: registration.id,
        ...registration.data()
      }
    }
  } catch (error) {
    console.error('Error fetching invoices:', error)
    throw error
  }
}

// Uso en un componente React
function InvoiceLookup() {
  const [email, setEmail] = useState('')
  const [invoices, setInvoices] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  
  const handleSearch = async () => {
    if (!email) return
    
    setLoading(true)
    setError(null)
    
    try {
      const result = await getUserInvoices(email)
      setInvoices(result.invoices)
      
      if (result.invoices.length === 0) {
        setError('No invoices found for this email')
      }
    } catch (err) {
      setError('Error searching for invoices')
    } finally {
      setLoading(false)
    }
  }
  
  return (
    <div>
      <input 
        type="email" 
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Enter your email"
      />
      <button onClick={handleSearch} disabled={loading}>
        {loading ? 'Searching...' : 'Find My Invoice'}
      </button>
      
      {error && <p style={{ color: 'red' }}>{error}</p>}
      
      {invoices.length > 0 && (
        <div>
          <h3>Your Invoices</h3>
          {invoices.map(invoice => (
            <div key={invoice.id}>
              <h4>Invoice #{invoice.id}</h4>
              <p>Total: ${(invoice.total / 100).toFixed(2)}</p>
              <p>Paid: ${(invoice.paid / 100).toFixed(2)}</p>
              <p>Balance: ${(invoice.balance / 100).toFixed(2)}</p>
              <p>Status: {invoice.status}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
```

## 🔗 Opción 2: Link Directo con ID de Registro

Después de que el usuario se registra, puedes mostrarle un link directo a su invoice usando el ID de su registro.

### Implementación

```javascript
// Después de que el usuario se registra exitosamente
const handleRegistrationSuccess = async (registrationId) => {
  // Mostrar mensaje de éxito con link
  const invoiceUrl = `/invoice/${registrationId}`
  
  return (
    <div>
      <h2>Registration Successful!</h2>
      <p>Your invoice will be generated automatically.</p>
      <a href={invoiceUrl}>View Your Invoice</a>
    </div>
  )
}

// Página de invoice individual
function InvoicePage({ registrationId }) {
  const [invoice, setInvoice] = useState(null)
  const [loading, setLoading] = useState(true)
  
  useEffect(() => {
    async function fetchInvoice() {
      try {
        const invoicesRef = collection(db, COLLECTIONS_CONFIG.academyInvoices)
        const q = query(
          invoicesRef,
          where('studentId', '==', registrationId)
        )
        const snapshot = await getDocs(q)
        
        if (!snapshot.empty) {
          const invoiceDoc = snapshot.docs[0]
          setInvoice({
            id: invoiceDoc.id,
            ...invoiceDoc.data()
          })
        }
      } catch (error) {
        console.error('Error:', error)
      } finally {
        setLoading(false)
      }
    }
    
    fetchInvoice()
  }, [registrationId])
  
  if (loading) return <div>Loading...</div>
  if (!invoice) return <div>Invoice not found</div>
  
  return (
    <div>
      <h2>Invoice #{invoice.id}</h2>
      <p>Total: ${(invoice.total / 100).toFixed(2)}</p>
      <p>Paid: ${(invoice.paid / 100).toFixed(2)}</p>
      <p>Balance: ${(invoice.balance / 100).toFixed(2)}</p>
      <p>Status: {invoice.status}</p>
      
      <h3>Items</h3>
      {invoice.lines.map((line, index) => (
        <div key={index}>
          <p>{line.academy} - Period {line.period}</p>
          <p>${(line.amount / 100).toFixed(2)}</p>
        </div>
      ))}
    </div>
  )
}
```

## 🔐 Reglas de Firestore

Las reglas ya están configuradas para permitir lectura pública de invoices:

```javascript
// En firestore.rules
match /academy_invoices/{document} {
  allow read: if true;  // ✅ Lectura pública permitida
  allow write: if isAdmin();  // Solo admins pueden escribir
}
```

## 📧 Envío Automático de Email con Invoice (Recomendado)

### Opción A: EmailJS (Fácil de implementar desde el frontend)

**Paso 1: Configurar EmailJS**

1. Crear cuenta en [EmailJS](https://www.emailjs.com/)
2. Crear un servicio de email (Gmail, Outlook, etc.)
3. Crear una plantilla de email
4. Obtener las credenciales (Service ID, Template ID, Public Key)

**Paso 2: Instalar EmailJS en el frontend**

```bash
npm install @emailjs/browser
```

**Paso 3: Crear servicio de email**

```javascript
// services/emailService.js
import emailjs from '@emailjs/browser'

// Inicializar EmailJS (solo una vez en tu app)
emailjs.init('YOUR_PUBLIC_KEY') // Reemplazar con tu Public Key

/**
 * Enviar email con link al invoice después del registro
 */
export async function sendInvoiceEmail({
  to,
  studentName,
  registrationId,
  invoiceId,
  total
}) {
  try {
    const invoiceUrl = `https://www.iyforlando.org/invoice/${registrationId}`
    const invoiceLookupUrl = `https://www.iyforlando.org/invoice-lookup`
    
    const templateParams = {
      to_email: to,
      to_name: studentName,
      invoice_id: invoiceId,
      invoice_url: invoiceUrl,
      invoice_lookup_url: invoiceLookupUrl,
      total_amount: `$${(total / 100).toFixed(2)}`,
      registration_id: registrationId,
      from_name: 'IYF Orlando',
      reply_to: 'orlando@iyfusa.org'
    }
    
    const response = await emailjs.send(
      'YOUR_SERVICE_ID',      // Reemplazar con tu Service ID
      'YOUR_TEMPLATE_ID',     // Reemplazar con tu Template ID
      templateParams
    )
    
    console.log('Email sent successfully:', response)
    return { success: true, messageId: response.text }
  } catch (error) {
    console.error('Error sending email:', error)
    throw error
  }
}
```

**Paso 4: Usar después del registro**

```javascript
// En el componente de registro (frontend)
import { sendInvoiceEmail } from '../services/emailService'
import { collection, query, where, getDocs, onSnapshot } from 'firebase/firestore'
import { db } from '../firebase'
import { COLLECTIONS_CONFIG } from '../config/shared.js'

const handleRegistrationSuccess = async (registrationData) => {
  try {
    // 1. Guardar el registro
    const registrationRef = await addDoc(
      collection(db, COLLECTIONS_CONFIG.springAcademy2026),
      {
        ...registrationData,
        createdAt: serverTimestamp()
      }
    )
    
    const registrationId = registrationRef.id
    
    // 2. Esperar a que se genere el invoice (el admin dashboard lo crea automáticamente)
    // Escuchar cambios en invoices para este studentId
    const invoicesRef = collection(db, COLLECTIONS_CONFIG.academyInvoices)
    const invoicesQuery = query(
      invoicesRef,
      where('studentId', '==', registrationId)
    )
    
    // Esperar hasta que aparezca el invoice (máximo 30 segundos)
    const invoicePromise = new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        unsubscribe()
        reject(new Error('Invoice generation timeout'))
      }, 30000) // 30 segundos
      
      const unsubscribe = onSnapshot(invoicesQuery, (snapshot) => {
        if (!snapshot.empty) {
          const invoice = snapshot.docs[0]
          clearTimeout(timeout)
          unsubscribe()
          resolve({
            id: invoice.id,
            ...invoice.data()
          })
        }
      }, (error) => {
        clearTimeout(timeout)
        unsubscribe()
        reject(error)
      })
    })
    
    // 3. Cuando el invoice esté listo, enviar email
    const invoice = await invoicePromise
    
    await sendInvoiceEmail({
      to: registrationData.email,
      studentName: `${registrationData.firstName} ${registrationData.lastName}`,
      registrationId: registrationId,
      invoiceId: invoice.id,
      total: invoice.total
    })
    
    // 4. Mostrar mensaje de éxito
    alert('Registration successful! Check your email for your invoice.')
    
  } catch (error) {
    console.error('Error in registration:', error)
    // Aún así mostrar éxito, el invoice se generará y el usuario puede buscarlo después
    alert('Registration successful! Your invoice will be available shortly. Check your email or visit the invoice lookup page.')
  }
}
```

**Plantilla de Email en EmailJS:**

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

### Opción B: Firebase Functions (Más robusto, requiere backend)

**Crear Firebase Function que se dispara cuando se crea un invoice:**

```javascript
// functions/index.js
const functions = require('firebase-functions')
const admin = require('firebase-admin')
const nodemailer = require('nodemailer')

admin.initializeApp()

// Configurar transporter de email (Gmail, SendGrid, etc.)
const transporter = nodemailer.createTransport({
  service: 'gmail', // o 'sendgrid', etc.
  auth: {
    user: functions.config().email.user,
    pass: functions.config().email.password
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
    
    // Enviar email
    const mailOptions = {
      from: 'orlando@iyfusa.org',
      to: email,
      subject: `Your IYF Orlando Academy Invoice - Invoice #${invoiceId.slice(0, 8)}`,
      html: `
        <h2>Hello ${studentName},</h2>
        <p>Thank you for registering for the IYF Orlando Academy Spring 2026 Semester!</p>
        <p>Your invoice has been generated and is ready for review.</p>
        
        <h3>Invoice Details:</h3>
        <ul>
          <li>Invoice ID: ${invoiceId.slice(0, 8)}</li>
          <li>Total Amount: $${(invoice.total / 100).toFixed(2)}</li>
          <li>Status: ${invoice.status.toUpperCase()}</li>
        </ul>
        
        <p><a href="${invoiceUrl}" style="background-color: #1976d2; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">View Your Invoice</a></p>
        
        <p>You can also search for your invoice anytime at:<br>
        <a href="https://www.iyforlando.org/invoice-lookup">https://www.iyforlando.org/invoice-lookup</a></p>
        
        <h3>Payment Methods:</h3>
        <ul>
          <li>Zelle: orlando@iyfusa.org</li>
          <li>Cash: At IYF Orlando office (320 S Park Ave, Sanford, FL 32771)</li>
          <li>Check: Payable to IYF Orlando</li>
        </ul>
        
        <p>If you have any questions, please contact us at orlando@iyfusa.org or (407) 900-3442.</p>
        
        <p>Best regards,<br>IYF Orlando Team</p>
      `
    }
    
    try {
      await transporter.sendMail(mailOptions)
      console.log('Invoice email sent to:', email)
      return null
    } catch (error) {
      console.error('Error sending invoice email:', error)
      return null
    }
  })
```

**Para desplegar la función:**

```bash
cd functions
npm install firebase-functions firebase-admin nodemailer
firebase deploy --only functions:onInvoiceCreated
```

**Configurar credenciales de email:**

```bash
firebase functions:config:set email.user="orlando@iyfusa.org" email.password="your-app-password"
```

### Opción C: Envío desde el Frontend después del registro (Simple pero menos confiable)

```javascript
// En el componente de registro
const handleRegistrationSuccess = async (registrationData) => {
  // ... guardar registro ...
  
  // Esperar unos segundos para que se genere el invoice
  setTimeout(async () => {
    try {
      // Buscar el invoice
      const invoicesRef = collection(db, COLLECTIONS_CONFIG.academyInvoices)
      const q = query(
        invoicesRef,
        where('studentId', '==', registrationId)
      )
      const snapshot = await getDocs(q)
      
      if (!snapshot.empty) {
        const invoice = snapshot.docs[0]
        const invoiceId = invoice.id
        
        // Enviar email usando EmailJS o tu servicio preferido
        await sendInvoiceEmail({
          to: registrationData.email,
          studentName: `${registrationData.firstName} ${registrationData.lastName}`,
          registrationId,
          invoiceId,
          total: invoice.data().total
        })
      }
    } catch (error) {
      console.error('Error sending invoice email:', error)
    }
  }, 5000) // Esperar 5 segundos
}
```

## 🎨 Página de Búsqueda Completa (Ejemplo)

```javascript
// pages/InvoiceLookupPage.jsx
import { useState } from 'react'
import { getUserInvoices } from '../services/invoiceService'

export default function InvoiceLookupPage() {
  const [email, setEmail] = useState('')
  const [invoices, setInvoices] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [registration, setRegistration] = useState(null)
  
  const handleSearch = async (e) => {
    e.preventDefault()
    if (!email) return
    
    setLoading(true)
    setError(null)
    
    try {
      const result = await getUserInvoices(email)
      
      if (result.invoices.length === 0) {
        setError('No invoices found for this email address.')
      } else {
        setInvoices(result.invoices)
        setRegistration(result.registration)
      }
    } catch (err) {
      setError('An error occurred. Please try again.')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }
  
  return (
    <div className="invoice-lookup">
      <h1>Find Your Invoice</h1>
      
      <form onSubmit={handleSearch}>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Enter your registration email"
          required
        />
        <button type="submit" disabled={loading}>
          {loading ? 'Searching...' : 'Search'}
        </button>
      </form>
      
      {error && <div className="error">{error}</div>}
      
      {invoices.length > 0 && (
        <div className="invoices-list">
          <h2>Your Invoices</h2>
          {invoices.map(invoice => (
            <div key={invoice.id} className="invoice-card">
              <h3>Invoice #{invoice.id.slice(0, 8)}</h3>
              <div className="invoice-details">
                <p><strong>Total:</strong> ${(invoice.total / 100).toFixed(2)}</p>
                <p><strong>Paid:</strong> ${(invoice.paid / 100).toFixed(2)}</p>
                <p><strong>Balance:</strong> ${(invoice.balance / 100).toFixed(2)}</p>
                <p><strong>Status:</strong> 
                  <span className={`status ${invoice.status}`}>
                    {invoice.status.toUpperCase()}
                  </span>
                </p>
              </div>
              
              <div className="invoice-items">
                <h4>Items:</h4>
                {invoice.lines.map((line, idx) => (
                  <div key={idx} className="invoice-line">
                    <span>{line.academy}</span>
                    {line.level && line.level !== 'N/A' && <span> - {line.level}</span>}
                    {line.schedule && <span> ({line.schedule})</span>}
                    {/* Period only shown for legacy invoices (2025 and earlier) */}
                    {line.period && <span> - Period {line.period}</span>}
                    <span className="price">${(line.amount / 100).toFixed(2)}</span>
                  </div>
                ))}
              </div>
              
              {invoice.balance > 0 && (
                <div className="payment-info">
                  <p>Payment Methods:</p>
                  <ul>
                    <li>Zelle: orlando@iyfusa.org</li>
                    <li>Cash: At IYF Orlando office</li>
                    <li>Check: Payable to IYF Orlando</li>
                  </ul>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
```

## 📝 Notas Importantes

1. **Conversión de Centavos a Dólares**: Los precios en Firestore están en centavos, así que divide por 100 para mostrar en dólares.

2. **Seguridad**: Aunque las reglas permiten lectura pública, considera agregar validación adicional:
   - Verificar que el email coincida exactamente
   - Limitar el número de búsquedas por IP
   - Agregar CAPTCHA para prevenir abuso

3. **Privacidad**: Los usuarios solo pueden ver sus propios invoices porque:
   - Buscan por su email específico
   - El sistema solo retorna invoices asociados a ese email

4. **Timing**: El invoice se genera automáticamente cuando se detecta un nuevo registro, pero puede tomar unos segundos. Considera mostrar un mensaje como "Your invoice will be available shortly" si no se encuentra inmediatamente.

## 🚀 Pasos para Implementar

1. **Crear el servicio de búsqueda** (`services/invoiceService.js`)
2. **Crear la página de búsqueda** (`pages/InvoiceLookupPage.jsx`)
3. **Agregar la ruta** en tu router
4. **Probar** con un email de prueba
5. **Agregar link** en la página de confirmación de registro
