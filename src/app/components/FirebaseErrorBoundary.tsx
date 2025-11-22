import React from 'react'
import { Alert, AlertTitle, Box, Button, Typography } from '@mui/material'
import { Refresh } from '@mui/icons-material'
import { logger } from '../../lib/logger'
import { isFirebasePermissionError } from '../../lib/errors'

interface Props {
  children: React.ReactNode
  fallback?: React.ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
  errorInfo: React.ErrorInfo | null
}

export class FirebaseErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    }
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    // Check if it's a Firebase permission error
    if (isFirebasePermissionError(error)) {
      return { hasError: false }
    }

    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Only log non-permission errors
    if (!isFirebasePermissionError(error)) {
      logger.error('FirebaseErrorBoundary caught an error', { error, errorInfo })
      this.setState({
        error,
        errorInfo
      })
    }
  }

  handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    })
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <Box sx={{ p: 3 }}>
          <Alert 
            severity="error" 
            action={
              <Button 
                color="inherit" 
                size="small" 
                onClick={this.handleRetry}
                startIcon={<Refresh />}
              >
                Retry
              </Button>
            }
          >
            <AlertTitle>Something went wrong</AlertTitle>
            <Typography variant="body2" sx={{ mt: 1 }}>
              {this.state.error?.message || 'An unexpected error occurred'}
            </Typography>
            {process.env.NODE_ENV === 'development' && this.state.errorInfo && (
              <details style={{ marginTop: 8 }}>
                <summary>Error Details</summary>
                <pre style={{ fontSize: '12px', marginTop: 8 }}>
                  {this.state.errorInfo.componentStack}
                </pre>
              </details>
            )}
          </Alert>
        </Box>
      )
    }

    return this.props.children
  }
}

export default FirebaseErrorBoundary
