/**
 * Auto Invoice Generator
 * Automatically creates invoices when new registrations are created
 */

import { 
  collection, 
  addDoc, 
  query, 
  where, 
  getDocs, 
  serverTimestamp,
  doc,
  getDoc,
  orderBy
} from 'firebase/firestore'
import { db } from './firebase'
import { COLLECTIONS_CONFIG } from '../config/shared.js'
import { logger } from './logger'
import type { Registration } from '../features/registrations/types'
import type { Invoice, InvoiceLine } from '../features/payments/types'
import type { PricingDoc } from '../features/payments/types'

const PRICING_DOC_PATH = ['settings', 'pricing'] as const
const ACADEMIES_COLLECTION = 'academies_2026_spring'

/**
 * Get pricing configuration from Firestore
 * Tries to get from settings/pricing first, then from academies collection
 */
async function getPricing(): Promise<PricingDoc | null> {
  try {
    // First try settings/pricing
    const pricingRef = doc(db, ...PRICING_DOC_PATH)
    const pricingSnap = await getDoc(pricingRef)
    if (pricingSnap.exists()) {
      return pricingSnap.data() as PricingDoc
    }
    
    // If not found, try to build from academies collection
    try {
      const academiesRef = collection(db, ACADEMIES_COLLECTION)
      const academiesSnapshot = await getDocs(query(academiesRef, orderBy('order', 'asc')))
      
      const academyPrices: Record<string, number> = {}
      academiesSnapshot.forEach((docSnap) => {
        const academy = docSnap.data()
        if (academy.name && typeof academy.price === 'number') {
          // Store in cents (academy.price is in dollars, convert to cents)
          const normalized = normalizeAcademy(academy.name)
          academyPrices[normalized] = academy.price * 100
        }
      })
      
      if (Object.keys(academyPrices).length > 0) {
        return {
          academyPrices,
          lunch: { semester: 40, single: 4 },
          currency: 'USD',
        } as PricingDoc
      }
    } catch (academiesError) {
      logger.warn('Could not fetch from academies collection', academiesError)
    }
    
    return null
  } catch (error) {
    logger.error('Error fetching pricing', error)
    return null
  }
}

/**
 * Normalize academy name for consistent lookup
 */
function normalizeAcademy(academy?: string): string {
  if (!academy) return ''
  return academy.trim().toLowerCase()
}

/**
 * Get price for an academy from pricing config
 * Updated for 2026: No periods, just academies
 */
function getAcademyPrice(
  academy: string | undefined,
  level: string | undefined,
  pricing: PricingDoc | null
): number {
  if (!academy || academy === 'N/A') return 0
  
  const normalized = normalizeAcademy(academy)
  
  // Try to get price from pricing config
  if (pricing?.academyPrices?.[normalized]) {
    return Number(pricing.academyPrices[normalized]) || 0
  }
  
  // Default pricing fallback for 2026 Spring Semester (in cents)
  const defaultPrices: Record<string, number> = {
    'art': 10000, // $100
    'english': 5000, // $50
    'kids academy': 5000, // $50
    'korean language': 5000, // $50
    'piano': 10000, // $100
    'pickleball': 5000, // $50
    'soccer': 5000, // $50
    'taekwondo': 10000, // $100
    // Legacy academies (mantener compatibilidad con datos antiguos)
    'korean cooking': 4000, // $40
    'stretch and strengthen': 4000, // $40
    'diy': 8000, // $80
    'senior': 4000, // $40
    'kids': 5000, // $50 (alias de Kids Academy)
  }
  
  return defaultPrices[normalized] || 5000 // Default $50
}

/**
 * Create invoice lines from registration academies
 * Updated for 2026: Supports both old structure (firstPeriod/secondPeriod) 
 * and new structure (selectedAcademies array or single academies)
 */
function createInvoiceLines(
  registration: Registration,
  pricing: PricingDoc | null
): InvoiceLine[] {
  const lines: InvoiceLine[] = []
  
  // NEW STRUCTURE (2026): Check for selectedAcademies array
  // This is how the frontend might store multiple academies
  if ((registration as any).selectedAcademies && Array.isArray((registration as any).selectedAcademies)) {
    const selectedAcademies = (registration as any).selectedAcademies
    selectedAcademies.forEach((academyData: any) => {
      if (academyData.academy && academyData.academy !== 'N/A') {
        const price = getAcademyPrice(
          academyData.academy,
          academyData.level,
          pricing
        )
        
        lines.push({
          academy: academyData.academy,
          period: null, // No periods in 2026
          level: academyData.level || null,
          schedule: academyData.schedule || null, // Include schedule if available
          unitPrice: price,
          qty: 1,
          amount: price,
        })
      }
    })
    return lines
  }
  
  // LEGACY STRUCTURE: Support firstPeriod/secondPeriod for backward compatibility
  // This handles old registrations that might still have this structure
  if (registration.firstPeriod?.academy && registration.firstPeriod.academy !== 'N/A') {
    const price = getAcademyPrice(
      registration.firstPeriod.academy,
      registration.firstPeriod.level,
      pricing
    )
    
    lines.push({
      academy: registration.firstPeriod.academy,
      period: null, // No periods in 2026, but keep for compatibility
      level: registration.firstPeriod.level || null,
      unitPrice: price,
      qty: 1,
      amount: price,
    })
  }
  
  // Only add secondPeriod if it's different from firstPeriod (avoid duplicates)
  if (
    registration.secondPeriod?.academy && 
    registration.secondPeriod.academy !== 'N/A' &&
    registration.secondPeriod.academy !== registration.firstPeriod?.academy
  ) {
    const price = getAcademyPrice(
      registration.secondPeriod.academy,
      registration.secondPeriod.level,
      pricing
    )
    
    lines.push({
      academy: registration.secondPeriod.academy,
      period: null, // No periods in 2026
      level: registration.secondPeriod.level || null,
      unitPrice: price,
      qty: 1,
      amount: price,
    })
  }
  
  return lines
}

/**
 * Check if an invoice already exists for a registration
 */
async function invoiceExists(studentId: string): Promise<boolean> {
  try {
    const invoicesRef = collection(db, COLLECTIONS_CONFIG.academyInvoices)
    const q = query(
      invoicesRef,
      where('studentId', '==', studentId),
      where('status', 'in', ['unpaid', 'partial'])
    )
    const snapshot = await getDocs(q)
    return !snapshot.empty
  } catch (error) {
    logger.error('Error checking existing invoice', error)
    return false
  }
}

/**
 * Automatically create an invoice for a registration
 */
export async function createAutoInvoice(registration: Registration): Promise<string | null> {
  try {
    // Check if invoice already exists
    const exists = await invoiceExists(registration.id)
    if (exists) {
      logger.info(`Invoice already exists for registration ${registration.id}`)
      return null
    }
    
    // Get pricing configuration
    const pricing = await getPricing()
    
    // Create invoice lines from registration periods
    const lines = createInvoiceLines(registration, pricing)
    
    // If no lines, don't create invoice
    if (lines.length === 0) {
      logger.info(`No academy periods found for registration ${registration.id}`)
      return null
    }
    
    // Calculate totals
    const subtotal = lines.reduce((sum, line) => sum + (line.amount || 0), 0)
    const total = subtotal
    const paid = 0
    const balance = total
    
    // Get student name
    const studentName = registration.firstName && registration.lastName
      ? `${registration.firstName} ${registration.lastName}`
      : registration.firstName || registration.lastName || 'Unknown'
    
    // Create invoice
    const invoiceRef = await addDoc(collection(db, COLLECTIONS_CONFIG.academyInvoices), {
      studentId: registration.id,
      studentName,
      lines,
      subtotal,
      lunch: {
        semesterSelected: false,
        singleQty: 0,
        prices: {
          semester: pricing?.lunch?.semester || 4000,
          single: pricing?.lunch?.single || 400,
        },
      },
      lunchAmount: 0,
      discountAmount: 0,
      discountNote: null,
      total,
      paid,
      balance,
      status: 'unpaid' as const,
      method: null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    } as Omit<Invoice, 'id'>)
    
    logger.info(`Auto-created invoice ${invoiceRef.id} for registration ${registration.id}`)
    return invoiceRef.id
  } catch (error) {
    logger.error('Error creating auto invoice', error)
    throw error
  }
}

/**
 * Process all registrations without invoices and create them
 */
export async function processPendingRegistrations(): Promise<number> {
  try {
    const registrationsRef = collection(db, COLLECTIONS_CONFIG.fallAcademy)
    const registrationsSnapshot = await getDocs(registrationsRef)
    
    let processed = 0
    const pricing = await getPricing()
    
    for (const docSnap of registrationsSnapshot.docs) {
      const registration = { id: docSnap.id, ...docSnap.data() } as Registration
      
      // Check if invoice exists
      const exists = await invoiceExists(registration.id)
      if (exists) continue
      
      // Create invoice
      try {
        await createAutoInvoice(registration)
        processed++
      } catch (error) {
        logger.error(`Error processing registration ${registration.id}`, error)
      }
    }
    
    return processed
  } catch (error) {
    logger.error('Error processing pending registrations', error)
    throw error
  }
}
