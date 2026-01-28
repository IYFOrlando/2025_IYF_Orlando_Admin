import * as React from 'react'
import { Card, useTheme } from '@mui/material'
import type { CardProps } from '@mui/material'
import { motion } from 'framer-motion'

interface GlassCardProps extends CardProps {
  children?: React.ReactNode
}

export const GlassCard = ({ children, sx = {}, ...props }: GlassCardProps) => {
  const theme = useTheme()
  const isDark = theme.palette.mode === 'dark'

  return (
    <Card
      component={motion.div}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      elevation={0}
      sx={{
        background: isDark ? 'rgba(30, 30, 30, 0.6)' : 'rgba(255, 255, 255, 0.8)',
        backdropFilter: 'blur(12px)',
        borderRadius: 3,
        border: '1px solid',
        borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(255, 255, 255, 0.4)',
        boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.07)',
        height: '100%',
        ...sx
      }}
      {...props}
    >
      {children}
    </Card>
  )
}
