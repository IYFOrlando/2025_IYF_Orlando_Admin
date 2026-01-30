import { Box, Stack, Typography } from '@mui/material'
import type { ReactNode } from 'react'

interface PageHeaderProps {
  icon: ReactNode
  title: string
  subtitle?: string
  color?: string // Main color
  gradientEnd?: string // Gradient end color
}

/**
 * Reusable page header component with gradient background
 * Matches the sidebar selection colors for visual consistency
 */
export const PageHeader = ({
  icon,
  title,
  subtitle,
  color = '#3F51B5', // Default indigo
  gradientEnd
}: PageHeaderProps) => {
  const endColor = gradientEnd || color

  return (
    <Box
      sx={{
        mb: 4,
        background: `linear-gradient(135deg, ${color} 0%, ${endColor} 100%)`,
        borderRadius: 3,
        p: { xs: 2.5, sm: 3 },
        color: 'white',
        boxShadow: `0 4px 20px 0 rgba(0,0,0,0.14), 0 7px 10px -5px ${color}66`
      }}
    >
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        alignItems={{ xs: 'flex-start', sm: 'center' }}
        spacing={2}
      >
        <Box sx={{ fontSize: { xs: 32, sm: 40 }, color: 'white', display: 'flex' }}>
          {icon}
        </Box>
        <Box>
          <Typography variant="h4" fontWeight={800} color="white">
            {title}
          </Typography>
          {subtitle && (
            <Typography variant="body1" sx={{ opacity: 0.9, mt: 0.5, color: 'white' }}>
              {subtitle}
            </Typography>
          )}
        </Box>
      </Stack>
    </Box>
  )
}

