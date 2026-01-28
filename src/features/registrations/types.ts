export type Period = { academy?: string; level?: string }
export type SelectedAcademy = {
  academy?: string
  level?: string
  schedule?: string | null
}
export type Registration = {
  id: string
  firstName?: string
  lastName?: string
  cellNumber?: string
  email?: string
  city?: string
  state?: string
  birthday?: string
  gender?: string
  confirmEmail?: string
  address?: string
  zipCode?: string
  age?: number | string
  firstPeriod?: Period // Legacy: for old registrations
  secondPeriod?: Period // Legacy: for old registrations
  selectedAcademies?: SelectedAcademy[] // 2026: new structure with array of academies
  createdAt?: any
  isDuplicate?: boolean // Mark duplicate registrations
  guardianName?: string
  guardianPhone?: string
  tShirtSize?: string
}