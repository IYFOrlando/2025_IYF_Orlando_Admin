export type Period = { academy?: string; level?: string }
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
  firstPeriod?: Period
  secondPeriod?: Period
  createdAt?: any
}