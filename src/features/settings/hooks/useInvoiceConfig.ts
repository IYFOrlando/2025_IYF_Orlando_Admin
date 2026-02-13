import { useState, useEffect } from 'react'
import { supabase } from '../../../lib/supabase'

export interface InvoiceConfig {
  organizationName: string
  addressLine1: string
  addressLine2: string
  phone: string
  email: string
  currentSemester: string
  semesterStartDate?: string
  semesterEndDate?: string
}

const DEFAULT_CONFIG: InvoiceConfig = {
  organizationName: 'IYF Orlando',
  addressLine1: '320 S Park Ave',
  addressLine2: 'Sanford, FL 32771',
  phone: '407-900-3442',
  email: 'orlando@iyfusa.org',
  currentSemester: '2026 Spring Semester',
}

/**
 * Hook to get invoice configuration
 * Tries to load from Supabase app_settings, falls back to defaults
 */
export function useInvoiceConfig() {
  const [config, setConfig] = useState<InvoiceConfig>(DEFAULT_CONFIG)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const { data, error } = await supabase
          .from('app_settings')
          .select('value')
          .eq('key', 'invoice_config')
          .limit(1)

        if (!error && data && data.length > 0 && data[0].value) {
          setConfig({ ...DEFAULT_CONFIG, ...data[0].value })
        } else {
          // Use defaults - this is expected if table doesn't exist
          setConfig(DEFAULT_CONFIG)
        }
      } catch {
        // Silently fall back to defaults
        setConfig(DEFAULT_CONFIG)
      } finally {
        setLoading(false)
      }
    }

    fetchConfig()
  }, [])

  return { config, loading }
}
