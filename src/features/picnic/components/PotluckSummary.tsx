import React from 'react'
import { Box, Card, Typography, Grid, Chip, Avatar, useTheme } from '@mui/material'
import { UtensilsCrossed, Package, Coffee, Pizza, Soup, Beef } from 'lucide-react'

interface PotluckSummaryProps {
  items: string[]
  loading: boolean
}

const getCategoryIcon = (itemName: string) => {
  const name = itemName.toLowerCase()
  if (name.includes('drink') || name.includes('soda') || name.includes('water') || name.includes('juice')) return <Coffee size={20} />
  if (name.includes('pizza') || name.includes('bread') || name.includes('bun')) return <Pizza size={20} />
  if (name.includes('soup') || name.includes('dish') || name.includes('rice')) return <Soup size={20} />
  if (name.includes('meat') || name.includes('chicken') || name.includes('pork') || name.includes('beef')) return <Beef size={20} />
  if (name.includes('napkin') || name.includes('plate') || name.includes('fork') || name.includes('spoon')) return <Package size={20} />
  return <UtensilsCrossed size={20} />
}

export default function PotluckSummary({ items, loading }: PotluckSummaryProps) {
  const theme = useTheme()
  const isDark = theme.palette.mode === 'dark'

  const groupedItems = React.useMemo(() => {
    const counts: Record<string, number> = {}
    items.forEach(item => {
      counts[item] = (counts[item] || 0) + 1
    })
    
    return Object.entries(counts).map(([name, count]) => ({
      name,
      count,
      category: 'General' // Simple grouping for now
    })).sort((a, b) => b.count - a.count)
  }, [items])

  if (loading) {
    return <Typography color="text.secondary">Loading potluck data...</Typography>
  }

  if (groupedItems.length === 0) {
    return (
      <Box sx={{ p: 4, textAlign: 'center', border: '2px dashed', borderColor: 'divider', borderRadius: 4 }}>
        <Typography color="text.disabled">No potluck items have been claimed yet.</Typography>
      </Box>
    )
  }

  return (
    <Box>
      <Typography variant="h6" fontWeight={800} sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <UtensilsCrossed size={24} color="#de4f25" />
        Logistics: Potluck Items Count
      </Typography>
      
      <Grid container spacing={2}>
        {groupedItems.map((item, idx) => (
          <Grid item xs={12} sm={6} md={4} lg={3} key={idx}>
            <Card
              elevation={0}
              sx={{
                p: 2,
                borderRadius: 3,
                border: '1px solid',
                borderColor: 'divider',
                display: 'flex',
                alignItems: 'center',
                gap: 2,
                background: isDark ? 'rgba(255,255,255,0.03)' : 'white',
                '&:hover': { 
                  borderColor: '#de4f2530',
                  bgcolor: isDark ? 'rgba(222, 79, 37, 0.03)' : 'rgba(222, 79, 37, 0.01)'
                }
              }}
            >
              <Avatar sx={{ bgcolor: 'rgba(222, 79, 37, 0.1)', color: '#de4f25' }}>
                {getCategoryIcon(item.name)}
              </Avatar>
              <Box sx={{ flex: 1 }}>
                <Typography variant="subtitle2" fontWeight={700} noWrap>
                  {item.name}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Total Confirmed: <strong>{item.count}</strong>
                </Typography>
              </Box>
              <Chip 
                label={item.count} 
                size="small" 
                sx={{ 
                  bgcolor: '#0a192f', 
                  color: 'white', 
                  fontWeight: 800,
                  fontSize: '0.7rem' 
                }} 
              />
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  )
}
