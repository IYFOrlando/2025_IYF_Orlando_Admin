import { createClient } from '@supabase/supabase-js'

// We will replace these with the real values you give me
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || ''
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

// Create a single supabase client for interacting with your database
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Helper to check if connection is working
export const checkSupabaseConnection = async () => {
  try {
    const { data, error } = await supabase.from('academies').select('count', { count: 'exact', head: true })
    if (error) throw error
    return true
  } catch (err) {
    console.error('Supabase connection check failed:', err)
    return false
  }
}
