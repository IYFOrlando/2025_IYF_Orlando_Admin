import * as React from 'react'

export interface GeolocationData {
  latitude: number
  longitude: number
  accuracy?: number
  address?: string
}

export interface GeolocationError {
  code: number
  message: string
}

export function useGeolocation() {
  const [location, setLocation] = React.useState<GeolocationData | null>(null)
  const [error, setError] = React.useState<GeolocationError | null>(null)
  const [loading, setLoading] = React.useState(false)

  const getCurrentLocation = React.useCallback(async (): Promise<GeolocationData> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        const error = {
          code: 0,
          message: 'Geolocation is not supported by this browser'
        }
        setError(error)
        reject(error)
        return
      }

      setLoading(true)
      setError(null)

      const options: PositionOptions = {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000 // 5 minutes
      }

      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude, accuracy } = position.coords
          
          // Try to get address from coordinates (reverse geocoding)
          let address: string | undefined
          try {
            // Using a free reverse geocoding service
            const response = await fetch(
              `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`
            )
            const data = await response.json()
            if (data.city && data.principalSubdivision) {
              address = `${data.city}, ${data.principalSubdivision}`
            }
          } catch (err) {
            console.warn('Could not get address from coordinates:', err)
          }

          const locationData: GeolocationData = {
            latitude,
            longitude,
            accuracy,
            address
          }

          setLocation(locationData)
          setLoading(false)
          resolve(locationData)
        },
        (error) => {
          const errorData: GeolocationError = {
            code: error.code,
            message: error.message
          }
          setError(errorData)
          setLoading(false)
          reject(errorData)
        },
        options
      )
    })
  }, [])

  const clearLocation = React.useCallback(() => {
    setLocation(null)
    setError(null)
    setLoading(false)
  }, [])

  return {
    location,
    error,
    loading,
    getCurrentLocation,
    clearLocation
  }
}
