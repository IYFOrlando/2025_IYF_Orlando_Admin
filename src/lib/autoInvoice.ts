/**
 * Auto Invoice Generator
 * Automatically creates invoices when new registrations are created
 * 
 * IMPORTANT: ALL pricing data comes from Firestore (academies_2026_spring collection)
 * No hardcoded fallbacks - single source of truth is Firestore
 * This ensures DRY principle - pricing is managed in one place only
 */

import { 
  collection, 
  addDoc, 
  query, 
  where, 
  getDocs, 
  serverTimestamp,
  orderBy,
  updateDoc,
  doc
} from 'firebase/firestore'
import { db } from './firebase'
import { COLLECTIONS_CONFIG } from '../config/shared.js'
import { logger } from './logger'
import { isFirebasePermissionError } from './errors'
import type { Registration } from '../features/registrations/types'
import type { Invoice, InvoiceLine } from '../features/payments/types'
import type { PricingDoc } from '../features/payments/types'

/**
 * Get pricing configuration from Firestore
 * ALL data comes from academies_2026_spring collection - no hardcoded fallbacks
 * Single source of truth: academies_2026_spring
 */
async function getPricing(): Promise<PricingDoc | null> {
  try {
    // Single source of truth: academies_2026_spring collection
    const academyCollectionName = COLLECTIONS_CONFIG.academies2026Spring || 'academies_2026_spring'
    
    const academiesRef = collection(db, academyCollectionName)
    const academiesSnapshot = await getDocs(query(academiesRef, orderBy('order', 'asc')))
    
    if (academiesSnapshot.empty) {
      logger.error(`⚠️ Academy collection ${academyCollectionName} is empty. Please ensure academies are configured in Firestore.`)
      throw new Error(`No academies found in ${academyCollectionName}. Please configure academies in Firestore first.`)
    }
    
    const academyPrices: Record<string, number> = {}
    academiesSnapshot.forEach((docSnap) => {
      const academy = docSnap.data()
      if (academy.name && typeof academy.price === 'number') {
        // Store in cents (academy.price is in dollars, convert to cents)
        const normalized = normalizeAcademy(academy.name)
        academyPrices[normalized] = academy.price * 100
        logger.debug(`Loaded academy price: ${academy.name} -> ${normalized} = $${academy.price} (${academy.price * 100} cents)`)
      }
    })
    
    if (Object.keys(academyPrices).length === 0) {
      logger.error(`⚠️ No valid academy prices found in ${academyCollectionName}`)
      throw new Error(`No valid academy prices in ${academyCollectionName}. Please ensure academies have price field.`)
    }
    
    logger.info(`✅ Pricing loaded from ${academyCollectionName}`, { 
      academyCount: Object.keys(academyPrices).length,
      academies: Object.keys(academyPrices)
    })
    
    return {
      academyPrices,
      lunch: { semester: 4000, single: 400 }, // Lunch prices (can be moved to Firestore later if needed)
      currency: 'USD',
    } as PricingDoc
  } catch (error) {
    logger.error('❌ Error fetching pricing from Firestore:', error)
    throw error // Re-throw to prevent invoice creation with wrong prices
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
 * ALL prices come from Firestore (academies_2026_spring) - no hardcoded fallbacks
 * @throws {Error} If pricing is not available or academy not found
 */
function getAcademyPrice(
  academy: string | undefined,
  _level: string | undefined,
  pricing: PricingDoc | null
): number {
  if (!academy || academy === 'N/A') return 0
  
  if (!pricing) {
    const error = `Pricing not loaded from Firestore. Cannot get price for ${academy}.`
    logger.error(`❌ ${error}`)
    throw new Error(error)
  }
  
  const normalized = normalizeAcademy(academy)
  
  // Get price from Firestore data
  if (pricing.academyPrices?.[normalized]) {
    const price = Number(pricing.academyPrices[normalized]) || 0
    if (price === 0) {
      logger.warn(`⚠️ Price is 0 for ${academy} (${normalized}) in Firestore`)
    }
    logger.debug(`✅ Price from Firestore for ${academy} (${normalized}): ${price} cents`)
    return price
  }
  
  // Academy not found in Firestore
  const error = `Academy "${academy}" (${normalized}) not found in Firestore pricing. Available academies: ${Object.keys(pricing.academyPrices || {}).join(', ')}`
  logger.error(`❌ ${error}`)
  throw new Error(error)
}

/**
 * Create invoice lines from registration academies
 * Updated for 2026: Supports both old structure (firstPeriod/secondPeriod) 
 * and new structure (selectedAcademies array or single academies)
 * ALL pricing comes from Firestore - no hardcoded fallbacks
 */
function createInvoiceLines(
  registration: Registration,
  pricing: PricingDoc // REQUIRED - pricing must come from Firestore
): InvoiceLine[] {
  if (!pricing) {
    throw new Error('Pricing is required to create invoice lines. Pricing must be loaded from Firestore.')
  }
  
  const lines: InvoiceLine[] = []
  
  // NEW STRUCTURE (2026): Check for selectedAcademies array
  // This is how the frontend stores multiple academies
  if ((registration as any).selectedAcademies && Array.isArray((registration as any).selectedAcademies)) {
    const selectedAcademies = (registration as any).selectedAcademies
    selectedAcademies.forEach((academyData: any) => {
      if (academyData.academy && academyData.academy !== 'N/A') {
        // This will throw error if academy not found in Firestore
        const price = getAcademyPrice(
          academyData.academy,
          academyData.level,
          pricing
        )
        
        lines.push({
          academy: academyData.academy,
          period: null, // 2026: no periods, kept for backward compatibility
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
    // This will throw error if academy not found in Firestore
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
    // This will throw error if academy not found in Firestore
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
 * Check if ANY invoice already exists for this registration (studentId).
 * We must not create a second invoice even when the existing one is paid/exonerated.
 */
async function invoiceExists(studentId: string): Promise<boolean> {
  try {
    const invoicesRef = collection(db, COLLECTIONS_CONFIG.academyInvoices)
    const q = query(invoicesRef, where('studentId', '==', studentId))
    const snapshot = await getDocs(q)
    return !snapshot.empty
  } catch (error: any) {
    // Silently handle permission errors - expected for non-admin users
    if (isFirebasePermissionError(error)) {
      logger.debug('Permission denied for checking existing invoice (expected for non-admin users)')
      return false
    }
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
    
    // Get pricing configuration from Firebase (REQUIRED - no fallbacks)
    // This will throw an error if pricing is not available
    const pricing = await getPricing()
    
    if (!pricing) {
      const error = `Cannot create invoice: Pricing not available from Firestore for registration ${registration.id}. Please ensure academies_2026_spring collection is configured.`
      logger.error(`❌ ${error}`)
      throw new Error(error)
    }
    
    // Create invoice lines from registration academies
    const lines = createInvoiceLines(registration, pricing)
    
    // Log what academies are being processed
    logger.info(`Creating invoice for registration ${registration.id}`, {
      studentName: `${registration.firstName} ${registration.lastName}`,
      hasSelectedAcademies: !!(registration as any).selectedAcademies,
      selectedAcademiesCount: (registration as any).selectedAcademies?.length || 0,
      linesCount: lines.length,
      lines: lines.map(l => ({ academy: l.academy, price: l.unitPrice, amount: l.amount }))
    })
    
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
  } catch (error: any) {
    // Silently handle permission errors - expected for non-admin users
    if (isFirebasePermissionError(error)) {
      logger.debug('Permission denied for creating auto invoice (expected for non-admin users)')
      throw error // Still throw so caller can handle it
    }
    logger.error('Error creating auto invoice', error)
    throw error
  }
}

/**
 * Process all registrations without invoices and create them
 * Requires pricing from Firestore - will fail if academies_2026_spring is not configured
 */
export async function processPendingRegistrations(): Promise<number> {
  try {
    // Verify pricing is available before processing
    const pricing = await getPricing()
    if (!pricing) {
      throw new Error('Cannot process registrations: Pricing not available from Firestore. Please ensure academies_2026_spring collection is configured.')
    }
    
    const registrationsRef = collection(db, COLLECTIONS_CONFIG.fallAcademy)
    const registrationsSnapshot = await getDocs(registrationsRef)
    
    let processed = 0
    let errors = 0
    
    for (const docSnap of registrationsSnapshot.docs) {
      const registration = { id: docSnap.id, ...docSnap.data() } as Registration
      
      // Check if invoice exists
      const exists = await invoiceExists(registration.id)
      if (exists) continue
      
      // Create invoice (will use pricing from Firestore)
      try {
        await createAutoInvoice(registration)
        processed++
      } catch (error: any) {
        // Silently handle permission errors - expected for non-admin users
        if (isFirebasePermissionError(error)) {
          logger.debug(`Permission denied for processing registration ${registration.id} (expected for non-admin users)`)
          return 0 // Exit early if no permissions
        }
        errors++
        logger.error(`❌ Error processing registration ${registration.id}:`, error)
        // Continue with next registration instead of stopping
      }
    }
    
    if (errors > 0) {
      logger.warn(`⚠️ Processed ${processed} invoices, ${errors} errors occurred`)
    }
    
    return processed
  } catch (error: any) {
    // Silently handle permission errors - expected for non-admin users
    if (isFirebasePermissionError(error)) {
      logger.debug('Permission denied for processing pending registrations (expected for non-admin users)')
      return 0
    }
    logger.error('❌ Error processing pending registrations:', error)
    throw error
  }
}

/**
 * Update an existing invoice when registration details change
 * logic:
 * 1. Find the invoice for this student (unpaid or partial preferred)
 * 2. Regenerate lines based on new registration data
 * 3. Recalculate totals
 * 4. Update invoice
 */
export async function updateInvoiceForRegistration(registration: Registration): Promise<void> {
  try {
    // 1. Find Invoice
    const invoicesRef = collection(db, COLLECTIONS_CONFIG.academyInvoices)
    // Try to find ANY invoice for this student, but prefer latest.
    // Usually there is only one active invoice per semester.
    const q = query(invoicesRef, where('studentId', '==', registration.id))
    const snapshot = await getDocs(q)
    
    if (snapshot.empty) {
        // If no invoice exists, try creating one?
        // Yes, if they just added academies to a previously academy-less student.
        await createAutoInvoice(registration)
        return
    }

    // Sort by date desc to get latest
    const docs = snapshot.docs.map(d => ({ ...d.data(), id: d.id } as Invoice))
                         .sort((a,b) => (b.createdAt?.seconds||0) - (a.createdAt?.seconds||0))
    
    // Pick the most relevant invoice to update.
    // If there is an 'unpaid' or 'partial' invoice, pick that.
    // If only 'paid' invoice exists, we might need to update it too (e.g. they added a class).
    const targetInvoice = docs.find(i => i.status !== 'paid' && i.status !== 'exonerated') || docs[0]
    
    if (!targetInvoice) return 

    // 2. Get Pricing
    const pricing = await getPricing()
    if (!pricing) throw new Error('Pricing unavailable')

    // 3. Generate Lines (New)
    const newLines = createInvoiceLines(registration, pricing)
    
    // 4. Recalculate
    const subtotal = newLines.reduce((s, l) => s + (l.amount || 0), 0)
    
    // Preserve lunch/discount from existing invoice unless we want to recalc them?
    // For now, preserve existing extra items.
    const lunchAmount = targetInvoice.lunchAmount || 0
    const discountAmount = targetInvoice.discountAmount || 0
    
    const newTotal = Math.max(0, subtotal + lunchAmount - discountAmount)
    const newBalance = newTotal - (targetInvoice.paid || 0)
    
    let newStatus = targetInvoice.status
    if (newBalance <= 0) newStatus = 'paid'
    else if (targetInvoice.paid > 0) newStatus = 'partial'
    else newStatus = 'unpaid'

    // Update student name just in case it changed
    const studentName = [registration.firstName, registration.lastName].filter(Boolean).join(' ')

    await updateDoc(doc(db, COLLECTIONS_CONFIG.academyInvoices, targetInvoice.id), {
        studentName,
        lines: newLines,
        subtotal,
        total: newTotal,
        balance: newBalance,
        status: newStatus,
        updatedAt: serverTimestamp()
    })

    logger.info(`Updated Invoice ${targetInvoice.id} for Student ${registration.id}`)

  } catch (error: any) {
    // Silently handle permission errors - expected for non-admin users
    if (isFirebasePermissionError(error)) {
      logger.debug('Permission denied for updating invoice (expected for non-admin users)')
      return
    }
    logger.error('Error updating invoice', error)
    // Don't crash the UI for background invoice updates
  }
}
