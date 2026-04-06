import { supabase } from '../../../lib/supabase'

export interface PicnicSignup {
  id: number
  first_name: string
  last_name: string
  email: string
  phone?: string
  guests: number
  items_claimed: string[]
  created_at: string
}

export interface PicnicStats {
  totalRegistrations: number
  totalGuests: number
  totalPotluckItems: number
}

/** Fetch all picnic signups */
export async function getPicnicSignups(): Promise<PicnicSignup[]> {
  const { data, error } = await supabase
    .from('picnic_signups')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching picnic signups:', error)
    throw error
  }

  return data || []
}

/** Get aggregated stats for the picnic */
export async function getPicnicStats(): Promise<PicnicStats> {
  const { data, error } = await supabase
    .from('picnic_signups')
    .select('guests, items_claimed')

  if (error) {
    console.error('Error fetching picnic stats:', error)
    throw error
  }

  const totalRegistrations = data.length
  let totalAdditionalGuests = 0
  let totalPotluckItems = 0

  data.forEach(row => {
    totalAdditionalGuests += (row.guests || 0)
    totalPotluckItems += (row.items_claimed?.length || 0)
  })

  return {
    totalRegistrations,
    totalGuests: totalRegistrations + totalAdditionalGuests,
    totalPotluckItems
  }
}

/** Delete a signup */
export async function deletePicnicSignup(id: number): Promise<void> {
  const { error } = await supabase
    .from('picnic_signups')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('Error deleting picnic signup:', error)
    throw error
  }
}
