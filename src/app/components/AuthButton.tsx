import * as React from 'react'
import { getAuth, signOut } from 'firebase/auth'
import { Button } from '@mui/material'
import LogoutIcon from '@mui/icons-material/Logout'

export default function AuthButton() {
  const [user, setUser] = React.useState<any>(null)

  React.useEffect(() => {
    const auth = getAuth()
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setUser(user)
    })
    return unsubscribe
  }, [])

  const handleSignOut = () => {
    signOut(getAuth())
  }

  if (!user) return null

  return (
    <Button
      variant="outlined"
      size="small"
      startIcon={<LogoutIcon />}
      onClick={handleSignOut}
    >
      {user.email}
    </Button>
  )
}
