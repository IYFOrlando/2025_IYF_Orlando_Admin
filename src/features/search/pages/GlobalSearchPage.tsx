import * as React from 'react'
import { 
  Box, TextField, Button, Card, CardContent, Typography, 
  CircularProgress, Stack, Chip, Alert, Accordion,
  AccordionSummary, AccordionDetails, Table, TableBody,
  TableCell, TableHead, TableRow, Paper
} from '@mui/material'
import { Search, ChevronDown } from 'lucide-react'
import { supabase } from '../../../lib/supabase'
import { PageHeader } from '../../../components/PageHeader'

// Supabase tables to search
const SUPABASE_TARGETS = [
  { id: 'students', name: 'Students', table: 'students' },
  { id: 'profiles', name: 'Profiles (Staff/Teachers)', table: 'profiles' },
  { id: 'invoices', name: 'Invoices', table: 'invoices' },
  { id: 'payments', name: 'Payments', table: 'payments' },
  { id: 'enrollments', name: 'Enrollments', table: 'enrollments' },
] as const

type SearchResult = Record<string, any>

async function searchStudents(term: string): Promise<SearchResult[]> {
  const { data, error } = await supabase
    .from('students')
    .select('*')
    .or(`first_name.ilike.%${term}%,last_name.ilike.%${term}%,email.ilike.%${term}%,phone.ilike.%${term}%`)
    .limit(100)
  if (error) throw error
  return (data || []).map(d => ({ ...d, _name: `${d.first_name} ${d.last_name}`, _email: d.email, _phone: d.phone }))
}

async function searchProfiles(term: string): Promise<SearchResult[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .or(`full_name.ilike.%${term}%,email.ilike.%${term}%,phone.ilike.%${term}%`)
    .limit(100)
  if (error) throw error
  return (data || []).map(d => ({ ...d, _name: d.full_name, _email: d.email, _phone: d.phone }))
}

async function searchInvoices(term: string): Promise<SearchResult[]> {
  // Search invoices by joining students
  const { data, error } = await supabase
    .from('invoices')
    .select('*, student:students(first_name, last_name, email)')
    .limit(200)
  if (error) throw error
  // Client-side filter on student names
  const lower = term.toLowerCase()
  return (data || []).filter(inv => {
    const student = inv.student as any
    if (!student) return false
    const name = `${student.first_name} ${student.last_name}`.toLowerCase()
    return name.includes(lower) || (student.email || '').toLowerCase().includes(lower)
  }).map(d => {
    const student = d.student as any
    return { ...d, _name: student ? `${student.first_name} ${student.last_name}` : '', _email: student?.email, student: undefined }
  })
}

async function searchPayments(term: string): Promise<SearchResult[]> {
  const { data, error } = await supabase
    .from('payments')
    .select('*, invoice:invoices(student:students(first_name, last_name, email))')
    .limit(200)
  if (error) throw error
  const lower = term.toLowerCase()
  return (data || []).filter(p => {
    const student = (p.invoice as any)?.student
    if (!student) return false
    const name = `${student.first_name} ${student.last_name}`.toLowerCase()
    return name.includes(lower) || (student.email || '').toLowerCase().includes(lower)
  }).map(d => {
    const student = (d.invoice as any)?.student
    return { ...d, _name: student ? `${student.first_name} ${student.last_name}` : '', _email: student?.email, invoice: undefined }
  })
}

async function searchEnrollments(term: string): Promise<SearchResult[]> {
  const { data, error } = await supabase
    .from('enrollments')
    .select('*, student:students(first_name, last_name, email), academy:academies(name), level:levels(name)')
    .limit(200)
  if (error) throw error
  const lower = term.toLowerCase()
  return (data || []).filter(e => {
    const student = e.student as any
    if (!student) return false
    const name = `${student.first_name} ${student.last_name}`.toLowerCase()
    const acName = ((e.academy as any)?.name || '').toLowerCase()
    return name.includes(lower) || (student.email || '').toLowerCase().includes(lower) || acName.includes(lower)
  }).map(d => {
    const student = d.student as any
    return { 
      ...d, 
      _name: student ? `${student.first_name} ${student.last_name}` : '',
      _email: student?.email,
      _academy: (d.academy as any)?.name,
      _level: (d.level as any)?.name,
      student: undefined, academy: undefined, level: undefined 
    }
  })
}

const SEARCH_FNS: Record<string, (t: string) => Promise<SearchResult[]>> = {
  students: searchStudents,
  profiles: searchProfiles,
  invoices: searchInvoices,
  payments: searchPayments,
  enrollments: searchEnrollments,
}

export default function GlobalSearchPage() {
  const [term, setTerm] = React.useState('')
  const [loading, setLoading] = React.useState(false)
  const [searched, setSearched] = React.useState(false)
  const [results, setResults] = React.useState<Record<string, SearchResult[]>>({})

  const handleSearch = async () => {
    if (!term.trim()) return
    setLoading(true)
    setSearched(false)
    setResults({})

    const searchTerm = term.trim()
    const newResults: Record<string, SearchResult[]> = {}

    try {
      const promises = SUPABASE_TARGETS.map(async (target) => {
        try {
          const fn = SEARCH_FNS[target.id]
          if (!fn) return
          const matches = await fn(searchTerm)
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
        subtitle="Search across all Supabase tables"
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
            Searches in: {SUPABASE_TARGETS.map(t => t.name).join(', ')}
          </Typography>
        </CardContent>
      </Card>

      {searched && (
        <Stack spacing={2}>
          {Object.keys(results).length === 0 ? (
            <Alert severity="warning">No results found for &quot;{term}&quot; across any table.</Alert>
          ) : (
            SUPABASE_TARGETS.map(target => {
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
                            {items.map((item: any, idx: number) => (
                              <TableRow key={item.id || idx} hover>
                                <TableCell sx={{ fontFamily: 'monospace', fontSize: 11 }}>{item.id}</TableCell>
                                <TableCell>
                                  <Stack spacing={0.5}>
                                    {item._name && <Typography variant="body2">Name: <b>{item._name}</b></Typography>}
                                    {item._email && <Typography variant="body2">Email: {item._email}</Typography>}
                                    {item._phone && <Typography variant="body2">Phone: {item._phone}</Typography>}
                                    {item._academy && <Typography variant="body2">Academy: {item._academy}</Typography>}
                                    {item._level && <Typography variant="body2">Level: {item._level}</Typography>}
                                    {item.amount != null && <Typography variant="body2">Amount: ${(item.amount / 100).toFixed(2)}</Typography>}
                                    {item.status && <Typography variant="body2">Status: {item.status}</Typography>}
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
