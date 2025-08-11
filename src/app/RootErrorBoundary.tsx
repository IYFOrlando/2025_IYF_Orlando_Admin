import * as React from 'react'
import { Alert, AlertTitle, Button, Stack } from '@mui/material'

type Props = { children: React.ReactNode }
type State = { hasError: boolean; error?: any }

export default class RootErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }
  static getDerivedStateFromError(error: any) {
    return { hasError: true, error }
  }
  componentDidCatch(error: any, info: any) {
    // Still log to console for details
    // eslint-disable-next-line no-console
    console.error('App crashed:', error, info)
  }
  handleReload = () => {
    this.setState({ hasError: false, error: undefined })
    window.location.reload()
  }
  render() {
    if (this.state.hasError) {
      return (
        <Stack sx={{ p: 3 }}>
          <Alert severity="error" variant="filled">
            <AlertTitle>Something went wrong</AlertTitle>
            {String(this.state.error?.message || this.state.error || 'Unknown error')}
          </Alert>
          <Button onClick={this.handleReload} sx={{ mt: 2 }} variant="contained">
            Reload
          </Button>
        </Stack>
      )
    }
    return this.props.children
  }
}
