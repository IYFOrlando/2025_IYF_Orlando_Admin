import * as React from 'react'
import { 
  Box, TextField, Button, Card, CardContent, Typography, 
  CircularProgress, Stack, Chip, Alert, Accordion,
  AccordionSummary, AccordionDetails, Table, TableBody,
  TableCell, TableHead, TableRow, Paper
} from '@mui/material'
import { Search, ChevronDown } from 'lucide-react'
import { collection, getDocs, type DocumentData } from 'firebase/firestore'
import { db } from '../../../lib/firebase'
import { COLLECTIONS_CONFIG } from '../../../config/shared'
import { PageHeader } from '../../../components/PageHeader'

// Define search targets
const SEARCH_TARGETS = [
  { id: 'registrations', name: 'Academy Registrations', collection: COLLECTIONS_CONFIG.springAcademy2026, type: 'academy' },
  { id: 'volunteers', name: 'Volunteers', collection: COLLECTIONS_CONFIG.volunteerApplications, type: 'volunteer' },
  { id: 'cooking', name: 'Cooking Class', collection: COLLECTIONS_CONFIG.cookingClass, type: 'other' },
  { id: 'korea', name: 'Trip to Korea', collection: COLLECTIONS_CONFIG.tripToKorea, type: 'other' },
  { id: 'kdrama', name: 'K-Drama Class', collection: COLLECTIONS_CONFIG.kdrama, type: 'other' },
  { id: 'events', name: 'Event Volunteers', collection: COLLECTIONS_CONFIG.volunteerHours, type: 'other' },
  { id: 'newsletter', name: 'Newsletter', collection: COLLECTIONS_CONFIG.newsletter, type: 'other' },
  { id: 'contact', name: 'Contact Messages', collection: COLLECTIONS_CONFIG.contact, type: 'other' },
  { id: 'teachers', name: 'Teachers (Legacy)', collection: 'teachers', type: 'other' },
  { id: 'teachersIndex', name: 'Teachers Index', collection: COLLECTIONS_CONFIG.teachersIndex, type: 'other' },
]

export default function GlobalSearchPage() {
  const [term, setTerm] = React.useState('')
  const [loading, setLoading] = React.useState(false)
  const [searched, setSearched] = React.useState(false)
  const [results, setResults] = React.useState<Record<string, DocumentData[]>>({})

  const handleSearch = async () => {
    if (!term.trim()) return
    setLoading(true)
    setSearched(false)
    setResults({})

    const searchTerm = term.trim().toLowerCase()
    const newResults: Record<string, DocumentData[]> = {}

    try {
      // We can't do full text search easily in Firestore without Algolia/etc.
      // So we'll fetch all and filter client side for this admin tool 
      // OR do specific queries if we know the fields. 
      // Given the urgency/size, fetching collections and filtering is safer to find partial matches
      // but risky if collections are huge. 
      // Let's try to query by common fields if possible, or fallback to client filter for smaller collections.
      
      // For this specific 'Danna Uhr' case, user wants to find her anywhere. 
      // We will run parallel queries for common name fields.
      
      const promises = SEARCH_TARGETS.map(async (target) => {
        try {
          const colRef = collection(db, target.collection)
          
          // Strategy: Fetch all (cap at 1000 maybe?) and filter. 
          // This is inefficient for PROD with millions of rows but fine for this admin tool context (~1000s records)
          const snap = await getDocs(colRef)
          
          const matches = snap.docs
            .map(d => ({ id: d.id, ...d.data() }))
            .filter((d: any) => {
              const str = JSON.stringify(d).toLowerCase()
              return str.includes(searchTerm)
            })
          
          if (matches.length > 0) {
            newResults[target.id] = matches
          }
        } catch (e) {
          console.error(`Error querying ${target.name}:`, e)
        }
      })

      await Promise.all(promises)
      setResults(newResults)
    } catch (e) {
      console.error("Search failed", e)
    } finally {
      setLoading(false)
      setSearched(true)
    }
  }

  return (
    <Box sx={{ pb: 4 }}>
      <PageHeader 
        title="Global Search" 
        subtitle="Search across all database collections"
        icon={<Search size={32} />}
        color="#673ab7"
      />

      <Card sx={{ mb: 4, borderRadius: 3 }}>
        <CardContent>
          <Stack direction="row" spacing={2}>
            <TextField 
              fullWidth 
              label="Search Query (Name, Email, Phone...)" 
              value={term}
              onChange={(e) => setTerm(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="e.g. Danna"
            />
            <Button 
              variant="contained" 
              size="large" 
              onClick={handleSearch}
              disabled={loading || !term.trim()}
              startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <Search />}
            >
              Search
            </Button>
          </Stack>
          <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
            Searches in: {SEARCH_TARGETS.map(t => t.name).join(', ')}
          </Typography>
        </CardContent>
      </Card>

      {searched && (
        <Stack spacing={2}>
          {Object.keys(results).length === 0 ? (
            <Alert severity="warning">No results found for "{term}" across any checked collection.</Alert>
          ) : (
            SEARCH_TARGETS.map(target => {
              const items = results[target.id]
              if (!items) return null

              return (
                <Accordion key={target.id} defaultExpanded>
                  <AccordionSummary expandIcon={<ChevronDown />}>
                    <Stack direction="row" spacing={2} alignItems="center">
                      <Typography variant="h6">{target.name}</Typography>
                      <Chip label={`${items.length} matches`} color="primary" size="small" />
                    </Stack>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Paper variant="outlined" sx={{ overflow: 'hidden' }}>
                      <Box sx={{ overflowX: 'auto' }}>
                        <Table size="small">
                          <TableHead>
                            <TableRow>
                              <TableCell>ID</TableCell>
                              <TableCell>Matches</TableCell>
                              <TableCell>Raw Data</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {items.map((item: any) => (
                              <TableRow key={item.id} hover>
                                <TableCell sx={{ fontFamily: 'monospace' }}>{item.id}</TableCell>
                                <TableCell>
                                  {/* Try to show name/email if they exist */}
                                  <Stack spacing={0.5}>
                                    {item.firstName && <Typography variant="body2">Name: <b>{item.firstName} {item.lastName}</b></Typography>}
                                    {item.name && <Typography variant="body2">Name: <b>{item.name}</b></Typography>}
                                    {item.email && <Typography variant="body2">Email: {item.email}</Typography>}
                                    {item.phone && <Typography variant="body2">Phone: {item.phone}</Typography>}
                                    {item.cellNumber && <Typography variant="body2">Cell: {item.cellNumber}</Typography>}
                                  </Stack>
                                </TableCell>
                                <TableCell>
                                  <details>
                                    <summary style={{ cursor: 'pointer', color: '#1976d2' }}>View JSON</summary>
                                    <pre style={{ fontSize: 11, maxHeight: 200, overflow: 'auto' }}>
                                      {JSON.stringify(item, null, 2)}
                                    </pre>
                                  </details>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </Box>
                    </Paper>
                  </AccordionDetails>
                </Accordion>
              )
            })
          )}
        </Stack>
      )}
    </Box>
  )
}
