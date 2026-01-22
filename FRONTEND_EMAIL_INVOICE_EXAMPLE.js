/**
 * Ejemplo completo de cómo enviar email con invoice después del registro
 * 
 * Este código debe ir en el frontend (iyforlando)
 * 
 * Pasos:
 * 1. Instalar: npm install @emailjs/browser
 * 2. Configurar EmailJS (ver EMAIL_INVOICE_SETUP.md)
 * 3. Reemplazar las constantes con tus credenciales
 * 4. Usar en tu componente de registro
 */

import emailjs from '@emailjs/browser'
import { 
  collection, 
  addDoc, 
  query, 
  where, 
  getDocs, 
  onSnapshot,
  serverTimestamp 
} from 'firebase/firestore'
import { db } from './firebase'
import { COLLECTIONS_CONFIG } from './config/shared.js'

// ============================================
// CONFIGURACIÓN - Reemplazar con tus valores
// ============================================
const EMAILJS_CONFIG = {
  SERVICE_ID: 'YOUR_SERVICE_ID',        // De EmailJS > Email Services
  TEMPLATE_ID: 'YOUR_TEMPLATE_ID',      // De EmailJS > Email Templates
  PUBLIC_KEY: 'YOUR_PUBLIC_KEY'         // De EmailJS > Account > General
}

// Inicializar EmailJS (solo una vez en tu app)
emailjs.init(EMAILJS_CONFIG.PUBLIC_KEY)

// URLs de tu sitio
const SITE_URL = 'https://www.iyforlando.org'
const INVOICE_BASE_URL = `${SITE_URL}/invoice`
const INVOICE_LOOKUP_URL = `${SITE_URL}/invoice-lookup`

// ============================================
// FUNCIÓN: Enviar Email con Invoice
// ============================================
export async function sendInvoiceEmail({
  to,
  studentName,
  registrationId,
  invoiceId,
  total,
  invoiceStatus = 'unpaid'
}) {
  try {
    const invoiceUrl = `${INVOICE_BASE_URL}/${registrationId}`
    const shortInvoiceId = invoiceId.slice(0, 8).toUpperCase()
    
    const templateParams = {
      to_email: to,
      to_name: studentName,
      invoice_id: shortInvoiceId,
      invoice_url: invoiceUrl,
      invoice_lookup_url: INVOICE_LOOKUP_URL,
      total_amount: `$${(total / 100).toFixed(2)}`,
      registration_id: registrationId,
      invoice_status: invoiceStatus.toUpperCase(),
      from_name: 'IYF Orlando',
      reply_to: 'orlando@iyfusa.org',
      contact_email: 'orlando@iyfusa.org',
      contact_phone: '(407) 900-3442',
      office_address: '320 S Park Ave, Sanford, FL 32771'
    }
    
    const response = await emailjs.send(
      EMAILJS_CONFIG.SERVICE_ID,
      EMAILJS_CONFIG.TEMPLATE_ID,
      templateParams
    )
    
    console.log('✅ Invoice email sent successfully:', response)
    return { 
      success: true, 
      messageId: response.text,
      invoiceUrl 
    }
  } catch (error) {
    console.error('❌ Error sending invoice email:', error)
    throw error
  }
}

// ============================================
// FUNCIÓN: Esperar a que se genere el Invoice
// ============================================
/**
 * Espera a que el admin dashboard genere el invoice automáticamente
 * Retorna el invoice cuando esté disponible o null si hay timeout
 */
export function waitForInvoice(registrationId, timeoutMs = 30000) {
  return new Promise((resolve, reject) => {
    const invoicesRef = collection(db, COLLECTIONS_CONFIG.academyInvoices)
    const invoicesQuery = query(
      invoicesRef,
      where('studentId', '==', registrationId)
    )
    
    let resolved = false
    
    // Timeout
    const timeout = setTimeout(() => {
      if (!resolved) {
        resolved = true
        unsubscribe()
        reject(new Error('Invoice generation timeout. Please check back later or use the invoice lookup page.'))
      }
    }, timeoutMs)
    
    // Escuchar cambios
    const unsubscribe = onSnapshot(
      invoicesQuery,
      (snapshot) => {
        if (!snapshot.empty && !resolved) {
          const invoice = snapshot.docs[0]
          resolved = true
          clearTimeout(timeout)
          unsubscribe()
          
          resolve({
            id: invoice.id,
            ...invoice.data()
          })
        }
      },
      (error) => {
        if (!resolved) {
          resolved = true
          clearTimeout(timeout)
          unsubscribe()
          reject(error)
        }
      }
    )
  })
}

// ============================================
// FUNCIÓN: Procesar Registro y Enviar Email
// ============================================
/**
 * Función principal que:
 * 1. Guarda el registro
 * 2. Espera a que se genere el invoice
 * 3. Envía el email con el link al invoice
 */
export async function processRegistrationAndSendInvoice(registrationData) {
  try {
    // 1. Guardar el registro en Firestore
    console.log('📝 Saving registration...')
    const registrationRef = await addDoc(
      collection(db, COLLECTIONS_CONFIG.springAcademy2026),
      {
        ...registrationData,
        email: registrationData.email.toLowerCase().trim(), // Normalizar email
        createdAt: serverTimestamp()
      }
    )
    
    const registrationId = registrationRef.id
    console.log('✅ Registration saved:', registrationId)
    
    // 2. Esperar a que se genere el invoice (el admin dashboard lo hace automáticamente)
    console.log('⏳ Waiting for invoice generation...')
    let invoice
    
    try {
      invoice = await waitForInvoice(registrationId, 30000) // 30 segundos máximo
      console.log('✅ Invoice generated:', invoice.id)
    } catch (error) {
      // Si hay timeout, aún así continuar (el invoice se generará después)
      console.warn('⚠️ Invoice not ready yet:', error.message)
      throw new Error('Your registration was successful! Your invoice will be generated shortly. Please check your email or visit the invoice lookup page in a few minutes.')
    }
    
    // 3. Preparar datos para el email
    const studentName = registrationData.firstName && registrationData.lastName
      ? `${registrationData.firstName} ${registrationData.lastName}`
      : registrationData.firstName || registrationData.lastName || 'Student'
    
    // 4. Enviar email con el invoice
    console.log('📧 Sending invoice email...')
    const emailResult = await sendInvoiceEmail({
      to: registrationData.email,
      studentName,
      registrationId,
      invoiceId: invoice.id,
      total: invoice.total,
      invoiceStatus: invoice.status
    })
    
    console.log('✅ Email sent successfully!')
    
    return {
      success: true,
      registrationId,
      invoiceId: invoice.id,
      invoiceUrl: emailResult.invoiceUrl,
      message: 'Registration successful! Check your email for your invoice.'
    }
    
  } catch (error) {
    console.error('❌ Error in registration process:', error)
    
    // Aún así retornar éxito si el registro se guardó
    // El invoice se generará después y el usuario puede buscarlo
    return {
      success: true,
      warning: true,
      message: error.message || 'Registration successful! Your invoice will be available shortly. Please check your email or visit the invoice lookup page.'
    }
  }
}

// ============================================
// EJEMPLO DE USO EN COMPONENTE REACT
// ============================================
/*
import { processRegistrationAndSendInvoice } from './services/emailInvoiceService'

function RegistrationForm() {
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState(null)
  
  const handleSubmit = async (formData) => {
    setLoading(true)
    setMessage(null)
    
    try {
      // 2026 Structure: No periods, use selectedAcademies array
      const result = await processRegistrationAndSendInvoice({
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        cellNumber: formData.cellNumber,
        birthday: formData.birthday,
        age: formData.age,
        gender: formData.gender,
        address: formData.address,
        city: formData.city,
        state: formData.state,
        zipCode: formData.zipCode,
        // NEW 2026 STRUCTURE: Array of selected academies (no periods)
        selectedAcademies: formData.selectedAcademies.map(sel => ({
          academy: sel.academy,
          level: sel.level || 'N/A',
          schedule: sel.schedule || null
        })),
        // LEGACY: Still supported for backward compatibility
        // firstPeriod: { academy: formData.firstPeriodAcademy, level: formData.firstPeriodLevel },
        // secondPeriod: { academy: formData.secondPeriodAcademy, level: formData.secondPeriodLevel },
        termsAccepted: true,
        confirmEmail: formData.email
      })
      
      if (result.success) {
        setMessage({
          type: result.warning ? 'warning' : 'success',
          text: result.message
        })
        
        // Opcional: Redirigir a página de confirmación
        if (result.invoiceUrl) {
          // window.location.href = `/registration-success?invoice=${result.invoiceId}`
        }
      }
    } catch (error) {
      setMessage({
        type: 'error',
        text: 'Registration failed. Please try again.'
      })
    } finally {
      setLoading(false)
    }
  }
  
  return (
    <form onSubmit={handleSubmit}>
      {/* Campos del formulario */}
      {message && (
        <div className={`message ${message.type}`}>
          {message.text}
        </div>
      )}
      <button type="submit" disabled={loading}>
        {loading ? 'Registering...' : 'Submit Registration'}
      </button>
    </form>
  )
}
*/

// ============================================
// FUNCIÓN ALTERNATIVA: Reintentar envío de email
// ============================================
/**
 * Si el email no se envió inicialmente, esta función permite reintentarlo
 */
export async function resendInvoiceEmail(registrationId, userEmail) {
  try {
    // Buscar el invoice
    const invoicesRef = collection(db, COLLECTIONS_CONFIG.academyInvoices)
    const q = query(
      invoicesRef,
      where('studentId', '==', registrationId)
    )
    const snapshot = await getDocs(q)
    
    if (snapshot.empty) {
      throw new Error('Invoice not found. Please contact support.')
    }
    
    const invoice = snapshot.docs[0]
    const invoiceData = invoice.data()
    
    // Buscar datos del registro para obtener el nombre
    const registrationRef = collection(db, COLLECTIONS_CONFIG.springAcademy2026)
    const registrationDoc = await getDocs(
      query(registrationRef, where('__name__', '==', registrationId))
    )
    
    let studentName = 'Student'
    if (!registrationDoc.empty) {
      const regData = registrationDoc.docs[0].data()
      studentName = regData.firstName && regData.lastName
        ? `${regData.firstName} ${regData.lastName}`
        : regData.firstName || regData.lastName || 'Student'
    }
    
    // Enviar email
    return await sendInvoiceEmail({
      to: userEmail,
      studentName,
      registrationId,
      invoiceId: invoice.id,
      total: invoiceData.total,
      invoiceStatus: invoiceData.status
    })
  } catch (error) {
    console.error('Error resending invoice email:', error)
    throw error
  }
}
