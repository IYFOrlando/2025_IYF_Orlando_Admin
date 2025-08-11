import * as React from 'react'
import { Alert, AlertTitle, Button, Stack } from '@mui/material'

type Props = { children: React.ReactNode }
type State = { hasError: boolean; error?: any }

export default class GridErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }
  static getDerivedStateFromError(error: any) { return { hasError: true, error } }
  componentDidCatch(error: any) { /* Error logged silently */ }
  render() {
    if (this.state.hasError) {
      return (
        <Stack spacing={2}>
          <Alert severity="error" variant="filled">
            <AlertTitle>Table rendering error</AlertTitle>
            {String(this.state.error?.message || this.state.error || 'Unknown error')}
          </Alert>
          <Button onClick={() => location.reload()} variant="contained">Reload</Button>
        </Stack>
      )
    }
    return this.props.children
  }
}
